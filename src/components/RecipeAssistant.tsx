import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import {
  X,
  Send,
  Check,
  Undo2,
  Sparkles,
  Lightbulb,
  Wand2,
  ArrowLeft,
  ChevronRight,
} from 'lucide-react';
import type { Recipe, Step, Ingredient } from '../types';
import { BrandMark } from './BrandMark';
import {
  adjustRecipe as aiAdjustRecipe,
  polishIngredients as aiPolishIngredients,
  polishSteps as aiPolishSteps,
  applyPrefix as aiApplyPrefix,
  generateTips as aiGenerateTips,
  explainProposal as aiExplainProposal,
  AiRequestError,
} from '../services/aiService';
import { normalizeAiActionError } from '../services/errorMessageService';

// Phase C C0: Recipe-scoped assistant-surface.
// Messenger-style floating toast. Reuses existing AI endpoints via aiService.
// Output contract: no_change | proposal | answer | clarify | error.
//
// Design notes (batch 2026-04-22):
// - Assistant is the SINGLE AI-surface in RecipeView. Old inline buttons
//   ("AI - Ret til cookmode", "Stram ingredienser op", "Tips & Tricks",
//   "AI Varianter") are hidden at the RecipeView layer when this mounts —
//   those flows live here as:
//     Home  → 3 big cards (Tilpas / Varianter / Tips)
//     Adjust section → 4 starter chips (ingredients, fremgangsmåde,
//       beskrivelse, hele opskriften / free-text)
//     Variants section → preset variant buttons (Gourmet, Autentisk, …)
//     Tips tab → "Generer tips" + existing tips list
// - Click outside closes the panel. Panel is draggable via its header.
// - Dark mode: deep forest base with a matte karry-yellow accent. Light
//   mode matches the Tips & Tricks surface (sand bg, heath-mid accents).

type ActionId =
  | 'adjust_ingredients'
  | 'adjust_steps'
  | 'adjust_description'
  | 'adjust_all'
  | 'apply_variant'
  | 'generate_tips';

type Section = 'home' | 'adjust' | 'variants';

type TabId = 'chat' | 'tips';

interface ProposalDiscussionEntry {
  id: string;
  question: string;
  answer?: string;
  pending?: boolean;
  errored?: boolean;
  // Set when the entry is a refine-request rather than an explain-request.
  // Visually rendered as a "Rettelse" badge so the user can tell them apart
  // from pure Q&A.
  isRefine?: boolean;
}

// Persistent chat-log that survives section/tab switches + proposal resolve.
// Only a recipe.id change (or closing-with-close-resets) wipes it, so old
// exchanges stay visible instead of feeling like a hard reset every time the
// user applies or discards a proposal.
interface ChatLogEntry {
  id: string;
  role: 'user' | 'assistant' | 'status';
  text?: string;
  summary?: string;
  bullets?: string[];
  tone?: 'default' | 'error' | 'success';
}

type ViewState =
  | { kind: 'idle' }
  | { kind: 'loading'; action: ActionId; label: string }
  | { kind: 'no_change'; action: ActionId; reason: string }
  | {
      kind: 'proposal';
      action: ActionId;
      proposed: Recipe;
      summary: string;
      bullets: string[];
      // Threaded Q&A about THIS proposal. User can ask "why 900 min?" and
      // get a short text answer without losing the Apply/Discard buttons.
      discussion: ProposalDiscussionEntry[];
    }
  | { kind: 'answer'; text: string }
  | { kind: 'clarify'; question: string }
  | { kind: 'error'; message: string };

interface RecipeAssistantProps {
  recipe: Recipe;
  onApply: (proposed: Recipe) => void;
  aiDisabledReason?: string | null;
  userLevel?: string;
  /** When false the floating bubble is hidden entirely (e.g. no edit rights). */
  enabled?: boolean;
}

const INSTRUCTION_DESCRIPTION =
  'Kig kun på titel, kort beskrivelse og eventuelle hints. Hold ingredienser og fremgangsmåde uændret, medmindre en formulering er direkte misvisende.';

interface VariantPreset {
  prefix: string;
  label: string;
  hint: string;
  // Deterministic, up-front hint of what the AI variant is likely to touch.
  // Shown in a lightweight confirm step so the user isn't forced into a blind
  // commit before the heavy AI round-trip fires.
  previewBullets: string[];
}

const VARIANT_PRESETS: VariantPreset[] = [
  {
    prefix: 'Gourmet',
    label: 'Gourmet',
    hint: 'Mere forfinet version.',
    previewBullets: [
      'Finere teknikker og plating',
      'Kan tilføje forædlede smagselementer (fx kryddersmør, reduktioner)',
      'Titelprefix: "Gourmet"',
    ],
  },
  {
    prefix: 'Autentisk',
    label: 'Autentisk',
    hint: 'Tættere på oprindelsen.',
    previewBullets: [
      'Tættere på oprindelseslandets smagsprofil',
      'Typiske krydderier og teknikker kan blive tilføjet',
      'Titelprefix: "Autentisk"',
    ],
  },
  {
    prefix: 'Den hurtige',
    label: 'Den hurtige',
    hint: 'Færre trin, kortere tid.',
    previewBullets: [
      'Kortere samlet tilberedningstid',
      'Færre eller sammenlagte trin',
      'Titelprefix: "Den hurtige"',
    ],
  },
  {
    prefix: 'Begynderen',
    label: 'Begynderen',
    hint: 'Enklere teknikker.',
    previewBullets: [
      'Enklere teknikker, forklaret mere udførligt',
      'Flere hjælpetrin og sikkerhedsnet',
      'Titelprefix: "Begynderen"',
    ],
  },
  {
    prefix: 'Babyvenlig 0/1 år',
    label: 'Babyvenlig',
    hint: 'Tilpasset 0/1 år.',
    previewBullets: [
      'Ingen salt, sukker eller stærke krydderier',
      'Blødere konsistens og mindre bidder',
      'Titelprefix: "Babyvenlig 0/1 år"',
    ],
  },
  {
    prefix: 'Børnevenlig 1/3 år',
    label: 'Børnevenlig',
    hint: 'Tilpasset 1/3 år.',
    previewBullets: [
      'Mildere smag og mindre salt',
      'Mere bide-venlig konsistens',
      'Titelprefix: "Børnevenlig 1/3 år"',
    ],
  },
  {
    prefix: 'Spice it up',
    label: 'Spice it up',
    hint: 'Mere krydret.',
    previewBullets: [
      'Mere chili eller stærke krydderier',
      'Dybere, mere kompleks smagsprofil',
      'Titelprefix: "Spice it up"',
    ],
  },
];

// ---------- normalization helpers ----------

function normalizeString(input: unknown): string {
  if (typeof input !== 'string') return '';
  return input.trim().replace(/\s+/g, ' ').toLowerCase();
}

function ingredientSignature(list: Recipe['ingredients']): string {
  if (!Array.isArray(list)) return '';
  return list
    .map((i) => {
      const amount = i?.amount == null ? '' : String(i.amount);
      const unit = normalizeString(i?.unit);
      const name = normalizeString(i?.name);
      const group = normalizeString(i?.group);
      return `${amount}|${unit}|${name}|${group}`;
    })
    .join('\n');
}

function stepSignature(list: Recipe['steps']): string {
  if (!Array.isArray(list)) return '';
  return list.map((s) => normalizeString(s?.text)).join('\n');
}

function truncate(text: string | undefined | null, max = 70): string {
  if (!text) return '';
  const str = text.trim();
  if (str.length <= max) return str;
  return str.slice(0, max - 1).trimEnd() + '…';
}

// ---------- concrete delta computation ----------

interface StepChangeBullet {
  sortKey: number;
  text: string;
}

function describeHeatChange(prev: Step | undefined, next: Step | undefined): string | null {
  const prevHeat = (prev?.heat || '').trim();
  const nextHeat = (next?.heat || '').trim();
  const prevLvl = prev?.heatLevel;
  const nextLvl = next?.heatLevel;

  const heatChanged = normalizeString(prevHeat) !== normalizeString(nextHeat);
  const lvlChanged = (prevLvl ?? null) !== (nextLvl ?? null);

  if (!heatChanged && !lvlChanged) return null;

  if (prevHeat && nextHeat && heatChanged) {
    return `varme: ${prevHeat} → ${nextHeat}`;
  }
  if (!prevHeat && nextHeat) return `varme tilføjet (${nextHeat})`;
  if (prevHeat && !nextHeat) return `varme fjernet`;
  if (lvlChanged) {
    return `varmetrin ${prevLvl ?? '?'} → ${nextLvl ?? '?'}`;
  }
  return null;
}

