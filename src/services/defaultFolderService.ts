import type { Folder, Recipe } from '../types';

export const DEFAULT_FOLDER_NAME = 'Ikke gemte';
export const LOCAL_DEFAULT_FOLDER_OWNER = 'local';

export function getCanonicalDefaultFolderId(ownerUID = LOCAL_DEFAULT_FOLDER_OWNER) {
  return `default-unsaved-${ownerUID}`;
}

function getLegacyDefaultFolderIds(ownerUID = LOCAL_DEFAULT_FOLDER_OWNER) {
  return new Set([
    getCanonicalDefaultFolderId(ownerUID),
    `default-un-saved-${ownerUID}`,
    `unsaved_${ownerUID}`,
    ownerUID === LOCAL_DEFAULT_FOLDER_OWNER ? 'default-un-saved-direct' : '',
  ].filter(Boolean));
}

export function isDefaultFolder(folder: Folder | undefined, ownerUID = LOCAL_DEFAULT_FOLDER_OWNER) {
  if (!folder) return false;
  return Boolean(
    folder.isDefault
    || folder.name === DEFAULT_FOLDER_NAME
    || getLegacyDefaultFolderIds(ownerUID).has(folder.id),
  );
}

export function createCanonicalDefaultFolder(ownerUID = LOCAL_DEFAULT_FOLDER_OWNER): Folder {
  return {
    id: getCanonicalDefaultFolderId(ownerUID),
    name: DEFAULT_FOLDER_NAME,
    ownerUID,
    isDefault: true,
    sharedWith: [],
    editorUids: [],
    viewerUids: [],
  };
}

export function findDefaultFolder(folders: Folder[], ownerUID = LOCAL_DEFAULT_FOLDER_OWNER): Folder | undefined {
  return folders.find((folder) => folder.ownerUID === ownerUID && folder.id === getCanonicalDefaultFolderId(ownerUID))
    || folders.find((folder) => folder.ownerUID === ownerUID && isDefaultFolder(folder, ownerUID))
    || folders.find((folder) => folder.id === getCanonicalDefaultFolderId(ownerUID))
    || folders.find((folder) => isDefaultFolder(folder, ownerUID));
}

export function normalizeRecipeDefaultFolder(recipe: Recipe, ownerUID = LOCAL_DEFAULT_FOLDER_OWNER): Recipe {
  const legacyIds = getLegacyDefaultFolderIds(ownerUID);
  const pointsAtDefaultFolder = recipe.folder === DEFAULT_FOLDER_NAME
    || (recipe.folderId ? legacyIds.has(recipe.folderId) : false);

  if (!pointsAtDefaultFolder) {
    return recipe;
  }

  return {
    ...recipe,
    folder: DEFAULT_FOLDER_NAME,
    folderId: getCanonicalDefaultFolderId(ownerUID),
  };
}

export function reconcileDefaultFolderState(
  folders: Folder[],
  recipes: Recipe[],
  ownerUID = LOCAL_DEFAULT_FOLDER_OWNER,
): { folders: Folder[]; recipes: Recipe[]; defaultFolder: Folder } {
  const legacyIds = getLegacyDefaultFolderIds(ownerUID);
  const ownerFolders = folders.filter((folder) => folder.ownerUID === ownerUID);
  const defaultCandidates = ownerFolders.filter((folder) => isDefaultFolder(folder, ownerUID));
  const seedFolder = defaultCandidates.find((folder) => folder.id === getCanonicalDefaultFolderId(ownerUID))
    || defaultCandidates[0]
    || createCanonicalDefaultFolder(ownerUID);

  const defaultFolder: Folder = {
    ...createCanonicalDefaultFolder(ownerUID),
    ...seedFolder,
    id: getCanonicalDefaultFolderId(ownerUID),
    name: DEFAULT_FOLDER_NAME,
    ownerUID,
    isDefault: true,
  };

  const nextFolders = [
    ...folders.filter((folder) => !(folder.ownerUID === ownerUID && isDefaultFolder(folder, ownerUID))),
    defaultFolder,
  ].sort((a, b) => a.name.localeCompare(b.name));

  const nextRecipes = recipes.map((recipe) => {
    if (recipe.folder === DEFAULT_FOLDER_NAME || (recipe.folderId && legacyIds.has(recipe.folderId))) {
      return {
        ...recipe,
        folder: DEFAULT_FOLDER_NAME,
        folderId: defaultFolder.id,
      };
    }
    return recipe;
  });

  return {
    folders: nextFolders,
    recipes: nextRecipes,
    defaultFolder,
  };
}
