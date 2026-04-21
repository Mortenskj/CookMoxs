import { Barcode, ChevronDown, ChevronUp, Link2, Loader2, Search, ShieldAlert, Unlink2, Wand2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNutritionToolsEnabled } from '../hooks/useNutritionToolsEnabled';
import { useRecipeNutritionEstimateVisible } from '../hooks/useRecipeNutritionEstimateVisible';
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
  servings?: number;
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
type MacroBasis = 'perPortion' | 'per100g';
type MacroTab = 'protein' | 'fat' | 'carbs';
type DistributionBasis = 'grams' | 'calories';

const MACRO_META: Record<MacroTab, { label: string; stroke: string; softBg: string; pillText: string }> = {
  protein: {
    label: 'Protein',
    stroke: '#315649',
    softBg: 'bg-[#E0ECE5] dark:bg-[#21362D]',
    pillText: 'text-[#315649] dark:text-[#DDEBE3]',
  },
  fat: {
    label: 'Fedt',
    stroke: '#B17A2C',
    softBg: 'bg-[#F8E8C6] dark:bg-[#4A3720]',
    pillText: 'text-[#8B5F1F] dark:text-[#F6D998]',
  },
  carbs: {
    label: 'Kulhydrat',
    stroke: '#C96C46',
    softBg: 'bg-[#F7DCCF] dark:bg-[#4A2E24]',
    pillText: 'text-[#9B4E2F] dark:text-[#F5D2C4]',
  },
};

function normalizeEstimateForDisplay(estimate?: RecipeNutritionEstimate) {
  if (!estimate) {
    return null;
  }

  return {
    ...estimate,
    per100g: estimate.per100g ?? {},
    perPortion: estimate.perPortion ?? {},
    ingredientBreakdown: Array.isArray(estimate.ingredientBreakdown) ? estimate.ingredientBreakdown : [],
    omittedIngredients: Array.isArray(estimate.omittedIngredients) ? estimate.omittedIngredients : [],
    countedIngredientCount: typeof estimate.countedIngredientCount === 'number' ? estimate.countedIngredientCount : 0,
    totalIngredientCount: typeof estimate.totalIngredientCount === 'number' ? estimate.totalIngredientCount : 0,
    validationWarnings: Array.isArray(estimate.validationWarnings) ? estimate.validationWarnings : [],
    coverageStatus: estimate.coverageStatus ?? 'complete',
    rationale: estimate.rationale ?? '',
  };
}

function formatIngredientMacroLine(estimate: RecipeNutritionEstimate['ingredientBreakdown'][number]) {
  const parts: string[] = [];

  if (estimate.proteinGrams != null) {
    parts.push(`Protein ${estimate.proteinGrams} g`);
  }
  if (estimate.fatGrams != null) {
    parts.push(`Fedt ${estimate.fatGrams} g`);
  }
  if (estimate.carbsGrams != null) {
    parts.push(`Kulhydrat ${estimate.carbsGrams} g`);
  }

  return parts.length > 0 ? parts.join(' · ') : 'Makrofordeling ikke oplyst';
}

