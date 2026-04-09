import { useState } from 'react';

const STORAGE_KEY = 'cookmoxs_wake_lock_enabled';

export function useWakeLockEnabled() {
  const [enabled, setEnabledState] = useState<boolean>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === null ? true : stored === 'true';
  });

  const setEnabled = (next: boolean) => {
    localStorage.setItem(STORAGE_KEY, String(next));
    setEnabledState(next);
  };

  return { enabled, setEnabled };
}

export function getWakeLockEnabled(): boolean {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === null ? true : stored === 'true';
}