function describeTimerChange(prev: Step | undefined, next: Step | undefined): string | null {
  const p = prev?.timer;
  const n = next?.timer;
  if (!p && !n) return null;
  if (!p && n) return `timer tilføjet (${n.duration} min)`;
  if (p && !n) return `timer fjernet`;
  if (p && n && p.duration !== n.duration) {
    return `timer ${p.duration} → ${n.duration} min`;
  }
  return null;
}

function textChangeKind(prevText: string, nextText: string): 'unchanged' | 'rewrite' | 'tweak' {
  const p = normalizeString(prevText);
  const n = normalizeString(nextText);
  if (p === n) return 'unchanged';
  if (p.length > 0 && (n.startsWith(p) || p.startsWith(n))) return 'tweak';
  if (p.length > 0 && n.includes(p.slice(0, Math.min(30, p.length)))) return 'tweak';
  return 'rewrite';
}

function describeIngredientsDelta(prev: Ingredient[], next: Ingredient[]): string[] {
  const bullets: string[] = [];
  const prevByName = new Map<string, Ingredient>();
  for (const ing of prev) {
    const key = normalizeString(ing.name);
    if (key && !prevByName.has(key)) prevByName.set(key, ing);
  }
  const nextByName = new Map<string, Ingredient>();
  for (const ing of next) {
    const key = normalizeString(ing.name);
    if (key && !nextByName.has(key)) nextByName.set(key, ing);
  }

  const added: string[] = [];
  const removed: string[] = [];
  const modified: string[] = [];

  for (const [name, nextIng] of nextByName.entries()) {
    const prevIng = prevByName.get(name);
    if (!prevIng) {
      added.push(nextIng.name);
      continue;
    }
    const amountChanged = String(prevIng.amount ?? '') !== String(nextIng.amount ?? '');
    const unitChanged = normalizeString(prevIng.unit) !== normalizeString(nextIng.unit);
    if (amountChanged || unitChanged) {
      const prevAmt = prevIng.amount == null ? '—' : `${prevIng.amount}${prevIng.unit ? ' ' + prevIng.unit : ''}`;
      const nextAmt = nextIng.amount == null ? '—' : `${nextIng.amount}${nextIng.unit ? ' ' + nextIng.unit : ''}`;
      modified.push(`${nextIng.name}: ${prevAmt} → ${nextAmt}`);
    }
  }
  for (const [name, prevIng] of prevByName.entries()) {
    if (!nextByName.has(name)) removed.push(prevIng.name);
  }

  if (added.length) bullets.push(`Tilføjer: ${added.slice(0, 4).join(', ')}${added.length > 4 ? ` +${added.length - 4}` : ''}`);
  if (removed.length) bullets.push(`Fjerner: ${removed.slice(0, 4).join(', ')}${removed.length > 4 ? ` +${removed.length - 4}` : ''}`);
  for (const m of modified.slice(0, 6)) bullets.push(m);
  if (modified.length > 6) bullets.push(`+${modified.length - 6} mængde-justeringer`);

  return bullets;
}

function describeStepsDelta(prev: Step[], next: Step[]): string[] {
  const bullets: StepChangeBullet[] = [];

  const countDelta = next.length - prev.length;
  const commonLen = Math.min(prev.length, next.length);
  for (let i = 0; i < commonLen; i += 1) {
    const p = prev[i];
    const n = next[i];
    const heatBit = describeHeatChange(p, n);
    const timerBit = describeTimerChange(p, n);
    const textKind = textChangeKind(p.text || '', n.text || '');

    if (textKind === 'unchanged' && !heatBit && !timerBit) continue;

    const parts: string[] = [];
    if (textKind === 'rewrite') {
      parts.push(`omformuleret → "${truncate(n.text, 60)}"`);
    } else if (textKind === 'tweak') {
      parts.push(`mindre sproglig justering`);
    }
    if (heatBit) parts.push(heatBit);
    if (timerBit) parts.push(timerBit);
    bullets.push({ sortKey: i, text: `Trin ${i + 1}: ${parts.join(' · ')}` });
  }

  if (countDelta > 0) {
    for (let i = prev.length; i < next.length; i += 1) {
      bullets.push({
        sortKey: i,
        text: `Nyt trin ${i + 1}: "${truncate(next[i].text, 60)}"`,
      });
    }
  } else if (countDelta < 0) {
    for (let i = next.length; i < prev.length; i += 1) {
      bullets.push({
        sortKey: i,
        text: `Fjerner trin ${i + 1}: "${truncate(prev[i].text, 60)}"`,
      });
    }
  }

  bullets.sort((a, b) => a.sortKey - b.sortKey);
  return bullets.map((b) => b.text);
}

function describeRecipeDelta(prev: Recipe, next: Recipe, action: ActionId): {
  bullets: string[];
  summary: string;
} {
  const bullets: string[] = [];
  const prevIng = Array.isArray(prev.ingredients) ? prev.ingredients : [];
  const nextIng = Array.isArray(next.ingredients) ? next.ingredients : [];
  const prevSteps = Array.isArray(prev.steps) ? prev.steps : [];
  const nextSteps = Array.isArray(next.steps) ? next.steps : [];

  if (normalizeString(prev.title) !== normalizeString(next.title)) {
    bullets.push(`Titel: "${truncate(prev.title, 40)}" → "${truncate(next.title, 40)}"`);
  }
  if (normalizeString(prev.summary) !== normalizeString(next.summary)) {
    bullets.push(`Beskrivelse omformuleret`);
  }

  if (ingredientSignature(prevIng) !== ingredientSignature(nextIng)) {
    const ingBullets = describeIngredientsDelta(prevIng, nextIng);
    if (ingBullets.length) {
      bullets.push(...ingBullets.map((b) => `Ingredienser: ${b}`));
    } else {
      bullets.push(`Ingredienser: tekst justeret`);
    }
  }

  if (stepSignature(prevSteps) !== stepSignature(nextSteps)
      || prevSteps.length !== nextSteps.length
      || prevSteps.some((p, i) => {
        const n = nextSteps[i];
        return !!describeHeatChange(p, n) || !!describeTimerChange(p, n);
      })) {
    const stepBullets = describeStepsDelta(prevSteps, nextSteps);
    if (stepBullets.length) bullets.push(...stepBullets);
  }

  // Tips (generate_tips flow)
  const prevTips = Array.isArray(prev.tipsAndTricks) ? prev.tipsAndTricks : [];
  const nextTips = Array.isArray(next.tipsAndTricks) ? next.tipsAndTricks : [];
  if (prevTips.join('|') !== nextTips.join('|')) {
    const added = nextTips.length - prevTips.length;
    if (added > 0) bullets.push(`Tips: ${added} nye tip${added === 1 ? '' : 's'}`);
    else if (added < 0) bullets.push(`Tips: ${-added} fjernet`);
    else bullets.push(`Tips omformuleret`);
  }

  // Variant prefix
  if ((prev.variantPrefix || '') !== (next.variantPrefix || '')) {
    bullets.push(`Variant: ${next.variantPrefix || '—'}`);
  }

  const prevCats = Array.isArray(prev.categories) ? prev.categories.slice().sort().join('|') : '';
  const nextCats = Array.isArray(next.categories) ? next.categories.slice().sort().join('|') : '';
  if (prevCats !== nextCats) bullets.push('Kategorier opdateret');

  const prefix =
    action === 'adjust_ingredients'
      ? 'Jeg vil tilpasse ingredienserne'
      : action === 'adjust_steps'
        ? 'Jeg vil tilpasse fremgangsmåden'
        : action === 'adjust_description'
          ? 'Jeg vil tilpasse beskrivelsen'
          : action === 'apply_variant'
            ? 'Jeg foreslår en variant'
            : action === 'generate_tips'
              ? 'Jeg har nye tips'
              : 'Jeg har et forslag';
  const summary = bullets.length === 0 ? 'Ingen synlige ændringer' : `${prefix}:`;

  return { bullets, summary };
}

function reasonForNoChange(action: ActionId): string {
  switch (action) {
    case 'adjust_ingredients':
      return 'Ingredienslisten ser allerede konsistent ud. Jeg foreslår ingen ændring.';
    case 'adjust_steps':
      return 'Fremgangsmåden ser allerede klar ud. Jeg foreslår ingen ændring.';
    case 'adjust_description':
      return 'Beskrivelsen rammer allerede opskriften. Jeg foreslår ingen ændring.';
    case 'adjust_all':
      return 'Opskriften ser allerede rimeligt ud. Jeg foreslår ingen ændring.';
    case 'apply_variant':
      return 'Varianten ligner allerede nuværende opskrift.';
    case 'generate_tips':
      return 'Ingen nye tips denne gang.';
    default:
      return 'Jeg foreslår ingen ændring.';
  }
}

