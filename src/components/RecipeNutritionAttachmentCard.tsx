import { Barcode, ChevronDown, ChevronUp, Link2, Loader2, Search, ShieldAlert, Unlink2, Wand2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNutritionToolsEnabled } from '../hooks/useNutritionToolsEnabled';
import { useRecipeNutritionVisible } from '../hooks/useRecipeNutritionVisible';
import { useRecipeNutritionExpandedByDefault } from '../hooks/useRecipeNutritionExpandedByDefault';
import type { RecipeNutritionAttachment, RecipeNutritionEstimate } from '../types';
import {
  getNutritionStatus,
  lookupNutritionBarcode,
  searchNutritionProductsByText,
} from '../services/nutrition/nutritionClientService';
import type { NutritionLookupResult } from '../services/nutrition/nutritionLookupService';
import {
  createRecipeNutritionAttachment,
  getRecipeNutritionExplanation,
  getRecipeNutritionSummaryLine,
} from '../services/nutrition/recipeNutritionAttachmentService';

interface RecipeNutritionAttachmentCardProps {
  attachment?: RecipeNutritionAttachment;
  estimate?: RecipeNutritionEstimate;
  canAttach: boolean;
  canEstimate: boolean;
  canClear?: boolean;
  readOnlyMessage?: string | null;
  isEstimating?: boolean;
  aiDisabledReason?: string | null;
  onEstimate?: () => void;
  onAttach: (attachment: RecipeNutritionAttachment) => void;
  onClear: () => void;
}

type LookupMode = 'barcode' | 'text_search';

