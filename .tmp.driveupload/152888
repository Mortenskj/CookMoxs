import type { Dispatch, SetStateAction } from 'react';
import { STORAGE_KEYS } from '../config/storageKeys';

export type CloudSyncStatus = 'idle' | 'syncing' | 'saved' | 'error';

interface CloudSyncStatusHelpersOptions {
  setStatus: Dispatch<SetStateAction<CloudSyncStatus>>;
  setMessage: Dispatch<SetStateAction<string | null>>;
  setLastSyncAt: Dispatch<SetStateAction<string | null>>;
}

export function createCloudSyncStatusHelpers({
  setStatus,
  setMessage,
  setLastSyncAt,
}: CloudSyncStatusHelpersOptions) {
  const markCloudSyncing = (message = 'Synkroniserer til cloud...') => {
    setStatus('syncing');
    setMessage(message);
  };

  const markCloudSaved = (message = 'Synkroniseret til cloud') => {
    const now = new Date().toISOString();
    setStatus('saved');
    setMessage(message);
    setLastSyncAt(now);
    localStorage.setItem(STORAGE_KEYS.lastCloudSyncAt, now);
  };

  const markCloudError = (message = 'Cloud-sync fejlede') => {
    setStatus('error');
    setMessage(message);
  };

  return {
    markCloudSyncing,
    markCloudSaved,
    markCloudError,
  };
}
