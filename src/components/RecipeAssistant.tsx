import { useCallback, useEffect, useMemo, useState } from 'react';
import { MessageSquare, Sparkles, X, Loader2, Check, Undo2 } from 'lucide-react';
import type { Recipe } from '../types';
import {
  adjustRecipe as aiAdjustRecipe,
  polishIngredients as aiPolishIngredients,
  polishSteps as aiPolishSteps,
  AiRequestError,
} from '../services/aiService';
import { normalizeAiActionError } from '../services/errorMessageService';

// Phase C C0: Recipe-scoped assistant-surface.
// Minimum viable panel for RecipeView / recipe-edit flow. Reuses existing AI
// endpoints via aiService. Not a chat platform, not a global assistant.
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
  | { kind: 'loading'; action: ActionId }
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
  open: boolean;
  onClose: () => void;
  recipe: Recipe;
  onApply: (proposed: Recipe) => void;
  aiDisabledReason?: string | null;
  userLevel?: string;
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
      ? 'Ingrediensforslag'
      : action === 'adjust_steps'
        ? 'Trin-forslag'
        : action === 'adjust_description'
          ? 'Beskrivelses-forslag'
          : 'Forslag';
  return `${prefix}: ${head}${rest}`;
}

function reasonForNoChange(action: ActionId): string {
  switch (action) {
    case 'adjust_ingredients':
      return 'Ingredienslisten ser allerede konsistent ud. AI foreslår ingen ændring.';
    case 'adjust_steps':
      return 'Fremgangsmåden ser allerede klar ud. AI foreslår ingen ændring.';
    case 'adjust_description':
      return 'Beskrivelsen rammer allerede opskriften. AI foreslår ingen ændring.';
    case 'adjust_all':
      return 'Opskriften ser allerede rimeligt ud. AI foreslår ingen ændring.';
    default:
      return 'AI foreslår ingen ændring.';
  }
}