function loadingLabelFor(action: ActionId): string {
  switch (action) {
    case 'adjust_ingredients':
      return 'Gennemgår ingredienser';
    case 'adjust_steps':
      return 'Gennemgår fremgangsmåde';
    case 'adjust_description':
      return 'Gennemgår beskrivelse';
    case 'adjust_all':
      return 'Genererer et svar';
    case 'apply_variant':
      return 'Bygger variant';
    case 'generate_tips':
      return 'Finder tips';
    default:
      return 'Arbejder';
  }
}

// ---------- component ----------

export function RecipeAssistant({
  recipe,
  onApply,
  aiDisabledReason,
  userLevel,
  enabled = true,
}: RecipeAssistantProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<TabId>('chat');
  const [section, setSection] = useState<Section>('home');
  const [view, setView] = useState<ViewState>({ kind: 'idle' });
  const [freeText, setFreeText] = useState('');
  // In-flight guard for proposal Q&A (explainProposal). Prevents the user
  // from spamming Enter and kicking off N parallel identical requests.
  const [isAsking, setIsAsking] = useState(false);
  // Holds the pre-apply recipe so the assistant can offer a local "Fortryd"
  // even after the proposal has been committed (reuses the existing onApply
  // flow by calling it with the previous snapshot — no new state-machine).
  const [lastApplied, setLastApplied] = useState<Recipe | null>(null);
  // Variant preview: a single-step confirm between "chip click" and the
  // heavy apply_variant AI round-trip. Deterministic hint text — no new
  // backend call — so the user knows what they're about to trigger.
  const [pendingVariant, setPendingVariant] = useState<VariantPreset | null>(null);
  // VisualViewport-derived keyboard inset. On iOS Safari the browser does
  // NOT shrink the layout viewport when the soft keyboard opens, so a
  // fixed-bottom panel ends up hidden behind the keyboard. We read
  // window.visualViewport and shift the panel up + cap its height.
  const [keyboardInset, setKeyboardInset] = useState(0);
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);
  // Persistent chat-log. Past exchanges (Q&A, applied/discarded proposals,
  // status markers) stay visible when the user navigates between Tilpas /
  // Varianter / Tips so the panel doesn't feel like a full reset on every
  // action. Reset on recipe.id change only — NOT on close, NOT on section.
  const [chatLog, setChatLog] = useState<ChatLogEntry[]>([]);

  const panelRef = useRef<HTMLDivElement | null>(null);
  const bubbleRef = useRef<HTMLDivElement | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const dragControls = useDragControls();

  const close = useCallback(() => setOpen(false), []);

  // Reset when closing OR when recipe changes so we never render a proposal
  // against a different recipe. NOTE: chatLog is intentionally kept across
  // close/reopen — it only resets when the recipe changes.
  useEffect(() => {
    if (!open) {
      setView({ kind: 'idle' });
      setFreeText('');
      setSection('home');
    }
  }, [open]);
  useEffect(() => {
    setView({ kind: 'idle' });
    setTab('chat');
    setSection('home');
    setOpen(false);
    setChatLog([]);
  }, [recipe.id]);

  const appendLog = useCallback((entry: Omit<ChatLogEntry, 'id'>) => {
    setChatLog((prev) => {
      const next: ChatLogEntry[] = [
        ...prev,
        {
          ...entry,
          id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        },
      ];
      // Soft cap — keep memory / DOM bounded on long sessions.
      return next.length > 60 ? next.slice(next.length - 60) : next;
    });
  }, []);

  // Flushes an in-flight proposal (summary/bullets + discussion thread)
  // into the persistent chat-log with a trailing status pill. Called from
  // both handleApply and handleDiscard so the thread isn't lost.
  const flushProposalToLog = useCallback(
    (snapshot: Extract<ViewState, { kind: 'proposal' }>, status: 'applied' | 'discarded') => {
      setChatLog((prev) => {
        const additions: ChatLogEntry[] = [];
        const now = Date.now();
        let seq = 0;
        const mkId = () => `log-${now}-${seq++}-${Math.random().toString(36).slice(2, 5)}`;
        additions.push({
          id: mkId(),
          role: 'assistant',
          summary: snapshot.summary,
          bullets: snapshot.bullets,
        });
        snapshot.discussion.forEach((e) => {
          additions.push({
            id: mkId(),
            role: 'user',
            text: e.isRefine ? `Ret: ${e.question}` : e.question,
          });
          if (e.answer) {
            additions.push({
              id: mkId(),
              role: 'assistant',
              text: e.answer,
              tone: e.errored ? 'error' : 'default',
            });
          }
        });
        additions.push({
          id: mkId(),
          role: 'status',
          text: status === 'applied' ? 'Forslag anvendt' : 'Forslag forkastet',
          tone: status === 'applied' ? 'success' : 'default',
        });
        const next = [...prev, ...additions];
        return next.length > 60 ? next.slice(next.length - 60) : next;
      });
    },
    [],
  );

  // Click outside panel closes it. We compare against both the panel and the
  // floating bubble so clicking the bubble still just toggles (doesn't
  // double-fire close + open race).
  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (ev: PointerEvent) => {
      const target = ev.target as Node | null;
      if (!target) return;
      if (panelRef.current && panelRef.current.contains(target)) return;
      if (bubbleRef.current && bubbleRef.current.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  // ESC closes the panel — standard dialog-shaped affordance.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  // Auto-scroll the chat body to the bottom whenever the view changes or a
  // new discussion entry arrives so the user doesn't miss the latest reply.
  const discussionLen =
    view.kind === 'proposal' ? view.discussion.length : 0;
  const lastDiscussionPending =
    view.kind === 'proposal'
      ? view.discussion[view.discussion.length - 1]?.pending ?? false
      : false;
  useEffect(() => {
    if (!open) return;
    const el = chatScrollRef.current;
    if (!el) return;
    // Use rAF so the DOM has flushed the new bubble before we measure.
    const raf = requestAnimationFrame(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    });
    return () => cancelAnimationFrame(raf);
  }, [open, view.kind, discussionLen, lastDiscussionPending, chatLog.length]);

  // Track the VisualViewport so the panel repositions above the soft
  // keyboard and shrinks to fit the available height on small screens.
  // Desktop browsers expose a stable VisualViewport too; this is a no-op
  // for them because the inset stays 0.
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const vv = window.visualViewport;
    const update = () => {
      if (vv) {
        const inset = Math.max(
          0,
          window.innerHeight - vv.height - vv.offsetTop,
        );
        setKeyboardInset(inset);
        setViewportHeight(vv.height);
      } else {
        setKeyboardInset(0);
        setViewportHeight(window.innerHeight);
      }
    };
    update();
    if (vv) {
      vv.addEventListener('resize', update);
      vv.addEventListener('scroll', update);
    }
    window.addEventListener('resize', update);
    return () => {
      if (vv) {
        vv.removeEventListener('resize', update);
        vv.removeEventListener('scroll', update);
      }
      window.removeEventListener('resize', update);
    };
  }, []);

  // Auto-grow the composer textarea up to a hard cap. Keeps the messenger
  // feel (no rigid single-line cramp) without letting the composer eat the
  // whole panel on a long paste.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const next = Math.min(el.scrollHeight, 144); // ~9rem
    el.style.height = `${next}px`;
  }, [freeText, open, tab]);

  const aiDisabled = Boolean(aiDisabledReason);

  const dispatch = useCallback(
    async (action: ActionId, opts?: { instruction?: string; variantPrefix?: string }) => {
      if (aiDisabled) {
        setView({
          kind: 'error',
          message: aiDisabledReason || 'AI er ikke tilgængelig lige nu.',
        });
        return;
      }
      setView({ kind: 'loading', action, label: loadingLabelFor(action) });
      try {
        let proposed: Recipe;
        if (action === 'adjust_ingredients') {
          proposed = (await aiPolishIngredients(recipe, userLevel)) as Recipe;
        } else if (action === 'adjust_steps') {
          proposed = (await aiPolishSteps(recipe, userLevel)) as Recipe;
        } else if (action === 'adjust_description') {
          proposed = (await aiAdjustRecipe(recipe, INSTRUCTION_DESCRIPTION)) as Recipe;
        } else if (action === 'adjust_all') {
          const text = (opts?.instruction || '').trim();
          if (!text) {
            setView({
              kind: 'clarify',
              question: 'Skriv kort hvad der skal rettes, så jeg ved hvor jeg skal kigge.',
            });
            return;
          }
          proposed = (await aiAdjustRecipe(recipe, text)) as Recipe;
        } else if (action === 'apply_variant') {
          const prefix = (opts?.variantPrefix || '').trim();
          if (!prefix) {
            setView({ kind: 'clarify', question: 'Vælg en variant først.' });
            return;
          }
          proposed = (await aiApplyPrefix(recipe, prefix)) as Recipe;
        } else if (action === 'generate_tips') {
          const tips = (await aiGenerateTips(recipe)) as string[];
          proposed = { ...recipe, tipsAndTricks: Array.isArray(tips) ? tips : [] } as Recipe;
        } else {
          setView({
            kind: 'clarify',
            question: 'Denne handling er ikke aktiv endnu.',
          });
          return;
        }

        const { bullets, summary } = describeRecipeDelta(recipe, proposed, action);
        if (bullets.length === 0) {
          setView({ kind: 'no_change', action, reason: reasonForNoChange(action) });
          return;
        }
        setView({
          kind: 'proposal',
          action,
          proposed,
          summary,
          bullets,
          discussion: [],
        });
      } catch (error) {
        const normalized = normalizeAiActionError(
          error instanceof AiRequestError ? error : error,
        );
        setView({
          kind: 'error',
          message: normalized.message || 'Der opstod en fejl. Prøv igen om lidt.',
        });
      }
    },
    [aiDisabled, aiDisabledReason, recipe, userLevel],
  );

  const handleApply = useCallback(() => {
    if (view.kind !== 'proposal') return;
    // Flush the resolved thread into the persistent chat-log so the user
    // can still see what was asked/answered and which proposal was kept,
    // even after the panel has moved on to another section.
    flushProposalToLog(view, 'applied');
    // Snapshot the pre-apply recipe so the in-panel "Fortryd" can restore it
    // via the same onApply pipe (no new parent wiring required — the global
    // UndoToast in App.tsx still fires too, this is just the in-panel mirror
    // for flows where the assistant stays open, e.g. generate_tips).
    setLastApplied(recipe);
    onApply(view.proposed);
    if (view.action === 'generate_tips') {
      setView({ kind: 'idle' });
      setTab('tips');
    } else {
      setView({ kind: 'idle' });
      // Intentionally NOT closing the panel — keeps the chat-log visible so
      // the user has continuity after apply. The bubble toggle still closes
      // it manually. (Previously called close() here.)
    }
  }, [onApply, flushProposalToLog, recipe, view]);

  const handleUndoLastApply = useCallback(() => {
    if (!lastApplied) return;
    const snap = lastApplied;
    setLastApplied(null);
    onApply(snap);
    appendLog({
      role: 'status',
      text: 'Seneste AI-ændring fortrudt',
      tone: 'default',
    });
  }, [lastApplied, onApply, appendLog]);

  const handleDiscard = useCallback(() => {
    if (view.kind === 'proposal') {
      flushProposalToLog(view, 'discarded');
    }
    setView({ kind: 'idle' });
  }, [flushProposalToLog, view]);

  // When a proposal is on screen, the composer instead threads a short
  // clarifying Q&A via /api/ai/explain-proposal — cheaper than re-running
  // adjust, and the proposal stays editable so the user can Apply once the
  // answer resolves the doubt.
  const askAboutProposal = useCallback(
    async (question: string) => {
      // In-flight guard — block parallel sends before we even touch state.
      if (isAsking) return;
      setIsAsking(true);
      setView((prev) => {
        if (prev.kind !== 'proposal') return prev;
        const entry: ProposalDiscussionEntry = {
          id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          question,
          pending: true,
        };
        return { ...prev, discussion: [...prev.discussion, entry] };
      });
      try {
        const proposedSnapshot = view.kind === 'proposal' ? view.proposed : recipe;
        const bulletsSnapshot = view.kind === 'proposal' ? view.bullets : [];
        const answer = await aiExplainProposal(
          recipe,
          proposedSnapshot,
          question,
          bulletsSnapshot,
        );
        setView((prev) => {
          if (prev.kind !== 'proposal') return prev;
          return {
            ...prev,
            discussion: prev.discussion.map((entry) =>
              entry.pending && entry.question === question
                ? { ...entry, pending: false, answer: answer || 'Intet svar.' }
                : entry,
            ),
          };
        });
      } catch (error) {
        const normalized = normalizeAiActionError(
          error instanceof AiRequestError ? error : error,
        );
        setView((prev) => {
          if (prev.kind !== 'proposal') return prev;
          return {
            ...prev,
            discussion: prev.discussion.map((entry) =>
              entry.pending && entry.question === question
                ? {
                    ...entry,
                    pending: false,
                    errored: true,
                    answer: normalized.message || 'Kunne ikke hente svar.',
                  }
                : entry,
            ),
          };
        });
      } finally {
        setIsAsking(false);
      }
    },
    [isAsking, recipe, view],
  );

  // Refine the current proposal in-place using the user's instruction
  // (typically a follow-up from a Q&A like "ret timer til 60 min"). Uses
  // aiAdjustRecipe against the CURRENT PROPOSED recipe so iterative edits
  // converge — delta bullets are still computed against the ORIGINAL recipe
  // so Behold/Fortryd still refer to the correct baseline.
  const refineProposal = useCallback(
    async (instruction: string) => {
      const text = instruction.trim();
      if (!text) return;
      if (aiDisabled) {
        setView({
          kind: 'error',
          message: aiDisabledReason || 'AI er ikke tilgængelig lige nu.',
        });
        return;
      }
      // If called outside proposal view (e.g. via composer when idle), fall
      // through to the normal adjust_all flow so nothing is lost.
      if (view.kind !== 'proposal') {
        await dispatch('adjust_all', { instruction: text });
        return;
      }
      if (isAsking) return;
      setIsAsking(true);
      const entryId = `refine-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setView((prev) => {
        if (prev.kind !== 'proposal') return prev;
        return {
          ...prev,
          discussion: [
            ...prev.discussion,
            { id: entryId, question: text, pending: true, isRefine: true },
          ],
        };
      });
      try {
        const baseline = view.proposed;
        const action = view.action;
        const refined = (await aiAdjustRecipe(baseline, text)) as Recipe;
        const { bullets, summary } = describeRecipeDelta(recipe, refined, action);
        setView((prev) => {
          if (prev.kind !== 'proposal') return prev;
          const effectiveSummary = bullets.length > 0 ? summary : prev.summary;
          const effectiveBullets = bullets.length > 0 ? bullets : prev.bullets;
          return {
            ...prev,
            proposed: refined,
            summary: effectiveSummary,
            bullets: effectiveBullets,
            discussion: prev.discussion.map((e) =>
              e.id === entryId
                ? {
                    ...e,
                    pending: false,
                    answer:
                      bullets.length > 0
                        ? 'Forslaget er rettet — se opdaterede ændringer ovenfor.'
                        : 'Jeg kunne ikke ændre noget ud fra den rettelse. Prøv en mere konkret instruktion.',
                  }
                : e,
            ),
          };
        });
      } catch (error) {
        const normalized = normalizeAiActionError(
          error instanceof AiRequestError ? error : error,
        );
        setView((prev) => {
          if (prev.kind !== 'proposal') return prev;
          return {
            ...prev,
            discussion: prev.discussion.map((e) =>
              e.id === entryId
                ? {
                    ...e,
                    pending: false,
                    errored: true,
                    answer: normalized.message || 'Kunne ikke rette forslaget.',
                  }
                : e,
            ),
          };
        });
      } finally {
        setIsAsking(false);
      }
    },
    [aiDisabled, aiDisabledReason, dispatch, isAsking, recipe, view],
  );

  const handleSendFreeText = useCallback(() => {
    const text = freeText.trim();
    if (!text) return;
    // In the proposal view, route the composer to ask-about-proposal so the
    // user can interrogate a suspicious proposal before applying it. Guard
    // against re-entry while the previous question is still in flight.
    if (view.kind === 'proposal') {
      if (isAsking) return;
      void askAboutProposal(text);
      setFreeText('');
      return;
    }
    void dispatch('adjust_all', { instruction: text });
    setFreeText('');
  }, [askAboutProposal, dispatch, freeText, isAsking, view]);

  // Alternative send from the proposal composer: interpret the text as a
  // direct correction instead of a clarifying question. Keeps the chat
  // in-flow so the user doesn't have to Fortryd + start a fresh adjust_all
  // prompt (which previously timed out on large recipes).
  const handleSendAsRefine = useCallback(() => {
    const text = freeText.trim();
    if (!text) return;
    if (isAsking) return;
    void refineProposal(text);
    setFreeText('');
  }, [freeText, isAsking, refineProposal]);

  // Per-tip delete: pushes the filtered list through the same onApply channel
  // so history/undo stays coherent with every other AI-applied change.
  const handleDeleteTip = useCallback(
    (index: number) => {
      const tips = Array.isArray(recipe.tipsAndTricks) ? recipe.tipsAndTricks : [];
      if (index < 0 || index >= tips.length) return;
      setLastApplied(recipe);
      const nextTips = tips.filter((_, i) => i !== index);
      onApply({ ...recipe, tipsAndTricks: nextTips } as Recipe);
    },
    [onApply, recipe],
  );

  if (!enabled) return null;

  const isBusy = view.kind === 'loading';
  const recipeTips = Array.isArray(recipe.tipsAndTricks) ? recipe.tipsAndTricks : [];

  return (
    <>
      {/* Floating bubble — toggles the panel open/closed (both directions). */}
      <motion.div
        ref={bubbleRef}
        drag
        dragConstraints={
          typeof window !== 'undefined'
            ? {
                left: -window.innerWidth + 64,
                right: 0,
                top: -window.innerHeight / 2 + 64,
                bottom: window.innerHeight / 2 - 64,
              }
            : undefined
        }
        dragMomentum={false}
        whileTap={{ scale: 0.94 }}
        className="fixed right-4 bottom-24 sm:bottom-28 z-40 print:hidden"
        style={{ touchAction: 'none' }}
      >
        <button
          onClick={() => setOpen((v) => !v)}
          className={[
            'relative w-12 h-12 rounded-full shadow-lg flex items-center justify-center',
            'transition-all duration-200 border',
            open
              ? 'bg-heath-mid text-white border-black/10 shadow-xl dark:bg-[#C9A14A] dark:text-[#1A221E] dark:border-[#C9A14A]/60'
              : 'bg-sand/95 text-heath-mid border-black/5 hover:bg-white hover:shadow-xl dark:bg-[#1A221E]/95 dark:text-[#D9B564] dark:border-[#C9A14A]/30 dark:hover:bg-[#1f2a24]',
          ].join(' ')}
          aria-label={open ? 'Minimer CookMoxs-assistent' : 'Åbn CookMoxs-assistent'}
          aria-expanded={open}
        >
          <BrandMark size={44} className="drop-shadow-sm" />
          {isBusy && (
            <span
              aria-hidden="true"
              className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-heath-mid dark:bg-[#C9A14A] ring-2 ring-sand dark:ring-[#1A221E] animate-pulse"
            />
          )}
        </button>
      </motion.div>

      <AnimatePresence>
        {open && (
          <motion.div
            key="assistant-panel"
            ref={panelRef}
            drag
            dragListener={false}
            dragControls={dragControls}
            dragMomentum={false}
            dragConstraints={
              typeof window !== 'undefined'
                ? {
                    left: -window.innerWidth + 80,
                    right: 40,
                    top: -window.innerHeight + 200,
                    bottom: 40,
                  }
                : undefined
            }
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="fixed right-3 sm:right-4 bottom-[6.5rem] sm:bottom-[7.5rem] z-40 w-[min(22rem,calc(100vw-1.5rem))] print:hidden flex flex-col"
            style={{
              // Shift above iOS soft-keyboard when VisualViewport reports an
              // inset. On desktop / non-soft-keyboard browsers the inset stays
              // 0 and this collapses to a no-op.
              bottom:
                keyboardInset > 0
                  ? `calc(6.5rem + ${keyboardInset}px)`
                  : undefined,
              // Cap the panel so long threads + composer can never overflow
              // the visible viewport. Falls back to CSS dvh when VV is missing
              // (old browsers) so there's still a sane ceiling.
              maxHeight:
                viewportHeight != null
                  ? `${Math.max(260, viewportHeight - 140)}px`
                  : 'min(80dvh, 640px)',
            }}
            role="dialog"
            aria-label="CookMoxs-assistent"
          >
            <div className="rounded-[1.5rem] overflow-hidden shadow-2xl border border-black/10 dark:border-[#C9A14A]/25 backdrop-blur-xl bg-sand/95 dark:bg-[#1A221E]/95 flex flex-col min-h-0 max-h-full">
              {/* Header — serves as drag handle */}
              <div
                role="toolbar"
                aria-label="Assistent-header (træk for at flytte panelet)"
                aria-grabbed="false"
                className="flex items-center gap-2.5 px-3.5 py-3 border-b border-black/5 dark:border-white/10 bg-white/40 dark:bg-white/[0.03] cursor-grab active:cursor-grabbing select-none shrink-0"
                onPointerDown={(e) => dragControls.start(e)}
                style={{ touchAction: 'none' }}
              >
                <div className="w-9 h-9 rounded-full bg-heath-mid/15 text-heath-mid dark:bg-[#C9A14A]/20 dark:text-[#E2C06E] flex items-center justify-center shadow-sm ring-1 ring-inset ring-heath-mid/10 dark:ring-[#C9A14A]/20">
                  <BrandMark size={30} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-forest-mid cm-light-surface-ink-muted dark:text-[#E2C06E] leading-none mb-0.5">
                    Assistent
                  </div>
                  <div className="text-[11px] text-forest-mid/85 dark:text-white/65 truncate italic leading-tight">
                    {recipe.title || 'Opskrift'}
                  </div>
                </div>
                <button
                  onClick={close}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-forest-dark hover:bg-black/10 transition-colors dark:text-[#E2C06E] dark:hover:bg-[#C9A14A]/15 border border-transparent dark:hover:border-[#C9A14A]/30"
                  aria-label="Minimer"
                  title="Minimer"
                >
                  <X size={16} strokeWidth={2.5} />
                </button>
              </div>

              {/* Tab strip */}
              <div
                role="tablist"
                aria-label="Assistent-faner"
                className="flex border-b border-black/5 dark:border-white/10 bg-white/20 dark:bg-black/20 shrink-0"
              >
                <TabButton
                  active={tab === 'chat'}
                  onClick={() => setTab('chat')}
                  icon={<Sparkles size={13} />}
                  label="Forslag"
                />
                <TabButton
                  active={tab === 'tips'}
                  onClick={() => setTab('tips')}
                  icon={<Lightbulb size={13} />}
                  label={`Tips${recipeTips.length ? ` (${recipeTips.length})` : ''}`}
                />
              </div>

              {/* Body */}
              {tab === 'chat' ? (
                <div
                  ref={chatScrollRef}
                  aria-live="polite"
                  aria-relevant="additions text"
                  className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-2.5"
                >
                  {aiDisabled && (
                    <div className="rounded-2xl border border-amber-200/70 bg-amber-50/90 dark:bg-amber-950/40 dark:border-amber-700/50 px-3 py-2 text-amber-900 dark:text-amber-200 text-[12px]">
                      {aiDisabledReason || 'AI er ikke tilgængelig lige nu.'}
                    </div>
                  )}

                  {/* Intro bubble */}
                  <AssistantBubble>
                    Hvad kan jeg hjælpe med på{' '}
                    <span className="italic">{recipe.title || 'denne opskrift'}</span>?
                  </AssistantBubble>

                  {/* Persistent chat-log — past Q&A, applied/discarded proposals,
                       status markers. Survives section/tab switches and apply/
                       discard so the conversation doesn't feel like a reset. */}
                  {chatLog.map((entry) => {
                    if (entry.role === 'user') {
                      return (
                        <div key={entry.id} className="flex justify-end pr-0.5">
                          <div className="max-w-[85%] rounded-2xl rounded-tr-md bg-heath-mid/70 text-white dark:bg-[#C9A14A]/70 dark:text-[#1A221E] px-3 py-1.5 text-[12px] leading-snug shadow-sm opacity-90">
                            {entry.text}
                          </div>
                        </div>
                      );
                    }
                    if (entry.role === 'status') {
                      const statusCls =
                        entry.tone === 'success'
                          ? 'border-heath-mid/40 bg-heath-mid/10 text-heath-dark dark:border-[#C9A14A]/40 dark:bg-[#C9A14A]/10 dark:text-[#E2C06E]'
                          : 'border-black/10 bg-white/50 text-forest-mid dark:border-white/10 dark:bg-white/[0.04] dark:text-white/60';
                      return (
                        <div key={entry.id} className="flex justify-center py-0.5">
                          <div
                            className={`rounded-full border px-3 py-0.5 text-[10.5px] uppercase tracking-[0.14em] font-bold ${statusCls}`}
                          >
                            {entry.text}
                          </div>
                        </div>
                      );
                    }
                    // assistant
                    return (
                      <AssistantBubble key={entry.id} tone={entry.tone === 'error' ? 'error' : 'default'}>
                        {entry.summary ? (
                          <>
                            <div className="font-bold text-[12px] mb-1 opacity-80">
                              {entry.summary}
                            </div>
                            {entry.bullets && entry.bullets.length > 0 && (
                              <ul className="text-[11.5px] leading-snug opacity-75 space-y-0.5">
                                {entry.bullets.map((b, idx) => (
                                  <li key={idx} className="flex gap-1.5">
                                    <span className="text-heath-mid dark:text-[#C9A14A] font-bold mt-0.5 shrink-0">•</span>
                                    <span>{b}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </>
                        ) : (
                          <div className="whitespace-pre-wrap text-[12px] leading-snug opacity-85">
                            {entry.text}
                          </div>
                        )}
                      </AssistantBubble>
                    );
                  })}

                  {view.kind === 'idle' && section === 'home' && (
                    <div className="pl-8 space-y-1.5">
                      {lastApplied && (
                        <button
                          onClick={handleUndoLastApply}
                          className="w-full inline-flex items-center justify-center gap-1.5 rounded-full border border-heath-mid/35 dark:border-[#C9A14A]/40 bg-white/60 dark:bg-[#223029]/60 text-forest-dark dark:text-[#F0D997] text-[11.5px] font-bold px-3 py-1.5 hover:bg-white/80 dark:hover:bg-[#223029]/90 transition-colors active:scale-[0.97]"
                          aria-label="Fortryd seneste AI-ændring"
                        >
                          <Undo2 size={12} />
                          Fortryd seneste AI-ændring
                        </button>
                      )}
                      {chatLog.length > 0 && (
                        <button
                          onClick={() => setChatLog([])}
                          className="w-full inline-flex items-center justify-center gap-1.5 rounded-full border border-black/10 dark:border-white/10 bg-transparent text-forest-mid/80 dark:text-white/50 text-[11px] font-bold px-3 py-1 hover:bg-white/60 dark:hover:bg-white/[0.04] transition-colors active:scale-[0.97]"
                          aria-label="Ryd chat-log"
                        >
                          Ryd chat-log
                        </button>
                      )}
                      <HomeCard
                        icon={<Wand2 size={16} />}
                        label="Tilpas opskriften"
                        hint="Ret ingredienser, fremgangsmåde eller beskrivelse."
                        onClick={() => setSection('adjust')}
                        disabled={aiDisabled}
                      />
                      <HomeCard
                        icon={<Sparkles size={16} />}
                        label="AI-Varianter"
                        hint="Gourmet, hurtig, børnevenlig og flere."
                        onClick={() => setSection('variants')}
                        disabled={aiDisabled}
                      />
                      <HomeCard
                        icon={<Lightbulb size={16} />}
                        label="Generer tips"
                        hint="Få nye tips og tricks til retten."
                        onClick={() => {
                          if (aiDisabled) return;
                          void dispatch('generate_tips');
                        }}
                        disabled={aiDisabled}
                      />
                    </div>
                  )}

                  {view.kind === 'idle' && section === 'adjust' && (
                    <>
                      <BackToHome onClick={() => setSection('home')} />
                      <div className="flex flex-wrap gap-1.5 pl-8">
                        <StarterChip
                          label="Tilpas ingredienser"
                          hint="Ret mængder og navne uden nye råvarer."
                          disabled={aiDisabled}
                          onClick={() => void dispatch('adjust_ingredients')}
                        />
                        <StarterChip
                          label="Tilpas fremgangsmåde"
                          hint="Gør trinnene klarere."
                          disabled={aiDisabled}
                          onClick={() => void dispatch('adjust_steps')}
                        />
                        <StarterChip
                          label="Tilpas beskrivelse"
                          hint="Kort og ærlig beskrivelse."
                          disabled={aiDisabled}
                          onClick={() => void dispatch('adjust_description')}
                        />
                        <StarterChip
                          label="Tilpas hele opskriften"
                          hint="Skriv frit hvad du vil ændre nedenfor."
                          disabled={aiDisabled}
                          onClick={() => {
                            setView({
                              kind: 'clarify',
                              question: 'Skriv kort hvad der skal rettes — jeg bruger det som instruktion.',
                            });
                          }}
                        />
                      </div>
                    </>
                  )}

                  {view.kind === 'idle' && section === 'variants' && (
                    <>
                      <BackToHome
                        onClick={() => {
                          setPendingVariant(null);
                          setSection('home');
                        }}
                      />
                      {pendingVariant ? (
                        <AssistantBubble>
                          <div className="font-bold text-[12px] mb-1.5">
                            {pendingVariant.label} — hvad det typisk ændrer
                          </div>
                          <ul className="text-[11.5px] leading-snug opacity-90 space-y-1">
                            {pendingVariant.previewBullets.map((b, idx) => (
                              <li key={idx} className="flex gap-1.5">
                                <span className="text-heath-mid dark:text-[#C9A14A] font-bold mt-0.5 shrink-0">
                                  •
                                </span>
                                <span>{b}</span>
                              </li>
                            ))}
                          </ul>
                          <div className="mt-2 text-[10.5px] italic opacity-60 leading-snug">
                            Dette er en hurtig forhåndsvisning. AI’en laver først
                            det faktiske forslag, du kan beholde eller fortryde.
                          </div>
                          <div className="mt-2 flex gap-1.5">
                            <button
                              onClick={() => setPendingVariant(null)}
                              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full border border-black/15 dark:border-white/20 px-3 py-1.5 text-[12px] font-bold text-forest-dark dark:text-white/80 hover:bg-white/70 dark:hover:bg-white/10 transition-colors active:scale-[0.97]"
                            >
                              Annuller
                            </button>
                            <button
                              onClick={() => {
                                const prefix = pendingVariant.prefix;
                                setPendingVariant(null);
                                void dispatch('apply_variant', { variantPrefix: prefix });
                              }}
                              disabled={aiDisabled}
                              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full bg-heath-mid text-white dark:bg-[#C9A14A] dark:text-[#1A221E] text-[12px] font-bold px-3 py-1.5 hover:bg-heath-dark dark:hover:bg-[#D9B564] transition-colors active:scale-[0.97] shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <ChevronRight size={12} />
                              Fortsæt
                            </button>
                          </div>
                        </AssistantBubble>
                      ) : (
                        <div className="flex flex-wrap gap-1.5 pl-8">
                          {VARIANT_PRESETS.map((v) => (
                            <StarterChip
                              key={v.prefix}
                              label={v.label}
                              hint={v.hint}
                              disabled={aiDisabled}
                              onClick={() => setPendingVariant(v)}
                            />
                          ))}
                        </div>
                      )}
                    </>
                  )}

                  {view.kind === 'loading' && <TypingIndicator label={`${view.label}…`} />}

                  {view.kind === 'no_change' && (
                    <>
                      <AssistantBubble>
                        <div className="font-bold mb-0.5 text-[12px]">
                          Ingen ændring anbefales
                        </div>
                        <div className="italic opacity-80">{view.reason}</div>
                      </AssistantBubble>
                      <div className="pl-8">
                        <GhostButton onClick={() => setView({ kind: 'idle' })}>
                          Tilbage
                        </GhostButton>
                      </div>
                    </>
                  )}

                  {view.kind === 'proposal' && (
                    <>
                      <AssistantBubble>
                        <div className="font-bold text-[12px] mb-1.5">{view.summary}</div>
                        <ul className="text-[11.5px] leading-snug opacity-90 space-y-1">
                          {view.bullets.map((b, idx) => (
                            <li key={idx} className="flex gap-1.5">
                              <span className="text-heath-mid dark:text-[#C9A14A] font-bold mt-0.5 shrink-0">
                                •
                              </span>
                              <span>{b}</span>
                            </li>
                          ))}
                        </ul>
                        <div className="mt-2 text-[10.5px] italic opacity-60 leading-snug">
                          Spørg “hvorfor 900 min?” — eller skriv en rettelse
                          (“ret timer til 60 min”) og tryk <b>Ret</b>. Forslaget
                          ændres først permanent når du trykker <b>Behold</b>.
                        </div>
                      </AssistantBubble>

                      {view.discussion.map((entry) => (
                        <div key={entry.id} className="space-y-1">
                          {/* user question bubble (right-aligned) */}
                          <div className="flex justify-end pr-0.5">
                            <div
                              className={[
                                'max-w-[85%] rounded-2xl rounded-tr-md px-3 py-1.5 text-[12px] leading-snug shadow-sm',
                                entry.isRefine
                                  ? 'bg-heath-dark text-white dark:bg-[#D9B564] dark:text-[#1A221E] ring-1 ring-inset ring-white/30 dark:ring-black/20'
                                  : 'bg-heath-mid text-white dark:bg-[#C9A14A] dark:text-[#1A221E]',
                              ].join(' ')}
                            >
                              {entry.isRefine && (
                                <span className="mr-1.5 text-[9.5px] font-bold uppercase tracking-wider opacity-85">
                                  Rettelse
                                </span>
                              )}
                              {entry.question}
                            </div>
                          </div>
                          {/* assistant answer bubble */}
                          {entry.pending ? (
                            <TypingIndicator
                              label={entry.isRefine ? 'Retter forslaget…' : 'Tænker…'}
                            />
                          ) : (
                            <>
                              <AssistantBubble tone={entry.errored ? 'error' : 'default'}>
                                <div className="whitespace-pre-wrap text-[12px] leading-snug">
                                  {entry.answer}
                                </div>
                              </AssistantBubble>
                              {/* "Brug som udkast" pre-fills the composer with
                                   the question text so the user can edit it
                                   into a real correction and confirm with the
                                   Ret-button. It does NOT fire an AI call —
                                   Q&A and refine stay cleanly separated. */}
                              {!entry.errored && !entry.isRefine && (
                                <div className="pl-8">
                                  <button
                                    onClick={() => {
                                      setFreeText(entry.question);
                                      // Focus + place caret at end so the user
                                      // can immediately rewrite the draft into
                                      // a correction.
                                      requestAnimationFrame(() => {
                                        const el = textareaRef.current;
                                        if (!el) return;
                                        el.focus();
                                        const len = el.value.length;
                                        try {
                                          el.setSelectionRange(len, len);
                                        } catch {
                                          // Some mobile browsers throw on
                                          // setSelectionRange for hidden
                                          // elements — focus alone is fine.
                                        }
                                      });
                                    }}
                                    disabled={aiDisabled || isAsking}
                                    className="inline-flex items-center gap-1 rounded-full border border-heath-mid/40 dark:border-[#C9A14A]/40 bg-white/70 dark:bg-[#223029]/70 text-forest-dark dark:text-[#F0D997] text-[11px] font-bold px-2.5 py-1 hover:bg-heath-mid hover:text-white dark:hover:bg-[#C9A14A] dark:hover:text-[#1A221E] transition-colors active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed"
                                    title="Kopiér spørgsmålet til feltet — redigér og tryk Ret for at ændre forslaget"
                                  >
                                    <Wand2 size={11} />
                                    Brug som udkast
                                  </button>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      ))}

                      <div className="pl-8 flex gap-1.5 pt-0.5">
                        <button
                          onClick={handleDiscard}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full border border-black/15 dark:border-white/20 px-3 py-1.5 text-[12px] font-bold text-forest-dark dark:text-white/80 hover:bg-white/70 dark:hover:bg-white/10 transition-colors active:scale-[0.97]"
                        >
                          <Undo2 size={12} />
                          Fortryd
                        </button>
                        <button
                          onClick={handleApply}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full bg-heath-mid text-white dark:bg-[#C9A14A] dark:text-[#1A221E] text-[12px] font-bold px-3 py-1.5 hover:bg-heath-dark dark:hover:bg-[#D9B564] transition-colors active:scale-[0.97] shadow-sm"
                        >
                          <Check size={12} />
                          Behold
                        </button>
                      </div>
                    </>
                  )}

                  {view.kind === 'clarify' && (
                    <>
                      <AssistantBubble>{view.question}</AssistantBubble>
                      <div className="pl-8">
                        <GhostButton onClick={() => setView({ kind: 'idle' })}>
                          Tilbage
                        </GhostButton>
                      </div>
                    </>
                  )}

                  {view.kind === 'answer' && (
                    <>
                      <AssistantBubble>
                        <div className="whitespace-pre-wrap">{view.text}</div>
                      </AssistantBubble>
                      <div className="pl-8">
                        <GhostButton onClick={() => setView({ kind: 'idle' })}>
                          Tilbage
                        </GhostButton>
                      </div>
                    </>
                  )}

                  {view.kind === 'error' && (
                    <>
                      <div className="flex items-start gap-1.5">
                        <div className="w-6 h-6 shrink-0 rounded-full bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 flex items-center justify-center mt-0.5">
                          <BrandMark size={22} />
                        </div>
                        <div className="max-w-[85%] rounded-2xl rounded-tl-md bg-red-50 dark:bg-red-950/30 border border-red-200/70 dark:border-red-700/40 px-3 py-2 text-[12px] text-red-900 dark:text-red-200">
                          {view.message}
                        </div>
                      </div>
                      <div className="pl-8">
                        <GhostButton onClick={() => setView({ kind: 'idle' })}>
                          Tilbage
                        </GhostButton>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                /* Tips tab */
                <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-2">
                  {recipeTips.length === 0 ? (
                    <div className="text-center py-4 text-forest-mid dark:text-white/60 italic text-[12px]">
                      <p className="mb-1">Ingen tips endnu på denne opskrift.</p>
                      <p className="opacity-70 text-[11px]">
                        Tryk “Generer tips” for at få nye tips og tricks.
                      </p>
                    </div>
                  ) : (
                    <ul className="space-y-2">
                      {recipeTips.map((tip, idx) => (
                        <li
                          key={idx}
                          className="rounded-xl bg-white/60 dark:bg-[#223029]/60 border border-black/5 dark:border-[#C9A14A]/20 px-3 py-2 text-[12px] leading-snug text-forest-dark dark:text-white/85 flex gap-2 items-start group"
                        >
                          <Lightbulb
                            size={13}
                            className="shrink-0 mt-0.5 text-heath-mid dark:text-[#C9A14A]"
                          />
                          <span className="italic flex-1">{tip}</span>
                          <button
                            onClick={() => handleDeleteTip(idx)}
                            aria-label={`Slet tip ${idx + 1}`}
                            title="Slet tip"
                            className="shrink-0 -my-1 -mr-1 p-1 rounded-full text-forest-mid/60 dark:text-white/40 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors opacity-60 group-hover:opacity-100"
                          >
                            <X size={12} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <button
                    onClick={() => {
                      if (aiDisabled || isBusy) return;
                      setTab('chat');
                      void dispatch('generate_tips');
                    }}
                    disabled={aiDisabled || isBusy}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-heath-mid text-white dark:bg-[#C9A14A] dark:text-[#1A221E] text-[12px] font-bold px-3 py-2 hover:bg-heath-dark dark:hover:bg-[#D9B564] transition-colors active:scale-[0.97] shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Wand2 size={13} />
                    {recipeTips.length > 0 ? 'Generer nye tips' : 'Generer tips'}
                  </button>
                </div>
              )}

              {/* Composer — messenger-style (only on chat tab) */}
              {tab === 'chat' && (
                <div className="px-2.5 py-2 border-t border-black/5 dark:border-white/10 bg-white/30 dark:bg-black/30 shrink-0">
                  <div className="flex items-end gap-1.5">
                    <textarea
                      ref={textareaRef}
                      value={freeText}
                      onChange={(e) => setFreeText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          // Guard re-entry: duplicate Enter during an
                          // in-flight Q&A should NOT spawn a second call.
                          if (isAsking && view.kind === 'proposal') return;
                          handleSendFreeText();
                        }
                      }}
                      placeholder={
                        view.kind === 'proposal'
                          ? isAsking
                            ? 'Venter på svar…'
                            : 'Spørg — eller tryk Ret for at ændre forslaget'
                          : 'Skriv til assistenten…'
                      }
                      rows={1}
                      disabled={
                        aiDisabled
                          || isBusy
                          || (isAsking && view.kind === 'proposal')
                      }
                      className="flex-1 resize-none rounded-2xl border border-black/10 dark:border-[#C9A14A]/25 bg-white/80 dark:bg-[#223029]/80 px-3 py-1.5 text-[12px] leading-snug text-forest-dark dark:text-white/90 placeholder-forest-mid/50 dark:placeholder-white/30 focus:outline-none focus:border-heath-mid dark:focus:border-[#C9A14A] disabled:opacity-50"
                      style={{ maxHeight: '9rem' }}
                    />
                    {/* Secondary action (proposal view only): treat the
                        textarea text as a direct correction instead of a
                        Q&A. Lets the user say "ret timer til 60 min" in the
                        chat without having to Fortryd + restart a fresh
                        adjust_all prompt. */}
                    {view.kind === 'proposal' && (
                      <button
                        onClick={handleSendAsRefine}
                        disabled={
                          !freeText.trim()
                            || aiDisabled
                            || isBusy
                            || isAsking
                        }
                        className="shrink-0 h-8 px-2.5 rounded-full border border-heath-mid/40 dark:border-[#C9A14A]/40 bg-white/70 dark:bg-[#223029]/70 text-forest-dark dark:text-[#F0D997] text-[11px] font-bold flex items-center gap-1 disabled:opacity-35 disabled:cursor-not-allowed hover:bg-heath-dark hover:text-white hover:border-heath-dark dark:hover:bg-[#D9B564] dark:hover:text-[#1A221E] dark:hover:border-[#D9B564] transition-colors active:scale-[0.94]"
                        aria-label="Ret forslaget ud fra teksten"
                        title="Brug teksten som rettelse til forslaget"
                      >
                        <Wand2 size={12} />
                        Ret
                      </button>
                    )}
                    <button
                      onClick={handleSendFreeText}
                      disabled={
                        !freeText.trim()
                          || aiDisabled
                          || isBusy
                          || (isAsking && view.kind === 'proposal')
                      }
                      className="shrink-0 w-8 h-8 rounded-full bg-heath-mid text-white dark:bg-[#C9A14A] dark:text-[#1A221E] flex items-center justify-center disabled:opacity-35 disabled:cursor-not-allowed hover:bg-heath-dark dark:hover:bg-[#D9B564] transition-colors active:scale-[0.94] shadow-sm"
                      aria-label={
                        view.kind === 'proposal'
                          ? (isAsking ? 'Sender spørgsmål…' : 'Send som spørgsmål')
                          : (isAsking ? 'Sender…' : 'Send')
                      }
                      title={view.kind === 'proposal' ? 'Send som spørgsmål' : 'Send'}
                    >
                      <Send size={13} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ---------- small presentational pieces ----------

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
}) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={[
        'flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.14em] transition-colors',
        active
          ? 'text-heath-mid dark:text-[#E2C06E] border-b-2 border-heath-mid dark:border-[#C9A14A] bg-white/40 dark:bg-white/[0.04]'
          : 'text-forest-mid/70 dark:text-white/45 border-b-2 border-transparent hover:text-forest-dark dark:hover:text-[#E2C06E] hover:bg-white/30 dark:hover:bg-white/[0.02]',
      ].join(' ')}
    >
      {icon}
      {label}
    </button>
  );
}

function HomeCard({
  icon,
  label,
  hint,
  onClick,
  disabled,
}: {
  icon: ReactNode;
  label: string;
  hint: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={[
        'w-full flex items-center gap-3 rounded-2xl px-3 py-2.5 border text-left transition-all duration-150',
        disabled
          ? 'opacity-45 cursor-not-allowed border-black/5 dark:border-white/10 bg-white/40 dark:bg-[#223029]/40'
          : 'border-heath-mid/25 dark:border-[#C9A14A]/25 bg-white/85 dark:bg-[#223029]/80 hover:bg-heath-mid hover:text-white hover:border-heath-mid dark:hover:bg-[#C9A14A] dark:hover:text-[#1A221E] dark:hover:border-[#C9A14A] hover:shadow-md active:scale-[0.98]',
      ].join(' ')}
    >
      <span className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center bg-heath-mid/15 text-heath-mid dark:bg-[#C9A14A]/20 dark:text-[#E2C06E]">
        {icon}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-[12px] font-bold leading-tight">{label}</span>
        <span className="block text-[11px] italic opacity-75 leading-tight mt-0.5">{hint}</span>
      </span>
      <ChevronRight size={14} className="shrink-0 opacity-60" />
    </button>
  );
}

function BackToHome({ onClick }: { onClick: () => void }) {
  return (
    <div className="pl-8">
      <button
        onClick={onClick}
        className="inline-flex items-center gap-1 text-[11px] text-forest-mid dark:text-[#E2C06E] hover:text-forest-dark dark:hover:text-[#F0D997] transition-colors"
      >
        <ArrowLeft size={12} /> Tilbage til start
      </button>
    </div>
  );
}

function StarterChip({
  label,
  hint,
  disabled,
  onClick,
}: {
  // `key` is intentionally declared optional so map() call-sites can pass it.
  // The project runs without `@types/react`, so TS's built-in JSX fallback
  // treats `key` as a regular prop rather than a React-special attribute.
  key?: string | number;
  label: string;
  hint: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={() => {
        if (disabled) return;
        onClick();
      }}
      disabled={disabled}
      title={hint}
      className={[
        'text-[12px] font-medium rounded-full px-3 py-1.5 border transition-all duration-150',
        disabled
          ? 'bg-transparent border-black/5 dark:border-white/10 opacity-45 cursor-not-allowed text-forest-mid dark:text-white/40'
          : 'bg-white/80 dark:bg-[#223029]/80 border-heath-mid/30 dark:border-[#C9A14A]/30 text-forest-dark dark:text-[#F0D997] hover:bg-heath-mid hover:text-white hover:border-heath-mid dark:hover:bg-[#C9A14A] dark:hover:text-[#1A221E] dark:hover:border-[#C9A14A] hover:shadow-md active:scale-[0.97]',
      ].join(' ')}
    >
      {label}
    </button>
  );
}

function AssistantBubble({
  children,
  tone = 'default',
}: {
  // `key` is intentionally declared optional so map() call-sites can pass it.
  // The project runs without `@types/react`, so TS's built-in JSX fallback
  // treats `key` as a regular prop rather than a React-special attribute.
  key?: string | number;
  children: ReactNode;
  tone?: 'default' | 'error';
}) {
  const avatarCls =
    tone === 'error'
      ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
      : 'bg-heath-mid/15 text-heath-mid dark:bg-[#C9A14A]/20 dark:text-[#E2C06E]';
  const bubbleCls =
    tone === 'error'
      ? 'bg-red-50 dark:bg-red-950/30 border-red-200/70 dark:border-red-700/40 text-red-900 dark:text-red-200'
      : 'bg-white/85 dark:bg-[#223029]/85 border-black/5 dark:border-[#C9A14A]/15 text-forest-dark dark:text-white/90';
  return (
    <div className="flex items-start gap-1.5">
      <div className={`w-6 h-6 shrink-0 rounded-full flex items-center justify-center mt-0.5 ${avatarCls}`}>
        <BrandMark size={22} />
      </div>
      <div className={`max-w-[85%] rounded-2xl rounded-tl-md border px-3 py-2 text-[12px] leading-snug shadow-sm ${bubbleCls}`}>
        {children}
      </div>
    </div>
  );
}

function TypingIndicator({ label }: { label: string }) {
  return (
    <div className="flex items-start gap-1.5" role="status" aria-live="polite">
      <div className="w-6 h-6 shrink-0 rounded-full bg-heath-mid/15 text-heath-mid dark:bg-[#C9A14A]/20 dark:text-[#E2C06E] flex items-center justify-center mt-0.5">
        <BrandMark size={22} />
      </div>
      <div className="rounded-2xl rounded-tl-md bg-white/85 dark:bg-[#223029]/85 border border-black/5 dark:border-[#C9A14A]/15 px-3 py-2 flex items-center gap-2 shadow-sm">
        <span className="flex items-end gap-[3px] h-3">
          <TypingDot delay={0} />
          <TypingDot delay={0.15} />
          <TypingDot delay={0.3} />
        </span>
        <span className="text-[11px] italic text-forest-mid dark:text-white/70">
          {label}
        </span>
      </div>
    </div>
  );
}

function TypingDot({ delay }: { delay: number }) {
  return (
    <motion.span
      className="w-1.5 h-1.5 rounded-full bg-heath-mid dark:bg-[#C9A14A]"
      animate={{ y: [0, -3, 0], opacity: [0.4, 1, 0.4] }}
      transition={{ duration: 0.9, repeat: Infinity, delay, ease: 'easeInOut' }}
    />
  );
}

function GhostButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-[12px] rounded-full border border-black/15 dark:border-white/20 px-3 py-1 text-forest-dark dark:text-white/80 hover:bg-white/70 dark:hover:bg-white/10 transition-colors active:scale-[0.97]"
    >
      {children}
    </button>
  );
}
