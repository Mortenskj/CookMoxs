export type OfflineQueueItemType = 'image' | 'url' | 'text' | 'edit';
export type OfflineQueueStatus = 'pending' | 'processing' | 'failed';

const DB_NAME = 'cookmoxs_offline_queue';
const DB_VERSION = 1;
const STORE_NAME = 'offlineQueue';

interface OfflineQueueBaseItem {
  id: string;
  type: OfflineQueueItemType;
  status: OfflineQueueStatus;
  createdAt: string;
  updatedAt: string;
  attemptCount: number;
  lastError?: string;
  sourceLabel?: string;
}

export type OfflineQueueItem =
  | (OfflineQueueBaseItem & { type: 'url'; payloadText: string })
  | (OfflineQueueBaseItem & { type: 'text'; payloadText: string })
  | (OfflineQueueBaseItem & { type: 'image'; payloadBlob: Blob; mimeType: string; fileName?: string })
  | (OfflineQueueBaseItem & { type: 'edit'; recipeId: string; payloadJson: Record<string, unknown> });

export type OfflineQueueInput =
  | { type: 'url'; url: string; sourceLabel?: string }
  | { type: 'text'; text: string; sourceLabel?: string }
  | { type: 'image'; blob: Blob; mimeType?: string; fileName?: string; sourceLabel?: string }
  | { type: 'edit'; recipeId: string; changes: Record<string, unknown>; sourceLabel?: string };

function createId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function isIndexedDbAvailable() {
  return typeof indexedDB !== 'undefined';
}

function requestToPromise<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
  });
}

function transactionDone(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB transaction failed'));
    transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB transaction aborted'));
  });
}

function openQueueDb() {
  if (!isIndexedDbAvailable()) {
    return Promise.reject(new Error('IndexedDB er ikke tilgaengelig i denne browser.'));
  }

  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      const store = db.objectStoreNames.contains(STORE_NAME)
        ? request.transaction!.objectStore(STORE_NAME)
        : db.createObjectStore(STORE_NAME, { keyPath: 'id' });

      if (!store.indexNames.contains('byStatus')) {
        store.createIndex('byStatus', 'status', { unique: false });
      }
      if (!store.indexNames.contains('byCreatedAt')) {
        store.createIndex('byCreatedAt', 'createdAt', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Kunne ikke aabne offline-koeen.'));
  });
}

async function withStore<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => Promise<T> | IDBRequest<T>) {
  const db = await openQueueDb();
  try {
    const transaction = db.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);
    const result = await Promise.resolve(run(store)).then(value => value instanceof IDBRequest ? requestToPromise(value) : value);
    await transactionDone(transaction);
    return result;
  } finally {
    db.close();
  }
}

function buildQueueItem(input: OfflineQueueInput): OfflineQueueItem {
  const timestamp = new Date().toISOString();
  const base: OfflineQueueBaseItem = {
    id: createId(),
    type: input.type,
    status: 'pending',
    createdAt: timestamp,
    updatedAt: timestamp,
    attemptCount: 0,
    sourceLabel: input.sourceLabel,
  };

  switch (input.type) {
    case 'url':
      return { ...base, type: 'url', payloadText: input.url };
    case 'text':
      return { ...base, type: 'text', payloadText: input.text };
    case 'image':
      return { ...base, type: 'image', payloadBlob: input.blob, mimeType: input.mimeType || input.blob.type || 'application/octet-stream', fileName: input.fileName };
    case 'edit':
      return { ...base, type: 'edit', recipeId: input.recipeId, payloadJson: input.changes };
  }
}

export function isOfflineQueueSupported() {
  return isIndexedDbAvailable();
}

export async function enqueueOfflineQueueItem(input: OfflineQueueInput) {
  if (input.type === 'image' && !(input.blob instanceof Blob)) {
    throw new Error('Billeditems skal gemmes som Blob i offline-koeen.');
  }

  const item = buildQueueItem(input);
  await withStore('readwrite', store => store.add(item));
  return item;
}

export async function listOfflineQueueItems(status?: OfflineQueueStatus) {
  const items = await withStore('readonly', (store) => {
    if (status) {
      return store.index('byStatus').getAll(IDBKeyRange.only(status));
    }
    return store.getAll();
  });

  return [...items].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function getOfflineQueueItem(id: string) {
  return withStore('readonly', store => store.get(id));
}

export async function getPendingOfflineQueueCount() {
  return withStore('readonly', store => store.index('byStatus').count(IDBKeyRange.only('pending')));
}

export async function updateOfflineQueueStatus(id: string, status: OfflineQueueStatus, options?: { lastError?: string; incrementAttemptCount?: boolean }) {
  return withStore('readwrite', async (store) => {
    const item = await requestToPromise(store.get(id));
    if (!item) return null;

    const updated: OfflineQueueItem = {
      ...item,
      status,
      updatedAt: new Date().toISOString(),
      lastError: options?.lastError,
      attemptCount: options?.incrementAttemptCount ? item.attemptCount + 1 : item.attemptCount,
    };

    await requestToPromise(store.put(updated));
    return updated;
  });
}

export async function removeOfflineQueueItem(id: string) {
  await withStore('readwrite', store => store.delete(id));
}

export async function clearOfflineQueue() {
  await withStore('readwrite', store => store.clear());
}