export function RecipeNutritionAttachmentCard({
  attachment,
  estimate,
  canAttach,
  canEstimate,
  canClear = canAttach,
  readOnlyMessage,
  isEstimating = false,
  aiDisabledReason,
  onEstimate,
  onAttach,
  onClear,
}: RecipeNutritionAttachmentCardProps) {
  const { enabled: nutritionToolsEnabled } = useNutritionToolsEnabled();
  const { visible: recipeNutritionVisible } = useRecipeNutritionVisible();
  const { expandedByDefault } = useRecipeNutritionExpandedByDefault();
  const [enabled, setEnabled] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [isExpanded, setIsExpanded] = useState(expandedByDefault);
  const [mode, setMode] = useState<LookupMode>('barcode');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<NutritionLookupResult | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const status = await getNutritionStatus();
        if (!cancelled) {
          setEnabled(status.enabled);
        }
      } catch {
        if (!cancelled) {
          setEnabled(false);
        }
      } finally {
        if (!cancelled) {
          setLoadingStatus(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setIsExpanded(expandedByDefault);
  }, [expandedByDefault]);

  if (loadingStatus || !enabled || !nutritionToolsEnabled || !recipeNutritionVisible) {
    return null;
  }

  const hasAttachment = Boolean(attachment);
  const summaryLine = hasAttachment
    ? getRecipeNutritionSummaryLine(attachment)
    : 'Ingen produktdata er knyttet til denne opskrift endnu.';
  const canTriggerEstimate = canEstimate && Boolean(onEstimate);

  const handleLookup = async () => {
    if (!input.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const nextResult = mode === 'barcode'
        ? await lookupNutritionBarcode(input.trim())
        : await searchNutritionProductsByText(input.trim(), 4);
      setResult(nextResult);
    } catch (lookupError) {
      setResult(null);
      setError(lookupError instanceof Error ? lookupError.message : 'Produktdata kunne ikke hentes.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mb-8 glass-brushed p-6 sm:p-8 rounded-[2.5rem] border border-black/5 dark:border-white/10">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-white/60 dark:bg-black/20 rounded-2xl border border-black/5 dark:border-white/10">
            <Link2 size={18} className="text-heath-mid" />
          </div>
          <div>
            <h3 className="font-serif text-xl text-forest-dark dark:text-white italic text-engraved">Produktdata til opskriften</h3>
            <p className="text-xs text-forest-mid dark:text-white/70 opacity-80">
              {getRecipeNutritionExplanation(attachment)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {canTriggerEstimate && (
            <button
              type="button"
              onClick={onEstimate}
              disabled={isEstimating || Boolean(aiDisabledReason)}
              className="inline-flex items-center gap-2 rounded-full border border-[#3A2A22] bg-[#2A1F1A] px-4 py-2 text-xs font-bold uppercase tracking-widest text-[#D4B886] transition-colors hover:bg-[#3A2A22] disabled:opacity-50"
            >
              {isEstimating ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
              {isEstimating ? 'Estimerer...' : 'AI - Estimer macro/kcal'}
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsExpanded((current) => !current)}
            className="inline-flex items-center gap-2 rounded-full border border-black/10 dark:border-white/10 bg-white/55 dark:bg-black/20 px-4 py-2 text-xs font-bold uppercase tracking-widest text-forest-mid dark:text-white/80 transition-colors hover:bg-white/80 dark:hover:bg-white/10"
            aria-expanded={isExpanded}
          >
            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {isExpanded ? 'Skjul' : 'Vis'}
          </button>
        </div>
      </div>

      {estimate && (
        <div className="mb-4 rounded-3xl border border-[#D4B886]/40 bg-[#FFF8EA]/80 p-5 text-sm text-forest-mid shadow-sm dark:border-[#D4B886]/20 dark:bg-[#2A1F1A]/50 dark:text-white/80">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-serif text-lg italic text-forest-dark dark:text-white">AI-estimat for opskriften</p>
              <p className="mt-1 text-xs opacity-75">
                Vejledende tal ud fra ingredienslisten. Senest opdateret {new Date(estimate.generatedAt).toLocaleString('da-DK')}.
              </p>
            </div>
            <span className="rounded-full bg-white/70 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-heath-mid dark:bg-black/20">
              Sikkerhed: {estimate.confidence}
            </span>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-black/5 bg-white/60 p-4 dark:border-white/10 dark:bg-black/20">
              <p className="text-xs font-bold uppercase tracking-widest opacity-60">Pr. 100 g</p>
              <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-2xl bg-white/70 px-3 py-3 dark:bg-black/20">kcal: {estimate.per100g.energyKcal ?? '-'}</div>
                <div className="rounded-2xl bg-white/70 px-3 py-3 dark:bg-black/20">Fedt: {estimate.per100g.fatGrams ?? '-'} g</div>
                <div className="rounded-2xl bg-white/70 px-3 py-3 dark:bg-black/20">Kulhydrat: {estimate.per100g.carbsGrams ?? '-'} g</div>
                <div className="rounded-2xl bg-white/70 px-3 py-3 dark:bg-black/20">Protein: {estimate.per100g.proteinGrams ?? '-'} g</div>
              </div>
            </div>
            <div className="rounded-2xl border border-black/5 bg-white/60 p-4 dark:border-white/10 dark:bg-black/20">
              <p className="text-xs font-bold uppercase tracking-widest opacity-60">Pr. portion</p>
              <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-2xl bg-white/70 px-3 py-3 dark:bg-black/20">kcal: {estimate.perPortion.energyKcal ?? '-'}</div>
                <div className="rounded-2xl bg-white/70 px-3 py-3 dark:bg-black/20">Fedt: {estimate.perPortion.fatGrams ?? '-'} g</div>
                <div className="rounded-2xl bg-white/70 px-3 py-3 dark:bg-black/20">Kulhydrat: {estimate.perPortion.carbsGrams ?? '-'} g</div>
                <div className="rounded-2xl bg-white/70 px-3 py-3 dark:bg-black/20">Protein: {estimate.perPortion.proteinGrams ?? '-'} g</div>
              </div>
            </div>
          </div>
          <div className="mt-4 rounded-2xl border border-black/5 bg-white/55 p-4 text-xs leading-relaxed dark:border-white/10 dark:bg-black/20">
            <p className="font-bold uppercase tracking-widest opacity-60">Antagelser</p>
            <p className="mt-2">{estimate.rationale}</p>
            <p className="mt-3 opacity-75">
              Estimeret samlet vaegt: {estimate.estimatedTotalWeightGrams ?? '-'} g
            </p>
          </div>
        </div>
      )}

      {!canTriggerEstimate && readOnlyMessage && (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-900">
          {readOnlyMessage}
        </div>
      )}

      {aiDisabledReason && (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-900">
          AI-estimat er midlertidigt slaaet fra. {aiDisabledReason}
        </div>
      )}

      <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white/35 dark:bg-black/10 px-4 py-3 text-sm text-forest-mid dark:text-white/80">
        <p className="font-medium">{hasAttachment ? 'Knyttet produktdata' : 'Ingen knyttet produktdata'}</p>
        <p className="mt-1 text-xs opacity-80">{summaryLine}</p>
      </div>

      {isExpanded && (attachment ? (
        <div className="mt-4 rounded-3xl border border-black/5 dark:border-white/10 bg-white/45 dark:bg-black/20 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-serif text-lg text-forest-dark dark:text-white italic">{attachment.title}</p>
              <p className="mt-1 text-xs text-forest-mid dark:text-white/70 opacity-75">
                {[attachment.brand, attachment.barcode].filter(Boolean).join(' · ') || 'Intet ekstra produkt-id'}
              </p>
            </div>
            {canClear && (
              <button
                onClick={onClear}
                className="inline-flex items-center gap-2 rounded-full border border-black/10 dark:border-white/10 px-4 py-2 text-xs font-bold uppercase tracking-widest text-forest-mid dark:text-white/80 hover:bg-white/40 dark:hover:bg-white/10 transition-colors"
              >
                <Unlink2 size={14} />
                Fjern link
              </button>
            )}
          </div>
          <p className="mt-3 text-xs text-forest-mid dark:text-white/70 opacity-80">
            {getRecipeNutritionSummaryLine(attachment)}
          </p>
          {attachment.nutrition && (
            <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-forest-mid dark:text-white/80">
              <div className="rounded-2xl bg-white/55 dark:bg-black/20 px-3 py-3">kcal/100g: {attachment.nutrition.energyKcalPer100g ?? '-'}</div>
              <div className="rounded-2xl bg-white/55 dark:bg-black/20 px-3 py-3">Fedt: {attachment.nutrition.fatPer100g ?? '-'} g</div>
              <div className="rounded-2xl bg-white/55 dark:bg-black/20 px-3 py-3">Kulhydrat: {attachment.nutrition.carbsPer100g ?? '-'} g</div>
              <div className="rounded-2xl bg-white/55 dark:bg-black/20 px-3 py-3">Protein: {attachment.nutrition.proteinPer100g ?? '-'} g</div>
            </div>
          )}
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-900">
            Vejledende produktdata pr. 100 g. Opskriftens ingredienser og portioner bliver ikke regnet om automatisk.
          </div>
          {attachment.provenance.sourceUrl && (
            <a
              href={attachment.provenance.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex text-xs font-bold uppercase tracking-widest text-heath-mid hover:underline"
            >
              Se kilde
            </a>
          )}
        </div>
      ) : (
        <div className="mt-4 rounded-3xl border border-dashed border-black/10 dark:border-white/10 bg-white/35 dark:bg-black/10 p-5 text-sm text-forest-mid dark:text-white/80">
          Ingen produktdata er knyttet til denne opskrift endnu.
        </div>
      ))}

      {isExpanded && !canAttach && !readOnlyMessage && (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-900">
          {readOnlyMessage || 'Gem opskriften foerst, hvis du vil knytte produktdata til den.'}
        </div>
      )}

      {isExpanded && canAttach && (
        <>
          <div className="mt-5 flex bg-white/40 dark:bg-black/10 rounded-2xl p-1.5 border border-black/5 dark:border-white/10">
            <button
              onClick={() => setMode('barcode')}
              className={`flex-1 px-4 py-2 rounded-xl flex items-center justify-center gap-2 transition-all ${mode === 'barcode' ? 'bg-forest-dark text-white shadow-sm' : 'text-forest-mid dark:text-white/70 hover:bg-white/40 dark:hover:bg-white/10'}`}
            >
              <Barcode size={14} /> Stregkode
            </button>
            <button
              onClick={() => setMode('text_search')}
              className={`flex-1 px-4 py-2 rounded-xl flex items-center justify-center gap-2 transition-all ${mode === 'text_search' ? 'bg-forest-dark text-white shadow-sm' : 'text-forest-mid dark:text-white/70 hover:bg-white/40 dark:hover:bg-white/10'}`}
            >
              <Search size={14} /> Produktsogning
            </button>
          </div>

          <div className="mt-4 flex flex-col sm:flex-row gap-3">
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !loading) {
                  void handleLookup();
                }
              }}
              placeholder={mode === 'barcode' ? 'Fx 3017620422003' : 'Fx nutella'}
              className="flex-1 rounded-2xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-black/20 px-4 py-3 text-sm text-forest-dark dark:text-white outline-none focus:border-forest-mid"
            />
            <button
              onClick={() => void handleLookup()}
              disabled={!input.trim() || loading}
              className="px-5 py-3 text-xs font-bold uppercase tracking-widest rounded-2xl bg-forest-dark text-white shadow-sm disabled:opacity-50"
            >
              {loading ? 'Soger...' : 'Find produkt'}
            </button>
          </div>

          {error && (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50/80 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {result && (
            <div className="mt-4 space-y-3">
              {result.items.length === 0 && (
                <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white/40 dark:bg-black/10 p-4 text-sm text-forest-mid dark:text-white/80">
                  Ingen produkter fundet for denne sogning.
                </div>
              )}
              {result.items.map((item) => (
                <div key={item.id} className="rounded-2xl border border-black/5 dark:border-white/10 bg-white/45 dark:bg-black/20 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-serif text-lg text-forest-dark dark:text-white italic">{item.title}</p>
                      <p className="mt-1 text-xs text-forest-mid dark:text-white/70 opacity-75">
                        {[item.brand, item.barcode].filter(Boolean).join(' · ') || 'Ingen ekstra produktinfo'}
                      </p>
                      <p className="mt-2 text-xs text-forest-mid dark:text-white/70 opacity-80">
                        {getRecipeNutritionSummaryLine(createRecipeNutritionAttachment(result, item))}
                      </p>
                    </div>
                    <button
                      onClick={() => onAttach(createRecipeNutritionAttachment(result, item))}
                      disabled={!canAttach}
                      className="rounded-full bg-forest-dark text-white px-4 py-2 text-xs font-bold uppercase tracking-widest disabled:opacity-50"
                    >
                      Knyt til opskrift
                    </button>
                  </div>
                  {item.provenance.isFallback && (
                    <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-amber-100 text-amber-800 px-3 py-1 text-[10px] font-bold uppercase tracking-widest">
                      <ShieldAlert size={12} />
                      Fallback-kilde
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
