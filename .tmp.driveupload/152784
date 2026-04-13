import { useCallback, useEffect, useState } from 'react';
import { getPendingOfflineQueueCount, isOfflineQueueSupported, listOfflineQueueItems } from '../services/offlineQueueService';

export function usePendingQueue() {
  const [pendingCount, setPendingCount] = useState(0);
  const [retryableCount, setRetryableCount] = useState(0);
  const [isQueueSupported, setIsQueueSupported] = useState(false);

  const refreshPendingCount = useCallback(async () => {
    const supported = isOfflineQueueSupported();
    setIsQueueSupported(supported);

    if (!supported) {
      setPendingCount(0);
      setRetryableCount(0);
      return;
    }

    try {
      const count = await getPendingOfflineQueueCount();
      const items = await listOfflineQueueItems();
      setPendingCount(count);
      setRetryableCount(items.filter(item => item.status === 'pending' || item.status === 'failed').length);
    } catch {
      setPendingCount(0);
      setRetryableCount(0);
    }
  }, []);

  useEffect(() => {
    refreshPendingCount();

    const onRefresh = () => {
      void refreshPendingCount();
    };

    const onVisibilityChange = () => {
      if (!document.hidden) {
        void refreshPendingCount();
      }
    };

    window.addEventListener('focus', onRefresh);
    window.addEventListener('online', onRefresh);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.removeEventListener('focus', onRefresh);
      window.removeEventListener('online', onRefresh);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [refreshPendingCount]);

  return {
    pendingCount,
    retryableCount,
    isQueueSupported,
    refreshPendingCount,
  };
}
