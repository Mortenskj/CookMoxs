import type { Recipe, RecipeNutritionEstimate } from '../types';

export type AiRequestErrorCode =
  | 'ai_model_error'
  | 'ai_transport_error'
  | 'ai_empty_response'
  | 'ai_parse_error'
  | 'network_error'
  | 'offline'
  | 'unknown_error';

type ErrorResponseBody = {
  error?: string;
  code?: string;
};

const AI_REQUEST_TIMEOUT_MS = 45000;

export class AiRequestError extends Error {
  readonly code: AiRequestErrorCode;
  readonly status?: number;

  constructor(message: string, code: AiRequestErrorCode, status?: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

function normalizeErrorCode(code: unknown): AiRequestErrorCode {
  if (
    code === 'ai_model_error'
    || code === 'ai_transport_error'
    || code === 'ai_empty_response'
    || code === 'ai_parse_error'
    || code === 'network_error'
    || code === 'offline'
  ) {
    return code;
  }

  return 'unknown_error';
}

async function request<T>(url: string, body: unknown): Promise<T> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new AiRequestError('Du er offline. AI-funktioner kraever internetforbindelse.', 'offline');
  }

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeoutId = controller
    ? globalThis.setTimeout(() => controller.abort(), AI_REQUEST_TIMEOUT_MS)
    : null;

  let resp: Response;
  try {
    resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller?.signal,
    });
  } catch (error) {
    if (timeoutId !== null) {
      globalThis.clearTimeout(timeoutId);
    }

    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new AiRequestError(
        'AI-kaldet brugte for lang tid og blev afbrudt. Proev igen om lidt.',
        'network_error',
      );
    }

    throw new AiRequestError(
      error instanceof Error ? error.message : 'Failed to fetch',
      'network_error',
    );
  }

  if (timeoutId !== null) {
    globalThis.clearTimeout(timeoutId);
  }

  const data = await resp.json().catch(() => '__MALFORMED_RESPONSE__');

  if (!resp.ok) {
    const payload = (data && typeof data === 'object') ? (data as ErrorResponseBody) : null;
    throw new AiRequestError(
      payload?.error || (typeof data === 'string' ? data : 'Der opstod en fejl ved AI-kaldet. Proev igen om lidt.'),
      normalizeErrorCode(payload?.code),
      resp.status,
    );
  }

  if (data === '__MALFORMED_RESPONSE__') {
    throw new AiRequestError('__MALFORMED_RESPONSE__', 'ai_parse_error', resp.status);
  }

  return data as T;
}

export async function adjustRecipe(recipe: any, instruction: string): Promise<any> {
  const data = await request<{ recipe: any }>('/api/ai/adjust', { recipe, instruction });
  return data.recipe;
}

export async function generateSteps(recipe: any, level?: string): Promise<any> {
  const data = await request<{ recipe: any }>('/api/ai/generate-steps', { recipe, level });
  return data.recipe;
}

export async function fillRest(recipe: any, level?: string): Promise<any> {
  const data = await request<{ recipe: any }>('/api/ai/fill-rest', { recipe, level });
  return data.recipe;
}

export async function generateTips(recipe: any): Promise<string[]> {
  const data = await request<{ tipsAndTricks: string[] }>('/api/ai/generate-tips', { recipe });
  return data.tipsAndTricks;
}

export async function applyPrefix(recipe: any, prefix: string): Promise<any> {
  const data = await request<{ recipe: any }>('/api/ai/apply-prefix', { recipe, prefix });
  return data.recipe;
}

export async function estimateRecipeNutrition(recipe: Recipe, level?: string): Promise<RecipeNutritionEstimate> {
  const data = await request<{ estimate: RecipeNutritionEstimate }>('/api/ai/estimate-nutrition', { recipe, level });
  return data.estimate;
}

export interface ImportRecipePayload {
  sourceType: 'url' | 'text' | 'file' | 'image';
  textContent?: string;
  isStructuredData?: boolean;
  fileData?: { data: string; mimeType: string };
  level?: string;
  googleAccessToken?: string;
}

export interface EnrichmentResult {
  summary?: string;
  categories?: string[];
  flavorBoosts?: string[];
  pitfalls?: string[];
  hints?: string[];
  substitutions?: string[];
}

export async function enrichRecipe(recipe: any, level?: string): Promise<EnrichmentResult> {
  const data = await request<{ enrichment: EnrichmentResult }>('/api/ai/enrich', { recipe, level });
  return data.enrichment;
}

export async function importRecipe(payload: ImportRecipePayload): Promise<any> {
  const data = await request<{ parsedData: any }>('/api/ai/import', payload);
  return data.parsedData;
}
