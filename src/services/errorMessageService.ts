import type { FirestoreErrorInfo } from '../firebase';

export type ImportErrorCategory =
  | 'network'
  | 'timeout'
  | 'malformed_response'
  | 'unsupported_source'
  | 'ai_failure';

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return String(error ?? '');
}

function parseFirestoreErrorInfo(error: unknown): FirestoreErrorInfo | null {
  const message = getErrorMessage(error).trim();
  if (!message.startsWith('{')) return null;

  try {
    const parsed = JSON.parse(message);
    if (parsed && typeof parsed === 'object' && typeof parsed.error === 'string') {
      return parsed as FirestoreErrorInfo;
    }
  } catch {
    // Ignore invalid JSON-shaped messages and fall back to plain text handling.
  }

  return null;
}

export function normalizeImportError(error: unknown): { category: ImportErrorCategory; message: string } {
  const rawMessage = getErrorMessage(error).toLowerCase();

  if (rawMessage.includes('blev afbrudt') || rawMessage.includes('ikke blev godkendt')) {
    return {
      category: 'ai_failure',
      message: 'Importen blev afbrudt, fordi AI-import ikke blev godkendt.',
    };
  }

  if (
    rawMessage.includes('offline')
    || rawMessage.includes('netværk')
    || rawMessage.includes('failed to fetch')
    || rawMessage.includes('fetch failed')
    || rawMessage.includes('network')
    || rawMessage.includes('kunne ikke oprette forbindelse til kilden')
  ) {
    return {
      category: 'network',
      message: 'Netværket drillede, så opskriften kunne ikke hentes. Tjek din forbindelse og prøv igen.',
    };
  }

  if (
    rawMessage.includes('timeout')
    || rawMessage.includes('timed out')
    || rawMessage.includes('econnaborted')
    || rawMessage.includes('deadline')
    || rawMessage.includes('kilden brugte for lang tid')
  ) {
    return {
      category: 'timeout',
      message: 'Det tog for lang tid at hente opskriften. Prøv igen om lidt eller indsæt opskriften som tekst.',
    };
  }

  if (
    rawMessage.includes('unexpected end of json input')
    || rawMessage.includes('unexpected token')
    || rawMessage.includes('malformed')
    || rawMessage.includes('invalid json')
    || rawMessage.includes('__malformed_response__')
  ) {
    return {
      category: 'malformed_response',
      message: 'Vi fik et ugyldigt svar tilbage under importen. Prøv igen eller brug tekst i stedet.',
    };
  }

  if (
    rawMessage.includes('url er ugyldig')
    || rawMessage.includes('kun http og https er tilladt')
    || rawMessage.includes('private eller lokale adresser er ikke tilladt')
    || rawMessage.includes('manglende indhold til import')
    || rawMessage.includes('kunne ikke hente indhold fra url')
    || rawMessage.includes('failed to fetch url content')
    || rawMessage.includes('kilden kunne ikke bruges som opskrift')
    || rawMessage.includes('unsupported')
  ) {
    return {
      category: 'unsupported_source',
      message: 'Kilden kunne ikke bruges som opskrift. Prøv en anden side eller indsæt opskriften som tekst.',
    };
  }

  return {
    category: 'ai_failure',
    message: 'AI kunne ikke gøre opskriften klar denne gang. Prøv igen om lidt.',
  };
}

export function normalizeSyncError(error: unknown, fallbackMessage = 'Cloud-sync fejlede. Dine lokale data er ikke mistet.'): string {
  const firestoreInfo = parseFirestoreErrorInfo(error);
  const rawMessage = (firestoreInfo?.error || getErrorMessage(error)).toLowerCase();
  const rawCode = firestoreInfo?.code?.toLowerCase() || '';

  if (
    rawMessage.includes('offline')
    || rawMessage.includes('network')
    || rawMessage.includes('failed to fetch')
    || rawCode.includes('unavailable')
  ) {
    return 'Cloud er midlertidigt utilgængelig. Dine lokale ændringer er ikke synkroniseret endnu.';
  }

  if (
    rawCode.includes('permission-denied')
    || rawMessage.includes('missing or insufficient permissions')
    || rawMessage.includes('permission-denied')
  ) {
    return 'Du har ikke adgang til at synkronisere disse data lige nu.';
  }

  if (
    rawCode.includes('unauthenticated')
    || rawMessage.includes('unauthenticated')
    || rawMessage.includes('auth')
  ) {
    return 'Din login-session er udløbet. Log ind igen for at fortsætte sync.';
  }

  if (
    rawCode.includes('deadline-exceeded')
    || rawCode.includes('aborted')
    || rawMessage.includes('deadline')
    || rawMessage.includes('timeout')
  ) {
    return 'Cloud-sync tog for lang tid. Prøv igen om et øjeblik.';
  }

  if (
    rawCode.includes('not-found')
    || rawMessage.includes('not-found')
  ) {
    return 'Det, du prøvede at synkronisere, findes ikke længere i cloud.';
  }

  return fallbackMessage;
}
