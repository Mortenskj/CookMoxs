import type { ShareRole, Folder } from '../types';
import type { PermissionUiState } from '../config/permissionUiModel';

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const syncFolderShareIndexes = (folder: Folder): Folder => {
  const sharedWith = folder.sharedWith || [];

  return {
    ...folder,
    sharedWith,
    editorUids: sharedWith
      .filter((share) => share.role === 'editor' && share.uid && !share.uid.startsWith('pending_'))
      .map((share) => share.uid),
    viewerUids: sharedWith
      .filter((share) => share.role === 'viewer' && share.uid && !share.uid.startsWith('pending_'))
      .map((share) => share.uid),
  };
};

export const upsertFolderShare = (folder: Folder, email: string, role: ShareRole): Folder => {
  const normalizedEmail = normalizeEmail(email);
  const existing = (folder.sharedWith || []).find((share) => normalizeEmail(share.email) === normalizedEmail);
  const nextSharedWith = existing
    ? (folder.sharedWith || []).map((share) => normalizeEmail(share.email) === normalizedEmail ? { ...share, email: normalizedEmail, role } : share)
    : [...(folder.sharedWith || []), { uid: `pending_${normalizedEmail}`, email: normalizedEmail, role }];

  return syncFolderShareIndexes({
    ...folder,
    sharedWith: nextSharedWith,
  });
};

export const removeFolderShare = (folder: Folder, email: string): Folder => {
  const normalizedEmail = normalizeEmail(email);
  return syncFolderShareIndexes({
    ...folder,
    sharedWith: (folder.sharedWith || []).filter((share) => normalizeEmail(share.email) !== normalizedEmail),
  });
};

export const setFolderPermissionState = (folder: Folder, state: Exclude<PermissionUiState, 'household'>): Folder => {
  if (state === 'private') {
    return {
      ...folder,
      sharedWith: [],
      editorUids: [],
      viewerUids: [],
    };
  }

  const nextRole: ShareRole = state === 'shared_edit' ? 'editor' : 'viewer';
  return syncFolderShareIndexes({
    ...folder,
    sharedWith: (folder.sharedWith || []).map((share) => ({ ...share, role: nextRole })),
  });
};
