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

const VARIANT_PRESETS: { prefix: string; label: string; hint: string }[] = [
  { prefix: 'Gourmet', label: 'Gourmet', hint: 'Mere forfinet version.' },
  { prefix: 'Autentisk', label: 'Autentisk', hint: 'Tættere på oprindelsen.' },
  { prefix: 'Den hurtige', label: 'Den hurtige', hint: 'Færre trin, kortere tid.' },
  { prefix: 'Begynderen', label: 'Begynderen', hint: 'Enklere teknikker.' },
  { prefix: 'Babyvenlig 0/1 år', label: 'Babyvenlig', hint: 'Tilpasset 0/1 år.' },
  { prefix: 'Børnevenlig 1/3 år', label: 'Børnevenlig', hint: 'Tilpasset 1/3 år.' },
  { prefix: 'Spice it up', label: 'Spice it up', hint: 'Mere krydret.' },
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

  const panelRef = useRef<HTMLDivElement | null>(null);
  const bubbleRef = useRef<HTMLDivElement | null>(null);
  const dragControls = useDragControls();

  const close = useCallback(() => setOpen(false), []);

  // Reset when closing OR when recipe changes so we never render a proposal
  // against a different recipe.
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
  }, [recipe.id]);

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
    onApply(view.proposed);
    // After applying a tips-generate, stay on the tips tab so user sees the
    // new tips. Other actions close the panel as a natural "confirm" beat.
    if (view.action === 'generate_tips') {
      setView({ kind: 'idle' });
      setTab('tips');
    } else {
      setView({ kind: 'idle' });
      close();
    }
  }, [onApply, close, view]);

  const handleDiscard = useCallback(() => {
    setView({ kind: 'idle' });
  }, []);

  const handleSendFreeText = useCallback(() => {
    const text = freeText.trim();
    if (!text) return;
    void dispatch('adjust_all', { instruction: text });
    setFreeText('');
  }, [dispatch, freeText]);

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
          <BrandMark size={40} className="drop-shadow-sm" />
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
            className="fixed right-3 sm:right-4 bottom-[6.5rem] sm:bottom-[7.5rem] z-40 w-[min(22rem,calc(100vw-1.5rem))] print:hidden"
            role="dialog"
            aria-label="CookMoxs-assistent"
          >
            <div className="rounded-[1.5rem] overflow-hidden shadow-2xl border border-black/10 dark:border-[#C9A14A]/25 backdrop-blur-xl bg-sand/95 dark:bg-[#1A221E]/95">
              {/* Header — serves as drag handle */}
              <div
                className="flex items-center gap-2.5 px-3.5 py-3 border-b border-black/5 dark:border-white/10 bg-white/40 dark:bg-white/[0.03] cursor-grab active:cursor-grabbing select-none"
                onPointerDown={(e) => dragControls.start(e)}
                style={{ touchAction: 'none' }}
              >
                <div className="w-8 h-8 rounded-full bg-heath-mid/15 text-heath-mid dark:bg-[#C9A14A]/20 dark:text-[#E2C06E] flex items-center justify-center shadow-sm">
                  <BrandMark size={28} />
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
                className="flex border-b border-black/5 dark:border-white/10 bg-white/20 dark:bg-black/20"
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
                <div className="max-h-[52vh] overflow-y-auto px-3 py-3 space-y-2.5">
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

                  {view.kind === 'idle' && section === 'home' && (
                    <div className="pl-8 space-y-1.5">
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
                      <BackToHome onClick={() => setSection('home')} />
                      <div className="flex flex-wrap gap-1.5 pl-8">
                        {VARIANT_PRESETS.map((v) => (
                          <StarterChip
                            key={v.prefix}
                            label={v.label}
                            hint={v.hint}
                            disabled={aiDisabled}
                            onClick={() => void dispatch('apply_variant', { variantPrefix: v.prefix })}
                          />
                        ))}
                      </div>
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
                      </AssistantBubble>

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
                          <BrandMark size={20} />
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
                <div className="max-h-[52vh] overflow-y-auto px-3 py-3 space-y-2">
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
                          className="rounded-xl bg-white/60 dark:bg-[#223029]/60 border border-black/5 dark:border-[#C9A14A]/20 px-3 py-2 text-[12px] leading-snug text-forest-dark dark:text-white/85 flex gap-2"
                        >
                          <Lightbulb
                            size={13}
                            className="shrink-0 mt-0.5 text-heath-mid dark:text-[#C9A14A]"
                          />
                          <span className="italic">{tip}</span>
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
                <div className="px-2.5 py-2 border-t border-black/5 dark:border-white/10 bg-white/30 dark:bg-black/30">
                  <div className="flex items-end gap-1.5">
                    <textarea
                      value={freeText}
                      onChange={(e) => setFreeText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendFreeText();
                        }
                      }}
                      placeholder="Skriv til assistenten…"
                      rows={1}
                      disabled={aiDisabled || isBusy}
                      className="flex-1 resize-none rounded-2xl border border-black/10 dark:border-[#C9A14A]/25 bg-white/80 dark:bg-[#223029]/80 px-3 py-1.5 text-[12px] leading-snug text-forest-dark dark:text-white/90 placeholder-forest-mid/50 dark:placeholder-white/30 focus:outline-none focus:border-heath-mid dark:focus:border-[#C9A14A] disabled:opacity-50"
                      style={{ maxHeight: '5.5rem' }}
                    />
                    <button
                      onClick={handleSendFreeText}
                      disabled={!freeText.trim() || aiDisabled || isBusy}
                      className="shrink-0 w-8 h-8 rounded-full bg-heath-mid text-white dark:bg-[#C9A14A] dark:text-[#1A221E] flex items-center justify-center disabled:opacity-35 disabled:cursor-not-allowed hover:bg-heath-dark dark:hover:bg-[#D9B564] transition-colors active:scale-[0.94] shadow-sm"
                      aria-label="Send"
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

function AssistantBubble({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-1.5">
      <div className="w-6 h-6 shrink-0 rounded-full bg-heath-mid/15 text-heath-mid dark:bg-[#C9A14A]/20 dark:text-[#E2C06E] flex items-center justify-center mt-0.5">
        <BrandMark size={20} />
      </div>
      <div className="max-w-[85%] rounded-2xl rounded-tl-md bg-white/85 dark:bg-[#223029]/85 border border-black/5 dark:border-[#C9A14A]/15 px-3 py-2 text-[12px] leading-snug text-forest-dark dark:text-white/90 shadow-sm">
        {children}
      </div>
    </div>
  );
}

function TypingIndicator({ label }: { label: string }) {
  return (
    <div className="flex items-start gap-1.5" role="status" aria-live="polite">
      <div className="w-6 h-6 shrink-0 rounded-full bg-heath-mid/15 text-heath-mid dark:bg-[#C9A14A]/20 dark:text-[#E2C06E] flex items-center justify-center mt-0.5">
        <BrandMark size={20} />
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
