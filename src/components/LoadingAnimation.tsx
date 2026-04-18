import React, { useEffect, useState } from 'react';

const LOADING_STAGES = [
  {
    title: 'Læser kilden',
    detail: 'Link, tekst, PDF eller billede normaliseres til ét arbejdsformat.',
  },
  {
    title: 'Strukturerer opskriften',
    detail: 'Ingredienser, trin, tider og metadata samles i CookMoxs-format.',
  },
  {
    title: 'Gør klar til Cook Mode',
    detail: 'Resultatet klargøres til læsning, justering og roligt køkkenflow.',
  },
] as const;

export function InlineLoadingGlyph({ className = '' }: { className?: string }) {
  return (
    <span className={['cm-inline-loader__glyph', className].filter(Boolean).join(' ')} aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  );
}

export function InlineLoadingLabel({ className = '', label }: { className?: string; label: string }) {
  return (
    <span className={['cm-inline-loader', className].filter(Boolean).join(' ')} role="status" aria-live="polite">
      <InlineLoadingGlyph />
      <span>{label}</span>
    </span>
  );
}

// Observed p95 for a healthy AI import round-trip is ~12-18s. Beyond ~25s
// something is slower than normal (quota, cold model, slow source). Beyond
// ~55s we are deep into fallback territory — the server's own retry/fallback
// path kicks in around here. We reflect that honestly in the loader rather
// than racing the bar to 99%.
const SLOW_THRESHOLD_MS = 25000;
const FALLBACK_HINT_THRESHOLD_MS = 55000;
// Progress cap: we cannot know true completion from inside this component
// (it unmounts when import resolves), so hold at 85% instead of blindly
// climbing to 99%. 85% reads as "nearly there, waiting for the real signal"
// rather than "suspiciously stuck at 99 for 30 seconds".
const PROGRESS_CAP = 85;

export function LoadingAnimation() {
  const [progress, setProgress] = useState(8);
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    const startedAt = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      setElapsedMs(elapsed);
      setProgress((prev) => {
        // Slow down aggressively as we approach the cap — the last 15% is
        // reserved for the true completion signal. No climb past PROGRESS_CAP.
        const increment = prev < 32 ? 4 : prev < 60 ? 2.0 : prev < 75 ? 0.6 : 0.15;
        const next = prev + increment;
        return next > PROGRESS_CAP ? PROGRESS_CAP : next;
      });
    }, 180);

    return () => clearInterval(interval);
  }, []);

  const activeStage = progress < 36 ? 0 : progress < 68 ? 1 : 2;
  const isSlow = elapsedMs >= SLOW_THRESHOLD_MS;
  const isFallbackHint = elapsedMs >= FALLBACK_HINT_THRESHOLD_MS;

  const eyebrow = isFallbackHint
    ? 'Importen tager længere end normalt'
    : isSlow
      ? 'Arbejder stadig — kilden er lidt tung'
      : 'Import i gang';

  const honestyNote = isFallbackHint
    ? 'Vi prøver automatisk en mere robust fallback-import.'
    : isSlow
      ? 'AI-kaldet har brugt længere tid end sædvanligt — vi venter stadig på svar.'
      : null;

  return (
    <div className="cm-import-loading cm-import-loading--compact cm-feedback-enter" role="status" aria-live="polite">
      <div className="cm-import-loading__hero">
        <p className="cm-import-loading__eyebrow">{eyebrow}</p>
        <div className="cm-import-loading__meter" aria-hidden="true">
          <div
            className="cm-import-loading__meter-bar"
            style={{ width: `${Math.max(progress, 10)}%` }}
          />
        </div>
        <div className="cm-import-loading__meta">
          <span>{Math.floor(progress)}%</span>
          <span>{LOADING_STAGES[activeStage].title}</span>
        </div>
        {honestyNote && (
          <p className="cm-import-loading__honesty text-sm text-[color:var(--cm-ink-muted,#6b6357)] mt-2">
            {honestyNote}
          </p>
        )}
      </div>

      <div className="cm-import-loading__stages">
        {LOADING_STAGES.map((stage, index) => {
          const state = index < activeStage ? 'done' : index === activeStage ? 'active' : 'pending';

          return (
            <div key={stage.title} className="cm-import-loading__stage" data-state={state}>
              <span className="cm-import-loading__stage-index">{String(index + 1).padStart(2, '0')}</span>
              <div className="min-w-0">
                <p className="cm-import-loading__stage-title">{stage.title}</p>
                <p className="cm-import-loading__stage-detail">{stage.detail}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
