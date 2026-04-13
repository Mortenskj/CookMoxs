import { Recipe, Timer, Ingredient } from '../types';
import {
  ChevronLeft,
  ChevronRight,
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
} from 'lucide-react';
import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [showIngredients, setShowIngredients] = useState(false);
  const [hudMessage, setHudMessage] = useState<string | null>(null);
  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set());
  const contentRef = useRef<HTMLDivElement>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const minSwipeDistance = 50;

  useEffect(() => {
    setHudMessage(null);
  }, [currentStep]);

  // Scroll lock when ingredient overlay is open
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

  // Wake lock
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

  // Swipe handlers
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };
  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };
  const onTouchEnd = () => {
    if (!touchStart || !touchEnd || !recipe) return;
    const distance = touchStart - touchEnd;
    if (distance > minSwipeDistance && safeCurrentStep < steps.length - 1) {
      setCurrentStep(safeCurrentStep + 1);
    } else if (distance < -minSwipeDistance && safeCurrentStep > 0) {
      setCurrentStep(safeCurrentStep - 1);
    }
  };

  const steps = useMemo(() => {
    if (!recipe) return [];
    const prepStep = {
      text: '__PREP__',
      relevantIngredients: recipe.ingredients || [],
    };
    return includePrep ? [prepStep, ...recipe.steps] : recipe.steps;
  }, [recipe, includePrep]);
  const maxStepIndex = Math.max(steps.length - 1, 0);
  const clampedInitialStep = Math.min(Math.max(initialStep, 0), maxStepIndex);
  const safeCurrentStep = Math.min(Math.max(currentStep, 0), maxStepIndex);

  const isPrepStep = includePrep && safeCurrentStep === 0;
  const prepActions = useMemo(() => {
    if (!recipe || !isPrepStep) return [];
    return categorizePrepIngredients(recipe.ingredients || []);
  }, [recipe, isPrepStep]);

  useEffect(() => {
    setCurrentStep(clampedInitialStep);
  }, [clampedInitialStep, recipe?.id]);

  useEffect(() => {
    if (currentStep !== safeCurrentStep) {
      setCurrentStep(safeCurrentStep);
    }
  }, [currentStep, safeCurrentStep]);

  // eslint-disable-next-line react-hooks/exhaustive-deps -- onStepChange is an inline callback; only fire on step change
  useEffect(() => {
    if (onStepChange) onStepChange(safeCurrentStep);
  }, [safeCurrentStep]);

  const toggleChecked = (index: number) => {
    setCheckedIngredients((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  // Empty state
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

  const step = steps[safeCurrentStep];
  const nextStep = steps[safeCurrentStep + 1];

  if (!step) {
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

  const displayHeat = isPrepStep ? null : formatStepHeatDisplay(step);
  const mentionedIngredients = isPrepStep ? [] : (step?.relevantIngredients?.length ? step.relevantIngredients : []);
  const canStartStepTimer =
    !isPrepStep &&
    !!step?.timer &&
    !timers.some((t) => t.description === step.timer!.description && t.duration === step.timer!.duration * 60);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const scale = recipe.scale || 1;
  const hasHud = displayHeat || canStartStepTimer || timers.length > 0;

  return (
    <div
      className="cm-cook-shell cm-cook-viewport cm-cook-grid max-w-md mx-auto relative"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* ═══ TOP ZONE: Topbar + HUD (fixed) ═══ */}
      <div className="cm-cook-top-zone z-30">
        {/* Topbar */}
        <div className="cm-cook-topbar flex justify-between items-center p-3 sm:p-5 gap-2 pt-5 relative">
          <div className="cm-cook-progress-track absolute top-0 left-0 right-0 h-1 z-50">
            <div
              className="cm-cook-progress-bar h-full"
                style={{ width: `${((safeCurrentStep + 1) / steps.length) * 100}%` }}
            />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-bold text-heath-mid uppercase tracking-widest mb-1 truncate">
                Trin {safeCurrentStep + 1} af {steps.length}
            </span>
            <button onClick={onStopCooking} className="cm-cook-danger-button self-start mt-1 text-xs">
              Stop
            </button>
          </div>
          <div className="flex items-center gap-2 shrink-0">
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
            <button
              onClick={() => setShowIngredients(true)}
              className="cm-cook-icon-button"
              aria-label="Alle ingredienser"
              title="Ingredienser"
            >
              <List size={18} />
            </button>
            <button onClick={onExit} className="cm-cook-icon-button" aria-label="Luk cook mode" title="Luk">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* HUD: heat + timer strip (capped height) */}
        {hasHud && (
          <div className="cm-cook-hud-strip">
            {(displayHeat || canStartStepTimer) && (
              <div className="flex flex-col sm:flex-row gap-3 shrink-0">
                {displayHeat && (
                  <div className="cm-cook-heat-chip flex-1 min-w-0 px-4 py-3 rounded-2xl flex items-center justify-center gap-3">
                    <Flame size={18} className="text-red-400 shrink-0" />
                    <span className="text-xs font-bold uppercase tracking-[0.2em] truncate">{displayHeat}</span>
                  </div>
                )}
                {canStartStepTimer && step.timer && (
                  <div className="cm-cook-surface flex-1 rounded-2xl px-4 py-3 flex items-center justify-between gap-3 min-w-0">
                    <div className="flex items-center gap-3 min-w-0">
                      <TimerAnimationIcon type={getTimerAnimationType(step.timer.description)} size={28} />
                      <div className="flex flex-col min-w-0">
                        <span className="text-[0.5rem] sm:text-[0.6rem] font-bold uppercase tracking-widest text-heath-mid opacity-70 truncate">
                          {step.timer.description}
                        </span>
                        <span className="text-lg sm:text-xl font-mono tracking-tighter text-[#F9F9F7] truncate">
                          {formatTime(step.timer.duration * 60)}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        if (timers.length >= 3) {
                          setHudMessage('Du kan højst have 3 timere i gang ad gangen.');
                          return;
                        }
                        setHudMessage(null);
                        setTimers([
                          ...timers,
                          {
                            id: Date.now().toString() + Math.random().toString(),
                            duration: step.timer.duration * 60,
                            remaining: step.timer.duration * 60,
                            description: step.timer.description,
                            active: true,
                          },
                        ]);
                      }}
                      className="cm-cook-icon-button shrink-0"
                      aria-label="Start timer"
                      disabled={timers.length >= 3}
                    >
                      <PlayCircle size={24} />
                    </button>
                  </div>
                )}
              </div>
            )}

            {hudMessage && (
              <div className="cm-inline-feedback cm-inline-feedback--info">{hudMessage}</div>
            )}

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
          </div>
        )}
      </div>

      {/* ═══ MIDDLE ZONE: Step text or prep checklist (fills remaining space, internal scroll) ═══ */}
      <div className="cm-cook-middle-zone relative min-h-0 flex flex-col">
        <div
          ref={contentRef}
          className="cm-cook-step-scroll flex-1 min-h-0 overflow-y-auto custom-scrollbar px-6 sm:px-10 py-4"
        >
          {isPrepStep ? (
            /* ── Prep checklist ── */
            <div className="w-full max-w-[28rem] mx-auto space-y-5">
              <h2 className="font-serif text-xl sm:text-2xl text-[#F9F9F7] italic mb-2">Klargør ingredienser</h2>
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
                            onClick={() => toggleChecked(index)}
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
                            <span className={`text-base sm:text-lg font-serif text-[#F9F9F7] transition-all ${
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
              <p className="text-xs text-white/30 italic mt-4">
                Tryk for at afkrydse · {checkedIngredients.size}/{recipe.ingredients?.length || 0} klar
              </p>
            </div>
          ) : (
            /* ── Regular step text ── */
            <div className="mx-auto flex min-h-full w-full max-w-[28rem] items-center">
              <div className="w-full flex flex-col gap-6">
                <div
                  className="font-serif leading-relaxed text-[#F9F9F7] transition-all duration-300 w-full break-words text-balance"
                  style={{ fontSize: `clamp(${Math.max(COOK_FONT_META[fontSize].px * 0.55, 14)}px, ${COOK_FONT_META[fontSize].px / 6}vw + 8px, ${Math.min(COOK_FONT_META[fontSize].px, 32)}px)` }}
                >
                  {step.text}
                </div>

                {step.reminder && (
                  <div className="cm-cook-surface-subtle rounded-2xl p-4 sm:p-5 flex gap-4 items-start border-[rgba(229,169,59,0.3)]">
                    <div className="bg-[#E5A93B]/20 p-2 rounded-full shrink-0">
                      <AlertCircle className="text-[#E5A93B]" size={24} />
                    </div>
                    <div className="flex flex-col gap-1 min-w-0">
                      <span className="text-[#E5A93B] font-bold uppercase tracking-widest text-xs">{levelMeta.reminderLabel}</span>
                      <p className="text-[#F9F9F7] font-serif text-base sm:text-lg leading-relaxed">{step.reminder}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Navigation row — sits below scrollable text, never overlaps */}
        {!isPrepStep && (
          <div className="shrink-0 px-4 sm:px-6 py-2 flex justify-between items-center">
            <button
              onClick={() => setCurrentStep(Math.max(0, safeCurrentStep - 1))}
              disabled={safeCurrentStep === 0}
              className="cm-cook-nav-button disabled:opacity-0 disabled:pointer-events-none"
              aria-label="Forrige trin"
            >
              <ChevronLeft size={28} />
            </button>
            <button
              onClick={() => {
                if (safeCurrentStep < steps.length - 1) {
                  setCurrentStep(safeCurrentStep + 1);
                } else {
                  onCompleteCooking();
                }
              }}
              className="cm-cook-nav-button"
              aria-label={currentStep === steps.length - 1 ? 'Afslut madlavning' : 'Næste trin'}
            >
              {currentStep === steps.length - 1 ? <CheckCircle size={28} /> : <ChevronRight size={28} />}
            </button>
          </div>
        )}

        {/* Prep step has a simple "next" bar at bottom instead */}
        {isPrepStep && (
          <div className="shrink-0 px-6 py-2">
            <button
              onClick={() => setCurrentStep(1)}
              className="cm-cook-primary-button w-full py-4 rounded-2xl text-sm font-bold uppercase tracking-widest flex items-center justify-center gap-2"
            >
              Start madlavning <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>

      {/* ═══ BOTTOM ZONE: Mentioned ingredients + next step preview (fixed) ═══ */}
      <div className="cm-cook-bottom-zone z-20 px-4 sm:px-6 pb-4 flex flex-col gap-3 pt-3">
        {mentionedIngredients.length > 0 && (
          <div className="cm-cook-surface-subtle rounded-xl p-2.5">
            <span className="text-[0.6rem] font-bold text-white/40 uppercase tracking-widest flex items-center gap-1 mb-1.5">
              <Beaker size={10} /> {levelMeta.ingredientLabel}
            </span>
            <div className="flex flex-col gap-1">
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

        {nextStep && (
          <div className="cm-cook-surface-subtle rounded-2xl p-4">
            <div className="flex items-center justify-between mb-1 gap-3">
              <h3 className="text-[8px] font-bold text-heath-mid/40 uppercase tracking-widest">{levelMeta.nextStepLabel}</h3>
              <span className="text-[8px] font-bold text-white/20 shrink-0">{currentStep + 2} / {steps.length}</span>
            </div>
            <p className="text-xs font-serif italic text-[#F9F9F7]/40 line-clamp-1">
              {nextStep.text === '__PREP__' ? 'Klargør ingredienser' : nextStep.text}
            </p>
          </div>
        )}
      </div>

      {/* ═══ INGREDIENT OVERLAY — true full-screen modal ═══ */}
      {showIngredients && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-label="Alle ingredienser"
        >
          {/* Solid dark backdrop */}
          <div
            className="absolute inset-0 bg-black/85 backdrop-blur-md"
            onClick={() => setShowIngredients(false)}
          />

          {/* Modal content */}
          <div className="relative w-full max-w-md mx-auto h-full flex flex-col bg-[#111914]">
            {/* Modal topbar */}
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

            {/* Scrollable ingredient list */}
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

            {/* Bottom close button — large touch target */}
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
