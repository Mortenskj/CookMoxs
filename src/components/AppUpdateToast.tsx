import React from 'react';

interface AppUpdateToastProps {
  onUpdate: () => void;
  onDismiss: () => void;
}

export function AppUpdateToast({ onUpdate, onDismiss }: AppUpdateToastProps) {
  return (
    <div className="cm-toast-enter season-toast-surface fixed left-1/2 top-4 z-50 w-[min(720px,calc(100vw-2rem))] -translate-x-1/2 rounded-[2rem] px-5 py-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="font-serif text-lg italic text-forest-dark">Ny version klar</p>
          <p className="text-sm text-forest-mid opacity-80">Opdater for at få de nyeste ændringer. Det tager et øjeblik.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onDismiss}
            className="px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-2xl border border-black/10 text-forest-dark hover:bg-white/60 transition-colors"
          >
            Senere
          </button>
          <button
            onClick={onUpdate}
            className="px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-2xl bg-forest-dark text-white hover:bg-forest-mid transition-colors"
          >
            Opdater nu
          </button>
        </div>
      </div>
    </div>
  );
}
