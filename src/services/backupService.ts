import { Folder, Recipe } from '../types';
import type { UserLevel } from '../config/cookingLevels';
import type { CookFontSize } from '../config/cookDisplay';

export interface BackupPayload {
  app: 'CookMoxs';
  version: 1;
  exportedAt: string;
  recipes: Recipe[];
  folders: Folder[];
  activeRecipe: Recipe | null;
  preferences: {
    userLevel: UserLevel;
    theme: string;
    isDarkMode: boolean;
    cookFontSize?: CookFontSize;
  };
}

export function createBackupPayload(input: Omit<BackupPayload, 'app' | 'version' | 'exportedAt'>): BackupPayload {
  return {
    app: 'CookMoxs',
    version: 1,
    exportedAt: new Date().toISOString(),
    ...input,
  };
}

export function parseBackupPayload(raw: string): BackupPayload {
  const data = JSON.parse(raw);

  if (!data || data.app !== 'CookMoxs' || data.version !== 1) {
    throw new Error('Backupfilen er ikke en gyldig CookMoxs-backup.');
  }

  if (!Array.isArray(data.recipes) || !Array.isArray(data.folders)) {
    throw new Error('Backupfilen mangler opskrifter eller mapper.');
  }

  return data as BackupPayload;
}

export function downloadBackupFile(payload: BackupPayload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const stamp = payload.exportedAt.slice(0, 19).replace(/[:T]/g, '-');
  link.href = url;
  link.download = `cookmoxs-backup-${stamp}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
