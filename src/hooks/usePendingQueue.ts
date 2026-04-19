import { useCallback, useEffect, useState } from 'react';
import { getPendingOfflineQueueCount, isOfflineQueueSupported, listOfflineQueueItems } from '../services/offlineQueueService';

// Module-level singleton store so multiple component mounts share listeners
// and a single refresh flow. Mounting usePendingQueue() in both App.tsx and
// ImportView.tsx previously attached duplicate focus/online/visibility
// listeners and issued duplicate offlineQueue reads; this collapses them.
type QueueState = {
  pendingCount: number;
  retryableCount: number;
  isQueueSupported: boolean;
};

const initialState: QueueState = {
  pendingCount: 0,
  retryableCount: 0,
  isQueueSupported: false,
};

let currentState: QueueState = initialState;
const listeners = new Set<(s: QueueState) => void>();
let inflightRefresh: Promise<void> | null = null;
let windowListenersAttached = false;
let pendingRefreshAfterInflight = false;

function emit(next: QueueState) {
  currentState = next;
  listeners.forEach((listener) => listener(next));
}

async function runRefresh(): Promise<void> {
  const supported = isOfflineQueueSupported();
  if (!supported) {
    emit({ pendingCount: 0, retryableCount: 0, isQueueSupported: false });
    return;
  }
  try {
    const count = await getPendingOfflineQueueCount();
    const items = await listOfflineQueueItems();
    emit({
      pendingCount: count,
      retryableCount: items.filter((item) => item.status === 'pending' || item.status === 'failed').length,
      isQueueSupported: true,
    });
  } catch {
    emit({ pendingCount: 0, retryableCount: 0, isQueueSupported: supported });
  }
}

function refreshShared(): Promise<void> {
  if (inflightRefresh) {
    pendingRefreshAfterInflight = true;
    return inflightRefresh;
  }
  inflightRefresh = runRefresh().finally(() => {
    inflightRefresh = null;
    if (pendingRefreshAfterInflight) {
      pendingRefreshAfterInflight = false;
      void refreshShared();
    }
  });
  return inflightRefresh;
}

function ensureWindowListeners() {
  if (windowListenersAttached) return;
  if (typeof window === 'undefined') return;
  windowListenersAttached = true;

  const onRefresh = () => {
    void refreshShared();
  };
  const onVisibilityChange = () => {
    if (!document.hidden) void refreshShared();
  };

  window.addEventListener('focus', onRefresh);
  window.addEventListener('online', onRefresh);
  document.addEventListener('visibilitychange', onVisibilityChange);
}

export function usePendingQueue() {
  const [state, setState] = useState<QueueState>(currentState);

  const refreshPendingCount = useCallback(async () => {
    await refreshShared();
  }, []);

  useEffect(() => {
    ensureWindowListeners();

    const listener = (s: QueueState) => setState(s);
    listeners.add(listener);
    // Sync in case state already drifted since initial useState() snapshot.
    if (state !== currentState) setState(currentState);

    // First mount kicks a refresh; later mounts coalesce into inflight.
    void refreshShared();

    return () => {
      listeners.delete(listener);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    pendingCount: state.pendingCount,
    retryableCount: state.retryableCount,
    isQueueSupported: state.isQueueSupported,
    refreshPendingCount,
  };
}
