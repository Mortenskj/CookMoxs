import React from 'react';

interface ConfirmDialogProps {
  isOpen: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
}

export function ConfirmDialog({
  isOpen,
  message,
  onConfirm,
  onCancel,
  confirmLabel = 'Ja, fortsæt',
  cancelLabel = 'Nej, afbryd',
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div className="relative glass-brushed cm-surface-secondary rounded-3xl shadow-2xl border border-white/40 dark:border-white/10 w-full max-w-sm p-6 animate-in fade-in zoom-in-95 duration-200">
        <p className="text-base text-forest-dark dark:text-white leading-relaxed mb-6">
          {message}
        </p>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 px-4 rounded-2xl text-sm font-bold uppercase tracking-widest bg-white/50 dark:bg-white/10 text-forest-mid dark:text-white/70 hover:bg-white/70 dark:hover:bg-white/20 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 px-4 rounded-2xl text-sm font-bold uppercase tracking-widest bg-forest-dark text-white hover:bg-forest-mid transition-colors shadow-md"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
