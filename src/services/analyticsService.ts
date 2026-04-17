import { getObserverSessionId } from './observerClient';

export type AnalyticsEventName =
  | 'recipe_import_started'
  | 'recipe_import_succeeded'
  | 'recipe_import_failed'
  | 'recipe_saved'
  | 'recipe_deleted'
  | 'cook_mode_started'
  | 'cook_mode_completed'
  | 'ai_adjust_started'
  | 'ai_adjust_failed'
  | 'ai_adjust_used'
  | 'backup_exported'
  | 'backup_restored'
  | 'folder_shared'
  | 'folder_deleted_undone'
  | 'module_enabled'
  | 'module_disabled'
  | 'client_diagnostic'
  | 'session_error';

type AnalyticsValue = string | number | boolean | null;

export interface AnalyticsPayload {
  [key: string]: AnalyticsValue | AnalyticsValue[] | undefined;
}

export interface AnalyticsEvent {
  name: AnalyticsEventName;
  occurredAt: string;
  path?: string;
  payload?: AnalyticsPayload;
}

const ANALYTICS_ENDPOINT = '/api/events';

function buildEvent(name: AnalyticsEventName, payload?: AnalyticsPayload): AnalyticsEvent {
  const path = typeof window !== 'undefined'
    ? `${window.location.pathname}${window.location.search}${window.location.hash}`
    : undefined;
  const sessionId = typeof window !== 'undefined' ? getObserverSessionId() : undefined;

  return {
    name,
    occurredAt: new Date().toISOString(),
    path,
    payload: sessionId
      ? {
          sessionId,
          ...payload,
        }
      : payload,
  };
}

async function postEvent(event: AnalyticsEvent) {
  const body = JSON.stringify(event);

  if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
    const queued = navigator.sendBeacon(
      ANALYTICS_ENDPOINT,
      new Blob([body], { type: 'application/json' }),
    );

    if (queued) {
      return;
    }
  }

  await fetch(ANALYTICS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  });
}

export function trackEvent(name: AnalyticsEventName, payload?: AnalyticsPayload) {
  void postEvent(buildEvent(name, payload)).catch((error) => {
    console.warn('Analytics event failed:', error);
  });
}
