import { Recipe, Timer, Ingredient } from '../types';
import {
  PlayCircle,
  PauseCircle,
  CheckCircle,
  X,
  Flame,
  Beaker,
  ChefHat,
  List,
  Type,
  AlertCircle,
  Check,
  Plus,
  Eye,
  EyeOff,
} from 'lucide-react';
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { LEVEL_META, type UserLevel } from '../config/cookingLevels';
import { COOK_FONT_META, type CookFontSize } from '../config/cookDisplay';
import { formatStepHeatDisplay } from '../services/cookModeHeuristics';
import { getWakeLockEnabled } from '../hooks/useWakeLockEnabled';
import { TimerAnimationIcon, getTimerAnimationType } from './TimerAnimationIcon';

/* ── Prep step checklist helpers ── */

interface PrepAction {
  label: string;
  items: { ingredient: Ingredient; index: number }[];
}

function categorizePrepIngredients(ingredients: Ingredient[]): PrepAction[] {
  const weigh: PrepAction = { label: 'Vej af', items: [] };
  const measure: PrepAction = { label: 'Mål op', items: [] };
  const prepare: PrepAction = { label: 'Klargør', items: [] };
  const other: PrepAction = { label: 'Find frem', items: [] };

  const weightUnits = ['g', 'kg'];
  const volumeUnits = ['dl', 'cl', 'ml', 'l', 'tsk', 'spsk'];
  const prepWords = ['hakke', 'hak', 'revet', 'reven', 'skåret', 'tern', 'skive', 'finthak', 'snit', 'pil'];

  ingredients.forEach((ing, index) => {
    const entry = { ingredient: ing, index };
    const nameLower = ing.name.toLowerCase();
    const needsPrep = prepWords.some((w) => nameLower.includes(w));

    if (needsPrep) {
      prepare.items.push(entry);
    } else if (weightUnits.includes(ing.unit.toLowerCase())) {
      weigh.items.push(entry);
    } else if (volumeUnits.includes(ing.unit.toLowerCase())) {
      measure.items.push(entry);
    } else {
      other.items.push(entry);
    }
  });

  return [weigh, measure, prepare, other].filter((a) => a.items.length > 0);
}

/* ── Main component ── */

interface CookViewProps {
  recipe: Recipe | null;
  userLevel: UserLevel;
  fontSize: CookFontSize;
  setFontSize: (size: CookFontSize | ((prev: CookFontSize) => CookFontSize)) => void;
  initialStep?: number;
  includePrep?: boolean;
  onStepChange?: (step: number) => void;
  onExit: () => void;
  onCompleteCooking: () => void;
  onStopCooking: () => void;
  timers: Timer[];
  setTimers: React.Dispatch<React.SetStateAction<Timer[]>>;
}

