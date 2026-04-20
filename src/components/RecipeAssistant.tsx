import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Check, Undo2 } from 'lucide-react';
import type { Recipe } from '../types';
import { BrandMark } from './BrandMark';
import {
  adjustRecipe as aiAdjustRecipe,
  polishIngredients as aiPolishIngredients,
  polishSteps as aiPolishSteps,
  AiRequestError,
} from '../services/aiService';
import { normalizeAiActionError } from '../services/errorMessageService';

// Phase C C0: Recipe-scoped assistant-surface.
// Messenger-style floating toast. Reuses existing AI endpoints via aiService.
// Output contract: no_change | proposal | answer | clarify | error.

type ActionId =
  | 'adjust_ingredients'
  | 'adjust_steps'
  | 'adjust_description'
  | 'adjust_all'
  | 'ask';

interface ActionStarter {
  id: ActionId;
  label: string;
  hint: string;
  needsInput: boolean;
  available: boolean;
  disabledReason?: string;
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
      delta: string[];
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

function computeDelta(prev: Recipe, next: Recipe): string[] {
  const delta: string[] = [];

  if (normalizeString(prev.title) !== normalizeString(next.title)) {
    delta.push('titel');
  }
  if (normalizeString(prev.summary) !== normalizeString(next.summary)) {
    delta.push('beskrivelse');
  }

  const prevIng = Array.isArray(prev.ingredients) ? prev.ingredients : [];
  const nextIng = Array.isArray(next.ingredients) ? next.ingredients : [];
  if (ingredientSignature(prevIng) !== ingredientSignature(nextIng)) {
    const added = nextIng.length - prevIng.length;
    delta.push(
      added === 0
        ? `ingredienser (${nextIng.length} uændret antal, tekst justeret)`
        : `ingredienser (${prevIng.length} → ${nextIng.length})`,
    );
  }

  const prevSteps = Array.isArray(prev.steps) ? prev.steps : [];
  const nextSteps = Array.isArray(next.steps) ? next.steps : [];
  if (stepSignature(prevSteps) !== stepSignature(nextSteps)) {
    const added = nextSteps.length - prevSteps.length;
    delta.push(
      added === 0
        ? `fremgangsmåde (${nextSteps.length} trin, tekst justeret)`
        : `fremgangsmåde (${prevSteps.length} → ${nextSteps.length} trin)`,
    );
  }

  const prevCats = Array.isArray(prev.categories) ? prev.categories : [];
  const nextCats = Array.isArray(next.categories) ? next.categories : [];
  if (prevCats.slice().sort().join('|') !== nextCats.slice().sort().join('|')) {
    delta.push('kategorier');
  }

  return delta;
}

function buildProposalSummary(action: ActionId, delta: string[]): string {
  if (delta.length === 0) return 'Ingen synlige ændringer';
  const head = delta.slice(0, 3).join(', ');
  const rest = delta.length > 3 ? ` +${delta.length - 3}` : '';
  const prefix =
    action === 'adjust_ingredients'
      ? 'Forslag til ingredienser'
      : action === 'adjust_steps'
        ? 'Forslag til fremgangsmåde'
        : action === 'adjust_description'
          ? 'Forslag til beskrivelse'
          : 'Forslag';
  return `${prefix}: ${head}${rest}`;
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
    default:
      return 'Arbejder';
  }
}

