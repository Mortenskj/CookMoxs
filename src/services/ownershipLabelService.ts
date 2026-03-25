import { PERMISSION_UI_COPY, type PermissionUiState } from '../config/permissionUiModel';
import type { Folder, Recipe } from '../types';

export interface OwnershipDisplay {
  state: PermissionUiState;
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

const isViewerInFolder = (folder: Folder, userId?: string) =>
  Boolean(
    userId && (
      folder.viewerUids?.includes(userId)
      || folder.sharedWith?.some((share) => share.uid === userId && share.role === 'viewer')
    ),
  );

const isEditorInFolder = (folder: Folder, userId?: string) =>
  Boolean(
    userId && (
      folder.editorUids?.includes(userId)
      || folder.sharedWith?.some((share) => share.uid === userId && share.role === 'editor')
    ),
  );

const hasEditorSharing = (folder: Folder | undefined) =>
  Boolean(folder && ((folder.editorUids && folder.editorUids.length > 0) || folder.sharedWith?.some((share) => share.role === 'editor')));

const hasViewerSharing = (folder: Folder | undefined) =>
  Boolean(folder && ((folder.viewerUids && folder.viewerUids.length > 0) || folder.sharedWith?.some((share) => share.role === 'viewer')));

const buildOwnershipDisplay = (state: PermissionUiState, isOwnerPerspective: boolean, isMemberPerspective: boolean): OwnershipDisplay => {
  const copy = PERMISSION_UI_COPY[state];
  return {
    state,
    label: copy.shortLabel,
    detail: isOwnerPerspective ? copy.ownerDetail : isMemberPerspective ? copy.memberDetail : copy.neutralDetail,
  };
};

const getFolderPermissionState = (folder: Folder, currentUser: any): { state: PermissionUiState; isOwnerPerspective: boolean; isMemberPerspective: boolean } => {
  if (folder.ownership?.type === 'household' || folder.householdId) {
    return {
      state: 'household',
      isOwnerPerspective: Boolean(currentUser?.uid && folder.ownerUID === currentUser.uid),
      isMemberPerspective: true,
    };
  }

  const isOwnerPerspective = Boolean(currentUser?.uid && folder.ownerUID === currentUser.uid);
  const isEditorPerspective = isEditorInFolder(folder, currentUser?.uid);
  const isViewerPerspective = isViewerInFolder(folder, currentUser?.uid);

  if (isOwnerPerspective) {
    if (hasEditorSharing(folder)) {
      return { state: 'shared_edit', isOwnerPerspective: true, isMemberPerspective: false };
    }
    if (hasViewerSharing(folder)) {
      return { state: 'shared_view', isOwnerPerspective: true, isMemberPerspective: false };
    }
  }

  if (isEditorPerspective) {
    return { state: 'shared_edit', isOwnerPerspective: false, isMemberPerspective: true };
  }

  if (isViewerPerspective) {
    return { state: 'shared_view', isOwnerPerspective: false, isMemberPerspective: true };
  }

  if (hasEditorSharing(folder)) {
    return { state: 'shared_edit', isOwnerPerspective: false, isMemberPerspective: false };
  }

  if (hasViewerSharing(folder) || hasFolderSharing(folder)) {
    return { state: 'shared_view', isOwnerPerspective: false, isMemberPerspective: false };
  }

  return { state: 'private', isOwnerPerspective, isMemberPerspective: false };
};

export const getFolderOwnershipDisplay = (folder: Folder, currentUser: any): OwnershipDisplay => {
  const permission = getFolderPermissionState(folder, currentUser);
  return buildOwnershipDisplay(permission.state, permission.isOwnerPerspective, permission.isMemberPerspective);
};

export const getRecipeOwnershipDisplay = (recipe: Recipe, allFolders: Folder[], currentUser: any): OwnershipDisplay => {
  if (recipe.ownership?.type === 'household' || recipe.householdId) {
    return buildOwnershipDisplay('household', Boolean(currentUser?.uid && recipe.authorUID === currentUser.uid), true);
  }

  const folder = findFolderForRecipe(recipe, allFolders);
  if (folder?.ownership?.type === 'household' || folder?.householdId) {
    return buildOwnershipDisplay('household', Boolean(currentUser?.uid && folder.ownerUID === currentUser.uid), true);
  }

  if (folder) {
    const permission = getFolderPermissionState(folder, currentUser);
    if (permission.state !== 'private') {
      return buildOwnershipDisplay(permission.state, permission.isOwnerPerspective, permission.isMemberPerspective);
    }
  }

  if (recipe.ownership?.type === 'shared' || Boolean(currentUser?.uid && recipe.authorUID && recipe.authorUID !== currentUser.uid)) {
    const isOwnerPerspective = Boolean(currentUser?.uid && recipe.authorUID === currentUser.uid);
    return buildOwnershipDisplay('shared_view', isOwnerPerspective, !isOwnerPerspective);
  }

  return buildOwnershipDisplay('private', Boolean(currentUser?.uid && recipe.authorUID === currentUser.uid), false);
};