function formatMacroValue(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) {
    return '-';
  }

  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function formatMacroPercent(value: number) {
  if (!Number.isFinite(value)) {
    return '0%';
  }

  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded}%` : `${rounded.toFixed(1)}%`;
}

export function RecipeNutritionAttachmentCard({
  attachment,
  estimate,
  servings,
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
  const { visible: recipeNutritionEstimateVisible } = useRecipeNutritionEstimateVisible();
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
  const [macroBasis, setMacroBasis] = useState<MacroBasis>('perPortion');
  const [distributionBasis, setDistributionBasis] = useState<DistributionBasis>('grams');
  const [showMacroSources, setShowMacroSources] = useState(false);
  const [activeMacroTab, setActiveMacroTab] = useState<MacroTab>('protein');
  const [showAllMacroSources, setShowAllMacroSources] = useState(false);
  const displayEstimate = useMemo(() => normalizeEstimateForDisplay(estimate), [estimate]);

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

  const hasAttachment = Boolean(attachment);
  const summaryLine = hasAttachment
    ? getRecipeNutritionSummaryLine(attachment)
    : 'Ingen produktdata er knyttet til denne opskrift endnu.';
  const ingredientBreakdown = displayEstimate?.ingredientBreakdown ?? [];
  const omittedIngredients = displayEstimate?.omittedIngredients ?? [];
  const countedIngredientCount = displayEstimate?.countedIngredientCount ?? Math.max(ingredientBreakdown.length - omittedIngredients.length, 0);
  const totalIngredientCount = displayEstimate?.totalIngredientCount ?? Math.max(ingredientBreakdown.length, countedIngredientCount + omittedIngredients.length);
  const validationWarnings = displayEstimate?.validationWarnings ?? [];
  const coverageStatus = displayEstimate?.coverageStatus ?? (omittedIngredients.length > 0 ? 'partial' : 'complete');
  const canTriggerEstimate = recipeNutritionEstimateVisible && canEstimate && Boolean(onEstimate);
  const estimateCoverageLabel = coverageStatus === 'complete' ? 'Komplet estimate' : 'Delvist estimate';
  const canRenderMacroOverview = Boolean(displayEstimate && recipeNutritionEstimateVisible && coverageStatus === 'complete');
  const selectedSnapshot = displayEstimate ? displayEstimate[macroBasis] : null;
  const contributionScale = useMemo(() => {
    if (!displayEstimate) {
      return null;
    }

    if (macroBasis === 'perPortion') {
      return Number.isFinite(servings) && Number(servings) > 0 ? 1 / Number(servings) : 1;
    }

    return displayEstimate.estimatedTotalWeightGrams && displayEstimate.estimatedTotalWeightGrams > 0
      ? 100 / displayEstimate.estimatedTotalWeightGrams
      : 1;
  }, [displayEstimate, macroBasis, servings]);
  const sourceBasisLabel = macroBasis === 'perPortion'
    ? 'pr. portion'
    : displayEstimate?.estimatedTotalWeightGrams && displayEstimate.estimatedTotalWeightGrams > 0
      ? 'pr. 100 g'
      : 'for hele opskriften';
  const macroOverview = useMemo(() => {
    if (!selectedSnapshot) {
      return null;
    }

    const macros: Array<{
      key: MacroTab;
      label: string;
      grams: number;
      macroKcal: number;
      share: number;
      percent: number;
      stroke: string;
      softBg: string;
      pillText: string;
    }> = [
      {
        key: 'fat',
        label: MACRO_META.fat.label,
        grams: selectedSnapshot.fatGrams ?? 0,
        macroKcal: (selectedSnapshot.fatGrams ?? 0) * 9,
        share: 0,
        percent: 0,
        stroke: MACRO_META.fat.stroke,
        softBg: MACRO_META.fat.softBg,
        pillText: MACRO_META.fat.pillText,
      },
      {
        key: 'protein',
        label: MACRO_META.protein.label,
        grams: selectedSnapshot.proteinGrams ?? 0,
        macroKcal: (selectedSnapshot.proteinGrams ?? 0) * 4,
        share: 0,
        percent: 0,
        stroke: MACRO_META.protein.stroke,
        softBg: MACRO_META.protein.softBg,
        pillText: MACRO_META.protein.pillText,
      },
      {
        key: 'carbs',
        label: MACRO_META.carbs.label,
        grams: selectedSnapshot.carbsGrams ?? 0,
        macroKcal: (selectedSnapshot.carbsGrams ?? 0) * 4,
        share: 0,
        percent: 0,
        stroke: MACRO_META.carbs.stroke,
        softBg: MACRO_META.carbs.softBg,
        pillText: MACRO_META.carbs.pillText,
      },
    ];

    const totalDistributionValue = macros.reduce(
      (sum, macro) => sum + (distributionBasis === 'grams' ? macro.grams : macro.macroKcal),
      0,
    );

    return macros.map((macro) => ({
      ...macro,
      share: totalDistributionValue > 0
        ? (distributionBasis === 'grams' ? macro.grams : macro.macroKcal) / totalDistributionValue
        : 0,
      percent: totalDistributionValue > 0
        ? ((distributionBasis === 'grams' ? macro.grams : macro.macroKcal) / totalDistributionValue) * 100
        : 0,
    }));
  }, [distributionBasis, selectedSnapshot]);
  const donutSegments = useMemo(() => {
    if (!macroOverview) {
      return [];
    }

    const radius = 54;
    const circumference = 2 * Math.PI * radius;
    let offset = 0;

    return macroOverview.map((macro) => {
      const dashLength = (macro.percent / 100) * circumference;
      const segment = {
        ...macro,
        radius,
        circumference,
        dashArray: `${dashLength} ${circumference - dashLength}`,
        dashOffset: -offset,
      };
      offset += dashLength;
      return segment;
    });
  }, [macroOverview]);
  const macroSourceItems = useMemo(() => {
    if (!displayEstimate || !contributionScale) {
      return [];
    }

    const items = displayEstimate.ingredientBreakdown
      .map((item) => {
        const wholeRecipeValue = activeMacroTab === 'protein'
          ? item.proteinGrams ?? 0
          : activeMacroTab === 'fat'
            ? item.fatGrams ?? 0
            : item.carbsGrams ?? 0;

        const scaledValue = wholeRecipeValue * contributionScale;
        const scaledWeight = item.estimatedWeightGrams != null ? item.estimatedWeightGrams * contributionScale : null;

        return {
          ...item,
          scaledValue,
          scaledWeight,
        };
      })
      .filter((item) => item.scaledValue > 0)
      .sort((a, b) => b.scaledValue - a.scaledValue);

    return showAllMacroSources ? items : items.slice(0, 5);
  }, [activeMacroTab, contributionScale, displayEstimate, showAllMacroSources]);
  const macroOverviewItems = useMemo(() => {
    if (!macroOverview) {
      return [];
    }

    const preferredOrder: MacroTab[] = ['protein', 'carbs', 'fat'];
    return preferredOrder
      .map((key) => macroOverview.find((macro) => macro.key === key))
      .filter((macro): macro is NonNullable<typeof macro> => Boolean(macro));
  }, [macroOverview]);
  const distributionBasisLabel = distributionBasis === 'grams' ? 'gramfordelingen' : 'kaloriefordelingen';
  const distributionDescription = distributionBasis === 'grams'
    ? 'Diagrammet viser gramfordelingen mellem fedt, protein og kulhydrat.'
    : 'Diagrammet viser kaloriefordelingen mellem fedt, protein og kulhydrat.';

  useEffect(() => {
    setShowAllMacroSources(false);
  }, [activeMacroTab, macroBasis, showMacroSources]);

  if (loadingStatus || !enabled || !nutritionToolsEnabled || !recipeNutritionVisible) {
    return null;
  }

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
    <section className="cm-nutrition-section mb-8 glass-brushed p-5 sm:p-6 rounded-[2rem] border border-black/5 dark:border-white/10">
      {/* Header row — toggle expands/collapses entire section */}
      <button
        type="button"
        onClick={() => setIsExpanded((current) => !current)}
        className="w-full flex items-center justify-between gap-3"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Link2 size={16} className="text-heath-mid shrink-0" />
          <h3 className="font-serif text-base sm:text-lg text-forest-dark cm-light-surface-ink italic text-engraved truncate">Ernæring</h3>
          {displayEstimate && recipeNutritionEstimateVisible && (
            <span className="shrink-0 rounded-full bg-forest-dark/10 dark:bg-white/10 px-2 py-0.5 text-[0.625rem] sm:text-xs font-semibold text-forest-mid cm-light-surface-ink-muted">
              {estimateCoverageLabel}
            </span>
          )}
        </div>
        <span className="text-forest-mid/60 cm-light-surface-ink-soft shrink-0">
          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </span>
      </button>

      {isExpanded && (
        <div className="mt-5 space-y-4">
          {/* Estimate action + AI-disabled notice */}
          {canTriggerEstimate && (
            <button
              type="button"
              onClick={onEstimate}
              disabled={isEstimating || Boolean(aiDisabledReason)}
              className="btn-botanical w-full justify-center gap-2 disabled:opacity-50"
            >
              {isEstimating ? <Loader2 size={15} className="animate-spin" /> : <Wand2 size={15} />}
              {isEstimating ? 'Estimerer...' : 'Estimer ernæring med AI'}
            </button>
          )}

          {aiDisabledReason && (
            <p className="text-xs sm:text-sm text-amber-800 dark:text-amber-200 italic opacity-80">
              AI-estimat er midlertidigt slået fra. {aiDisabledReason}
            </p>
          )}

          {!canTriggerEstimate && readOnlyMessage && (
            <p className="text-xs sm:text-sm text-amber-800 dark:text-amber-200 italic opacity-80">
              {readOnlyMessage}
            </p>
          )}

          {/* AI estimate results */}
          {displayEstimate && recipeNutritionEstimateVisible && (
            <div className="space-y-4">
              {/* Meta line */}
              <p className="text-xs sm:text-sm text-forest-mid cm-light-surface-ink-muted opacity-75 leading-relaxed">
                Vejledende AI-beregning ud fra ingredienslisten.
                {' '}{countedIngredientCount}/{totalIngredientCount} ingredienser medregnet.
                {' '}Sikkerhed: {displayEstimate.confidence}.
              </p>

              {omittedIngredients.length > 0 && (
                <p className="text-xs sm:text-sm text-red-700 dark:text-red-300">
                  Mangler: {omittedIngredients.join(', ')}
                </p>
              )}

              {validationWarnings.length > 0 && (
                <ul className="space-y-1 text-xs sm:text-sm text-amber-800 dark:text-amber-200">
                  {validationWarnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              )}

              {/* Macro chart */}
              {canRenderMacroOverview && selectedSnapshot && macroOverview ? (
                <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white/40 dark:bg-black/10 p-4 sm:p-5 print:hidden">
                  {/* Basis toggles */}
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    <div className="cm-nutrition-macro-tabs rounded-full border border-black/8 dark:border-white/10 bg-white/60 dark:bg-black/15 p-0.5">
                      <button
                        type="button"
                        onClick={() => setMacroBasis('perPortion')}
                        className={`cm-nutrition-macro-tab text-xs sm:text-sm font-medium transition-colors ${macroBasis === 'perPortion' ? 'bg-forest-dark text-white' : 'text-forest-mid cm-light-surface-ink-muted'}`}
                      >
                        Pr. portion
                      </button>
                      <button
                        type="button"
                        onClick={() => setMacroBasis('per100g')}
                        className={`cm-nutrition-macro-tab text-xs sm:text-sm font-medium transition-colors ${macroBasis === 'per100g' ? 'bg-forest-dark text-white' : 'text-forest-mid cm-light-surface-ink-muted'}`}
                      >
                        Pr. 100 g
                      </button>
                    </div>
                    <div className="cm-nutrition-distribution-tabs rounded-full border border-black/8 dark:border-white/10 bg-white/60 dark:bg-black/15 p-0.5">
                      <button
                        type="button"
                        onClick={() => setDistributionBasis('grams')}
                        className={`cm-nutrition-distribution-tab text-xs sm:text-sm font-medium transition-colors ${distributionBasis === 'grams' ? 'bg-forest-dark text-white' : 'text-forest-mid cm-light-surface-ink-muted'}`}
                      >
                        Gram
                      </button>
                      <button
                        type="button"
                        onClick={() => setDistributionBasis('calories')}
                        className={`cm-nutrition-distribution-tab text-xs sm:text-sm font-medium transition-colors ${distributionBasis === 'calories' ? 'bg-forest-dark text-white' : 'text-forest-mid cm-light-surface-ink-muted'}`}
                      >
                        Kcal
                      </button>
                    </div>
                  </div>

                  <div className="cm-nutrition-macro-card">
                    <div className="cm-nutrition-donut-wrap">
                      <div className="relative flex h-[140px] w-[140px] sm:h-[160px] sm:w-[160px] items-center justify-center">
                        <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90">
                          <circle cx="70" cy="70" r="54" fill="none" stroke="rgba(49,86,73,0.12)" strokeWidth="16" />
                          {donutSegments.map((segment) => (
                            <circle
                              key={segment.key}
                              cx="70" cy="70" r={segment.radius}
                              fill="none" stroke={segment.stroke} strokeWidth="16" strokeLinecap="round"
                              strokeDasharray={segment.dashArray} strokeDashoffset={segment.dashOffset}
                            />
                          ))}
                        </svg>
                        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                          <span className="font-serif text-2xl sm:text-3xl italic text-forest-dark cm-light-surface-ink">
                            {formatMacroValue(selectedSnapshot.energyKcal)}
                          </span>
                          <span className="text-xs text-forest-mid/75 cm-light-surface-ink-muted">kcal</span>
                        </div>
                      </div>
                    </div>
                    <div className="cm-nutrition-macro-grid">
                      {macroOverview.map((macro) => (
                        <div key={macro.key} className={`rounded-2xl border border-black/5 dark:border-white/10 px-3 py-2.5 ${macro.softBg}`}>
                          <p className="text-[0.625rem] sm:text-xs font-semibold uppercase tracking-wider opacity-60">{macro.label}</p>
                          <p className={`mt-1 text-lg sm:text-xl font-serif italic ${macro.pillText}`}>{formatMacroValue(macro.grams)} g</p>
                          <p className="text-[0.625rem] sm:text-xs opacity-65">{formatMacroPercent(macro.percent)}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <p className="mt-3 text-xs sm:text-sm text-forest-mid cm-light-surface-ink-muted opacity-60 text-center">
                    Samlet vægt ca. {formatMacroValue(displayEstimate.estimatedTotalWeightGrams)} g · {sourceBasisLabel}
                  </p>
                </div>
              ) : (
                <p className="text-xs sm:text-sm text-amber-800 dark:text-amber-200 italic opacity-80">
                  Makrodiagrammet vises kun ved komplet ingrediensdækning.
                </p>
              )}

              {/* Print-only block */}
              <div className="hidden print:block rounded-2xl border border-black/10 bg-white p-4 text-black">
                <p className="text-sm font-bold uppercase tracking-widest">Ernæringsestimat</p>
                <p className="mt-2 text-xs">Vejledende beregning. {estimateCoverageLabel}. Sikkerhed: {displayEstimate.confidence}.</p>
                <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                  <div>Pr. 100 g: {formatMacroValue(displayEstimate.per100g.energyKcal)} kcal, fedt {formatMacroValue(displayEstimate.per100g.fatGrams)} g, kulhydrat {formatMacroValue(displayEstimate.per100g.carbsGrams)} g, protein {formatMacroValue(displayEstimate.per100g.proteinGrams)} g</div>
                  <div>Pr. portion: {formatMacroValue(displayEstimate.perPortion.energyKcal)} kcal, fedt {formatMacroValue(displayEstimate.perPortion.fatGrams)} g, kulhydrat {formatMacroValue(displayEstimate.perPortion.carbsGrams)} g, protein {formatMacroValue(displayEstimate.perPortion.proteinGrams)} g</div>
                </div>
                {validationWarnings.length > 0 && (
                  <ul className="mt-3 text-xs">
                    {validationWarnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Rationale */}
              {displayEstimate.rationale && (
                <details className="group rounded-2xl border border-black/5 dark:border-white/10 bg-white/35 dark:bg-black/10">
                  <summary className="cursor-pointer px-4 py-3 text-xs sm:text-sm font-medium text-forest-mid cm-light-surface-ink-muted select-none">
                    Antagelser og kilder
                  </summary>
                  <div className="px-4 pb-4 text-xs sm:text-sm leading-relaxed text-forest-mid cm-light-surface-ink-muted opacity-80">
                    <p>{displayEstimate.rationale}</p>
                    <p className="mt-2 opacity-75">
                      Estimeret samlet vægt: {displayEstimate.estimatedTotalWeightGrams ?? '-'} g
                    </p>
                  </div>
                </details>
              )}

              {/* Macro sources */}
              {ingredientBreakdown.length > 0 && (
                <details className="group rounded-2xl border border-black/5 dark:border-white/10 bg-white/35 dark:bg-black/10">
                  <summary className="cursor-pointer px-4 py-3 text-xs sm:text-sm font-medium text-forest-mid cm-light-surface-ink-muted select-none">
                    Makrokilder pr. ingrediens
                  </summary>
                  <div className="px-4 pb-4">
                    <div className="cm-nutrition-lookup-tabs mb-3">
                      {(['protein', 'fat', 'carbs'] as MacroTab[]).map((tab) => (
                        <button
                          key={tab}
                          type="button"
                          onClick={() => setActiveMacroTab(tab)}
                          className={`cm-nutrition-source-tab text-xs sm:text-sm font-medium transition-colors ${
                            activeMacroTab === tab
                              ? 'bg-forest-dark text-white'
                              : 'bg-white/60 dark:bg-black/15 text-forest-mid cm-light-surface-ink-muted hover:bg-white/80 dark:hover:bg-black/25'
                          }`}
                        >
                          {MACRO_META[tab].label}
                        </button>
                      ))}
                    </div>

                    <p className="text-xs sm:text-sm opacity-65 mb-3">
                      Sorteret efter størst bidrag ({sourceBasisLabel}).
                    </p>

                    <ul className="cm-nutrition-source-list">
                      {macroSourceItems.map((item, itemIdx) => (
                        // Recipes legitimately reuse ingredient names across groups
                        // (e.g. "løg" in both meatballs + sauce), so include the
                        // index in the key to keep React happy.
                        <li key={`${activeMacroTab}-${itemIdx}-${item.ingredientName}`} className="cm-nutrition-source-item rounded-xl bg-white/50 dark:bg-black/15 px-3 py-2.5">
                          <div className="cm-nutrition-source-item-row">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-forest-dark cm-light-surface-ink truncate">{item.ingredientName}</p>
                              <p className="text-xs opacity-70 mt-0.5">{formatIngredientMacroLine(item)}</p>
                            </div>
                            <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${MACRO_META[activeMacroTab].softBg} ${MACRO_META[activeMacroTab].pillText}`}>
                              {formatMacroValue(item.scaledValue)} g
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>

                    {ingredientBreakdown.length > 5 && (
                      <button
                        type="button"
                        onClick={() => setShowAllMacroSources((current) => !current)}
                        className="mt-3 text-xs sm:text-sm font-medium text-heath-mid hover:underline"
                      >
                        {showAllMacroSources ? 'Vis færre' : `Vis alle ${ingredientBreakdown.length}`}
                      </button>
                    )}
                  </div>
                </details>
              )}
            </div>
          )}

          {/* Attached product data */}
          {hasAttachment && attachment ? (
            <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white/40 dark:bg-black/10 p-4">
              <div className="cm-nutrition-attachment-head">
                <div className="min-w-0">
                  <p className="text-sm sm:text-base font-serif text-forest-dark cm-light-surface-ink italic truncate">{attachment.title}</p>
                  <p className="mt-1 text-xs sm:text-sm text-forest-mid cm-light-surface-ink-muted opacity-75">
                    {[attachment.brand, attachment.barcode].filter(Boolean).join(' · ') || 'Produktdata'}
                  </p>
                </div>
                {canClear && (
                  <button
                    onClick={onClear}
                    className="shrink-0 inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-heath-mid hover:underline"
                  >
                    <Unlink2 size={14} />
                    Fjern
                  </button>
                )}
              </div>
              {attachment.nutrition && (
                <div className="cm-nutrition-attachment-grid mt-3 text-xs sm:text-sm text-forest-mid cm-light-surface-ink-muted">
                  <div className="rounded-xl bg-white/50 dark:bg-black/15 px-3 py-2">{attachment.nutrition.energyKcalPer100g ?? '-'} kcal</div>
                  <div className="rounded-xl bg-white/50 dark:bg-black/15 px-3 py-2">Fedt {attachment.nutrition.fatPer100g ?? '-'} g</div>
                  <div className="rounded-xl bg-white/50 dark:bg-black/15 px-3 py-2">Kulh. {attachment.nutrition.carbsPer100g ?? '-'} g</div>
                  <div className="rounded-xl bg-white/50 dark:bg-black/15 px-3 py-2">Protein {attachment.nutrition.proteinPer100g ?? '-'} g</div>
                </div>
              )}
              <p className="mt-3 text-xs opacity-60">Pr. 100 g. Opskriftens portioner regnes ikke om automatisk.</p>
              {attachment.provenance.sourceUrl && (
                <a href={attachment.provenance.sourceUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-xs font-medium text-heath-mid hover:underline">
                  Se kilde
                </a>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white/35 dark:bg-black/10 px-4 py-3 text-xs sm:text-sm text-forest-mid cm-light-surface-ink-muted">
              <p className="font-medium">Ingen knyttet produktdata</p>
              <p className="mt-1 opacity-70">{summaryLine}</p>
            </div>
          )}

          {/* Product lookup */}
          {!canAttach && !readOnlyMessage && (
            <p className="text-xs sm:text-sm text-amber-800 dark:text-amber-200 italic opacity-80">
              Gem opskriften først, hvis du vil knytte produktdata til den.
            </p>
          )}

          {canAttach && (
            <>
              <div className="cm-nutrition-lookup-tabs bg-white/40 dark:bg-black/10 rounded-2xl p-1 border border-black/5 dark:border-white/10">
                <button
                  onClick={() => setMode('barcode')}
                  className={`cm-nutrition-lookup-tab px-4 py-2 rounded-xl flex items-center justify-center gap-2 text-xs sm:text-sm transition-all ${mode === 'barcode' ? 'bg-forest-dark text-white shadow-sm' : 'text-forest-mid cm-light-surface-ink-muted hover:bg-white/40 dark:hover:bg-white/10'}`}
                >
                  <Barcode size={14} /> Stregkode
                </button>
                <button
                  onClick={() => setMode('text_search')}
                  className={`cm-nutrition-lookup-tab px-4 py-2 rounded-xl flex items-center justify-center gap-2 text-xs sm:text-sm transition-all ${mode === 'text_search' ? 'bg-forest-dark text-white shadow-sm' : 'text-forest-mid cm-light-surface-ink-muted hover:bg-white/40 dark:hover:bg-white/10'}`}
                >
                  <Search size={14} /> Produktsøgning
                </button>
              </div>

              <div className="cm-nutrition-search">
                <input
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !loading) {
                      void handleLookup();
                    }
                  }}
                  placeholder={mode === 'barcode' ? 'Fx 3017620422003' : 'Fx nutella'}
                  className="flex-1 rounded-2xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-black/20 px-4 py-2.5 text-sm text-forest-dark cm-light-surface-ink outline-none focus:border-forest-mid"
                />
                <button
                  onClick={() => void handleLookup()}
                  disabled={!input.trim() || loading}
                  className="px-4 py-2.5 text-xs sm:text-sm font-medium rounded-2xl bg-forest-dark text-white shadow-sm disabled:opacity-50"
                >
                  {loading ? 'Søger...' : 'Find'}
                </button>
              </div>

              {error && (
                <p className="text-xs sm:text-sm text-red-700 dark:text-red-300">{error}</p>
              )}

              {result && (
                <div className="space-y-2">
                  {result.items.length === 0 && (
                    <p className="text-xs sm:text-sm text-forest-mid cm-light-surface-ink-muted opacity-70">
                      Ingen produkter fundet.
                    </p>
                  )}
                  {result.items.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-black/5 dark:border-white/10 bg-white/40 dark:bg-black/15 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm sm:text-base font-serif text-forest-dark cm-light-surface-ink italic truncate">{item.title}</p>
                          <p className="mt-1 text-xs text-forest-mid cm-light-surface-ink-muted opacity-75">
                            {[item.brand, item.barcode].filter(Boolean).join(' · ')}
                          </p>
                        </div>
                        <button
                          onClick={() => onAttach(createRecipeNutritionAttachment(result, item))}
                          disabled={!canAttach}
                          className="shrink-0 btn-botanical !py-2 !px-4 text-xs sm:text-sm disabled:opacity-50"
                        >
                          Knyt til
                        </button>
                      </div>
                      {item.provenance.isFallback && (
                        <p className="mt-2 text-xs text-amber-700 dark:text-amber-300 flex items-center gap-1">
                          <ShieldAlert size={12} /> Fallback-kilde
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      <div className="cm-nutrition-mobile-clearance" aria-hidden="true" />
    </section>
  );
}

