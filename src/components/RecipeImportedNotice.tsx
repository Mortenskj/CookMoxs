import { AlertCircle, Loader2, Sparkles, TimerReset, Wand2 } from 'lucide-react';

interface RecipeImportedNoticeProps {
  isAdjusting?: boolean;
  onSimplify?: () => void;
  onTighten?: () => void;
  onCheckTimes?: () => void;
}

export function RecipeImportedNotice({ isAdjusting, onSimplify, onTighten, onCheckTimes }: RecipeImportedNoticeProps) {
  return (
    <div className="mb-6 rounded-[2rem] border border-amber-200/70 bg-amber-50/80 px-5 py-4 text-amber-900 shadow-sm print:hidden">
      <div className="flex items-start gap-3">
        <AlertCircle size={18} className="mt-0.5 shrink-0" />
        <div className="w-full">
          <p className="font-serif text-lg italic">Importeret opskrift - gennemgå før du gemmer</p>
          <p className="text-sm leading-relaxed opacity-80 mt-1">
            Tjek især mængder, gruppenavne, trinformuleringer og varmeangivelser. Når det ser rigtigt ud,
            så gem opskriften i den mappe du vil bruge fremover.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={onSimplify}
              disabled={isAdjusting || !onSimplify}
              className="inline-flex items-center gap-2 rounded-full border border-amber-300/70 bg-white/70 px-3 py-2 text-[11px] font-bold uppercase tracking-widest text-amber-900 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isAdjusting ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
              Forenkle trin
            </button>
            <button
              onClick={onTighten}
              disabled={isAdjusting || !onTighten}
              className="inline-flex items-center gap-2 rounded-full border border-amber-300/70 bg-white/70 px-3 py-2 text-[11px] font-bold uppercase tracking-widest text-amber-900 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isAdjusting ? <Loader2 size={13} className="animate-spin" /> : <Wand2 size={13} />}
              Stram op
            </button>
            <button
              onClick={onCheckTimes}
              disabled={isAdjusting || !onCheckTimes}
              className="inline-flex items-center gap-2 rounded-full border border-amber-300/70 bg-white/70 px-3 py-2 text-[11px] font-bold uppercase tracking-widest text-amber-900 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isAdjusting ? <Loader2 size={13} className="animate-spin" /> : <TimerReset size={13} />}
              Tjek tider
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
