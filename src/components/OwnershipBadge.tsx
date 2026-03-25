import type { OwnershipDisplay } from '../services/ownershipLabelService';

interface OwnershipBadgeProps {
  ownership: OwnershipDisplay;
}

export function OwnershipBadge({ ownership }: OwnershipBadgeProps) {
  const toneClass = ownership.tone === 'household'
    ? 'bg-amber-100 text-amber-900'
    : ownership.tone === 'shared'
      ? 'bg-sky-100 text-sky-800'
      : 'bg-stone-100 text-stone-700';

  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${toneClass}`}>
      {ownership.label}
    </span>
  );
}
