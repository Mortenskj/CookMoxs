import { AsyncLocalStorage } from 'node:async_hooks';
import { mkdir, appendFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

export type ObserverLevel = 'info' | 'warn' | 'error';
export type ObserverSource = 'server' | 'client' | 'api' | 'analytics';

export type ObserverEvent = {
  id: string;
  ts: string;
  level: ObserverLevel;
  source: ObserverSource;
  kind: string;
  message?: string | null;
  sessionId?: string | null;
  requestId?: string | null;
  method?: string | null;
  path?: string | null;
  status?: number | null;
  durationMs?: number | null;
  data?: Record<string, unknown> | null;
};

type ObserverContext = {
  requestId?: string | null;
  sessionId?: string | null;
  method?: string | null;
  path?: string | null;
};

const MAX_EVENTS = 1500;
const MAX_SESSIONS = 120;
const contextStorage = new AsyncLocalStorage<ObserverContext>();
const recentEvents: ObserverEvent[] = [];
const sessionIds = new Map<string, string>();
const runtimeId = new Date().toISOString().replace(/[:.]/g, '-');
const observerDir = path.join(process.cwd(), '.dev-observe', 'live');
const observerFile = path.join(observerDir, `observer-${runtimeId}.ndjson`);
const captureDir = path.join(process.cwd(), '.dev-observe', 'captures');

let consoleBridgeInstalled = false;
let dirReady: Promise<void> | null = null;
let captureDirReady: Promise<void> | null = null;

const observerEnabled = process.env.NODE_ENV !== 'production' || process.env.OBSERVER_ENABLED === 'true';
const observerPersistToDisk = process.env.OBSERVER_PERSIST_TO_DISK === 'false'
  ? false
  : observerEnabled;
const observerExportToken = process.env.OBSERVER_EXPORT_TOKEN?.trim() || '';

function ensureObserverDir() {
  if (!dirReady) {
    dirReady = mkdir(observerDir, { recursive: true }).catch(() => {});
  }

  return dirReady;
}

function ensureCaptureDir() {
  if (!captureDirReady) {
    captureDirReady = mkdir(captureDir, { recursive: true }).catch(() => {});
  }

  return captureDirReady;
}

function trimMessage(value: unknown) {
  if (value == null) return null;
  if (typeof value === 'string') return value.slice(0, 400);

  try {
    return JSON.stringify(value).slice(0, 400);
  } catch {
    return String(value).slice(0, 400);
  }
}

function sanitizeDeepValue(value: unknown, depth = 0): unknown {
  if (depth > 5) return trimMessage(value);
  if (value == null) return value;
  if (typeof value === 'string') return value.slice(0, 4000);
  if (typeof value === 'number' || typeof value === 'boolean') return value;

  if (Array.isArray(value)) {
    return value.slice(0, 50).map((entry) => sanitizeDeepValue(entry, depth + 1));
  }

  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).slice(0, 50).map(([key, entry]) => [
        key.slice(0, 120),
        sanitizeDeepValue(entry, depth + 1),
      ]),
    );
  }

  return trimMessage(value);
}

function sanitizeData(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;

  return Object.fromEntries(
    Object.entries(value).slice(0, 20).map(([key, entry]) => [
      key.slice(0, 80),
      sanitizeDeepValue(entry),
    ]),
  );
}

function pushSessionId(sessionId?: string | null) {
  if (!sessionId) return;
  sessionIds.set(sessionId, new Date().toISOString());
  while (sessionIds.size > MAX_SESSIONS) {
    const oldestKey = sessionIds.keys().next().value;
    if (!oldestKey) break;
    sessionIds.delete(oldestKey);
  }
}

function persistEvent(event: ObserverEvent) {
  if (!observerPersistToDisk) return;

  void ensureObserverDir().then(() =>
    appendFile(observerFile, `${JSON.stringify(event)}\n`, 'utf8').catch(() => {}),
  );
}

export function isObserverEnabled() {
  return observerEnabled;
}

export function getObserverRuntimeInfo() {
  return {
    enabled: observerEnabled,
    runtimeId,
    observerFile: observerPersistToDisk ? observerFile : null,
    captureDir: observerPersistToDisk ? captureDir : null,
    exportTokenConfigured: Boolean(observerExportToken),
  };
}

export function runWithObserverContext<T>(context: ObserverContext, fn: () => T): T {
  return contextStorage.run(context, fn);
}

export function getObserverContext() {
  return contextStorage.getStore() || null;
}