export function CookView({
  recipe,
  userLevel,
  fontSize,
  setFontSize,
  initialStep = 0,
  includePrep = false,
  onStepChange,
  onExit,
  onCompleteCooking,
  onStopCooking,
  timers,
  setTimers,
}: CookViewProps) {
  const levelMeta = LEVEL_META[userLevel];

  /* ── State ── */
  const [activeStepIndex, setActiveStepIndex] = useState(initialStep);
  const [showInlineIngredients, setShowInlineIngredients] = useState(false);
  const [showIngredients, setShowIngredients] = useState(false);
  const [hudMessage, setHudMessage] = useState<string | null>(null);
  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set());
  const [showManualTimer, setShowManualTimer] = useState(false);
  const [manualMinutes, setManualMinutes] = useState('5');
  const [manualLabel, setManualLabel] = useState('Timer');

  /* ── Refs ── */
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);
  const isUserScrolling = useRef(true);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── Derived data ── */
  const steps = useMemo(() => {
    if (!recipe) return [];
    const prepStep = {
      text: '__PREP__',
      relevantIngredients: recipe.ingredients || [],
    };
    return includePrep ? [prepStep, ...recipe.steps] : recipe.steps;
  }, [recipe, includePrep]);

  const maxStepIndex = Math.max(steps.length - 1, 0);
  const safeActiveStep = Math.min(Math.max(activeStepIndex, 0), maxStepIndex);

  const prepActions = useMemo(() => {
    if (!recipe || !includePrep) return [];
    return categorizePrepIngredients(recipe.ingredients || []);
  }, [recipe, includePrep]);

  const scale = recipe?.scale || 1;

  /* ── Scroll-based active step detection ── */
  const updateActiveFromScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container || steps.length === 0) return;

    const containerRect = container.getBoundingClientRect();
    const containerCenter = containerRect.top + containerRect.height * 0.4; // Bias slightly upward

    let closestIndex = 0;
    let closestDistance = Infinity;

    stepRefs.current.forEach((el, i) => {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const elCenter = rect.top + rect.height / 2;
      const distance = Math.abs(elCenter - containerCenter);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = i;
      }
    });

    if (closestIndex !== activeStepIndex) {
      setActiveStepIndex(closestIndex);
    }
  }, [activeStepIndex, steps.length]);

  const handleScroll = useCallback(() => {
    if (!isUserScrolling.current) return;
    updateActiveFromScroll();
  }, [updateActiveFromScroll]);

  /* ── Auto-scroll to step ── */
  const scrollToStep = useCallback((index: number, smooth = true) => {
    const el = stepRefs.current[index];
    if (!el || !scrollContainerRef.current) return;

    isUserScrolling.current = false;
    el.scrollIntoView({
      behavior: smooth ? 'smooth' : 'instant',
      block: 'center',
    });

    // Re-enable user scroll detection after animation
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      isUserScrolling.current = true;
    }, smooth ? 600 : 100);
  }, []);

  /* ── Initial scroll to starting step ── */
  useEffect(() => {
    const clampedInitial = Math.min(Math.max(initialStep, 0), maxStepIndex);
    setActiveStepIndex(clampedInitial);
    // Delay to let layout settle
    const timeout = setTimeout(() => {
      scrollToStep(clampedInitial, false);
    }, 100);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipe?.id]);

  /* ── Notify parent of step changes ── */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (onStepChange) onStepChange(safeActiveStep);
  }, [safeActiveStep]);

  /* ── Clear HUD message on step change ── */
  useEffect(() => {
    setHudMessage(null);
  }, [safeActiveStep]);

  /* ── Scroll lock for ingredient overlay ── */
  useEffect(() => {
    if (!showIngredients) return;
    const prevOverflow = document.body.style.overflow;
    const prevTouch = document.body.style.touchAction;
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.touchAction = prevTouch;
    };
  }, [showIngredients]);

  /* ── Wake lock ── */
  useEffect(() => {
    if (!getWakeLockEnabled()) return;
    let wakeLock: any = null;
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await (navigator as any).wakeLock.request('screen');
        }
      } catch (err: any) {
        console.warn(`Wake lock not available: ${err.message}`);
      }
    };
    requestWakeLock();
    return () => { if (wakeLock) wakeLock.release(); };
  }, []);

  /* ── Cleanup ── */
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, []);

  /* ── Prep checklist ── */
  const toggleChecked = (index: number) => {
    setCheckedIngredients((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  /* ── Timer helpers ── */
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const startStepTimer = useCallback((step: any) => {
    if (!step?.timer || step.timer.duration <= 0) return;
    if (timers.length >= 3) {
      setHudMessage('Du kan højst have 3 timere i gang ad gangen.');
      return;
    }
    setHudMessage(null);
    setTimers((prev) => [
      ...prev,
      {
        id: Date.now().toString() + Math.random().toString(),
        duration: step.timer.duration * 60,
        remaining: step.timer.duration * 60,
        description: step.timer.description,
        active: true,
      },
    ]);
  }, [timers.length, setTimers]);

  const startManualTimer = useCallback(() => {
    const mins = parseInt(manualMinutes, 10);
    if (!mins || mins <= 0 || mins > 999) return;
    if (timers.length >= 3) {
      setHudMessage('Du kan højst have 3 timere i gang ad gangen.');
      return;
    }
    setTimers((prev) => [
      ...prev,
      {
        id: Date.now().toString() + Math.random().toString(),
        duration: mins * 60,
        remaining: mins * 60,
        description: manualLabel.trim() || 'Timer',
        active: true,
      },
    ]);
    setShowManualTimer(false);
    setManualMinutes('5');
    setManualLabel('Timer');
  }, [manualMinutes, manualLabel, timers.length, setTimers]);

  /* ── Empty state ── */
  if (!recipe) {
    return (
      <div className="cm-cook-shell p-4 pb-24 max-w-md mx-auto h-full flex flex-col items-center justify-center text-center">
        <div className="cm-cook-surface w-24 h-24 rounded-[28px] flex items-center justify-center mb-8">
          <ChefHat size={48} className="text-heath-mid" />
        </div>
        <h2 className="text-3xl font-serif mb-4 italic text-[#F9F9F7]">Ingen opskrift valgt</h2>
        <p className="text-heath-mid mb-10 max-w-xs italic opacity-70 leading-relaxed">
          Gå til biblioteket eller importer en ny opskrift for at starte madlavningen.
        </p>
        <button onClick={onExit} className="cm-cook-secondary-button">Gå tilbage</button>
      </div>
    );
  }

  if (steps.length === 0) {
    return (
      <div className="cm-cook-shell p-4 pb-24 max-w-md mx-auto h-full flex flex-col items-center justify-center text-center">
        <div className="cm-cook-surface w-24 h-24 rounded-[28px] flex items-center justify-center mb-8">
          <ChefHat size={48} className="text-heath-mid" />
        </div>
        <h2 className="text-3xl font-serif mb-4 italic text-[#F9F9F7]">Ingen trin tilgængelige</h2>
        <p className="text-heath-mid mb-10 max-w-xs italic opacity-70 leading-relaxed">
          Opskriften mangler trin eller kunne ikke gendannes sikkert i cook mode.
        </p>
        <button onClick={onExit} className="cm-cook-secondary-button">Gå tilbage</button>
      </div>
    );
  }

  /* ── Step-level helpers ── */
  const canStartTimer = (step: any, stepIndex: number) => {
    const isPrepStep = includePrep && stepIndex === 0;
    const timerKind = step?.timer?.kind || (step?.timer?.duration ? 'exact' : 'none');
    return (
      !isPrepStep &&
      !!step?.timer &&
      step.timer.duration > 0 &&
      (timerKind === 'exact' || timerKind === 'approximate') &&
      !timers.some((t) => t.description === step.timer!.description && t.duration === step.timer!.duration * 60)
    );
  };

  const stepFontSize = `clamp(${Math.max(COOK_FONT_META[fontSize].px * 0.55, 14)}px, ${COOK_FONT_META[fontSize].px / 6}vw + 8px, ${Math.min(COOK_FONT_META[fontSize].px, 32)}px)`;

  return (
    <div className="cm-cook-shell cm-cook-viewport flex flex-col max-w-md mx-auto relative">
      {/* ═══ FIXED TOP: Topbar + Timer Dock ═══ */}
      <div className="cm-cook-top-zone z-30 shrink-0">
        {/* Topbar */}
        <div className="cm-cook-topbar flex justify-between items-center p-3 sm:p-5 gap-2 pt-5 relative">
          {/* Progress bar */}
          <div className="cm-cook-progress-track absolute top-0 left-0 right-0 h-1 z-50">
            <div
              className="cm-cook-progress-bar h-full"
              style={{ width: `${((safeActiveStep + 1) / steps.length) * 100}%` }}
            />
          </div>

          {/* Left: step counter + stop */}
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-bold text-heath-mid uppercase tracking-widest mb-1 truncate">
              Trin {safeActiveStep + 1} af {steps.length}
            </span>
            <button onClick={onStopCooking} className="cm-cook-danger-button self-start mt-1 text-xs">
              Stop
            </button>
          </div>

          {/* Right: controls */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Ingredient toggle */}
            <button
              onClick={() => setShowInlineIngredients((prev) => !prev)}
              className={`cm-cook-icon-button ${showInlineIngredients ? 'ring-1 ring-white/30' : ''}`}
              aria-label={showInlineIngredients ? 'Skjul ingredienser' : 'Vis ingredienser'}
              title={showInlineIngredients ? 'Skjul ingredienser' : 'Vis ingredienser'}
            >
              {showInlineIngredients ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
            {/* Font size */}
            <button
              onClick={() =>
                setFontSize((prev) =>
                  prev === 'small' ? 'normal' : prev === 'normal' ? 'large' : prev === 'large' ? 'xlarge' : 'small',
                )
              }
              className="cm-cook-icon-button"
              aria-label="Skift tekststørrelse"
              title={`Tekst: ${COOK_FONT_META[fontSize].preview}`}
            >
              <Type size={18} />
            </button>
            {/* Full ingredient list */}
            <button
              onClick={() => setShowIngredients(true)}
              className="cm-cook-icon-button"
              aria-label="Alle ingredienser"
              title="Ingredienser"
            >
              <List size={18} />
            </button>
            {/* Exit */}
            <button onClick={onExit} className="cm-cook-icon-button" aria-label="Luk cook mode" title="Luk">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Timer dock — running timers + manual timer add */}
        {(timers.length > 0 || showManualTimer) && (
          <div className="cm-cook-hud-strip">
            {hudMessage && (
              <div className="cm-inline-feedback cm-inline-feedback--info">{hudMessage}</div>
            )}

            {/* Running timers */}
            {timers.length > 0 && (
              <div className="cm-cook-surface rounded-[22px] flex flex-col max-h-[8.5rem] overflow-y-auto custom-scrollbar">
                {timers.map((t) => (
                  <div key={t.id} className="px-4 py-2 flex items-center justify-between gap-2 border-b border-white/5 last:border-0">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <TimerAnimationIcon type={getTimerAnimationType(t.description)} size={22} />
                      <span className="text-sm font-serif italic text-[#F9F9F7] truncate">{t.description}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-lg font-mono tracking-tighter ${t.remaining === 0 ? 'text-red-400' : 'text-[#F9F9F7]'}`}>
                        {formatTime(t.remaining)}
                      </span>
                      <button
                        onClick={() => setTimers(timers.map((timer) => (timer.id === t.id ? { ...timer, active: !timer.active } : timer)))}
                        className="cm-cook-icon-button cm-cook-icon-button--compact"
                        aria-label={t.active && t.remaining > 0 ? 'Pause timer' : 'Start timer'}
                      >
                        {t.active && t.remaining > 0 ? <PauseCircle size={22} /> : <PlayCircle size={22} />}
                      </button>
                      <button
                        onClick={() => setTimers(timers.filter((timer) => timer.id !== t.id))}
                        className="cm-cook-icon-button cm-cook-icon-button--compact opacity-80"
                        aria-label="Fjern timer"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Manual timer form */}
            {showManualTimer && (
              <div className="cm-cook-surface rounded-2xl p-4 flex flex-col gap-3">
                <span className="text-xs font-bold uppercase tracking-widest text-heath-mid/60">Manuel timer</span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={manualLabel}
                    onChange={(e) => setManualLabel(e.target.value)}
                    placeholder="Navn (valgfrit)"
                    className="flex-1 min-w-0 bg-white/8 border border-white/10 rounded-xl px-3 py-2 text-sm text-[#F9F9F7] placeholder:text-white/30 focus:outline-none focus:border-white/25"
                  />
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={manualMinutes}
                      onChange={(e) => setManualMinutes(e.target.value)}
                      min="1"
                      max="999"
                      className="w-16 bg-white/8 border border-white/10 rounded-xl px-3 py-2 text-sm text-[#F9F9F7] text-center focus:outline-none focus:border-white/25"
                    />
                    <span className="text-xs text-white/40">min</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowManualTimer(false)}
                    className="cm-cook-secondary-button flex-1 py-2 rounded-xl text-xs"
                  >
                    Annuller
                  </button>
                  <button
                    onClick={startManualTimer}
                    className="cm-cook-primary-button flex-1 py-2 rounded-xl text-xs"
                  >
                    Start
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Manual timer trigger — always visible in topbar area when no manual form open */}
        {!showManualTimer && timers.length < 3 && (
          <div className="px-4 pb-2 flex justify-end">
            <button
              onClick={() => setShowManualTimer(true)}
              className="text-xs text-white/40 hover:text-white/60 flex items-center gap-1 transition-colors"
              aria-label="Tilføj manuel timer"
            >
              <Plus size={14} /> Timer
            </button>
          </div>
        )}
      </div>

      {/* ═══ SCROLLABLE FLOW: All steps ═══ */}
      <div
        ref={scrollContainerRef}
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain custom-scrollbar"
        onScroll={handleScroll}
      >
        <div className="px-4 sm:px-6 py-4 space-y-4 pb-32">
          {steps.map((step, stepIndex) => {
            const isPrepStep = includePrep && stepIndex === 0;
            const isActive = stepIndex === safeActiveStep;
            const isPast = stepIndex < safeActiveStep;
            const displayHeat = isPrepStep ? null : formatStepHeatDisplay(step);
            const hasTimer = canStartTimer(step, stepIndex);
            const mentionedIngredients = isPrepStep ? [] : (step?.relevantIngredients?.length ? step.relevantIngredients : []);
            const stepNumber = includePrep ? stepIndex : stepIndex + 1;

            return (
              <div
                key={stepIndex}
                ref={(el) => { stepRefs.current[stepIndex] = el; }}
                className={`cm-cook-flow-step rounded-2xl transition-all duration-300 ${
                  isActive
                    ? 'cm-cook-flow-step--active'
                    : isPast
                      ? 'cm-cook-flow-step--past'
                      : 'cm-cook-flow-step--upcoming'
                }`}
                onClick={() => {
                  if (!isActive) {
                    setActiveStepIndex(stepIndex);
                    scrollToStep(stepIndex);
                  }
                }}
              >
                {isPrepStep ? (
                  /* ── Prep checklist card ── */
                  <div className="p-5 sm:p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="cm-cook-flow-step-number">
                        <Beaker size={16} />
                      </div>
                      <h2 className="font-serif text-lg sm:text-xl text-[#F9F9F7] italic">Klargør ingredienser</h2>
                    </div>
                    {isActive && (
                      <div className="space-y-4 mt-3">
                        {prepActions.map((action) => (
                          <div key={action.label}>
                            <p className="text-xs font-bold uppercase tracking-widest text-heath-mid/60 mb-2">{action.label}</p>
                            <ul className="space-y-1">
                              {action.items.map(({ ingredient: ing, index }) => {
                                const checked = checkedIngredients.has(index);
                                const amountStr = ing.amount ? (typeof ing.amount === 'number' ? ing.amount * scale : ing.amount) : '';
                                return (
                                  <li key={index}>
                                    <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); toggleChecked(index); }}
                                      className={`w-full text-left flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all ${
                                        checked
                                          ? 'bg-white/5 opacity-40'
                                          : 'bg-white/8 hover:bg-white/12 active:bg-white/15'
                                      }`}
                                    >
                                      <span className={`shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                                        checked ? 'border-green-400 bg-green-400/20' : 'border-white/25'
                                      }`}>
                                        {checked && <Check size={14} className="text-green-400" />}
                                      </span>
                                      <span className={`text-base font-serif text-[#F9F9F7] transition-all ${
                                        checked ? 'line-through' : ''
                                      }`}>
                                        <strong>{amountStr} {ing.unit}</strong> {ing.name}
                                      </span>
                                    </button>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        ))}
                        <p className="text-xs text-white/30 italic mt-2">
                          Tryk for at afkrydse · {checkedIngredients.size}/{recipe.ingredients?.length || 0} klar
                        </p>
                      </div>
                    )}
                    {!isActive && (
                      <p className="text-sm text-white/40 italic font-serif mt-1">
                        {checkedIngredients.size}/{recipe.ingredients?.length || 0} ingredienser klar
                      </p>
                    )}
                  </div>
                ) : (
                  /* ── Regular step card ── */
                  <div className="p-5 sm:p-6">
                    {/* Step header: number + heat */}
                    <div className="flex items-start gap-3 mb-3">
                      <div className={`cm-cook-flow-step-number ${isPast ? 'bg-green-500/20 border-green-500/40' : ''}`}>
                        {isPast ? (
                          <Check size={14} className="text-green-400" />
                        ) : (
                          <span className="text-xs font-bold">{stepNumber}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                        {displayHeat && (
                          <div className="cm-cook-heat-chip px-3 py-1 rounded-full flex items-center gap-1.5 text-xs">
                            <Flame size={12} className="text-red-400 shrink-0" />
                            <span className="font-bold uppercase tracking-wider truncate">{displayHeat}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Step text */}
                    <div
                      className={`font-serif leading-relaxed text-[#F9F9F7] transition-all duration-300 break-words ${
                        !isActive ? 'line-clamp-3' : ''
                      }`}
                      style={{ fontSize: isActive ? stepFontSize : `calc(${stepFontSize} * 0.85)` }}
                    >
                      {step.text}
                    </div>

                    {/* Reminder (only when active) */}
                    {isActive && step.reminder && (
                      <div className="cm-cook-surface-subtle rounded-2xl p-4 flex gap-3 items-start mt-4 border-[rgba(229,169,59,0.3)]">
                        <div className="bg-[#E5A93B]/20 p-2 rounded-full shrink-0">
                          <AlertCircle className="text-[#E5A93B]" size={20} />
                        </div>
                        <div className="flex flex-col gap-1 min-w-0">
                          <span className="text-[#E5A93B] font-bold uppercase tracking-widest text-xs">{levelMeta.reminderLabel}</span>
                          <p className="text-[#F9F9F7] font-serif text-sm sm:text-base leading-relaxed">{step.reminder}</p>
                        </div>
                      </div>
                    )}

                    {/* Timer start button (only when active and has startable timer) */}
                    {isActive && hasTimer && step.timer && (
                      <div className="mt-4">
                        <button
                          onClick={(e) => { e.stopPropagation(); startStepTimer(step); }}
                          className="cm-cook-surface rounded-2xl px-4 py-3 flex items-center justify-between gap-3 w-full hover:bg-white/8 transition-colors"
                          disabled={timers.length >= 3}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <TimerAnimationIcon type={getTimerAnimationType(step.timer.description)} size={24} />
                            <div className="flex flex-col min-w-0 text-left">
                              <span className="text-[0.5rem] font-bold uppercase tracking-widest text-heath-mid opacity-70 truncate">
                                {step.timer.description}
                              </span>
                              <span className="text-lg font-mono tracking-tighter text-[#F9F9F7]">
                                {formatTime(step.timer.duration * 60)}
                              </span>
                            </div>
                          </div>
                          <PlayCircle size={24} className="text-white/70 shrink-0" />
                        </button>
                      </div>
                    )}

                    {/* Inline ingredients (toggle-based) */}
                    {isActive && showInlineIngredients && mentionedIngredients.length > 0 && (
                      <div className="cm-cook-surface-subtle rounded-xl p-3 mt-4">
                        <span className="text-[0.6rem] font-bold text-white/40 uppercase tracking-widest flex items-center gap-1 mb-1.5">
                          <Beaker size={10} /> {levelMeta.ingredientLabel}
                        </span>
                        <div className="flex flex-col gap-0.5">
                          {mentionedIngredients.map((ing, i) => {
                            const amountStr = ing.amount ? (typeof ing.amount === 'number' ? ing.amount * scale : ing.amount) : '';
                            return (
                              <span key={i} className="text-white/70 text-sm">
                                <strong className="text-white/90">{amountStr} {ing.unit}</strong> {ing.name}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* ── Completion card ── */}
          <div className="text-center py-8 space-y-4">
            <button
              onClick={onCompleteCooking}
              className="cm-cook-primary-button px-8 py-4 rounded-2xl text-sm font-bold uppercase tracking-widest inline-flex items-center gap-2"
            >
              <CheckCircle size={20} /> Afslut madlavning
            </button>
          </div>
        </div>
      </div>

      {/* ═══ INGREDIENT OVERLAY — full-screen modal ═══ */}
      {showIngredients && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-label="Alle ingredienser"
        >
          <div
            className="absolute inset-0 bg-black/85 backdrop-blur-md"
            onClick={() => setShowIngredients(false)}
          />

          <div className="relative w-full max-w-md mx-auto h-full flex flex-col bg-[#111914]">
            <div className="cm-cook-topbar flex items-center justify-between gap-3 p-5 sm:p-6 shrink-0">
              <h2 className="text-xl font-serif text-[#F9F9F7] italic">Alle ingredienser</h2>
              <button
                onClick={() => setShowIngredients(false)}
                className="cm-cook-icon-button"
                aria-label="Luk ingrediensoversigt"
              >
                <X size={22} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-4 sm:px-6">
              <ul className="divide-y divide-white/8">
                {(recipe.ingredients || []).map((ing, i) => {
                  const amountStr = ing.amount ? (typeof ing.amount === 'number' ? ing.amount * scale : ing.amount) : '';
                  const fullStr = `${amountStr} ${ing.unit} ${ing.name}`.trim();
                  return (
                    <li key={i} className="py-4 text-lg font-serif first:pt-2 last:pb-2">
                      <span className="text-[#F9F9F7]">{fullStr}</span>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="shrink-0 p-5 sm:p-6 pt-3">
              <button
                onClick={() => setShowIngredients(false)}
                className="cm-cook-secondary-button w-full py-4 rounded-2xl text-base font-bold uppercase tracking-widest"
              >
                Luk ingredienser
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
