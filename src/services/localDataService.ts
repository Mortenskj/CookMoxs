import type { Folder, Recipe } from '../types';
import { STORAGE_KEYS } from '../config/storageKeys';

export function loadLocalRecipes(): Recipe[] {
  const raw = localStorage.getItem(STORAGE_KEYS.recipes);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function loadLocalFolders(): Folder[] {
  const raw = localStorage.getItem(STORAGE_KEYS.folders);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function loadLocalActiveRecipe(): Recipe | null {
  const raw = localStorage.getItem(STORAGE_KEYS.activeRecipe);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveLocalRecipes(recipes: Recipe[]) {
  localStorage.setItem(STORAGE_KEYS.recipes, JSON.stringify(recipes));
}

export function saveLocalFolders(folders: Folder[]) {
  localStorage.setItem(STORAGE_KEYS.folders, JSON.stringify(folders));
}

export function saveLocalActiveRecipe(recipe: Recipe | null) {
  if (recipe) {
    localStorage.setItem(STORAGE_KEYS.activeRecipe, JSON.stringify(recipe));
  } else {
    localStorage.removeItem(STORAGE_KEYS.activeRecipe);
  }
}

export function ensureLocalDefaultFolder(folders: Folder[], ownerUID = 'local'): Folder[] {
  const hasDefault = folders.some(folder => folder.name === 'Ikke gemte' || folder.isDefault);
  if (hasDefault) return folders;

  return [
    ...folders,
    {
      id: `default-un-saved-${ownerUID}`,
      name: 'Ikke gemte',
      ownerUID,
      isDefault: true,
      sharedWith: [],
      editorUids: [],
      viewerUids: [],
    },
  ];
}

export function mergeMissingFoldersFromRecipes(recipes: Recipe[], folders: Folder[]): Folder[] {
  const folderNames = new Set(folders.map(folder => folder.name));
  const additions: Folder[] = [];

  for (const name of recipes.map(recipe => recipe.folder).filter(Boolean) as string[]) {
    if (!folderNames.has(name) && name !== 'Ikke gemte') {
      folderNames.add(name);
      additions.push({
        id: Date.now().toString() + Math.random().toString(36).slice(2, 9),
        name,
        ownerUID: 'local',
        sharedWith: [],
        editorUids: [],
        viewerUids: [],
      });
    }
  }

  return additions.length > 0 ? [...folders, ...additions].sort((a, b) => a.name.localeCompare(b.name)) : folders;
}
