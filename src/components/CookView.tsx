import { Recipe, Timer } from '../types';
import { ChevronLeft, ChevronRight, PlayCircle, PauseCircle, CheckCircle, X, Flame, Beaker, ChefHat, List, Type, AlertCircle } from 'lucide-react';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { LEVEL_META, type UserLevel } from '../config/cookingLevels';
import { COOK_FONT_META, type CookFontSize } from '../config/cookDisplay';
import { findRelevantIngredientsForStep, formatHeatDisplay } from '../services/cookModeHeuristics';

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

const renderStepTextWithIngredients = (text: string, ingredients: any[]) => {
  return <>{text}</>;
};

export function CookView({ recipe, userLevel, fontSize, setFontSize, initialStep = 0, includePrep = false, onStepChange, onExit, onCompleteCooking, onStopCooking, timers, setTimers }: CookViewProps) {
  const levelMeta = LEVEL_META[userLevel];
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [showIngredients, setShowIngredients] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);


  // Sync step changes back to parent
  useEffect(() => {
    if (onStepChange) {
      onStepChange(currentStep);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]);

  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Minimum swipe distance (in px)
  const minSwipeDistance = 50;

  useEffect(() => {
    let wakeLock: any = null;
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await (navigator as any).wakeLock.request('screen');
        }
      } catch (err: any) {
        // Ignore wake lock errors in environments where it's blocked (like iframes)
        console.warn(`Wake lock not available: ${err.message}`);
      }
    };
    requestWakeLock();
    return () => {
      if (wakeLock !== null) {
        wakeLock.release();
      }
    };
  }, []);

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && currentStep < recipe!.steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else if (isRightSwipe && currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const steps = useMemo(() => {
    if (!recipe) return [];
    
    const prepStep = {
      text: "Gør klar til madlavning. Find alle ingredienser frem og vej dem af, så du er klar til at gå i gang.",
      relevantIngredients: recipe.ingredients || []
    };

    return includePrep ? [prepStep, ...recipe.steps] : recipe.steps;
  }, [recipe, includePrep]);

  if (!recipe) {
    return (
      <div className="p-4 pb-24 max-w-md mx-auto h-full flex flex-col items-center justify-center text-center min-h-screen bg-forest-dark text-[#F9F9F7]">
        <div className="w-24 h-24 bg-[#3A453F] rounded-full flex items-center justify-center mb-8 border border-white/10 shadow-sm">
          <ChefHat size={48} className="text-heath-mid" />
        </div>
        <h2 className="text-3xl font-serif mb-4 italic text-[#F9F9F7]">Ingen opskrift valgt</h2>
        <p className="text-heath-mid mb-10 max-w-xs italic opacity-70 leading-relaxed">
          Gå til biblioteket eller importer en ny opskrift for at starte madlavningen.
        </p>
        <button onClick={onExit} className="bg-heath-dark text-[#F9F9F7] px-10 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest shadow-md hover:bg-heath-mid transition-colors">
          Gå tilbage
        </button>
      </div>
    );
  }

  const step = steps[currentStep];
  const nextStep = steps[currentStep + 1];
  const displayHeat = formatHeatDisplay(step.heat);

  // Dynamically find ingredients mentioned in this step if relevantIngredients is empty
  const mentionedIngredients = step.relevantIngredients?.length 
    ? step.relevantIngredients 
    : findRelevantIngredientsForStep(step.text, recipe.ingredients || []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const scale = recipe.scale || 1;

  return (
    <div 
      className="flex flex-col h-full bg-[#1A221E] text-[#F9F9F7] max-w-md mx-auto relative overflow-y-auto custom-scrollbar"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Sticky Top Section */}
      <div className="sticky top-0 z-30 flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 sm:p-6 border-b border-white/10 bg-[#1A221E] shadow-sm gap-2 pt-6 relative">
          {/* Continuous Progress Bar at the top */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-white/10 z-50">
            <div 
              className="h-full bg-[#F9F9F7] transition-all duration-500 ease-out"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-bold text-heath-mid uppercase tracking-widest mb-1 truncate">Trin {currentStep + 1} af {steps.length}</span>
            <button 
              onClick={onStopCooking}
              className="text-xs text-red-400 font-bold uppercase tracking-widest text-left hover:underline opacity-80 truncate"
            >
              Stop madlavning
            </button>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button 
              onClick={() => setFontSize(prev => prev === 'small' ? 'normal' : prev === 'normal' ? 'large' : prev === 'large' ? 'xlarge' : 'small')}
              className="p-2 sm:p-3 text-[#F9F9F7] hover:bg-white/10 rounded-full transition-all border border-white/10 shadow-sm"
            >
              <div className="flex items-center gap-2">
                <Type size={18} className="sm:w-5 sm:h-5" />
                <span className="hidden sm:inline text-[10px] font-bold uppercase tracking-widest text-white/60">
                  {COOK_FONT_META[fontSize].preview}
                </span>
              </div>
            </button>
            <button 
              onClick={() => setShowIngredients(true)} 
              className="p-2 sm:p-3 text-[#F9F9F7] hover:bg-white/10 rounded-full transition-all border border-white/10 shadow-sm flex items-center gap-2"
            >
              <List size={18} className="sm:w-5 sm:h-5" />
              <span className="text-xs font-bold uppercase tracking-widest hidden sm:inline">Ingredienser</span>
            </button>
            <button onClick={onExit} className="p-2 sm:p-3 text-[#F9F9F7] hover:bg-white/10 rounded-full transition-all border border-white/10 shadow-sm">
              <X size={18} className="sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Persistent Timers */}
        {timers.length > 0 && (
          <div className="bg-[#2C3631] border-b border-white/10 shadow-inner flex flex-col max-h-40 overflow-y-auto custom-scrollbar">
            {timers.map(t => (
              <div key={t.id} className="px-4 py-2 flex items-center justify-between border-b border-white/5 last:border-0">
                <div className="flex-1 min-w-0 pr-4">
                  <span className="text-sm font-serif italic text-[#F9F9F7] truncate block">{t.description}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`text-xl font-mono tracking-tighter ${t.remaining === 0 ? 'text-red-400 animate-pulse' : 'text-[#F9F9F7]'}`}>
                    {formatTime(t.remaining)}
                  </span>
                  <button 
                    onClick={() => setTimers(timers.map(timer => timer.id === t.id ? { ...timer, active: !timer.active } : timer))}
                    className="text-[#F9F9F7] hover:text-heath-mid transition-colors"
                  >
                    {t.active && t.remaining > 0 ? <PauseCircle size={24} /> : <PlayCircle size={24} />}
                  </button>
                  <button 
                    onClick={() => setTimers(timers.filter(timer => timer.id !== t.id))}
                    className="text-heath-mid hover:text-red-400 transition-colors opacity-60"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 sm:p-6 flex flex-col relative z-0 gap-4">
        
        {/* Top Row: Heat & Timer */}
        {(displayHeat || (step.timer && !timers.some(t => t.description === step.timer!.description && t.duration === step.timer!.duration * 60))) && (
          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            {displayHeat && (
              <div className="flex-1 bg-red-500/10 text-red-200 px-4 py-3 rounded-2xl border border-red-500/20 flex items-center justify-center gap-3 shadow-sm">
                <Flame size={18} className="text-red-400 shrink-0" />
                <span className="text-xs font-bold uppercase tracking-[0.2em] truncate">{displayHeat}</span>
              </div>
            )}
            {step.timer && !timers.some(t => t.description === step.timer!.description && t.duration === step.timer!.duration * 60) && (
              <div className="flex-1 bg-[#3A453F] rounded-2xl px-4 py-3 flex items-center justify-between border border-white/10 shadow-sm">
                <div className="flex flex-col min-w-0 pr-2">
                  <span className="text-[8px] font-bold uppercase tracking-widest text-heath-mid opacity-70 truncate">{step.timer.description}</span>
                  <span className="text-xl font-mono tracking-tighter text-[#F9F9F7] truncate">
                    {formatTime(step.timer.duration * 60)}
                  </span>
                </div>
                <button 
                  onClick={() => {
                    if (timers.length >= 3) {
                      alert("Du kan maksimalt have 3 timere i gang på samme tid.");
                      return;
                    }
                    setTimers([...timers, {
                      id: Date.now().toString() + Math.random().toString(),
                      duration: step.timer!.duration * 60,
                      remaining: step.timer!.duration * 60,
                      description: step.timer!.description,
                      active: true
                    }]);
                  }}
                  className="text-heath-mid hover:scale-110 transition-transform bg-white/5 p-2 rounded-xl border border-white/5 shrink-0"
                >
                  <PlayCircle size={24} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step Container (The main focus) */}
        <div 
          ref={containerRef}
          className="flex-1 flex flex-col px-12 sm:px-16"
        >
          <div className="flex-1 min-h-[2rem]"></div>
          <div ref={contentRef} className="w-full shrink-0 py-4 flex flex-col gap-6">
            <div 
              className="font-serif leading-relaxed text-[#F9F9F7] transition-all duration-300 w-full break-words text-balance"
              style={{ fontSize: `${COOK_FONT_META[fontSize].px}px` }}
            >
              {renderStepTextWithIngredients(step.text, mentionedIngredients)}
            </div>
            
            {step.reminder && (
              <div className="bg-[#E5A93B]/10 border border-[#E5A93B]/30 rounded-2xl p-4 sm:p-5 flex gap-4 items-start shadow-sm">
                <div className="bg-[#E5A93B]/20 p-2 rounded-full shrink-0">
                  <AlertCircle className="text-[#E5A93B]" size={24} />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[#E5A93B] font-bold uppercase tracking-widest text-xs">{levelMeta.reminderLabel}</span>
                  <p className="text-[#F9F9F7] font-serif text-lg sm:text-xl leading-relaxed">
                    {step.reminder}
                  </p>
                </div>
              </div>
            )}
          </div>
          <div className="flex-1 min-h-[2rem]"></div>
        </div>

        {/* Ingredients Compact Box */}
        {mentionedIngredients && mentionedIngredients.length > 0 && (
          <div className="flex-none bg-white/5 rounded-xl p-2.5 border border-white/10 mt-2">
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

        {/* Next Step Preview */}
        {nextStep && (
          <div className="flex-none bg-[#1A221E]/30 rounded-2xl p-4 border border-white/5">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-[8px] font-bold text-heath-mid/40 uppercase tracking-widest">{levelMeta.nextStepLabel}</h3>
              <span className="text-[8px] font-bold text-white/20">{currentStep + 2} / {steps.length}</span>
            </div>
            <p className="text-xs font-serif italic text-[#F9F9F7]/40 line-clamp-1">{nextStep.text}</p>
          </div>
        )}
      </div>

      {/* Floating Navigation Buttons */}
      <div className="fixed bottom-6 left-0 right-0 max-w-md mx-auto px-4 flex justify-between items-center pointer-events-none z-40">
        <button 
          onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
          disabled={currentStep === 0}
          className="pointer-events-auto p-4 bg-black/40 backdrop-blur-md text-[#F9F9F7] hover:bg-black/60 rounded-full transition-all disabled:opacity-0 disabled:pointer-events-none border border-white/10 shadow-lg"
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
          className="pointer-events-auto p-4 bg-black/40 backdrop-blur-md text-[#F9F9F7] hover:bg-black/60 rounded-full transition-all shadow-lg hover:scale-105 active:scale-95 border border-white/10"
        >
          {currentStep === steps.length - 1 ? <CheckCircle size={28} /> : <ChevronRight size={28} />}
        </button>
      </div>

      {/* Ingredients Modal */}
      {showIngredients && (
        <div className="absolute inset-0 z-50 flex flex-col bg-[#1A221E] animate-in slide-in-from-bottom-full duration-300">
          <div className="flex justify-between items-center p-6 border-b border-white/10 bg-[#1A221E] shadow-sm">
            <h2 className="text-xl font-serif text-[#F9F9F7]">Alle ingredienser</h2>
            <button onClick={() => setShowIngredients(false)} className="p-3 text-[#F9F9F7] hover:bg-white/10 rounded-full transition-all border border-white/10 shadow-sm">
              <X size={20} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            <ul className="space-y-4">
              {(recipe.ingredients || []).map((ing, i) => {
                const amountStr = ing.amount ? (typeof ing.amount === 'number' ? ing.amount * scale : ing.amount) : '';
                const fullStr = `${amountStr} ${ing.unit} ${ing.name}`.trim();
                return (
                  <li key={i} className="flex justify-between text-lg font-serif border-b border-white/10 pb-4 last:border-0 last:pb-0">
                    <span className="text-[#F9F9F7]">{fullStr}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
