import { useCallback, useEffect, useState } from 'react';

declare global {
  interface Window {
    __SW_REG__?: any;
  }
}

export function useServiceWorkerUpdate() {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    const onUpdate = () => setUpdateAvailable(true);
    const onControllerChange = () => {
      // After skipping waiting, controller changes when new SW takes over.
      // Reloading makes sure the newest assets are used.
      window.location.reload();
    };

    window.addEventListener('sw:update', onUpdate as EventListener);
    window.addEventListener('sw:controllerchange', onControllerChange as EventListener);

    return () => {
      window.removeEventListener('sw:update', onUpdate as EventListener);
      window.removeEventListener('sw:controllerchange', onControllerChange as EventListener);
    };
  }, []);

  const applyUpdate = useCallback(() => {
    const reg = window.__SW_REG__;
    if (!reg) return;
    const waiting = reg.waiting;
    if (waiting) {
      waiting.postMessage({ type: 'SKIP_WAITING' });
    } else {
      // If there isn't a waiting worker yet, try to update and let updatefound flow handle it.
      reg.update?.();
    }
  }, []);

  const dismiss = useCallback(() => setUpdateAvailable(false), []);

  return { updateAvailable, applyUpdate, dismiss };
}
