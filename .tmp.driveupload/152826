import React from 'react';

interface LibraryEmptyStateProps {
  title: string;
  hint?: string;
}

export function LibraryEmptyState({ title, hint }: LibraryEmptyStateProps) {
  return (
    <div className="text-center py-12 text-forest-mid dark:text-white/60 opacity-60 italic font-serif">
      <p className="text-lg">{title}</p>
      {hint ? <p className="text-sm mt-3 opacity-80 not-italic">{hint}</p> : null}
    </div>
  );
}
