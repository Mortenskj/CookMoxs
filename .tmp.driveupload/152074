import { useEffect, useState } from 'react';

export interface SessionError {
  timestamp: string;
  message: string;
  code?: string;
  action?: string;
}

const SESSION_ERRORS: SessionError[] = [];
const LISTENERS = new Set<() => void>();

export function logSessionError(error: { message?: string; code?: string }, action?: string) {
  SESSION_ERRORS.push({
    timestamp: new Date().toISOString(),
    message: error.message || 'Unknown error',
    code: error.code,
    action,
  });
  // Keep max 50 entries
  if (SESSION_ERRORS.length > 50) SESSION_ERRORS.shift();
  LISTENERS.forEach(fn => fn());
}

export function getSessionErrors(): SessionError[] {
  return [...SESSION_ERRORS];
}

export function clearSessionErrors() {
  SESSION_ERRORS.length = 0;
  LISTENERS.forEach(fn => fn());
}

export function exportSessionErrorLog(): string {
  if (SESSION_ERRORS.length === 0) return 'Ingen fejl i denne session.';
  return SESSION_ERRORS.map(e =>
    `[${e.timestamp}] ${e.action ? `(${e.action}) ` : ''}${e.code ? `[${e.code}] ` : ''}${e.message}`
  ).join('\n');
}

export function useSessionErrorLog() {
  const [errors, setErrors] = useState<SessionError[]>(() => getSessionErrors());

  useEffect(() => {
    const update = () => setErrors(getSessionErrors());
    LISTENERS.add(update);
    return () => { LISTENERS.delete(update); };
  }, []);

  return { errors, clear: clearSessionErrors, export: exportSessionErrorLog };
}