export function RecipeAssistant({
  recipe,
  onApply,
  aiDisabledReason,
  userLevel,
  enabled = true,
}: RecipeAssistantProps) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<ViewState>({ kind: 'idle' });
  const [freeText, setFreeText] = useState('');

  const close = useCallback(() => setOpen(false), []);

  // Reset when the panel closes or the active recipe changes so we never
  // render a proposal against a different recipe.
  useEffect(() => {
    if (!open) {
      setView({ kind: 'idle' });
      setFreeText('');
    }
  }, [open]);
  useEffect(() => {
    setView({ kind: 'idle' });
    setOpen(false);
  }, [recipe.id]);

  const aiDisabled = Boolean(aiDisabledReason);

  const starters = useMemo<ActionStarter[]>(
    () => [
      {
        id: 'adjust_ingredients',
        label: 'Tilpas ingredienser',
        hint: 'Ret mængder og navne uden nye råvarer.',
        needsInput: false,
        available: !aiDisabled,
        disabledReason: aiDisabledReason ?? undefined,
      },
      {
        id: 'adjust_steps',
        label: 'Tilpas fremgangsmåde',
        hint: 'Gør trinnene klarere.',
        needsInput: false,
        available: !aiDisabled,
        disabledReason: aiDisabledReason ?? undefined,
      },
      {
        id: 'adjust_description',
        label: 'Tilpas beskrivelse',
        hint: 'Kort og ærlig beskrivelse.',
        needsInput: false,
        available: !aiDisabled,
        disabledReason: aiDisabledReason ?? undefined,
      },
      {
        id: 'ask',
        label: 'Stil et spørgsmål',
        hint: 'Kommer snart.',
        needsInput: false,
        available: false,
        disabledReason: 'Q&A er ikke i denne version.',
      },
    ],
    [aiDisabled, aiDisabledReason],
  );

  const dispatch = useCallback(
    async (action: ActionId, instruction?: string) => {
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
          const text = (instruction || '').trim();
          if (!text) {
            setView({
              kind: 'clarify',
              question: 'Skriv kort hvad der skal rettes, så jeg ved hvor jeg skal kigge.',
            });
            return;
          }
          proposed = (await aiAdjustRecipe(recipe, text)) as Recipe;
        } else {
          setView({
            kind: 'clarify',
            question: 'Denne handling er ikke aktiv endnu.',
          });
          return;
        }

        const delta = computeDelta(recipe, proposed);
        if (delta.length === 0) {
          setView({ kind: 'no_change', action, reason: reasonForNoChange(action) });
          return;
        }
        setView({
          kind: 'proposal',
          action,
          proposed,
          summary: buildProposalSummary(action, delta),
          delta,
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
    setView({ kind: 'idle' });
    close();
  }, [onApply, close, view]);

  const handleDiscard = useCallback(() => {
    setView({ kind: 'idle' });
  }, []);

  const handleSendFreeText = useCallback(() => {
    const text = freeText.trim();
    if (!text) return;
    void dispatch('adjust_all', text);
    setFreeText('');
  }, [dispatch, freeText]);

  if (!enabled) return null;

  const isBusy = view.kind === 'loading';

  return (
    <>
      {/* Floating bubble — messenger FAB pattern, draggable so it can be
          moved out of the way. Uses the CookMoxs BrandMark as identity. */}
      <motion.div
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
              ? 'bg-[color:var(--theme-accent-mid)] text-white border-black/10 shadow-xl'
              : 'bg-[color:var(--theme-light)]/95 dark:bg-[color:var(--theme-dark)]/90 text-[color:var(--theme-accent-dark)] dark:text-[color:var(--theme-accent-mid)] border-black/5 dark:border-white/10 hover:shadow-xl',
          ].join(' ')}
          aria-label={open ? 'Luk CookMoxs-assistent' : 'Åbn CookMoxs-assistent'}
          aria-expanded={open}
        >
          <BrandMark size={24} className="drop-shadow-sm" />
          {isBusy && (
            <span
              aria-hidden="true"
              className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[color:var(--theme-accent-mid)] ring-2 ring-[color:var(--theme-light)] animate-pulse"
            />
          )}
        </button>
      </motion.div>

      <AnimatePresence>
        {open && (
          <motion.div
            key="assistant-panel"
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="fixed right-3 sm:right-4 bottom-[6.5rem] sm:bottom-[7.5rem] z-40 w-[min(20rem,calc(100vw-1.5rem))] print:hidden"
            role="dialog"
            aria-label="CookMoxs-assistent"
          >
            <div className="rounded-[1.25rem] overflow-hidden shadow-2xl border border-black/10 dark:border-white/10 backdrop-blur-xl bg-[color:var(--theme-light)]/92 dark:bg-[color:var(--theme-dark)]/92">
              {/* Header — messenger-style compact */}
              <div className="flex items-center gap-2.5 px-3.5 py-2.5 border-b border-black/5 dark:border-white/10 bg-[color:var(--theme-accent-mid)]/8 dark:bg-[color:var(--theme-accent-mid)]/14">
                <div className="w-7 h-7 rounded-full bg-[color:var(--theme-accent-mid)]/15 text-[color:var(--theme-accent-dark)] dark:text-[color:var(--theme-accent-mid)] flex items-center justify-center">
                  <BrandMark size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[color:var(--theme-mid)] cm-light-surface-ink-muted leading-none mb-0.5">
                    Assistent
                  </div>
                  <div className="text-[11px] text-[color:var(--theme-mid)]/80 cm-light-surface-ink-muted truncate italic leading-tight">
                    {recipe.title || 'Opskrift'}
                  </div>
                </div>
                <button
                  onClick={close}
                  className="p-1.5 rounded-full text-[color:var(--theme-mid)] cm-light-surface-icon hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                  aria-label="Luk"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Chat transcript */}
              <div className="max-h-[52vh] overflow-y-auto px-3 py-3 space-y-2.5">
                {aiDisabled && (
                  <div className="rounded-2xl border border-amber-200/70 bg-amber-50/80 px-3 py-2 text-amber-900 text-[12px]">
                    {aiDisabledReason || 'AI er ikke tilgængelig lige nu.'}
                  </div>
                )}

                {/* Intro bubble — always shown so the panel feels like a chat */}
                <AssistantBubble>
                  Hvad kan jeg hjælpe med på <span className="italic">{recipe.title || 'denne opskrift'}</span>?
                </AssistantBubble>

                {view.kind === 'idle' && (
                  <div className="flex flex-wrap gap-1.5 pl-8">
                    {starters.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => {
                          if (!s.available) return;
                          void dispatch(s.id);
                        }}
                        disabled={!s.available}
                        title={!s.available ? s.disabledReason : s.hint}
                        className={[
                          'text-[12px] rounded-full px-3 py-1.5 border transition-colors',
                          s.available
                            ? 'border-[color:var(--theme-accent-mid)]/30 bg-white/60 dark:bg-white/5 text-[color:var(--theme-dark)] cm-light-surface-ink hover:bg-[color:var(--theme-accent-mid)]/12 hover:border-[color:var(--theme-accent-mid)]/50'
                            : 'border-black/5 dark:border-white/10 bg-transparent opacity-45 cursor-not-allowed',
                        ].join(' ')}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                )}

                {view.kind === 'loading' && <TypingIndicator label={`${view.label}…`} />}

                {view.kind === 'no_change' && (
                  <>
                    <AssistantBubble>
                      <div className="font-bold mb-0.5 text-[12px]">Ingen ændring anbefales</div>
                      <div className="italic opacity-80">{view.reason}</div>
                    </AssistantBubble>
                    <div className="pl-8">
                      <button
                        onClick={() => setView({ kind: 'idle' })}
                        className="text-[12px] rounded-full border border-black/10 dark:border-white/15 px-3 py-1 text-[color:var(--theme-dark)] cm-light-surface-ink hover:bg-white/50 dark:hover:bg-white/5"
                      >
                        Tilbage
                      </button>
                    </div>
                  </>
                )}

                {view.kind === 'proposal' && (
                  <>
                    <AssistantBubble>
                      <div className="font-bold text-[12px] mb-1">{view.summary}</div>
                      <ul className="text-[11px] opacity-80 list-disc pl-4 space-y-0.5">
                        {view.delta.map((d, idx) => (
                          <li key={idx}>{d}</li>
                        ))}
                      </ul>
                    </AssistantBubble>

                    <div className="pl-8">
                      <ProposalDiff prev={recipe} next={view.proposed} />
                    </div>

                    <div className="flex gap-1.5 pl-8 pt-0.5">
                      <button
                        onClick={handleDiscard}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full border border-black/10 dark:border-white/15 px-3 py-1.5 text-[12px] font-bold text-[color:var(--theme-dark)] cm-light-surface-ink hover:bg-white/50 dark:hover:bg-white/5"
                      >
                        <Undo2 size={12} />
                        Fortryd
                      </button>
                      <button
                        onClick={handleApply}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full bg-[color:var(--theme-accent-mid)] text-white text-[12px] font-bold px-3 py-1.5 hover:bg-[color:var(--theme-accent-dark)] transition-colors"
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
                      <button
                        onClick={() => setView({ kind: 'idle' })}
                        className="text-[12px] rounded-full border border-black/10 dark:border-white/15 px-3 py-1 text-[color:var(--theme-dark)] cm-light-surface-ink hover:bg-white/50 dark:hover:bg-white/5"
                      >
                        Tilbage
                      </button>
                    </div>
                  </>
                )}

                {view.kind === 'answer' && (
                  <>
                    <AssistantBubble>
                      <div className="whitespace-pre-wrap">{view.text}</div>
                    </AssistantBubble>
                    <div className="pl-8">
                      <button
                        onClick={() => setView({ kind: 'idle' })}
                        className="text-[12px] rounded-full border border-black/10 dark:border-white/15 px-3 py-1 text-[color:var(--theme-dark)] cm-light-surface-ink hover:bg-white/50 dark:hover:bg-white/5"
                      >
                        Tilbage
                      </button>
                    </div>
                  </>
                )}

                {view.kind === 'error' && (
                  <>
                    <div className="flex items-start gap-1.5">
                      <div className="w-6 h-6 shrink-0 rounded-full bg-red-100 text-red-700 flex items-center justify-center mt-0.5">
                        <BrandMark size={12} />
                      </div>
                      <div className="max-w-[85%] rounded-2xl rounded-tl-md bg-red-50 border border-red-200/70 px-3 py-2 text-[12px] text-red-900">
                        {view.message}
                      </div>
                    </div>
                    <div className="pl-8">
                      <button
                        onClick={() => setView({ kind: 'idle' })}
                        className="text-[12px] rounded-full border border-black/10 dark:border-white/15 px-3 py-1 text-[color:var(--theme-dark)] cm-light-surface-ink hover:bg-white/50 dark:hover:bg-white/5"
                      >
                        Tilbage
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Composer — messenger-style */}
              <div className="px-2.5 py-2 border-t border-black/5 dark:border-white/10 bg-white/30 dark:bg-white/[0.03]">
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
                    className="flex-1 resize-none rounded-2xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-black/20 px-3 py-1.5 text-[12px] leading-snug text-[color:var(--theme-dark)] cm-light-surface-ink placeholder-[color:var(--theme-mid)]/50 focus:outline-none focus:border-[color:var(--theme-accent-mid)]/60 disabled:opacity-50"
                    style={{ maxHeight: '5.5rem' }}
                  />
                  <button
                    onClick={handleSendFreeText}
                    disabled={!freeText.trim() || aiDisabled || isBusy}
                    className="shrink-0 w-8 h-8 rounded-full bg-[color:var(--theme-accent-mid)] text-white flex items-center justify-center disabled:opacity-35 disabled:cursor-not-allowed hover:bg-[color:var(--theme-accent-dark)] transition-colors"
                    aria-label="Send"
                  >
                    <Send size={13} />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function AssistantBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-1.5">
      <div className="w-6 h-6 shrink-0 rounded-full bg-[color:var(--theme-accent-mid)]/15 text-[color:var(--theme-accent-dark)] dark:text-[color:var(--theme-accent-mid)] flex items-center justify-center mt-0.5">
        <BrandMark size={12} />
      </div>
      <div className="max-w-[85%] rounded-2xl rounded-tl-md bg-white/75 dark:bg-white/[0.06] border border-black/5 dark:border-white/10 px-3 py-2 text-[12px] leading-snug text-[color:var(--theme-dark)] cm-light-surface-ink">
        {children}
      </div>
    </div>
  );
}

function TypingIndicator({ label }: { label: string }) {
  return (
    <div className="flex items-start gap-1.5" role="status" aria-live="polite">
      <div className="w-6 h-6 shrink-0 rounded-full bg-[color:var(--theme-accent-mid)]/15 text-[color:var(--theme-accent-dark)] dark:text-[color:var(--theme-accent-mid)] flex items-center justify-center mt-0.5">
        <BrandMark size={12} />
      </div>
      <div className="rounded-2xl rounded-tl-md bg-white/75 dark:bg-white/[0.06] border border-black/5 dark:border-white/10 px-3 py-2 flex items-center gap-2">
        <span className="flex items-end gap-[3px] h-3">
          <TypingDot delay={0} />
          <TypingDot delay={0.15} />
          <TypingDot delay={0.3} />
        </span>
        <span className="text-[11px] italic text-[color:var(--theme-mid)] cm-light-surface-ink-muted">
          {label}
        </span>
      </div>
    </div>
  );
}

function TypingDot({ delay }: { delay: number }) {
  return (
    <motion.span
      className="w-1.5 h-1.5 rounded-full bg-[color:var(--theme-accent-mid)]"
      animate={{ y: [0, -3, 0], opacity: [0.4, 1, 0.4] }}
      transition={{ duration: 0.9, repeat: Infinity, delay, ease: 'easeInOut' }}
    />
  );
}

function truncate(text: string | undefined | null, max = 120): string {
  if (!text) return '';
  const str = text.trim();
  if (str.length <= max) return str;
  return str.slice(0, max - 1).trimEnd() + '…';
}

function ProposalDiff({ prev, next }: { prev: Recipe; next: Recipe }) {
  const showTitle = normalizeString(prev.title) !== normalizeString(next.title);
  const showSummary = normalizeString(prev.summary) !== normalizeString(next.summary);
  const prevIngCount = Array.isArray(prev.ingredients) ? prev.ingredients.length : 0;
  const nextIngCount = Array.isArray(next.ingredients) ? next.ingredients.length : 0;
  const showIng = ingredientSignature(prev.ingredients) !== ingredientSignature(next.ingredients);
  const prevStepCount = Array.isArray(prev.steps) ? prev.steps.length : 0;
  const nextStepCount = Array.isArray(next.steps) ? next.steps.length : 0;
  const showSteps = stepSignature(prev.steps) !== stepSignature(next.steps);

  if (!showTitle && !showSummary && !showIng && !showSteps) return null;

  return (
    <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white/40 dark:bg-white/[0.03] px-2.5 py-2 space-y-2 text-[11px]">
      {showTitle && <DiffRow label="Titel" before={prev.title} after={next.title} />}
      {showSummary && (
        <DiffRow label="Beskrivelse" before={truncate(prev.summary)} after={truncate(next.summary)} />
      )}
      {showIng && (
        <DiffRow
          label="Ingredienser"
          before={`${prevIngCount} linjer`}
          after={`${nextIngCount} linjer`}
        />
      )}
      {showSteps && (
        <DiffRow
          label="Fremgangsmåde"
          before={`${prevStepCount} trin`}
          after={`${nextStepCount} trin`}
        />
      )}
    </div>
  );
}

function DiffRow({ label, before, after }: { label: string; before: string; after: string }) {
  return (
    <div>
      <div className="font-bold uppercase tracking-[0.14em] text-[color:var(--theme-mid)] cm-light-surface-ink-muted text-[10px] mb-1">
        {label}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        <div className="rounded-lg bg-black/5 dark:bg-white/5 px-2 py-1.5 text-[color:var(--theme-dark)] cm-light-surface-ink">
          <div className="text-[9px] uppercase tracking-wider text-[color:var(--theme-mid)]/70 mb-0.5">Før</div>
          {before || <span className="italic opacity-60">(tom)</span>}
        </div>
        <div className="rounded-lg bg-[color:var(--theme-accent-mid)]/10 px-2 py-1.5 text-[color:var(--theme-dark)] cm-light-surface-ink">
          <div className="text-[9px] uppercase tracking-wider text-[color:var(--theme-accent-dark)] mb-0.5">Efter</div>
          {after || <span className="italic opacity-60">(tom)</span>}
        </div>
      </div>
    </div>
  );
}
