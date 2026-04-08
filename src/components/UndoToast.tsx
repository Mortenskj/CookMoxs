import React from 'react';
import { X } from 'lucide-react';

interface UndoToastProps {
  title: string;
  description?: string;
  onUndo: () => void;
  onDismiss: () => void;
}

export function UndoToast({ title, description, onUndo, onDismiss }: UndoToastProps) {
  return (
    <div className="cm-toast-enter fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[min(560px,calc(100%-24px))]">
      <div className="season-toast-surface rounded-[2rem] px-5 py-4">
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <p className="font-serif text-lg italic text-forest-dark">{title}</p>
            {description ? (
              <p className="text-sm text-forest-mid opacity-80 mt-1">{description}</p>
            ) : null}
            <div className="mt-3 flex items-center gap-3">
              <button
                onClick={onUndo}
                className="px-4 py-2 rounded-2xl bg-forest-dark text-white text-xs font-bold uppercase tracking-widest hover:bg-forest-mid transition-colors"
              >
                Fortryd
              </button>
              <button
                onClick={onDismiss}
                className="px-4 py-2 rounded-2xl border border-black/10 text-forest-dark text-xs font-bold uppercase tracking-widest hover:bg-white/60 transition-colors"
              >
                Luk
              </button>
            </div>
          </div>
          <button
            onClick={onDismiss}
            className="p-2 rounded-xl hover:bg-white/60 transition-colors"
            aria-label="Luk"
          >
            <X size={18} className="text-forest-mid" />
          </button>
        </div>
      </div>
    </div>
  );
}
