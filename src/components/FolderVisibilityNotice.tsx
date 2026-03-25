import { AlertTriangle } from 'lucide-react';
import { OwnershipBadge } from './OwnershipBadge';
import { getFolderOwnershipDisplay } from '../services/ownershipLabelService';
import type { Folder } from '../types';

interface FolderVisibilityNoticeProps {
  folder: Folder;
  currentUser?: any;
}

const visibilityCopy = {
  shared_view: 'Når du gemmer i denne mappe, får alle med visningsadgang også adgang til opskriften.',
  shared_edit: 'Når du gemmer i denne mappe, får alle med redigeringsadgang også adgang til opskriften og kan ændre den.',
  household: 'Når du gemmer i denne mappe, arver opskriften husstandens synlighed og medlemsadgang.',
} as const;

export function FolderVisibilityNotice({ folder, currentUser }: FolderVisibilityNoticeProps) {
  const ownership = getFolderOwnershipDisplay(folder, currentUser);

  if (ownership.state === 'private') {
    return null;
  }

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/85 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-900" />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-bold uppercase tracking-widest text-amber-900">Arvet synlighed</p>
            <OwnershipBadge ownership={ownership} />
          </div>
          <p className="mt-2 text-sm font-medium text-amber-950">{folder.name}</p>
          <p className="mt-1 text-sm text-amber-900">
            {visibilityCopy[ownership.state]}
          </p>
          <p className="mt-2 text-xs text-amber-900/80">{ownership.detail}</p>
        </div>
      </div>
    </div>
  );
}
