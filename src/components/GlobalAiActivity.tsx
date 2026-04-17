import { BrandMark } from './BrandMark';

interface GlobalAiActivityProps {
  visible: boolean;
  /** Kept for API compatibility; the loader now shows fixed "AI / Loader" copy. */
  label?: string;
}

/**
 * Compact, right-side branded AI-loader badge.
 *
 * Spec (Fase B B3):
 * - not a wide top overlay — a small badge anchored on the right edge
 * - branded ring around the mark, matching theme (light/dark aware)
 * - copy is fixed: "AI" over / "Loader" under
 * - calm fade/pulse; reduced-motion users get a static badge
 * - never blocks interaction (pointer-events-none)
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function GlobalAiActivity({ visible, label: _ignoredLabel }: GlobalAiActivityProps) {
  if (!visible) return null;

  return (
    <div
      className="fixed z-[200] pointer-events-none cm-ai-loader"
      style={{
        right: 'max(0.75rem, calc(env(safe-area-inset-right, 0px) + 0.5rem))',
        top: 'max(5rem, calc(env(safe-area-inset-top, 0px) + 4.5rem))',
      }}
      role="status"
      aria-live="polite"
      aria-label="AI indlæser"
    >
      <div className="cm-ai-loader__badge flex flex-col items-center justify-center rounded-2xl px-3 py-2.5 border border-black/10 dark:border-white/15 shadow-lg bg-[#FDFBF7] dark:bg-[#1A221E]">
        <div className="cm-ai-loader__ring w-11 h-11 rounded-full flex items-center justify-center ring-1 ring-heath-mid/30 bg-heath-mid/10">
          <BrandMark
            size={22}
            className="cm-brand-mark cm-brand-mark--pulse text-heath-mid"
          />
        </div>
        <p className="mt-1.5 text-[10px] uppercase tracking-[0.18em] font-bold text-forest-mid/75 dark:text-white/70 leading-none">
          AI
        </p>
        <p className="mt-0.5 text-[10px] uppercase tracking-[0.18em] font-semibold text-forest-mid/55 dark:text-white/45 leading-none">
          Loader
        </p>
      </div>
    </div>
  );
}
