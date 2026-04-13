import React from 'react';

type SortOrder = 'newest' | 'alphabetical' | 'most_used' | 'category';

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
        'glass-brushed text-forest-mid dark:text-white/70 text-xs font-bold uppercase tracking-widest rounded-xl px-3 py-2 outline-none dark:bg-black/20'
      }
    >
      <option value="newest">Nyeste</option>
      <option value="alphabetical">Alfabetisk</option>
      <option value="most_used">Mest brugte</option>
      <option value="category">Kategori</option>
    </select>
  );
}
