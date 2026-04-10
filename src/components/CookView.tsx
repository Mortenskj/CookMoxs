import { Recipe, Timer } from '../types';
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
} from 'lucide-react';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { LEVEL_META, type UserLevel } from '../config/cookingLevels';
import { COOK_FONT_META, type CookFontSize } from '../config/cookDisplay';
import { formatStepHeatDisplay } from '../services/cookModeHeuristics';
import { getWakeLockEnabled } from '../hooks/useWakeLockEnabled';

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
  const contentRef = useRef<HTMLDivElement>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const minSwipeDistance = 50;

  useEffect(() => {
    if (onStepChange) onStepChange(currentStep);
  }, [currentStep, onStepChange]);

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
    if (distance > minSwipeDistance && currentStep < recipe.steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else if (distance < -minSwipeDistance && currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const steps = useMemo(() => {
    if (!recipe) return [];
    const prepStep = {
      text: 'Gør klar til madlavning. Find alle ingredienser frem og vej dem af, så du er klar til at gå i gang.',
      relevantIngredients: recipe.ingredients || [],
    };
    return includePrep ? [prepStep, ...recipe.steps] : recipe.steps;
  }, [recipe, includePrep]);

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

  const step = steps[currentStep];
  const nextStep = steps[currentStep + 1];
  const displayHeat = formatStepHeatDisplay(step);
  const mentionedIngredients = step.relevantIngredients?.length ? step.relevantIngredients : [];
  const canStartStepTimer =
    !!step.timer &&
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
        <div className="cm-cook-topbar flex justify-between items-center p-4 sm:p-6 gap-2 pt-6 relative">
          <div className="cm-cook-progress-track absolute top-0 left-0 right-0 h-1 z-50">
            <div
              className="cm-cook-progress-bar h-full"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-bold text-heath-mid uppercase tracking-widest mb-1 truncate">
              Trin {currentStep + 1} af {steps.length}
            </span>
            <button onClick={onStopCooking} className="cm-cook-danger-button self-start mt-1">
              Stop madlavning
            </button>
          </div>
          <div className="cm-cook-topbar-controls shrink-0">
            <button
              onClick={() =>
                setFontSize((prev) =>
                  prev === 'small' ? 'normal' : prev === 'normal' ? 'large' : prev === 'large' ? 'xlarge' : 'small',
                )
              }
              className="cm-cook-icon-button cm-cook-topbar-action w-auto px-3 sm:px-4"
              aria-label="Skift tekststørrelse"
            >
              <div className="flex items-center gap-2">
                <Type size={18} className="sm:w-5 sm:h-5" />
                <span className="cm-cook-topbar-preview hidden sm:inline text-[10px] font-bold uppercase tracking-widest text-white/60">
                  {COOK_FONT_META[fontSize].preview}
                </span>
              </div>
            </button>
            <button
              onClick={() => setShowIngredients(true)}
              className="cm-cook-icon-button cm-cook-topbar-action w-auto px-3 sm:px-4 flex items-center gap-2"
              aria-label="Alle ingredienser"
            >
              <List size={18} className="sm:w-5 sm:h-5" />
              <span className="cm-cook-topbar-action-label text-xs font-bold uppercase tracking-widest hidden sm:inline">
                Ingredienser
              </span>
            </button>
            <button onClick={onExit} className="cm-cook-icon-button cm-cook-topbar-action" aria-label="Luk cook mode">
              <X size={18} className="sm:w-5 sm:h-5" />
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
                    <div className="flex flex-col min-w-0 pr-2">
                      <span className="text-[8px] font-bold uppercase tracking-widest text-heath-mid opacity-70 truncate">
                        {step.timer.description}
                      </span>
                      <span className="text-xl font-mono tracking-tighter text-[#F9F9F7] truncate">
                        {formatTime(step.timer.duration * 60)}
                      </span>
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
                  <div key={t.id} className="px-4 py-2 flex items-center justify-between gap-3 border-b border-white/5 last:border-0">
                    <div className="flex-1 min-w-0 pr-2">
                      <span className="text-sm font-serif italic text-[#F9F9F7] truncate block">{t.description}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`text-xl font-mono tracking-tighter ${t.remaining === 0 ? 'text-red-400' : 'text-[#F9F9F7]'}`}>
                        {formatTime(t.remaining)}
                      </span>
                      <button
                        onClick={() => setTimers(timers.map((timer) => (timer.id === t.id ? { ...timer, active: !timer.active } : timer)))}
                        className="cm-cook-icon-button cm-cook-icon-button--compact"
                        aria-label={t.active && t.remaining > 0 ? 'Pause timer' : 'Start timer'}
                      >
                        {t.active && t.remaining > 0 ? <PauseCircle size={24} /> : <PlayCircle size={24} />}
                      </button>
                      <button
                        onClick={() => setTimers(timers.filter((timer) => timer.id !== t.id))}
                        className="cm-cook-icon-button cm-cook-icon-button--compact opacity-80"
                        aria-label="Fjern timer"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ═══ MIDDLE ZONE: Step text (fills remaining space, internal scroll) ═══ */}
      <div className="cm-cook-middle-zone relative min-h-0">
        <div
          ref={contentRef}
          className="cm-cook-step-scroll h-full overflow-y-auto custom-scrollbar px-16 sm:px-20 py-6"
        >
          <div className="mx-auto flex min-h-full w-full max-w-[28rem] items-center">
            <div className="w-full flex flex-col gap-6">
              <div
                className="font-serif leading-relaxed text-[#F9F9F7] transition-all duration-300 w-full break-words text-balance"
                style={{ fontSize: `${COOK_FONT_META[fontSize].px}px` }}
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
                    <p className="text-[#F9F9F7] font-serif text-lg sm:text-xl leading-relaxed">{step.reminder}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Navigation buttons — fixed within middle zone */}
        <div className="absolute inset-y-0 left-0 right-0 px-2 sm:px-3 flex justify-between items-center pointer-events-none">
          <button
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
            className="cm-cook-nav-button pointer-events-auto disabled:opacity-0 disabled:pointer-events-none"
            aria-label="Forrige trin"
          >
            <ChevronLeft size={28} />
          </button>
          <button
            onClick={() => {
              if (currentStep < steps.length - 1) {
                setCurrentStep(currentStep + 1);
              } else {
                onCompleteCooking();
              }
            }}
            className="cm-cook-nav-button pointer-events-auto"
            aria-label={currentStep === steps.length - 1 ? 'Afslut madlavning' : 'Næste trin'}
          >
            {currentStep === steps.length - 1 ? <CheckCircle size={28} /> : <ChevronRight size={28} />}
          </button>
        </div>
      </div>

      {/* ═══ BOTTOM ZONE: Mentioned ingredients + next step preview (fixed) ═══ */}
      <div className="cm-cook-bottom-zone z-20 px-4 sm:px-6 pb-4 flex flex-col gap-3 pt-3">
        {mentionedIngredients.length > 0 && (
          <div className="cm-cook-surface-subtle rounded-xl p-2.5">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="text-xs font-bold text-white/40 uppercase tracking-widest flex items-center gap-1 mr-1">
                <Beaker size={10} /> {levelMeta.ingredientLabel}:
              </span>
              {mentionedIngredients.map((ing, i) => {
                const amountStr = ing.amount ? (typeof ing.amount === 'number' ? ing.amount * scale : ing.amount) : '';
                return (
                  <span key={i} className="text-white/70 text-xs">
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
            <p className="text-xs font-serif italic text-[#F9F9F7]/40 line-clamp-1">{nextStep.text}</p>
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
