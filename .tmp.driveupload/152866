import type { FirestoreErrorInfo } from '../firebase';
import { AiRequestError } from './aiService';

export type ImportErrorCategory =
  | 'network'
  | 'timeout'
  | 'malformed_response'
  | 'unsupported_source'
  | 'ai_failure';

export type AiActionErrorCategory =
  | 'ai_unavailable'
  | 'invalid_model'
  | 'malformed_response'
  | 'network';

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
  if (error instanceof AiRequestError) {
    if (error.code === 'offline' || error.code === 'network_error') {
      return {
        category: 'network',
        message: 'Netvaerket drillede, saa opskriften kunne ikke hentes. Tjek forbindelsen og proev igen.',
      };
    }

    if (error.code === 'ai_model_error') {
      return {
        category: 'ai_failure',
        message: 'AI er midlertidigt utilgaengelig paa serveren. Importen kan ikke fortsaette, foer modelkonfigurationen er rettet.',
      };
    }

    if (error.code === 'ai_parse_error' || error.code === 'ai_empty_response') {
      return {
        category: 'malformed_response',
        message: 'Vi fik et ugyldigt svar tilbage under importen. Proev igen eller brug tekst i stedet.',
      };
    }

    if (error.code === 'ai_transport_error') {
      return {
        category: 'ai_failure',
        message: 'AI kunne ikke kontaktes lige nu. Proev igen om lidt.',
      };
    }
  }

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

export function normalizeAiActionError(error: unknown): { category: AiActionErrorCategory; message: string } {
  if (error instanceof AiRequestError) {
    if (error.code === 'offline' || error.code === 'network_error') {
      return {
        category: 'network',
        message: 'Netvaerket drillede, saa AI-handlingen kunne ikke gennemfoeres. Tjek forbindelsen og proev igen.',
      };
    }

    if (error.code === 'ai_model_error') {
      return {
        category: 'invalid_model',
        message: 'AI er midlertidigt utilgaengelig paa serveren. Modelkonfigurationen eller serveropsaetningen skal rettes.',
      };
    }

    if (error.code === 'ai_parse_error' || error.code === 'ai_empty_response') {
      return {
        category: 'malformed_response',
        message: 'AI returnerede et svar, som ikke kunne bruges sikkert. Proev igen om lidt.',
      };
    }

    if (error.code === 'ai_transport_error') {
      return {
        category: 'ai_unavailable',
        message: 'AI kunne ikke kontaktes lige nu. Proev igen om lidt.',
      };
    }
  }

  const rawMessage = getErrorMessage(error).toLowerCase();

  if (
    rawMessage.includes('failed to fetch')
    || rawMessage.includes('fetch failed')
    || rawMessage.includes('network')
    || rawMessage.includes('offline')
    || rawMessage.includes('netv')
  ) {
    return {
      category: 'network',
      message: 'Netvaerket drillede, saa AI-handlingen kunne ikke gennemfoeres. Tjek forbindelsen og proev igen.',
    };
  }

  if (
    rawMessage.includes('model')
    || rawMessage.includes('api_key_invalid')
    || rawMessage.includes('gemini_api_key')
    || rawMessage.includes('konfigureret')
  ) {
    return {
      category: 'invalid_model',
      message: 'AI er midlertidigt utilgaengelig paa serveren. Modelkonfigurationen eller serveropsaetningen skal rettes.',
    };
  }

  if (
    rawMessage.includes('malformed')
    || rawMessage.includes('unexpected')
    || rawMessage.includes('json')
    || rawMessage.includes('empty response')
  ) {
    return {
      category: 'malformed_response',
      message: 'AI returnerede et svar, som ikke kunne bruges sikkert. Proev igen om lidt.',
    };
  }

  return {
    category: 'ai_unavailable',
    message: 'AI kunne ikke kontaktes lige nu. Proev igen om lidt.',
  };
}
