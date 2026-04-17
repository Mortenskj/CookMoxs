import React, { useEffect, useState } from 'react';
import { BrandMark } from './BrandMark';

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

export function LoadingAnimation() {
  const [progress, setProgress] = useState(8);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        const increment = prev < 32 ? 4 : prev < 68 ? 2.2 : prev < 92 ? 0.9 : 0.2;
        const next = prev + increment;
        return next > 99 ? 99 : next;
      });
    }, 180);

    return () => clearInterval(interval);
  }, []);

  const activeStage = progress < 36 ? 0 : progress < 72 ? 1 : 2;

  return (
    <div className="cm-import-loading cm-feedback-enter" role="status" aria-live="polite">
      <div className="cm-import-loading__hero">
        <div className="cm-import-loading__brand" aria-hidden="true">
          <BrandMark size={40} className="cm-brand-mark cm-brand-mark--pulse" />
        </div>
        <p className="cm-import-loading__eyebrow">CookMoxs import</p>
        <h2 className="cm-import-loading__title">Klargør opskrift</h2>
        <p className="cm-import-loading__description">
          Vi læser kilden, strukturerer indholdet og gør den klar til cook mode.
        </p>

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
