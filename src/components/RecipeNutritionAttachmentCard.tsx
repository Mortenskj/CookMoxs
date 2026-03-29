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

  if (loadingStatus || !enabled || !nutritionToolsEnabled || !recipeNutritionVisible) {
    return null;
  }

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
        stroke: MACRO_META.carbs.stroke,
        softBg: MACRO_META.carbs.softBg,
        pillText: MACRO_META.carbs.pillText,
      },
    ];

    const totalMacroKcal = macros.reduce((sum, macro) => sum + macro.macroKcal, 0);
    return macros.map((macro) => ({
      ...macro,
      share: totalMacroKcal > 0 ? macro.macroKcal / totalMacroKcal : 0,
    }));
  }, [selectedSnapshot]);
  const donutSegments = useMemo(() => {
    if (!macroOverview) {
      return [];
    }

    const radius = 54;
    const circumference = 2 * Math.PI * radius;
    let offset = 0;

    return macroOverview.map((macro) => {
      const dashLength = macro.share * circumference;
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

  useEffect(() => {
    setShowAllMacroSources(false);
  }, [activeMacroTab, macroBasis, showMacroSources]);

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

      {displayEstimate && recipeNutritionEstimateVisible && (
        <div className="mb-4 rounded-3xl border border-[#D4B886]/40 bg-[#FFF8EA]/80 p-5 text-sm text-forest-mid shadow-sm dark:border-[#D4B886]/20 dark:bg-[#2A1F1A]/50 dark:text-white/80">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-serif text-lg italic text-forest-dark dark:text-white">AI-estimat for opskriften</p>
                <span className="rounded-full bg-[#2A1F1A] px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[#D4B886]">
                  AI-estimat
                </span>
              </div>
              <p className="mt-1 text-xs opacity-75">
                Vejledende beregning ud fra ingredienslisten. Ikke producentdata. Senest opdateret {new Date(displayEstimate.generatedAt).toLocaleString('da-DK')}.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white/70 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-heath-mid dark:bg-black/20">
                {estimateCoverageLabel}
              </span>
              <span className="rounded-full bg-white/70 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-heath-mid dark:bg-black/20">
                Sikkerhed: {displayEstimate.confidence}
              </span>
            </div>
          </div>
          <div className="mt-4 rounded-2xl border border-black/5 bg-white/55 p-4 text-xs leading-relaxed dark:border-white/10 dark:bg-black/20">
            <p className="font-bold uppercase tracking-widest opacity-60">Ingrediensdækning</p>
            <p className="mt-2">
              Medregnet {countedIngredientCount} af {totalIngredientCount} ingredienser.
            </p>
            {omittedIngredients.length > 0 && (
              <p className="mt-2 text-red-700 dark:text-red-300">
                Mangler i estimate: {omittedIngredients.join(', ')}
              </p>
            )}
            {validationWarnings.length > 0 && (
              <ul className="mt-3 space-y-1 text-amber-800 dark:text-amber-200">
                {validationWarnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            )}
          </div>
          <div className="mt-4 rounded-[2rem] border border-black/5 bg-[linear-gradient(135deg,rgba(255,255,255,0.85),rgba(255,248,234,0.92))] p-5 shadow-sm print:hidden dark:border-white/10 dark:bg-[linear-gradient(135deg,rgba(28,22,19,0.92),rgba(42,31,26,0.88))]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.24em] opacity-60">Makrofordeling</p>
                <p className="mt-1 text-xs opacity-75">Diagrammet viser kaloriefordelingen mellem fedt, protein og kulhydrat.</p>
              </div>
              <div className="flex rounded-full border border-black/10 bg-white/70 p-1 dark:border-white/10 dark:bg-black/20">
                <button
                  type="button"
                  onClick={() => setMacroBasis('perPortion')}
                  className={`rounded-full px-4 py-2 text-[11px] font-bold uppercase tracking-widest transition-colors ${macroBasis === 'perPortion' ? 'bg-[#2A1F1A] text-[#F5E7C6]' : 'text-forest-mid dark:text-white/75'}`}
                >
                  Pr. portion
                </button>
                <button
                  type="button"
                  onClick={() => setMacroBasis('per100g')}
                  className={`rounded-full px-4 py-2 text-[11px] font-bold uppercase tracking-widest transition-colors ${macroBasis === 'per100g' ? 'bg-[#2A1F1A] text-[#F5E7C6]' : 'text-forest-mid dark:text-white/75'}`}
                >
                  Pr. 100 g
                </button>
              </div>
            </div>

            {canRenderMacroOverview && selectedSnapshot && macroOverview ? (
              <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,240px)_1fr] lg:items-center">
                <div className="mx-auto flex w-full max-w-[240px] flex-col items-center">
                  <div className="relative flex h-[220px] w-[220px] items-center justify-center">
                    <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90">
                      <circle
                        cx="70"
                        cy="70"
                        r="54"
                        fill="none"
                        stroke="rgba(49,86,73,0.12)"
                        strokeWidth="18"
                      />
                      {donutSegments.map((segment) => (
                        <circle
                          key={segment.key}
                          cx="70"
                          cy="70"
                          r={segment.radius}
                          fill="none"
                          stroke={segment.stroke}
                          strokeWidth="18"
                          strokeLinecap="round"
                          strokeDasharray={segment.dashArray}
                          strokeDashoffset={segment.dashOffset}
                        />
                      ))}
                    </svg>
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="text-[11px] font-bold uppercase tracking-[0.24em] text-forest-mid/70 dark:text-white/60">
                        {macroBasis === 'perPortion' ? 'Pr. portion' : 'Pr. 100 g'}
                      </span>
                      <span className="mt-2 font-serif text-4xl italic text-forest-dark dark:text-white">
                        {formatMacroValue(selectedSnapshot.energyKcal)}
                      </span>
                      <span className="text-sm text-forest-mid/75 dark:text-white/70">kcal</span>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {macroOverview.map((macro) => (
                      <div key={macro.key} className={`rounded-[1.5rem] border border-black/5 px-4 py-4 dark:border-white/10 ${macro.softBg}`}>
                        <p className="text-[11px] font-bold uppercase tracking-[0.24em] opacity-60">{macro.label}</p>
                        <p className={`mt-3 text-2xl font-serif italic ${macro.pillText}`}>{formatMacroValue(macro.grams)} g</p>
                        <p className="mt-1 text-xs opacity-75">{Math.round(macro.share * 100)}% af makro-kalorierne</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-3 text-xs opacity-75">
                    <span>Samlet vægt: {formatMacroValue(displayEstimate.estimatedTotalWeightGrams)} g</span>
                    <span>Visning: {sourceBasisLabel}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-900 dark:border-amber-300/30 dark:bg-amber-950/30 dark:text-amber-100">
                Makrodiagrammet vises kun, naar estimate er komplet og uden manglende ingrediensdaekning.
              </div>
            )}
          </div>

          <div className="hidden print:block mt-4 rounded-2xl border border-black/10 bg-white p-4 text-black">
            <p className="text-sm font-bold uppercase tracking-widest">AI-makroestimat</p>
            <p className="mt-2 text-xs">Vejledende beregning ud fra ingredienslisten. {estimateCoverageLabel}. Sikkerhed: {displayEstimate.confidence}.</p>
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
          <div className="mt-4 rounded-2xl border border-black/5 bg-white/55 p-4 text-xs leading-relaxed dark:border-white/10 dark:bg-black/20">
            <p className="font-bold uppercase tracking-widest opacity-60">Antagelser</p>
            <p className="mt-2">{displayEstimate.rationale}</p>
            <p className="mt-3 opacity-75">
              Estimeret samlet vægt: {displayEstimate.estimatedTotalWeightGrams ?? '-'} g
            </p>
          </div>
          {ingredientBreakdown.length > 0 && (
            <div className="mt-4 rounded-2xl border border-black/5 bg-white/55 p-4 text-xs leading-relaxed dark:border-white/10 dark:bg-black/20">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-bold uppercase tracking-widest opacity-60">Makrokilder</p>
                  <p className="mt-1 opacity-75">Se hvor {MACRO_META[activeMacroTab].label.toLowerCase()} kommer fra i estimatet.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowMacroSources((current) => !current)}
                  className="inline-flex items-center gap-2 rounded-full border border-black/10 dark:border-white/10 bg-white/70 px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-forest-mid transition-colors hover:bg-white/90 dark:bg-black/20 dark:text-white/80 dark:hover:bg-black/30"
                  aria-expanded={showMacroSources}
                >
                  {showMacroSources ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  {showMacroSources ? 'Skjul kilder' : 'Se hvor macroene kommer fra'}
                </button>
              </div>

              {showMacroSources && (
                <>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {(['protein', 'fat', 'carbs'] as MacroTab[]).map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setActiveMacroTab(tab)}
                        className={`rounded-full px-4 py-2 text-[11px] font-bold uppercase tracking-widest transition-colors ${
                          activeMacroTab === tab
                            ? 'bg-[#2A1F1A] text-[#F5E7C6]'
                            : 'bg-white/70 text-forest-mid hover:bg-white/90 dark:bg-black/20 dark:text-white/75 dark:hover:bg-black/30'
                        }`}
                      >
                        {MACRO_META[tab].label}
                      </button>
                    ))}
                  </div>

                  <p className="mt-4 opacity-75">
                    Viser bidrag {sourceBasisLabel}. Ingredienserne er sorteret efter stoerste bidrag.
                  </p>

                  <ul className="mt-3 space-y-2">
                    {macroSourceItems.map((item) => (
                      <li key={`${activeMacroTab}-${item.ingredientName}`} className="rounded-2xl bg-white/60 px-3 py-3 dark:bg-black/20">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-forest-dark dark:text-white">{item.ingredientName}</p>
                            <p className="mt-1 opacity-80">
                              {MACRO_META[activeMacroTab].label} {formatMacroValue(item.scaledValue)} g
                              {item.scaledWeight != null ? ` fra ca. ${formatMacroValue(item.scaledWeight)} g` : ''}
                            </p>
                            <p className="mt-1 opacity-75">{formatIngredientMacroLine(item)}</p>
                            {item.note && <p className="mt-1 opacity-75">{item.note}</p>}
                          </div>
                          <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${MACRO_META[activeMacroTab].softBg} ${MACRO_META[activeMacroTab].pillText}`}>
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
                      className="mt-4 inline-flex items-center gap-2 rounded-full border border-black/10 dark:border-white/10 bg-white/70 px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-forest-mid transition-colors hover:bg-white/90 dark:bg-black/20 dark:text-white/80 dark:hover:bg-black/30"
                    >
                      {showAllMacroSources ? 'Vis faerre' : 'Vis flere'}
                    </button>
                  )}
                </>
              )}
            </div>
          )}
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

