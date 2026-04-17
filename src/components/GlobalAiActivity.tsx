import { BrandMark } from './BrandMark';

interface GlobalAiActivityProps {
  visible: boolean;
  label: string;
}

export function GlobalAiActivity({ visible, label }: GlobalAiActivityProps) {
  if (!visible) return null;

  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 z-[200] pointer-events-none animate-fade-in"
      style={{ top: 'max(1rem, calc(env(safe-area-inset-top, 0px) + 0.75rem))' }}
      role="status"
      aria-live="polite"
    >
      <div className="rounded-2xl px-4 py-3 border border-black/10 dark:border-white/15 shadow-2xl flex items-center gap-3 bg-[#FDFBF7] dark:bg-[#1A221E] ring-1 ring-heath-mid/20">
        <div className="w-9 h-9 rounded-full bg-heath-mid/15 flex items-center justify-center">
          {/* Branded mark pulses softly; reduced-motion users see it static via CSS */}
          <BrandMark size={20} className="cm-brand-mark cm-brand-mark--pulse text-heath-mid" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-widest font-bold text-forest-mid/70 dark:text-white/55">
            AI arbejder
          </p>
          <p className="text-sm font-serif italic text-forest-dark dark:text-[#F6F2EA]">
            {label}
          </p>
        </div>
      </div>
    </div>
  );
}