export function getRequestSessionId(headers: Record<string, unknown>) {
  const headerValue = headers['x-cookmoxs-session-id'];

  if (Array.isArray(headerValue)) {
    const first = headerValue[0];
    return typeof first === 'string' ? first.slice(0, 120) : null;
  }

  return typeof headerValue === 'string' ? headerValue.slice(0, 120) : null;
}

export function createRequestId() {
  return crypto.randomUUID();
}

export function recordObserverEvent(input: Omit<ObserverEvent, 'id' | 'ts'>) {
  if (!observerEnabled) return null;

  const context = getObserverContext();
  const event: ObserverEvent = {
    id: crypto.randomUUID(),
    ts: new Date().toISOString(),
    level: input.level,
    source: input.source,
    kind: input.kind,
    message: trimMessage(input.message),
    sessionId: input.sessionId ?? context?.sessionId ?? null,
    requestId: input.requestId ?? context?.requestId ?? null,
    method: input.method ?? context?.method ?? null,
    path: input.path ?? context?.path ?? null,
    status: input.status ?? null,
    durationMs: input.durationMs ?? null,
    data: sanitizeData(input.data),
  };

  recentEvents.push(event);
  if (recentEvents.length > MAX_EVENTS) recentEvents.shift();
  pushSessionId(event.sessionId);
  persistEvent(event);

  return event;
}

export function installObserverConsoleBridge() {
  if (!observerEnabled || consoleBridgeInstalled) return;
  consoleBridgeInstalled = true;

  const originalWarn = console.warn.bind(console);
  const originalError = console.error.bind(console);

  console.warn = (...args: unknown[]) => {
    originalWarn(...args);
    recordObserverEvent({
      level: 'warn',
      source: 'server',
      kind: 'console_warn',
      message: trimMessage(args.map((arg) => trimMessage(arg)).join(' ')),
    });
  };

  console.error = (...args: unknown[]) => {
    originalError(...args);
    recordObserverEvent({
      level: 'error',
      source: 'server',
      kind: 'console_error',
      message: trimMessage(args.map((arg) => trimMessage(arg)).join(' ')),
    });
  };
}

export function isObserverRequestAuthorized(headers: Record<string, unknown>, host?: string | null) {
  if (!observerEnabled) return false;

  if (observerExportToken) {
    const token = headers['x-observer-token'];
    if (Array.isArray(token)) return token.includes(observerExportToken);
    return token === observerExportToken;
  }

  return process.env.NODE_ENV !== 'production' || host === '127.0.0.1:3000' || host === 'localhost:3000';
}

export function getObserverEvents(limit = 200, sessionId?: string | null) {
  const safeLimit = Math.max(1, Math.min(limit, 500));
  const filtered = sessionId
    ? recentEvents.filter((event) => event.sessionId === sessionId)
    : recentEvents;

  return filtered.slice(-safeLimit);
}

export function getObserverSessions(limit = 50) {
  return Array.from(sessionIds.entries())
    .map(([sessionId, lastSeenAt]) => ({ sessionId, lastSeenAt }))
    .slice(-Math.max(1, Math.min(limit, 200)));
}

export async function persistObserverCapture(params: {
  sessionId?: string | null;
  recipeId?: string | null;
  action: string;
  phase: 'before' | 'after';
  target: string;
  imageDataUrl: string;
}) {
  if (!observerPersistToDisk || !params.sessionId || !params.imageDataUrl.startsWith('data:image/png;base64,')) {
    return null;
  }

  await ensureCaptureDir();

  const safeSessionId = params.sessionId.replace(/[^a-z0-9-]+/gi, '_').slice(0, 80);
  const safeAction = params.action.replace(/[^a-z0-9-]+/gi, '_').slice(0, 60);
  const safeTarget = params.target.replace(/[^a-z0-9-]+/gi, '_').slice(0, 60);
  const safeRecipeId = (params.recipeId || 'unknown').replace(/[^a-z0-9-]+/gi, '_').slice(0, 80);
  const sessionCaptureDir = path.join(captureDir, safeSessionId);
  await mkdir(sessionCaptureDir, { recursive: true });

  const filename = `${new Date().toISOString().replace(/[:.]/g, '-')}-${safeRecipeId}-${safeAction}-${params.phase}-${safeTarget}.png`;
  const filePath = path.join(sessionCaptureDir, filename);
  const base64 = params.imageDataUrl.slice('data:image/png;base64,'.length);
  await writeFile(filePath, Buffer.from(base64, 'base64'));

  return filePath;
}
