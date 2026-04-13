import React from 'react';

type SortOrder = 'newest' | 'alphabetical' | 'last_opened' | 'category';

interface LibrarySortSelectProps {
  value: SortOrder;
  onChange: (next: SortOrder) => void;
  className?: string;
}

export function LibrarySortSelect({ value, onChange, className }: LibrarySortSelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as SortOrder)}
      className={
        className ||
        'glass-brushed text-forest-mid cm-light-surface-ink-muted text-xs font-bold uppercase tracking-widest rounded-xl px-3 py-2 outline-none'
      }
    >
      <option value="newest">Nyeste</option>
      <option value="alphabetical">Alfabetisk</option>
      <option value="last_opened">Sidst åbnet</option>
      <option value="category">Kategori</option>
    </select>
  );
}
