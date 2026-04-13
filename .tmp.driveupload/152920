export type AiFailureCode =
  | 'ai_model_error'
  | 'ai_transport_error'
  | 'ai_empty_response'
  | 'ai_parse_error';

type AiFailureMeta = {
  cause?: unknown;
  context?: string;
};

const AI_FAILURE_DETAILS: Record<AiFailureCode, { status: number; message: string }> = {
  ai_model_error: {
    status: 503,
    message: 'AI-modellen er utilgaengelig eller forkert konfigureret paa serveren.',
  },
  ai_transport_error: {
    status: 502,
    message: 'AI-forbindelsen fejlede. Proev igen om lidt.',
  },
  ai_empty_response: {
    status: 502,
    message: 'AI returnerede ikke brugbart indhold.',
  },
  ai_parse_error: {
    status: 502,
    message: 'AI returnerede et svar, som ikke kunne laeses sikkert.',
  },
};

const MODEL_ERROR_PATTERNS = [
  'gemini_api_key is not configured',
  'api_key_invalid',
  'model not found',
  'unsupported model',
  'unknown model',
  'invalid model',
  'permission denied',
  'permission_denied',
];

const TRANSPORT_ERROR_PATTERNS = [
  'fetch failed',
  'network',
  'socket hang up',
  'timed out',
  'timeout',
  'econnreset',
  'econnrefused',
  'eai_again',
  'enotfound',
  '503',
  '502',
  '504',
];

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return String(error ?? '');
}

export class AiServerError extends Error {
  readonly code: AiFailureCode;
  readonly status: number;
  readonly cause?: unknown;
  readonly context?: string;

  constructor(code: AiFailureCode, overrideMessage?: string, meta?: AiFailureMeta) {
    super(overrideMessage || AI_FAILURE_DETAILS[code].message);
    this.code = code;
    this.status = AI_FAILURE_DETAILS[code].status;
    this.cause = meta?.cause;
    this.context = meta?.context;
  }
}

export function isAiServerError(error: unknown): error is AiServerError {
  return error instanceof AiServerError;
}

function collectFallbackText(response: any): string {
  if (!response || typeof response !== 'object') {
    return '';
  }

  const parts = Array.isArray(response.candidates)
    ? response.candidates.flatMap((candidate: any) => candidate?.content?.parts || [])
    : [];

  return parts
    .map((part: any) => (typeof part?.text === 'string' ? part.text : ''))
    .join('')
    .trim();
}

export function extractTextFromAiResponse(response: unknown, context: string): string {
  let rawText = '';

  try {
    if (response && typeof response === 'object' && 'text' in response) {
      const maybeText = (response as { text?: unknown }).text;
      rawText = typeof maybeText === 'string' ? maybeText : '';
    }
  } catch (error) {
    throw new AiServerError('ai_transport_error', undefined, { cause: error, context });
  }

  if (!rawText) {
    try {
      rawText = collectFallbackText(response);
    } catch (error) {
      throw new AiServerError('ai_transport_error', undefined, { cause: error, context });
    }
  }

  if (!rawText.trim()) {
    throw new AiServerError('ai_empty_response', undefined, { context });
  }

  return rawText;
}

export function parseAiJsonResponse(rawText: string, context: string) {
  const trimmed = typeof rawText === 'string' ? rawText.trim() : '';
  if (!trimmed) {
    throw new AiServerError('ai_empty_response', undefined, { context });
  }

  const fencedCandidate = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim() || '';
  const braceStart = trimmed.indexOf('{');
  const braceEnd = trimmed.lastIndexOf('}');
  const braceCandidate = braceStart >= 0 && braceEnd > braceStart
    ? trimmed.slice(braceStart, braceEnd + 1)
    : '';

  const candidates = Array.from(new Set([trimmed, fencedCandidate, braceCandidate].filter(Boolean)));

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      // Try the next extraction strategy.
    }
  }

  console.error(`[AI Parse Error] ${context}:`, trimmed.slice(0, 300));
  throw new AiServerError('ai_parse_error', undefined, { context });
}

export function normalizeAiServerError(error: unknown, context: string): AiServerError {
  if (isAiServerError(error)) {
    return error;
  }

  const message = getErrorMessage(error).toLowerCase();

  if (MODEL_ERROR_PATTERNS.some((pattern) => message.includes(pattern))) {
    return new AiServerError('ai_model_error', undefined, { cause: error, context });
  }

  if (TRANSPORT_ERROR_PATTERNS.some((pattern) => message.includes(pattern))) {
    return new AiServerError('ai_transport_error', undefined, { cause: error, context });
  }

  return new AiServerError('ai_transport_error', undefined, { cause: error, context });
}

export function toAiErrorResponse(error: unknown, context: string) {
  const aiError = normalizeAiServerError(error, context);
  return {
    status: aiError.status,
    body: {
      error: aiError.message,
      code: aiError.code,
    },
  };
}
