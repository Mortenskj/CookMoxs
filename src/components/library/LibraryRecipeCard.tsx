import React from 'react';
import { ChevronRight, Folder, Heart, Cloud, HardDrive, Edit3 } from 'lucide-react';
import { OwnershipBadge } from '../OwnershipBadge';
import { getRecipeOwnershipDisplay } from '../../services/ownershipLabelService';
import type { Folder as FolderType, Recipe } from '../../types';

interface LibraryRecipeCardProps {
  recipe: Recipe;
  onOpen: (recipe: Recipe) => void;
  currentUser: any;
  allFolders: FolderType[];
}

export function LibraryRecipeCard({ recipe, onOpen, currentUser, allFolders }: LibraryRecipeCardProps) {
  const savedAt = recipe.updatedAt || recipe.createdAt;
  const isCloudBacked = Boolean(currentUser && recipe.authorUID) || Boolean(!currentUser && false);
  const statusLabel = isCloudBacked ? (recipe.isSaved ? 'Cloud' : 'Cloud kladde') : 'Lokal';
  const StatusIcon = isCloudBacked ? (recipe.isSaved ? Cloud : Edit3) : HardDrive;
  const ownership = getRecipeOwnershipDisplay(recipe, allFolders, currentUser);

  return (
    <div
      onClick={() => onOpen(recipe)}
      className="glass-brushed p-5 rounded-[2rem] cursor-pointer hover:bg-white/60 dark:hover:bg-white/10 transition-all duration-300 group"
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-xl font-serif text-forest-dark cm-light-surface-ink group-hover:text-forest-mid dark:group-hover:text-[#314038] transition-colors pr-4 italic">
          {recipe.title}
        </h3>
        {recipe.isFavorite ? <Heart size={18} className="text-forest-mid cm-light-surface-ink-muted fill-current shrink-0" /> : null}
      </div>

      {recipe.summary ? (
        <p className="text-sm text-forest-mid cm-light-surface-ink-muted line-clamp-2 mb-4 leading-relaxed opacity-80 dark:opacity-100">{recipe.summary}</p>
      ) : null}

      <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-forest-mid cm-light-surface-ink-muted">
        <div className="flex items-center gap-3">
          {recipe.categories && recipe.categories.length > 0 ? (
            <span className="bg-white/40 dark:bg-white/10 border border-black/5 dark:border-white/10 px-2 py-1 rounded-md">
              {recipe.categories[0]}
            </span>
          ) : null}
          {recipe.folder ? (
            <span className="flex items-center gap-1 opacity-60"><Folder size={12} /> {recipe.folder}</span>
          ) : null}
        </div>
        <ChevronRight size={16} className="text-forest-mid cm-light-surface-ink-muted group-hover:translate-x-1 transition-transform" />
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        {savedAt ? (
          <div className="text-[11px] text-forest-mid/70 cm-light-surface-ink-soft">
            Sidst gemt: {new Date(savedAt).toLocaleString('da-DK')}
          </div>
        ) : <div />}
        <div className="flex items-center gap-2">
          <OwnershipBadge ownership={ownership} />
          <div className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${isCloudBacked ? 'bg-sky-100 text-sky-800' : 'bg-stone-100 text-stone-700'}`}>
            <StatusIcon size={11} />
            <span>{statusLabel}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