export function RecipeAssistant({
  open,
  onClose,
  recipe,
  onApply,
  aiDisabledReason,
  userLevel,
}: RecipeAssistantProps) {
  const [view, setView] = useState<ViewState>({ kind: 'idle' });
  const [freeText, setFreeText] = useState('');

  // Reset when the sheet closes or the active recipe changes so we never
  // render a proposal against a different recipe.
  useEffect(() => {
    if (!open) {
      setView({ kind: 'idle' });
      setFreeText('');
    }
  }, [open]);
  useEffect(() => {
    setView({ kind: 'idle' });
  }, [recipe.id]);

  const aiDisabled = Boolean(aiDisabledReason);

  const starters = useMemo<ActionStarter[]>(
    () => [
      {
        id: 'adjust_ingredients',
        label: 'Tilpas ingredienser',
        hint: 'Ret mængder, navne og grupper uden at opfinde nye råvarer.',
        needsInput: false,
        available: !aiDisabled,
        disabledReason: aiDisabledReason ?? undefined,
      },
      {
        id: 'adjust_steps',
        label: 'Tilpas fremgangsmåde',
        hint: 'Gør trinnene klarere uden at ændre retten.',
        needsInput: false,
        available: !aiDisabled,
        disabledReason: aiDisabledReason ?? undefined,
      },
      {
        id: 'adjust_description',
        label: 'Tilpas beskrivelse',
        hint: 'Kort og ærlig beskrivelse der matcher opskriften.',
        needsInput: false,
        available: !aiDisabled,
        disabledReason: aiDisabledReason ?? undefined,
      },
      {
        id: 'adjust_all',
        label: 'Ret hele opskriften',
        hint: 'Beskriv kort hvad der skal rettes.',
        needsInput: true,
        available: !aiDisabled,
        disabledReason: aiDisabledReason ?? undefined,
      },
      {
        id: 'ask',
        label: 'Stil et spørgsmål om denne opskrift',
        hint: 'Kommer snart. Brug “Ret hele opskriften” hvis du vil foreslå en ændring.',
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
      setView({ kind: 'loading', action });
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
              question: 'Skriv kort hvad der skal rettes, så AI ved hvor den skal kigge.',
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
          message: normalized.message || 'Der opstod en fejl ved AI-kaldet. Prøv igen om lidt.',
        });
      }
    },
    [aiDisabled, aiDisabledReason, recipe, userLevel],
  );

  const handleApply = useCallback(() => {
    if (view.kind !== 'proposal') return;
    onApply(view.proposed);
    setView({ kind: 'idle' });
    onClose();
  }, [onApply, onClose, view]);

  const handleDiscard = useCallback(() => {
    setView({ kind: 'idle' });
  }, []);

  if (!open) return null;

  const loadingAction =
    view.kind === 'loading' ? view.action : null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-sm p-0 sm:p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md glass-brushed cm-surface-secondary rounded-t-3xl sm:rounded-3xl shadow-2xl border border-white/40 dark:border-white/10 max-h-[85vh] flex flex-col"
        role="dialog"
        aria-label="Opskrift-assistent"
      >
        <div className="flex items-center gap-3 px-5 py-4 border-b border-black/5 dark:border-white/10">
          <div className="p-2 rounded-full bg-heath-mid/15 text-heath-mid">
            <Sparkles size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold uppercase tracking-[0.18em] text-forest-mid cm-light-surface-ink-muted">
              Assistent
            </div>
            <div className="text-xs text-forest-mid/70 cm-light-surface-ink-muted truncate italic">
              {recipe.title || 'Opskrift'}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-forest-mid cm-light-surface-icon hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            aria-label="Luk"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {aiDisabled && (
            <div className="rounded-2xl border border-amber-200/70 bg-amber-50/80 px-4 py-3 text-amber-900 text-sm">
              {aiDisabledReason || 'AI er ikke tilgængelig lige nu.'}
            </div>
          )}

          {view.kind === 'idle' && (
            <>
              <p className="text-sm font-serif italic text-forest-mid cm-light-surface-ink-muted">
                Vælg en handling. Assistenten ændrer kun noget hvis den vurderer det giver mening — ellers svarer den “ingen ændring”.
              </p>
              <ul className="space-y-2">
                {starters.map((s) => (
                  <li key={s.id}>
                    <button
                      onClick={() => {
                        if (!s.available) return;
                        if (s.needsInput) {
                          setView({ kind: 'idle' });
                        } else {
                          void dispatch(s.id);
                        }
                      }}
                      disabled={!s.available}
                      className={`w-full text-left rounded-2xl px-4 py-3 border transition-colors ${
                        s.available
                          ? 'border-black/5 dark:border-white/10 hover:bg-white/50 dark:hover:bg-white/5'
                          : 'border-black/5 dark:border-white/10 opacity-50 cursor-not-allowed'
                      }`}
                      title={s.disabledReason}
                    >
                      <div className="text-sm font-bold text-forest-dark cm-light-surface-ink">
                        {s.label}
                      </div>
                      <div className="text-xs text-forest-mid/80 cm-light-surface-ink-muted mt-0.5">
                        {s.hint}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>

              <div className="pt-2 border-t border-black/5 dark:border-white/10">
                <label className="text-xs font-bold uppercase tracking-[0.18em] text-forest-mid cm-light-surface-ink-muted block mb-2">
                  Fri tekst
                </label>
                <textarea
                  value={freeText}
                  onChange={(e) => setFreeText(e.target.value)}
                  placeholder="fx: skær sukker til det halve, eller tydeliggør trin 3"
                  rows={2}
                  disabled={aiDisabled}
                  className="w-full bg-transparent border border-black/5 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-forest-dark cm-light-surface-ink placeholder-forest-mid/50 resize-none focus:outline-none focus:border-heath-mid"
                />
                <button
                  onClick={() => {
                    void dispatch('adjust_all', freeText);
                  }}
                  disabled={!freeText.trim() || aiDisabled}
                  className="mt-2 w-full inline-flex items-center justify-center gap-2 rounded-full bg-heath-mid text-white text-sm font-bold px-4 py-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <MessageSquare size={14} />
                  Send forslag
                </button>
              </div>
            </>
          )}

          {view.kind === 'loading' && (
            <div className="flex items-center gap-3 text-sm text-forest-mid italic">
              <Loader2 size={16} className="animate-spin" />
              <span>
                {loadingAction === 'adjust_ingredients'
                  ? 'Gennemgår ingredienser…'
                  : loadingAction === 'adjust_steps'
                    ? 'Gennemgår fremgangsmåde…'
                    : loadingAction === 'adjust_description'
                      ? 'Gennemgår beskrivelse…'
                      : 'Assistenten arbejder…'}
              </span>
            </div>
          )}

          {view.kind === 'no_change' && (
            <div className="space-y-3">
              <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white/40 dark:bg-white/5 px-4 py-3">
                <div className="text-sm font-bold text-forest-dark cm-light-surface-ink mb-1">
                  Ingen ændring anbefales
                </div>
                <p className="text-sm text-forest-mid cm-light-surface-ink-muted italic">
                  {view.reason}
                </p>
              </div>
              <button
                onClick={() => setView({ kind: 'idle' })}
                className="w-full rounded-full border border-black/10 dark:border-white/15 px-4 py-2 text-sm font-bold text-forest-dark cm-light-surface-ink hover:bg-white/50 dark:hover:bg-white/5"
              >
                Tilbage
              </button>
            </div>
          )}

          {view.kind === 'proposal' && (
            <div className="space-y-3">
              <div className="rounded-2xl border border-heath-mid/30 bg-heath-mid/5 px-4 py-3">
                <div className="text-sm font-bold text-forest-dark cm-light-surface-ink mb-1">
                  {view.summary}
                </div>
                <ul className="text-xs text-forest-mid cm-light-surface-ink-muted list-disc pl-4 space-y-0.5">
                  {view.delta.map((d, idx) => (
                    <li key={idx}>{d}</li>
                  ))}
                </ul>
              </div>

              <ProposalDiff prev={recipe} next={view.proposed} />

              <div className="flex gap-2">
                <button
                  onClick={handleDiscard}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-full border border-black/10 dark:border-white/15 px-4 py-2 text-sm font-bold text-forest-dark cm-light-surface-ink hover:bg-white/50 dark:hover:bg-white/5"
                >
                  <Undo2 size={14} />
                  Fortryd
                </button>
                <button
                  onClick={handleApply}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-heath-mid text-white text-sm font-bold px-4 py-2"
                >
                  <Check size={14} />
                  Behold
                </button>
              </div>
            </div>
          )}

          {view.kind === 'clarify' && (
            <div className="space-y-3">
              <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white/40 dark:bg-white/5 px-4 py-3 text-sm text-forest-dark cm-light-surface-ink">
                {view.question}
              </div>
              <button
                onClick={() => setView({ kind: 'idle' })}
                className="w-full rounded-full border border-black/10 dark:border-white/15 px-4 py-2 text-sm font-bold text-forest-dark cm-light-surface-ink hover:bg-white/50 dark:hover:bg-white/5"
              >
                Tilbage
              </button>
            </div>
          )}

          {view.kind === 'answer' && (
            <div className="space-y-3">
              <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white/40 dark:bg-white/5 px-4 py-3 text-sm text-forest-dark cm-light-surface-ink whitespace-pre-wrap">
                {view.text}
              </div>
              <button
                onClick={() => setView({ kind: 'idle' })}
                className="w-full rounded-full border border-black/10 dark:border-white/15 px-4 py-2 text-sm font-bold text-forest-dark cm-light-surface-ink hover:bg-white/50 dark:hover:bg-white/5"
              >
                Tilbage
              </button>
            </div>
          )}

          {view.kind === 'error' && (
            <div className="space-y-3">
              <div className="rounded-2xl border border-red-200/70 bg-red-50/80 px-4 py-3 text-sm text-red-900">
                {view.message}
              </div>
              <button
                onClick={() => setView({ kind: 'idle' })}
                className="w-full rounded-full border border-black/10 dark:border-white/15 px-4 py-2 text-sm font-bold text-forest-dark cm-light-surface-ink hover:bg-white/50 dark:hover:bg-white/5"
              >
                Tilbage
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function truncate(text: string | undefined | null, max = 160): string {
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
    <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white/30 dark:bg-white/5 px-4 py-3 space-y-3 text-xs">
      {showTitle && (
        <DiffRow label="Titel" before={prev.title} after={next.title} />
      )}
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
      <div className="font-bold uppercase tracking-[0.16em] text-forest-mid cm-light-surface-ink-muted mb-1">
        {label}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className="rounded-xl bg-black/5 dark:bg-white/5 px-3 py-2 text-forest-dark cm-light-surface-ink">
          <div className="text-[10px] uppercase tracking-wider text-forest-mid/70 mb-0.5">Før</div>
          {before || <span className="italic opacity-60">(tom)</span>}
        </div>
        <div className="rounded-xl bg-heath-mid/10 px-3 py-2 text-forest-dark cm-light-surface-ink">
          <div className="text-[10px] uppercase tracking-wider text-heath-mid mb-0.5">Efter</div>
          {after || <span className="italic opacity-60">(tom)</span>}
        </div>
      </div>
    </div>
  );
}
