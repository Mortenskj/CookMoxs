import { useState } from 'react';

const STORAGE_KEY = 'cookmoxs_flavor_boosts_visible';

export function useFlavorBoostsVisible() {
  const [visible, setVisibleState] = useState<boolean>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === null ? true : stored === 'true';
  });

  const setVisible = (next: boolean) => {
    localStorage.setItem(STORAGE_KEY, String(next));
    setVisibleState(next);
  };

  return { visible, setVisible };
}
