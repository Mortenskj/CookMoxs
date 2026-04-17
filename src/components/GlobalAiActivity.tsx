import { BrandMark } from './BrandMark';

interface GlobalAiActivityProps {
  visible: boolean;
  label: string;
}

export function GlobalAiActivity({ visible, label }: GlobalAiActivityProps) {
  if (!visible) return null;

  return (
    <div className="fixed left-1/2 top-6 z-[120] -translate-x-1/2 pointer-events-none animate-fade-in">
      <div className="glass-brushed rounded-2xl px-4 py-3 border border-black/5 dark:border-white/10 shadow-xl flex items-center gap-3 bg-[#FDFBF7]/90 dark:bg-[#1A221E]/92">
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
