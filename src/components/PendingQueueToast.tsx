import React from 'react';

interface PendingQueueToastProps {
  pendingCount: number;
  isProcessing: boolean;
  message?: string | null;
  onProcessNow: () => void;
  onDismissMessage: () => void;
}

export function PendingQueueToast({ pendingCount, isProcessing, message, onProcessNow, onDismissMessage }: PendingQueueToastProps) {
  if (pendingCount <= 0 && !isProcessing && !message) {
    return null;
  }

  const title = isProcessing
    ? 'Behandler ventende importer'
    : pendingCount > 0
      ? `${pendingCount} ventende import${pendingCount === 1 ? '' : 'er'} klar`
      : 'Queue-opdatering';

  const description = isProcessing
    ? 'Ventende importer bliver behandlet i baggrunden.'
    : message || 'Du kan behandle ventende importer nu eller lade appen klare det ved reconnect og resume.';

  return (
    <div className="fixed left-1/2 top-4 z-50 w-[min(720px,calc(100vw-2rem))] -translate-x-1/2 rounded-[2rem] border border-black/10 bg-white/80 shadow-lg backdrop-blur px-5 py-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="font-serif text-lg italic text-forest-dark">{title}</p>
          <p className="text-sm text-forest-mid opacity-80">{description}</p>
        </div>
        <div className="flex gap-2">
          {message ? (
            <button
              onClick={onDismissMessage}
              className="px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-2xl border border-black/10 text-forest-dark hover:bg-white/60 transition-colors"
            >
              Luk
            </button>
          ) : null}
          {pendingCount > 0 ? (
            <button
              onClick={onProcessNow}
              disabled={isProcessing}
              className="px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-2xl bg-forest-dark text-white hover:bg-forest-mid transition-colors disabled:opacity-50"
            >
              {isProcessing ? 'Behandler...' : 'Behandl nu'}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
