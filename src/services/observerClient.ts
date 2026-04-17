const OBSERVER_SESSION_KEY = 'cookmoxs_observer_session_id';
const OBSERVER_MAX_DIAGNOSTICS = 120;
const OBSERVER_DEDUPE_WINDOW_MS = 8000;
const ANALYTICS_ENDPOINT = '/api/events';

type DiagnosticLevel = 'warn' | 'error' | 'info';

type DiagnosticPayload = {
  level: DiagnosticLevel;
  kind: string;
  message: string;
  details?: Record<string, unknown>;
};

let clientObserverInitialized = false;
let sentDiagnostics = 0;
let postingDiagnostic = false;
const recentDiagnosticHashes = new Map<string, number>();

function trimText(value: unknown, max = 400): string {
  if (typeof value === 'string') return value.slice(0, max);

  try {
    return JSON.stringify(value).slice(0, max);
  } catch {
    return String(value).slice(0, max);
  }
}

function sanitizeDetails(details?: Record<string, unknown>) {
  if (!details) return undefined;

  return Object.fromEntries(
    Object.entries(details).slice(0, 20).map(([key, value]) => [
      key.slice(0, 80),
      typeof value === 'string'
        ? value.slice(0, 500)
        : typeof value === 'number' || typeof value === 'boolean' || value == null
          ? value
          : trimText(value, 500),
    ]),
  );
}

export function getObserverSessionId() {
  if (typeof window === 'undefined') return 'server';

  try {
    const existing = window.sessionStorage.getItem(OBSERVER_SESSION_KEY);
    if (existing) return existing;

    const next = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `session-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

    window.sessionStorage.setItem(OBSERVER_SESSION_KEY, next);
    return next;
  } catch {
    return `session-${Date.now()}`;
  }
}

function postObserverEvent(event: {
  name: 'client_diagnostic' | 'session_error';
  payload: Record<string, unknown>;
}) {
  const body = JSON.stringify({
    name: event.name,
    occurredAt: new Date().toISOString(),
    path: `${window.location.pathname}${window.location.search}${window.location.hash}`,
    payload: {
      sessionId: getObserverSessionId(),
      href: window.location.href,
      userAgent: navigator.userAgent.slice(0, 200),
      ...sanitizeDetails(event.payload),
    },
  });

  if (typeof navigator.sendBeacon === 'function') {
    const queued = navigator.sendBeacon(
      ANALYTICS_ENDPOINT,
      new Blob([body], { type: 'application/json' }),
    );

    if (queued) return;
  }

  void fetch(ANALYTICS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {});
}

function shouldSendDiagnostic(hash: string) {
  if (sentDiagnostics >= OBSERVER_MAX_DIAGNOSTICS) return false;

  const now = Date.now();
  const lastSeenAt = recentDiagnosticHashes.get(hash);
  if (lastSeenAt && now - lastSeenAt < OBSERVER_DEDUPE_WINDOW_MS) {
    return false;
  }

  recentDiagnosticHashes.set(hash, now);
  sentDiagnostics += 1;
  return true;
}

export function reportClientDiagnostic(payload: DiagnosticPayload) {
  if (typeof window === 'undefined' || postingDiagnostic) return;

  const message = trimText(payload.message);
  const hash = `${payload.level}:${payload.kind}:${message}`;

  if (!shouldSendDiagnostic(hash)) return;

  postingDiagnostic = true;
  try {
    postObserverEvent({
      name: 'client_diagnostic',
      payload: {
        level: payload.level,
        kind: payload.kind,
        message,
        ...sanitizeDetails(payload.details),
      },
    });
  } finally {
    postingDiagnostic = false;
  }
}

export function reportSessionErrorToObserver(error: { message?: string; code?: string }, action?: string) {
  if (typeof window === 'undefined') return;

  postObserverEvent({
    name: 'session_error',
    payload: {
      action: action || null,
      code: error.code || null,
      message: trimText(error.message || 'Unknown error'),
    },
  });
}

export function initObserverClient() {
  if (typeof window === 'undefined' || clientObserverInitialized) return;
  clientObserverInitialized = true;

  getObserverSessionId();

  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    try {
      const requestUrl = typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
      const isRelative = requestUrl.startsWith('/');
      const isSameOrigin = requestUrl.startsWith(window.location.origin);

      if (!isRelative && !isSameOrigin) {
        return originalFetch(input, init);
      }

      const nextHeaders = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined));
      nextHeaders.set('x-cookmoxs-session-id', getObserverSessionId());

      return originalFetch(input, {
        ...init,
        headers: nextHeaders,
      });
    } catch {
      return originalFetch(input, init);
    }
  };

  const originalWarn = console.warn.bind(console);
  const originalError = console.error.bind(console);

  console.warn = (...args: unknown[]) => {
    originalWarn(...args);
    reportClientDiagnostic({
      level: 'warn',
      kind: 'console_warn',
      message: args.map((arg) => trimText(arg, 200)).join(' '),
    });
  };

  console.error = (...args: unknown[]) => {
    originalError(...args);
    reportClientDiagnostic({
      level: 'error',
      kind: 'console_error',
      message: args.map((arg) => trimText(arg, 200)).join(' '),
    });
  };

  window.addEventListener('error', (event) => {
    reportClientDiagnostic({
      level: 'error',
      kind: 'window_error',
      message: event.message || 'Unhandled window error',
      details: {
        filename: event.filename || null,
        lineno: event.lineno || null,
        colno: event.colno || null,
      },
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    reportClientDiagnostic({
      level: 'error',
      kind: 'unhandled_rejection',
      message: trimText(event.reason || 'Unhandled promise rejection'),
    });
  });
}
