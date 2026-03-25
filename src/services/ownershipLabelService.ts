import type { Folder, Recipe } from '../types';

export interface OwnershipDisplay {
  tone: 'private' | 'shared' | 'household';
  label: string;
  detail: string;
}

const hasFolderSharing = (folder: Folder | undefined) =>
  Boolean(
    folder &&
    (
      (folder.sharedWith && folder.sharedWith.length > 0) ||
      (folder.editorUids && folder.editorUids.length > 0) ||
      (folder.viewerUids && folder.viewerUids.length > 0)
    ),
  );

export const findFolderForRecipe = (recipe: Recipe, allFolders: Folder[]) =>
  allFolders.find((folder) => folder.id === recipe.folderId)
  || allFolders.find((folder) => !recipe.folderId && folder.name === recipe.folder);

export const getFolderOwnershipDisplay = (folder: Folder, currentUser: any): OwnershipDisplay => {
  if (folder.ownership?.type === 'household' || folder.householdId) {
    return {
      tone: 'household',
      label: 'Husstand',
      detail: 'Denne mappe tilhoerer en husstand.',
    };
  }

  const isShared = hasFolderSharing(folder) || Boolean(currentUser?.uid && folder.ownerUID !== currentUser.uid);
  if (isShared) {
    const isOwner = Boolean(currentUser?.uid && folder.ownerUID === currentUser.uid);
    return {
      tone: 'shared',
      label: isOwner ? 'Delt af dig' : 'Delt med dig',
      detail: isOwner ? 'Du deler denne mappe med andre.' : 'Denne mappe er delt med dig.',
    };
  }

  return {
    tone: 'private',
    label: 'Privat',
    detail: 'Kun dig kan se denne mappe.',
  };
};

export const getRecipeOwnershipDisplay = (recipe: Recipe, allFolders: Folder[], currentUser: any): OwnershipDisplay => {
  if (recipe.ownership?.type === 'household' || recipe.householdId) {
    return {
      tone: 'household',
      label: 'Husstand',
      detail: 'Denne opskrift tilhoerer en husstand.',
    };
  }

  const folder = findFolderForRecipe(recipe, allFolders);
  if (folder?.ownership?.type === 'household' || folder?.householdId) {
    return {
      tone: 'household',
      label: 'Husstand',
      detail: 'Denne opskrift ligger i en husstandsmappe.',
    };
  }

  const isShared = recipe.ownership?.type === 'shared'
    || Boolean(currentUser?.uid && recipe.authorUID && recipe.authorUID !== currentUser.uid)
    || hasFolderSharing(folder)
    || Boolean(folder && currentUser?.uid && folder.ownerUID !== currentUser.uid);

  if (isShared) {
    const isOwnedByCurrentUser = Boolean(
      (currentUser?.uid && recipe.authorUID === currentUser.uid)
      || (folder && currentUser?.uid && folder.ownerUID === currentUser.uid),
    );

    return {
      tone: 'shared',
      label: isOwnedByCurrentUser ? 'Delt af dig' : 'Delt med dig',
      detail: isOwnedByCurrentUser ? 'Denne opskrift er delt med andre.' : 'Denne opskrift kommer fra delt indhold.',
    };
  }

  return {
    tone: 'private',
    label: 'Privat',
    detail: 'Denne opskrift er kun synlig for dig.',
  };
};
