import { useCallback, useEffect, useRef, useState } from 'react';
import {
  listOfflineQueueItems,
  removeOfflineQueueItem,
  updateOfflineQueueStatus,
  type OfflineQueueItem,
} from '../services/offlineQueueService';

interface UseOfflineQueueProcessorOptions {
  isOnline: boolean;
  canProcess: boolean;
  onProcessItem: (item: OfflineQueueItem) => Promise<void>;
  onQueueChanged?: () => Promise<void> | void;
}

type QueueProcessTrigger = 'manual' | 'online' | 'resume';

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return String(error ?? 'Ukendt fejl');
}

export function useOfflineQueueProcessor({ isOnline, canProcess, onProcessItem, onQueueChanged }: UseOfflineQueueProcessorOptions) {
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);
  const [queueProcessMessage, setQueueProcessMessage] = useState<string | null>(null);
  const processingRef = useRef(false);
  const onProcessItemRef = useRef(onProcessItem);
  const onQueueChangedRef = useRef(onQueueChanged);

  useEffect(() => {
    onProcessItemRef.current = onProcessItem;
  }, [onProcessItem]);

  useEffect(() => {
    onQueueChangedRef.current = onQueueChanged;
  }, [onQueueChanged]);

  const processPendingQueue = useCallback(async (trigger: QueueProcessTrigger = 'manual') => {
    if (!isOnline || !canProcess || processingRef.current) {
      return;
    }

    processingRef.current = true;
    setIsProcessingQueue(true);

    try {
      const items = await listOfflineQueueItems();
      const candidates = items.filter(item => item.status === 'pending' || (trigger === 'manual' && item.status === 'failed'));

      if (candidates.length === 0) {
        if (trigger === 'manual') {
          setQueueProcessMessage('Ingen ventende importer at behandle lige nu.');
        }
        return;
      }

      let processedCount = 0;
      let failedCount = 0;

      for (const item of candidates) {
        await updateOfflineQueueStatus(item.id, 'processing');

        try {
          await onProcessItemRef.current(item);
          await removeOfflineQueueItem(item.id);
          processedCount += 1;
        } catch (error) {
          failedCount += 1;
          await updateOfflineQueueStatus(item.id, 'failed', {
            lastError: getErrorMessage(error),
            incrementAttemptCount: true,
          });
        } finally {
          await onQueueChangedRef.current?.();
        }
      }

      if (processedCount > 0 && failedCount === 0) {
        setQueueProcessMessage(`${processedCount} ventende import${processedCount === 1 ? '' : 'er'} blev behandlet.`);
      } else if (processedCount > 0 && failedCount > 0) {
        setQueueProcessMessage(`${processedCount} ventende import${processedCount === 1 ? '' : 'er'} blev behandlet, men ${failedCount} fejlede stadig.`);
      } else if (failedCount > 0 && trigger === 'manual') {
        setQueueProcessMessage(`Ingen importer gik igennem. ${failedCount} item${failedCount === 1 ? '' : 's'} fejlede stadig.`);
      }
    } finally {
      processingRef.current = false;
      setIsProcessingQueue(false);
      await onQueueChangedRef.current?.();
    }
  }, [canProcess, isOnline]);

  useEffect(() => {
    if (!isOnline || !canProcess) return;
    void processPendingQueue('online');
  }, [isOnline, canProcess, processPendingQueue]);

  useEffect(() => {
    if (!canProcess) return;

    const onVisibilityChange = () => {
      if (!document.hidden && isOnline) {
        void processPendingQueue('resume');
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [canProcess, isOnline, processPendingQueue]);

  return {
    isProcessingQueue,
    queueProcessMessage,
    clearQueueProcessMessage: () => setQueueProcessMessage(null),
    processPendingQueue,
  };
}
