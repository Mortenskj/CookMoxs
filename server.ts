import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import * as cheerio from 'cheerio';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { GoogleGenAI, Type } from '@google/genai';
import { ADJUST_MODEL, DEFAULT_STRUCTURED_MODEL, IMPORT_MODEL, MODEL_DOC_COMMENT } from './src/config/serverAiModels.ts';
import { getNutritionModuleConfig } from './src/config/nutritionModule.ts';
import {
  extractTextFromAiResponse,
  parseAiJsonResponse as parseAiJsonPayload,
  toAiErrorResponse,
} from './src/server/utils/aiResponse.ts';
import axios from 'axios';
import { fetchWithSafeRedirects, UnsafeUrlError } from './src/server/utils/urlSafety.ts';
import { DirectParseError, parsePlainTextRecipeToRecipe, parseStructuredRecipeToRecipe } from './src/services/recipeDirectParser.ts';
import {
  NutritionLookupError,
  lookupNutritionByBarcode,
  searchNutritionProducts,
} from './src/services/nutrition/nutritionLookupService.ts';
import { getNutritionProviderStatus } from './src/services/nutrition/nutritionProviderRegistry.ts';
import {
  buildObserverDebugBundle,
  createRequestId,
  getObserverEvents,
  getObserverRuntimeInfo,
  getObserverSessions,
  getRequestSessionId,
  installObserverConsoleBridge,
  isObserverEnabled,
  isObserverRequestAuthorized,
  persistObserverCapture,
  recordObserverEvent,
  runWithObserverContext,
} from './src/server/services/observerService.ts';
import { collectRecipeObserverAssertions } from './src/services/observer/recipeAssertions.ts';
import { stripRedundantHeatProse, hasOvenHeatSignal } from './src/services/recipeStepNormalization.ts';
import { normalizeIngredientAmountShape } from './src/services/ingredientAmountNormalizer.ts';

/**
 * Deterministic drift guard for ingredient-touching AI passes.
 * Normalizes names by stripping non-letters and lowercasing, then checks how
 * many input ingredient names survive in the output (either as substring of
 * output or containing the output name). Returns a matchRate in [0,1].
 * Used to detect when the model silently dropped or renamed ingredients.
 */
function computeIngredientCoverage(input: any[], output: any[]): { matchRate: number } {
  const normalize = (s: unknown) =>
    typeof s === 'string' ? s.toLowerCase().replace(/[^a-zæøå0-9]+/g, '') : '';
  const outKeys = output.map((o) => normalize(o?.name)).filter(Boolean);
  if (!input.length) return { matchRate: 1 };
  let matched = 0;
  for (const inp of input) {
    const key = normalize(inp?.name);
    if (!key) { matched++; continue; } // unnamed input — don't penalize
    if (outKeys.some((ok) => ok === key || ok.includes(key) || key.includes(ok))) {
      matched++;
    }
  }
  return { matchRate: matched / input.length };
}
import mammoth from 'mammoth';

// Server-side heat-prose scrub on AI responses. The model occasionally
// produces steps with both structured heat (e.g. "200°C") and the same temp
// re-stated in prose ("Tænd ovnen på 200°C (almindelig ovn)"). Strip before
// asserting + returning so observer signal stays clean and clients don't
// have to rely solely on the client-side normalize to remove duplication.
function scrubRecipeHeatProse(recipe: { steps?: unknown } | null | undefined) {
  if (!recipe || typeof recipe !== 'object') return;
  const steps = (recipe as { steps?: unknown }).steps;
  if (!Array.isArray(steps)) return;
  for (const step of steps) {
    if (!step || typeof step !== 'object') continue;
    const s = step as { text?: unknown; heat?: unknown; heatLevel?: unknown };
    if (typeof s.text !== 'string') continue;
    const heat = typeof s.heat === 'string' ? s.heat : undefined;
    const ovenHeatPresent = hasOvenHeatSignal(heat);
    const structuredHeat = Boolean(ovenHeatPresent || (typeof s.heatLevel === 'number' && s.heatLevel >= 1 && s.heatLevel <= 9));
    if (!structuredHeat) continue;
    s.text = stripRedundantHeatProse(s.text, ovenHeatPresent);
  }
}

const RECIPE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    summary: { type: Type.STRING },
    recipeType: { type: Type.STRING },
    categories: { type: Type.ARRAY, items: { type: Type.STRING } },
    folder: { type: Type.STRING, description: "A suggested folder/group name like 'Aftensmad', 'Bagværk', 'Hurtig'." },
    servings: { type: Type.NUMBER },
    servingsUnit: { type: Type.STRING, description: "The unit for servings, e.g., 'personer', 'stk', 'frikadeller', 'boller'." },
    ingredients: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          amount: { type: Type.NUMBER },
          amountMin: { type: Type.NUMBER },
          amountMax: { type: Type.NUMBER },
          amountText: { type: Type.STRING },
          unit: { type: Type.STRING },
          group: { type: Type.STRING },
          locked: { type: Type.BOOLEAN },
        },
        required: ['name', 'unit'],
      },
    },
    steps: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          text: { type: Type.STRING },
          heat: { type: Type.STRING },
          heatLevel: { type: Type.NUMBER },
          heatSource: { type: Type.STRING },
          reminder: { type: Type.STRING },
          timer: {
            type: Type.OBJECT,
            properties: {
              duration: { type: Type.NUMBER },
              description: { type: Type.STRING },
            },
            required: ['duration', 'description'],
          },
          relevantIngredients: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                amount: { type: Type.NUMBER },
                unit: { type: Type.STRING },
              },
            },
          },
        },
        required: ['text'],
      },
    },
    flavorBoosts: { type: Type.ARRAY, items: { type: Type.STRING } },
    pitfalls: { type: Type.ARRAY, items: { type: Type.STRING } },
    hints: { type: Type.ARRAY, items: { type: Type.STRING } },
    substitutions: { type: Type.ARRAY, items: { type: Type.STRING } },
    heatGuide: { type: Type.ARRAY, items: { type: Type.STRING } },
    ovenGuide: { type: Type.ARRAY, items: { type: Type.STRING } },
    kitchenTimeline: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          at: { type: Type.STRING },
          text: { type: Type.STRING },
        },
      },
    },
    aiRationale: { type: Type.STRING },
  },
  required: ['title', 'ingredients', 'steps', 'servings'],
};

/**
 * Slim schema for the /api/ai/import primary pass. Drops heavy enrichment
 * fields (categories, flavorBoosts, pitfalls, hints, substitutions, heatGuide,
 * ovenGuide, kitchenTimeline, aiRationale, recipeType, folder) — those are
 * produced by dedicated downstream passes (/api/ai/enrich, /api/ai/suggest-tags,
 * /api/ai/generate-tips) which run after import. Reducing schema surface cuts
 * generation time on the critical path without sacrificing MVR correctness.
 */
const RECIPE_IMPORT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    title: RECIPE_SCHEMA.properties.title,
    summary: RECIPE_SCHEMA.properties.summary,
    servings: RECIPE_SCHEMA.properties.servings,
    servingsUnit: RECIPE_SCHEMA.properties.servingsUnit,
    ingredients: RECIPE_SCHEMA.properties.ingredients,
    steps: RECIPE_SCHEMA.properties.steps,
  },
  required: ['title', 'ingredients', 'steps', 'servings'],
};

const PREFIX_VARIANT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    summary: { type: Type.STRING },
    servings: { type: Type.NUMBER },
    servingsUnit: { type: Type.STRING },
    ingredients: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          amount: { type: Type.NUMBER },
          unit: { type: Type.STRING },
          group: { type: Type.STRING },
        },
        required: ['name', 'amount', 'unit'],
      },
    },
    steps: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          text: { type: Type.STRING },
          heat: { type: Type.STRING },
          heatLevel: { type: Type.NUMBER },
          timer: {
            type: Type.OBJECT,
            properties: {
              duration: { type: Type.NUMBER },
              description: { type: Type.STRING },
            },
            required: ['duration', 'description'],
          },
        },
        required: ['text'],
      },
    },
    aiRationale: { type: Type.STRING },
  },
  required: ['title', 'ingredients', 'steps'],
};

const STEP_REPAIR_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    steps: RECIPE_SCHEMA.properties.steps,
    heatGuide: { type: Type.ARRAY, items: { type: Type.STRING } },
    ovenGuide: { type: Type.ARRAY, items: { type: Type.STRING } },
    aiRationale: { type: Type.STRING },
  },
  required: ['steps'],
};

const INGREDIENT_POLISH_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    ingredients: RECIPE_SCHEMA.properties.ingredients,
    aiRationale: { type: Type.STRING },
  },
  required: ['ingredients'],
};

const STEP_POLISH_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    steps: RECIPE_SCHEMA.properties.steps,
    heatGuide: { type: Type.ARRAY, items: { type: Type.STRING } },
    ovenGuide: { type: Type.ARRAY, items: { type: Type.STRING } },
    flavorBoosts: { type: Type.ARRAY, items: { type: Type.STRING } },
    pitfalls: { type: Type.ARRAY, items: { type: Type.STRING } },
    hints: { type: Type.ARRAY, items: { type: Type.STRING } },
    kitchenTimeline: RECIPE_SCHEMA.properties.kitchenTimeline,
    aiRationale: { type: Type.STRING },
  },
  required: ['steps'],
};

const NUTRITION_ESTIMATE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    per100g: {
      type: Type.OBJECT,
      properties: {
        energyKcal: { type: Type.NUMBER },
        fatGrams: { type: Type.NUMBER },
        carbsGrams: { type: Type.NUMBER },
        proteinGrams: { type: Type.NUMBER },
      },
      required: ['energyKcal', 'fatGrams', 'carbsGrams', 'proteinGrams'],
    },
    perPortion: {
      type: Type.OBJECT,
      properties: {
        energyKcal: { type: Type.NUMBER },
        fatGrams: { type: Type.NUMBER },
        carbsGrams: { type: Type.NUMBER },
        proteinGrams: { type: Type.NUMBER },
      },
      required: ['energyKcal', 'fatGrams', 'carbsGrams', 'proteinGrams'],
    },
    ingredientBreakdown: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          ingredientName: { type: Type.STRING },
          estimatedWeightGrams: { type: Type.NUMBER },
          estimatedEnergyKcal: { type: Type.NUMBER },
          proteinGrams: { type: Type.NUMBER },
          fatGrams: { type: Type.NUMBER },
          carbsGrams: { type: Type.NUMBER },
          note: { type: Type.STRING },
        },
        required: ['ingredientName', 'proteinGrams', 'fatGrams', 'carbsGrams'],
      },
    },
    estimatedTotalWeightGrams: { type: Type.NUMBER },
    confidence: { type: Type.STRING },
    rationale: { type: Type.STRING },
  },
  required: ['per100g', 'perPortion', 'ingredientBreakdown', 'confidence', 'rationale'],
};

function getAiClient() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured on the server');
  }
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}

const SERVER_AI_TIMEOUT_MS = 105000;

async function generateAIContentOnce(model: string, prompt: string, responseSchema: any) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SERVER_AI_TIMEOUT_MS);
  try {
    const result = await getAiClient().models.generateContent({
      model,
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: 'application/json',
        responseSchema,
        httpOptions: { timeout: SERVER_AI_TIMEOUT_MS },
        abortSignal: controller.signal,
      },
    });
    const responseText = extractTextFromAiResponse(result, `model ${model}`);
    return parseAiJsonResponse(responseText, `model ${model}`);
  } catch (error: any) {
    if (error?.name === 'AbortError' || error?.code === 'ECONNABORTED' || error?.message?.includes('timed out')) {
      throw new Error(`AI request to ${model} timed out after ${SERVER_AI_TIMEOUT_MS / 1000}s`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

function isRetryableError(error: any): boolean {
  if (error?.status === 504 || error?.status === 503 || error?.status === 429) return true;
  if (error?.message?.includes('DEADLINE_EXCEEDED')) return true;
  if (error?.message?.includes('timed out')) return true;
  return false;
}

async function generateAIContent(model: string, prompt: string, responseSchema: any, maxRetries = 1) {
  let lastError: any;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await generateAIContentOnce(model, prompt, responseSchema);
    } catch (error: any) {
      lastError = error;
      if (attempt < maxRetries && isRetryableError(error)) {
        const delayMs = 2000 * (attempt + 1);
        console.log(`[ai] Retrying ${model} after ${delayMs}ms (attempt ${attempt + 1}/${maxRetries}), error: ${error.message?.substring(0, 100)}`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

function parseAiJsonResponse(rawText: string, context: string) {
  return parseAiJsonPayload(rawText, context);
}

const GEMINI_SUPPORTED_MIME_PREFIXES = ['image/', 'application/pdf', 'audio/', 'video/'];

function isGeminiSupportedMime(mimeType: string): boolean {
  return GEMINI_SUPPORTED_MIME_PREFIXES.some((prefix) => mimeType.startsWith(prefix));
}

function normalizeExtractedText(rawText: string): string {
  return rawText
    .replace(/\u00a0/g, ' ')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function extractTextFromGoogleDocShortcut(text: string, googleAccessToken?: string): Promise<string | null> {
  try {
    const parsed = JSON.parse(text);
    const docId = parsed.doc_id;

    if (docId && googleAccessToken) {
      try {
        const driveExportUrl = `https://www.googleapis.com/drive/v3/files/${docId}/export?mimeType=text/plain`;
        console.log('[gdoc] Fetching via Drive API with access token');
        const driveResp = await axios.get<string>(driveExportUrl, {
          headers: { Authorization: `Bearer ${googleAccessToken}` },
          responseType: 'text',
          timeout: 15000,
        });
        const bodyText = (typeof driveResp.data === 'string' ? driveResp.data : '').trim();
        if (bodyText) {
          console.log(`[gdoc] Drive API success, text length: ${bodyText.length}`);
          return bodyText;
        }
      } catch (driveErr) {
        console.log(`[gdoc] Drive API failed: ${driveErr instanceof Error ? driveErr.message : driveErr}`);
      }
    }

    const gdocUrls = parsed.url
      ? [parsed.url]
      : docId
        ? [
            `https://docs.google.com/document/d/${docId}/export?format=txt`,
            `https://docs.google.com/document/d/${docId}/pub`,
          ]
        : [];

    for (const gdocUrl of gdocUrls) {
      try {
        const { response } = await fetchWithSafeRedirects(gdocUrl);
        const isPlainText = gdocUrl.includes('export?format=txt');
        let bodyText: string;
        if (isPlainText) {
          bodyText = (typeof response.data === 'string' ? response.data : '').trim();
        } else {
          const $ = cheerio.load(response.data);
          $('script, style, nav, footer, iframe, noscript, svg').remove();
          $('body').find('br').replaceWith('\n');
          $('body').find('p, div, h1, h2, h3, h4, h5, h6, li').each((_, el) => { $(el).append('\n'); });
          bodyText = normalizeExtractedText($('body').text());
        }
        if (bodyText) {
          console.log(`[gdoc] Public URL success: ${gdocUrl}, text length: ${bodyText.length}`);
          return bodyText;
        }
      } catch (urlErr) {
        console.log(`[gdoc] URL failed: ${gdocUrl} â€” ${urlErr instanceof Error ? urlErr.message : urlErr}`);
      }
    }
  } catch (error) {
    console.error('[gdoc] Failed to process .gdoc file:', error);
  }

  return null;
}

function isZipLikeBuffer(buffer: Buffer): boolean {
  return buffer.length >= 4
    && buffer[0] === 0x50
    && buffer[1] === 0x4b
    && (buffer[2] === 0x03 || buffer[2] === 0x05 || buffer[2] === 0x07);
}

function looksLikeTextPayload(buffer: Buffer): boolean {
  const sample = buffer.subarray(0, Math.min(buffer.length, 4096)).toString('utf-8');
  if (!sample.trim()) return false;

  const printableChars = Array.from(sample).filter((char) => {
    const code = char.charCodeAt(0);
    return code === 9 || code === 10 || code === 13 || (code >= 32 && code < 65533);
  }).length;

  return printableChars / sample.length >= 0.85;
}

async function extractTextFromFile(base64Data: string, mimeType: string, googleAccessToken?: string): Promise<string | null> {
  const buffer = Buffer.from(base64Data, 'base64');
  const utf8Text = buffer.toString('utf-8');
  const trimmedUtf8Text = utf8Text.trim();

  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || (mimeType === 'application/octet-stream' && isZipLikeBuffer(buffer))) {
    try {
      const result = await mammoth.extractRawText({ buffer });
      if (result.value?.trim()) {
        return result.value;
      }
    } catch (docxError) {
      console.log(`[import] Mammoth extraction failed: ${docxError instanceof Error ? docxError.message : docxError}`);
    }
  }

  if (
    mimeType === 'application/vnd.google-apps.document'
    || mimeType === 'application/json'
    || (mimeType === 'application/octet-stream' && trimmedUtf8Text.startsWith('{'))
  ) {
    const gdocText = await extractTextFromGoogleDocShortcut(utf8Text, googleAccessToken);
    if (gdocText) {
      return gdocText;
    }
  }

  if (mimeType === 'multipart/related' || mimeType === 'message/rfc822') {
    const htmlMatch = utf8Text.match(/<html[\s\S]*<\/html>/i);
    if (htmlMatch) {
      const $ = cheerio.load(htmlMatch[0]);
      $('script, style, nav, footer, iframe, noscript, svg').remove();
      $('body').find('br').replaceWith('\n');
      $('body').find('p, div, h1, h2, h3, h4, h5, h6, li').each((_, el) => { $(el).append('\n'); });
      const text = normalizeExtractedText($('body').text());
      if (text.length > 20) return text;
    }
    return utf8Text;
  }

  if (
    mimeType === 'text/plain'
    || mimeType === 'text/rtf'
    || mimeType === 'text/html'
    || (mimeType === 'application/octet-stream' && looksLikeTextPayload(buffer))
  ) {
    return utf8Text;
  }

  return null;
}

/**
 * Returns `{ data, importMeta }` so callers (and the /api/ai/import response)
 * can distinguish between a primary AI success and a deterministic-parser
 * fallback. The client uses importMeta to emit a truthful pipeline stage
 * (`ai_import_fallback_used` vs `ai_import_succeeded`) instead of hiding the
 * fallback behind a generic success — see observer evidence recipeId
 * 1776516929706 where fallback + success coexisted silently (DEADLINE_EXCEEDED).
 */
async function importRecipeFromTextWithFallback(
  text: string,
  prompt: string,
  fallbackLabel: string,
  maxRetries = 0,
): Promise<{ data: any; importMeta: { fallbackUsed: boolean; reason?: string; primaryError?: string } }> {
  try {
    const data = await generateAIContent(IMPORT_MODEL, prompt, RECIPE_IMPORT_SCHEMA, maxRetries);
    return { data, importMeta: { fallbackUsed: false } };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const reason = /DEADLINE_EXCEEDED|timed out|deadline/i.test(errorMessage)
      ? 'ai_timeout'
      : /quota|rate/i.test(errorMessage) ? 'ai_quota'
      : 'ai_error';
    console.warn(`[import] AI import failed for ${fallbackLabel}, falling back to deterministic text parser: ${errorMessage}`);
    recordObserverPipelineStage('file_import', 'ai_primary_failed', {
      fallbackLabel,
      reason,
      errorMessage: errorMessage.slice(0, 240),
    });
    try {
      const data = parsePlainTextRecipeToRecipe(text);
      recordObserverPipelineStage('file_import', 'deterministic_fallback_used', {
        fallbackLabel,
        reason,
      });
      return { data, importMeta: { fallbackUsed: true, reason, primaryError: errorMessage.slice(0, 240) } };
    } catch (fallbackError) {
      console.warn(`[import] Deterministic text parser also failed for ${fallbackLabel}: ${fallbackError instanceof Error ? fallbackError.message : fallbackError}`);
      recordObserverFailure('file_import', 'deterministic_fallback_failed', 'parser_error', {
        fallbackLabel,
        reason,
      });
      throw error;
    }
  }
}

function getLevelStyleInstruction(level: string | undefined, mode: 'steps' | 'fill' | 'import') {
  switch ((level || '').toLowerCase()) {
    case 'begynder':
      return mode === 'import'
        ? 'Use very beginner-friendly Danish. Explain techniques simply and choose reassuring, practical wording.'
        : 'Brug enkelt, trygt sprog med korte forklaringer af teknik og tekstur. Antag ingen forkundskaber.';
    case 'erfaren amatør':
      return mode === 'import'
        ? 'Use precise Danish with light culinary terminology. Keep it concise but informative.'
        : 'Brug mere præcist køkkensprog og mindre håndholding. Antag, at brugeren kan grundteknikker.';
    case 'professionel':
      return mode === 'import'
        ? 'Use concise, technical Danish with professional kitchen terminology. Prioritize precision over explanation.'
        : 'Brug kompakt, teknisk sprog med professionel terminologi. Prioritér præcision frem for forklaring.';
    case 'hverdags kok':
    default:
      return mode === 'import'
        ? 'Use practical, natural Danish for a competent home cook. Keep the tone direct and useful.'
        : 'Brug praktisk, naturligt dansk til en almindelig hjemmekok. Vær tydelig uden at overforklare.';
  }
}

function normalizeNutritionEstimateValue(value: unknown) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return null;
  }

  return Math.round(numeric * 10) / 10;
}

function normalizeNutritionEstimateConfidence(value: unknown): 'high' | 'medium' | 'low' {
  if (value === 'high' || value === 'medium' || value === 'low') {
    return value;
  }

  return 'medium';
}

function normalizeIngredientNameForCoverage(value: unknown) {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function normalizeNutritionEstimateIngredient(item: any) {
  return {
    ingredientName: typeof item?.ingredientName === 'string' ? item.ingredientName.trim() : '',
    estimatedWeightGrams: normalizeNutritionEstimateValue(item?.estimatedWeightGrams),
    estimatedEnergyKcal: normalizeNutritionEstimateValue(item?.estimatedEnergyKcal),
    proteinGrams: normalizeNutritionEstimateValue(item?.proteinGrams),
    fatGrams: normalizeNutritionEstimateValue(item?.fatGrams),
    carbsGrams: normalizeNutritionEstimateValue(item?.carbsGrams),
    note: typeof item?.note === 'string' && item.note.trim() ? item.note.trim() : undefined,
  };
}

function validateNutritionEstimateCoverage(recipe: any, ingredientBreakdown: Array<{ ingredientName: string }>) {
  const recipeIngredientNames = Array.isArray(recipe?.ingredients)
    ? recipe.ingredients
        .map((ingredient: any) => (typeof ingredient?.name === 'string' ? ingredient.name.trim() : ''))
        .filter(Boolean)
    : [];

  const breakdownByName = new Map(
    ingredientBreakdown
      .map((item) => [normalizeIngredientNameForCoverage(item.ingredientName), item] as const)
      .filter(([name]) => Boolean(name)),
  );

  const omittedIngredients = recipeIngredientNames.filter((name) => !breakdownByName.has(normalizeIngredientNameForCoverage(name)));

  return {
    totalIngredientCount: recipeIngredientNames.length,
    countedIngredientCount: recipeIngredientNames.length - omittedIngredients.length,
    omittedIngredients,
  };
}

function getWholeRecipeMacroTotals(ingredientBreakdown: Array<{
  estimatedEnergyKcal?: number | null;
  proteinGrams?: number | null;
  fatGrams?: number | null;
  carbsGrams?: number | null;
}>) {
  return ingredientBreakdown.reduce<{
    energyKcal: number;
    proteinGrams: number;
    fatGrams: number;
    carbsGrams: number;
  }>(
    (totals, item) => ({
      energyKcal: totals.energyKcal + (item.estimatedEnergyKcal ?? 0),
      proteinGrams: totals.proteinGrams + (item.proteinGrams ?? 0),
      fatGrams: totals.fatGrams + (item.fatGrams ?? 0),
      carbsGrams: totals.carbsGrams + (item.carbsGrams ?? 0),
    }),
    { energyKcal: 0, proteinGrams: 0, fatGrams: 0, carbsGrams: 0 },
  );
}

function validateNutritionEstimateSanity(recipe: any, estimate: any, ingredientBreakdown: Array<{
  estimatedEnergyKcal?: number | null;
  proteinGrams?: number | null;
  fatGrams?: number | null;
  carbsGrams?: number | null;
}>) {
  const servings = Number(recipe?.servings);
  const hasServings = Number.isFinite(servings) && servings > 0;
  const breakdownTotals = getWholeRecipeMacroTotals(ingredientBreakdown);
  const warnings: string[] = [];

  const compareTotals = (
    label: string,
    breakdownValue: number,
    expectedValue: number | null | undefined,
    absoluteTolerance: number,
    relativeTolerance: number,
  ) => {
    if (!Number.isFinite(breakdownValue) || !Number.isFinite(Number(expectedValue))) {
      return;
    }

    const expected = Number(expectedValue);
    const delta = Math.abs(breakdownValue - expected);
    const relativeDelta = expected > 0 ? delta / expected : 0;

    if (delta > absoluteTolerance && relativeDelta > relativeTolerance) {
      warnings.push(`${label} summer ikke rent mellem ingredientBreakdown og totals.`);
    }
  };

  if (hasServings) {
    compareTotals(
      'kcal',
      breakdownTotals.energyKcal,
      normalizeNutritionEstimateValue(estimate?.perPortion?.energyKcal) != null
        ? Number(normalizeNutritionEstimateValue(estimate?.perPortion?.energyKcal)) * servings
        : null,
      80,
      0.2,
    );
    compareTotals(
      'protein',
      breakdownTotals.proteinGrams,
      normalizeNutritionEstimateValue(estimate?.perPortion?.proteinGrams) != null
        ? Number(normalizeNutritionEstimateValue(estimate?.perPortion?.proteinGrams)) * servings
        : null,
      8,
      0.2,
    );
    compareTotals(
      'fedt',
      breakdownTotals.fatGrams,
      normalizeNutritionEstimateValue(estimate?.perPortion?.fatGrams) != null
        ? Number(normalizeNutritionEstimateValue(estimate?.perPortion?.fatGrams)) * servings
        : null,
      8,
      0.2,
    );
    compareTotals(
      'kulhydrat',
      breakdownTotals.carbsGrams,
      normalizeNutritionEstimateValue(estimate?.perPortion?.carbsGrams) != null
        ? Number(normalizeNutritionEstimateValue(estimate?.perPortion?.carbsGrams)) * servings
        : null,
      10,
      0.2,
    );
  }

  return warnings;
}

function normalizeNutritionEstimate(estimate: any, recipe: any) {
  const normalizeSnapshot = (snapshot: any) => ({
    energyKcal: normalizeNutritionEstimateValue(snapshot?.energyKcal),
    fatGrams: normalizeNutritionEstimateValue(snapshot?.fatGrams),
    carbsGrams: normalizeNutritionEstimateValue(snapshot?.carbsGrams),
    proteinGrams: normalizeNutritionEstimateValue(snapshot?.proteinGrams),
  });

  const ingredientBreakdown = Array.isArray(estimate?.ingredientBreakdown)
    ? estimate.ingredientBreakdown.map(normalizeNutritionEstimateIngredient).filter((item) => item.ingredientName)
    : [];
  const coverage = validateNutritionEstimateCoverage(recipe, ingredientBreakdown);
  const validationWarnings = validateNutritionEstimateSanity(recipe, estimate, ingredientBreakdown);

  return {
    per100g: normalizeSnapshot(estimate?.per100g),
    perPortion: normalizeSnapshot(estimate?.perPortion),
    ingredientBreakdown,
    countedIngredientCount: coverage.countedIngredientCount,
    totalIngredientCount: coverage.totalIngredientCount,
    omittedIngredients: coverage.omittedIngredients,
    coverageStatus: coverage.omittedIngredients.length > 0 ? 'partial' : 'complete',
    validationWarnings,
    estimatedTotalWeightGrams: normalizeNutritionEstimateValue(estimate?.estimatedTotalWeightGrams),
    confidence: coverage.omittedIngredients.length > 0 || validationWarnings.length > 0
      ? 'low'
      : normalizeNutritionEstimateConfidence(estimate?.confidence),
    rationale: typeof estimate?.rationale === 'string' && estimate.rationale.trim()
      ? estimate.rationale.trim()
      : 'AI-estimat baseret på ingredienslisten.',
    generatedAt: new Date().toISOString(),
  };
}

class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function findRecipeInStructuredData(input: any): any {
  if (!input) return null;
  if (input['@type'] === 'Recipe' || (Array.isArray(input['@type']) && input['@type'].includes('Recipe'))) return input;
  if (Array.isArray(input)) {
    for (const item of input) {
      const found = findRecipeInStructuredData(item);
      if (found) return found;
    }
  }
  if (typeof input === 'object') {
    if (input['@graph']) return findRecipeInStructuredData(input['@graph']);
    for (const key in input) {
      if (typeof input[key] === 'object') {
        const found = findRecipeInStructuredData(input[key]);
        if (found) return found;
      }
    }
  }
  return null;
}

function extractEmbeddedRecipeDataFromScripts(html: string) {
  const $ = cheerio.load(html);

  // Priority 1: Next.js __NEXT_DATA__ JSON script tag (pure JSON, not JS variable assignment)
  // e.g. <script id="__NEXT_DATA__" type="application/json">{...}</script>
  const nextDataEl = $('script#__NEXT_DATA__');
  if (nextDataEl.length > 0) {
    const raw = nextDataEl.html();
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        const found = findRecipeInStructuredData(parsed);
        if (found) return found;
      } catch {
        // malformed JSON, fall through
      }
    }
  }

  // Priority 2: Any JSON-type script that might contain recipe data
  $('script[type="application/json"]').each((_, el) => {
    const raw = $(el).html();
    if (raw && raw.length > 100) {
      try {
        const parsed = JSON.parse(raw);
        const found = findRecipeInStructuredData(parsed);
        if (found) return found; // Note: this return is from the each callback, not the outer function
      } catch {
        // ignore
      }
    }
  });

  // Priority 3: Inline JS containing SPA data patterns or embedded recipe schema
  const scriptContents: string[] = [];
  $('script:not([type]), script[type="text/javascript"]').each((_, el) => {
    const content = $(el).html();
    if (content && content.length > 100) {
      scriptContents.push(content);
    }
  });

  for (const content of scriptContents) {
    if (
      content.includes('__NEXT_DATA__') ||
      content.includes('__NUXT__') ||
      content.includes('__INITIAL_STATE__') ||
      content.includes('"recipeIngredient"') ||
      content.includes('"recipeInstructions"') ||
      content.includes('"@type":"Recipe"') ||
      content.includes("'@type':'Recipe'")
    ) {
      const jsonMatches = content.match(/\{[\s\S]{200,}\}/g) || [];

      for (const match of jsonMatches) {
        try {
          const parsed = JSON.parse(match);
          const found = findRecipeInStructuredData(parsed);
          if (found) return found;
        } catch {
          // ignore non-JSON blocks
        }
      }
    }
  }

  return null;
}

async function fetchRecipeSource(url: string) {
  if (!url || typeof url !== 'string') {
    throw new HttpError(400, 'URL is required');
  }

  try {
    new URL(url);
  } catch {
    throw new HttpError(400, 'URL er ugyldig');
  }

  try {
    recordObserverPipelineStage('url_import', 'fetch_started', {
      urlHost: new URL(url).host,
    });
    const { response } = await fetchWithSafeRedirects(url);

    const $ = cheerio.load(response.data);
    let recipeJson: any = null;

    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const content = $(el).html();
        if (!content || recipeJson) return;
        const json = JSON.parse(content);
        recipeJson = findRecipeInStructuredData(json);
      } catch {
        // ignore malformed json-ld
      }
    });

    if (recipeJson) {
      recordObserverPipelineStage('url_import', 'structured_data_found', {
        parser: 'json_ld',
      });
      return { json: recipeJson };
    }

    const recipeElement = $('[itemtype*="schema.org/Recipe"]');
    if (recipeElement.length > 0) {
      const ingredients: string[] = [];
      recipeElement.find('[itemprop="recipeIngredient"]').each((_, el) => { ingredients.push($(el).text().trim()); });
      const instructions: string[] = [];
      recipeElement.find('[itemprop="recipeInstructions"]').each((_, el) => { instructions.push($(el).text().trim()); });
      if (ingredients.length > 0 || instructions.length > 0) {
        recordObserverPipelineStage('url_import', 'structured_data_found', {
          parser: 'microdata',
          ingredientCount: ingredients.length,
          instructionCount: instructions.length,
        });
        return { json: {
          '@type': 'Recipe',
          name: $('h1').first().text().trim() || $('title').text().trim(),
          recipeIngredient: ingredients,
          recipeInstructions: instructions,
          recipeYield: recipeElement.find('[itemprop="recipeYield"]').text().trim(),
          prepTime: recipeElement.find('[itemprop="prepTime"]').attr('content') || recipeElement.find('[itemprop="prepTime"]').text().trim(),
          cookTime: recipeElement.find('[itemprop="cookTime"]').attr('content') || recipeElement.find('[itemprop="cookTime"]').text().trim(),
          totalTime: recipeElement.find('[itemprop="totalTime"]').attr('content') || recipeElement.find('[itemprop="totalTime"]').text().trim(),
        } };
      }
    }

    // Fallback: look for recipe data embedded in <script> tags (SPA / SSR patterns like __NEXT_DATA__)
    const embeddedRecipe = extractEmbeddedRecipeDataFromScripts(response.data);
    if (embeddedRecipe) {
      recordObserverPipelineStage('url_import', 'structured_data_found', {
        parser: 'embedded_script',
      });
      return { json: embeddedRecipe };
    }

    $('script, style, nav, footer, iframe, noscript, svg, path, symbol, use, .ads, .sidebar, header, .header, .menu, .comments, .related, .newsletter, [role="navigation"], [role="banner"], [role="contentinfo"]').remove();
    const recipeSelectors = ['.recipe-container','.recipe-content','.wprm-recipe-container','.tasty-recipes','.mv-recipe-card','[itemtype="http://schema.org/Recipe"]','[itemprop="recipe"]','.recipe-card','article.recipe','main'];
    let targetElement = null;
    for (const selector of recipeSelectors) {
      const found = $(selector);
      if (found.length > 0) {
        targetElement = found.first();
        break;
      }
    }
    const contentElement = targetElement || $('body');
    contentElement.find('br').replaceWith('\n');
    contentElement.find('p, div, h1, h2, h3, h4, h5, h6, li').each((_, el) => { $(el).append('\n'); });
    recordObserverPipelineStage('url_import', 'html_fallback_ready', {
      parser: targetElement ? 'recipe_selector' : 'body_fallback',
    });
    return { html: normalizeExtractedText(contentElement.text()) };
  } catch (error) {
    if (error instanceof UnsafeUrlError) {
      recordObserverFailure('url_import', 'fetch_failed', 'unsafe_url', {
        errorCode: String(error.status),
      });
      throw new HttpError(error.status, error.message);
    }

    console.error('Error fetching URL:', error);
    recordObserverFailure('url_import', 'fetch_failed', 'transport_error');
    throw new HttpError(502, 'Kilden kunne ikke bruges som opskrift');
  }
}

function parseAnalyticsRequestBody(body: unknown) {
  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch {
      return null;
    }
  }

  if (body && typeof body === 'object') {
    return body;
  }

  return null;
}

function sanitizeAnalyticsValue(value: unknown): string | number | boolean | null | Array<string | number | boolean | null> {
  if (value === null) return null;
  if (typeof value === 'string') return value.slice(0, 200);
  if (typeof value === 'number' || typeof value === 'boolean') return value;

  if (Array.isArray(value)) {
    return value
      .slice(0, 20)
      .map((item) => {
        if (item === null) return null;
        if (typeof item === 'string') return item.slice(0, 200);
        if (typeof item === 'number' || typeof item === 'boolean') return item;
        return JSON.stringify(item).slice(0, 200);
      });
  }

  return JSON.stringify(value).slice(0, 200);
}

function recordObserverPipelineStage(feature: string, stage: string, data?: Record<string, unknown>) {
  recordObserverEvent({
    level: 'info',
    source: 'api',
    kind: 'observer_pipeline',
    data: {
      feature,
      stage,
      ...data,
    },
  });
}

function recordObserverFailure(feature: string, stage: string, errorCategory: string, data?: Record<string, unknown>) {
  recordObserverEvent({
    level: 'warn',
    source: 'api',
    kind: 'observer_failure',
    data: {
      feature,
      stage,
      errorCategory,
      ...data,
    },
  });
}

function recordRecipeAssertions(feature: string, recipe: any) {
  const assertions = collectRecipeObserverAssertions(recipe);
  assertions.forEach((assertion) => {
    recordObserverEvent({
      level: 'warn',
      source: 'api',
      kind: 'product_assertion',
      data: {
        feature,
        assertion: assertion.assertion,
        recipeId: typeof recipe?.id === 'string' ? recipe.id : null,
        recipeTitle: typeof recipe?.title === 'string' ? recipe.title.slice(0, 120) : null,
        stepIndex: assertion.stepIndex ?? null,
        evidence: assertion.evidence ?? null,
        heat: assertion.heat ?? null,
        note: assertion.note,
      },
    });
  });
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT || 3000);
  installObserverConsoleBridge();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
  }));
  app.use(express.json({ limit: '25mb' }));
  app.use('/api/events', express.text({ type: 'text/plain' }));
  app.use((req, res, next) => {
    const requestId = createRequestId();
    const sessionId = getRequestSessionId(req.headers);
    const startedAt = Date.now();
    res.setHeader('x-request-id', requestId);

    runWithObserverContext({
      requestId,
      sessionId,
      method: req.method,
      path: req.path,
    }, () => {
      if (isObserverEnabled() && req.path.startsWith('/api/') && !req.path.startsWith('/api/__observer')) {
        recordObserverEvent({
          level: 'info',
          source: 'api',
          kind: 'request_started',
          path: req.path,
          method: req.method,
          sessionId,
          requestId,
          data: {
            query: Object.keys(req.query || {}).slice(0, 20),
          },
        });

        res.on('finish', () => {
          recordObserverEvent({
            level: res.statusCode >= 400 ? 'warn' : 'info',
            source: 'api',
            kind: 'request_finished',
            path: req.path,
            method: req.method,
            sessionId,
            requestId,
            status: res.statusCode,
            durationMs: Date.now() - startedAt,
          });
        });
      }

      next();
    });
  });
  app.use('/api/ai', (req, res, next) => {
    if (!isObserverEnabled()) {
      next();
      return;
    }

    const action = req.path.replace(/^\//, '') || 'unknown';
    const originalJson = res.json.bind(res);
    recordObserverEvent({
      level: 'info',
      source: 'api',
      kind: 'ai_request_body',
      path: req.path,
      method: req.method,
      data: {
        action,
        body: req.body,
      },
    });

    (res as typeof res & { json: typeof res.json }).json = ((body: unknown) => {
      recordObserverEvent({
        level: res.statusCode >= 400 ? 'warn' : 'info',
        source: 'api',
        kind: 'ai_response_body',
        path: req.path,
        method: req.method,
        status: res.statusCode,
        data: {
          action,
          body,
        },
      });

      const responseRecipe = body && typeof body === 'object'
        ? ((body as { recipe?: unknown; parsedData?: unknown }).recipe || (body as { parsedData?: unknown }).parsedData)
        : null;
      if (responseRecipe && typeof responseRecipe === 'object') {
        // Scrub first so assertions run on the same text the client receives.
        scrubRecipeHeatProse(responseRecipe as { steps?: unknown });
        recordRecipeAssertions(action, responseRecipe);
      }

      return originalJson(body);
    }) as typeof res.json;

    next();
  });

  const aiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'For mange AI-kald lige nu. Prøv igen om et øjeblik.' },
  });
  app.use('/api/ai', aiLimiter);

  // Separate limiter for server-side URL fetching / direct parse to prevent abuse
  const fetchLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'For mange import-kald lige nu. Prøv igen om et øjeblik.' },
  });
  app.use(['/api/parse-direct', '/api/fetch-url'], fetchLimiter);

  app.get('/api/__observer/status', (req, res) => {
    if (!isObserverRequestAuthorized(req.headers, req.headers.host as string | undefined)) {
      return res.status(404).json({ error: 'Not found' });
    }

    return res.json({
      ...getObserverRuntimeInfo(),
      sessions: getObserverSessions(30),
    });
  });

  app.get('/api/__observer/recent', (req, res) => {
    if (!isObserverRequestAuthorized(req.headers, req.headers.host as string | undefined)) {
      return res.status(404).json({ error: 'Not found' });
    }

    const limit = typeof req.query.limit === 'string' ? Number(req.query.limit) : 200;
    const sessionId = typeof req.query.sessionId === 'string' ? req.query.sessionId.slice(0, 120) : null;

    return res.json({
      ...getObserverRuntimeInfo(),
      sessionId,
      events: getObserverEvents(limit, sessionId),
    });
  });

  app.get('/api/__observer/export', async (req, res) => {
    if (!isObserverRequestAuthorized(req.headers, req.headers.host as string | undefined)) {
      return res.status(404).json({ error: 'Not found' });
    }

    const limit = typeof req.query.limit === 'string' ? Number(req.query.limit) : 300;
    const sessionId = typeof req.query.sessionId === 'string' ? req.query.sessionId.slice(0, 120) : null;

    return res.json(await buildObserverDebugBundle(sessionId, limit));
  });

  app.post('/api/__observer/client-capture', async (req, res) => {
    const sessionId = typeof req.body?.sessionId === 'string' ? req.body.sessionId.slice(0, 120) : null;
    const recipeId = typeof req.body?.recipeId === 'string' ? req.body.recipeId.slice(0, 120) : null;
    const action = typeof req.body?.action === 'string' ? req.body.action.slice(0, 80) : 'unknown';
    const phase = req.body?.phase === 'after' ? 'after' : 'before';
    const target = typeof req.body?.target === 'string' ? req.body.target.slice(0, 80) : 'unknown';
    const text = typeof req.body?.text === 'string' ? req.body.text.slice(0, 20000) : '';
    const itemCount = typeof req.body?.itemCount === 'number' ? req.body.itemCount : null;
    const imageDataUrl = typeof req.body?.imageDataUrl === 'string' ? req.body.imageDataUrl : null;
    const captureError = typeof req.body?.captureError === 'string' ? req.body.captureError.slice(0, 400) : null;

    let capturePath: string | null = null;
    if (imageDataUrl) {
      capturePath = await persistObserverCapture({
        sessionId,
        recipeId,
        action,
        phase,
        target,
        imageDataUrl,
      }).catch(() => null);
    }

    recordObserverEvent({
      level: 'info',
      source: 'client',
      kind: 'ai_transformation_capture',
      sessionId,
      data: {
        recipeId,
        action,
        phase,
        target,
        itemCount,
        text,
        capturePath,
        captureError,
      },
    });

    return res.status(202).json({ ok: true, capturePath });
  });

  app.post('/api/events', (req, res) => {
    const analyticsBody = parseAnalyticsRequestBody(req.body);
    const name = typeof analyticsBody?.name === 'string' ? analyticsBody.name.trim() : '';

    if (!name) {
      return res.status(400).json({ error: 'event name is required' });
    }

    const occurredAt = typeof analyticsBody?.occurredAt === 'string'
      ? analyticsBody.occurredAt
      : new Date().toISOString();
    const pathValue = typeof analyticsBody?.path === 'string'
      ? analyticsBody.path.slice(0, 300)
      : null;

    const payload = analyticsBody?.payload && typeof analyticsBody.payload === 'object' && !Array.isArray(analyticsBody.payload)
      ? Object.fromEntries(
          Object.entries(analyticsBody.payload).slice(0, 20).map(([key, value]) => [
            key.slice(0, 80),
            sanitizeAnalyticsValue(value),
          ]),
        )
      : {};

    console.info('[analytics]', JSON.stringify({
      name,
      occurredAt,
      path: pathValue,
      payload,
    }));
    const isWarningEvent = name === 'recipe_import_failed'
      || name === 'ai_adjust_failed'
      || name === 'client_diagnostic'
      || name === 'session_error'
      || name === 'observer_failure'
      || name === 'product_assertion';
    const observerClientEventNames = new Set(['client_diagnostic', 'session_error', 'observer_pipeline', 'observer_failure', 'product_assertion']);
    recordObserverEvent({
      level: isWarningEvent ? 'warn' : 'info',
      source: observerClientEventNames.has(name) ? 'client' : 'analytics',
      kind: name,
      path: pathValue,
      sessionId: typeof payload.sessionId === 'string' ? payload.sessionId : null,
      data: {
        occurredAt,
        ...payload,
      },
    });

    return res.status(202).json({ ok: true });
  });

  app.get('/api/nutrition/status', (_req, res) => {
    const moduleConfig = getNutritionModuleConfig();
    const providerStatus = getNutritionProviderStatus();

    return res.json({
      enabled: moduleConfig.enabled,
      envKey: moduleConfig.envKey,
      primaryProviderId: moduleConfig.primaryProviderId,
      fallbackProviderId: moduleConfig.fallbackProviderId,
      providers: providerStatus.availableProviders,
    });
  });

  app.get('/api/nutrition/barcode/:barcode', async (req, res) => {
    try {
      const result = await lookupNutritionByBarcode(req.params.barcode || '');
      return res.json(result);
    } catch (error) {
      if (error instanceof NutritionLookupError) {
        return res.status(error.status).json({ error: error.message, code: error.code });
      }
      return res.status(500).json({ error: 'Kunne ikke hente produktdata lige nu.', code: 'unknown_error' });
    }
  });

  app.get('/api/nutrition/search', async (req, res) => {
    try {
      const query = typeof req.query.q === 'string' ? req.query.q : '';
      const limit = typeof req.query.limit === 'string' ? Number(req.query.limit) : undefined;
      const result = await searchNutritionProducts(query, limit);
      return res.json(result);
    } catch (error) {
      if (error instanceof NutritionLookupError) {
        return res.status(error.status).json({ error: error.message, code: error.code });
      }
      return res.status(500).json({ error: 'Kunne ikke søge efter produktdata lige nu.', code: 'unknown_error' });
    }
  });

  app.post('/api/ai/adjust', async (req, res) => {
    const { recipe, instruction } = req.body;
    if (!recipe || typeof instruction !== 'string') {
      return res.status(400).json({ error: 'recipe and instruction are required' });
    }
    try {
      const prompt = `
        You are an expert chef and culinary mathematician. Adjust the following recipe based on this user request: "${instruction}".
        Rules for adjustment:
        0. FIDELITY: Only make the adjustment the user asked for. Do not reinterpret the dish, do not change the cooking method (stovetop vs oven), do not add new ingredients unless the user's request specifically requires it, do not add serving suggestions, and do not modify the title.
        0.1 PRESERVE OVER REWRITE: Treat the incoming recipe as the source of truth. Keep ingredient names, groups, amountText (e.g. "efter smag", "valgfrit"), step order and step wording unchanged EXCEPT where the user's instruction forces a change. If a field is already clean and structured, copy it through verbatim rather than rephrasing.
        1. Gastronomic logic: Round awkward amounts and preserve cooking balance.
        2. Update timing if total volume changes significantly.
        3. Convert US/English units to Danish kitchen units when needed.
        4. Never change ingredients with locked=true.
        5. Heat must use a 1-9 induction scale.
        6. Extract timers into the timer property.
        7. Avoid repeating values already present in structured fields.
        8. Explain changes in aiRationale.
        9. Be conservative with weight/volume conversion. Never assume that 1 ml = 1 g or 1 dl = 100 g unless the ingredient is clearly water-like.
        10. Only convert between g and dl/ml when the ingredient has a well-known kitchen density, such as water, milk, cream, oil, butter, flour, sugar, oats, rice or cocoa.
        11. If the requested g/dl conversion is uncertain for a specific ingredient, keep the original amount and unit instead of guessing. Explain that choice briefly in aiRationale.
        12. When converting between weight and volume, keep the result realistic for Danish home cooking and avoid fake precision.
        Recipe JSON:
        ${JSON.stringify(recipe)}
      `;
      const parsedData = await generateAIContent(ADJUST_MODEL, prompt, RECIPE_SCHEMA, 2);
      return res.json({ recipe: { ...recipe, ...parsedData, id: recipe.id, lastUsed: new Date().toISOString() } });
    } catch (error) {
      console.error('AI Adjust Error:', error);
      const failure = toAiErrorResponse(error, '/api/ai/adjust');
      return res.status(failure.status).json(failure.body);
    }
  });

  app.post('/api/ai/generate-steps', async (req, res) => {
    const { recipe, level } = req.body;
    if (!recipe) return res.status(400).json({ error: 'recipe is required' });
    try {
      const styleInstruction = getLevelStyleInstruction(level, 'steps');
      const prompt = `
        You are an expert chef. Repair the recipe steps so the recipe works cleanly in cook mode.
        Rules:
        0. PRESERVE OVER REWRITE: If an incoming step already has clear text, an appropriate heat field, and a sensible timer, COPY IT THROUGH UNCHANGED. Only rewrite a step when it has a concrete weakness (missing heat, ambiguous action, buried ingredient). Do not change wording just to sound more "AI-polished". Do not reduce the number of steps unless an existing step is genuinely redundant — a significantly shorter list (<75% of input) is a signal that you are rewriting too much. Do not merge distinct actions.
        1. Improve existing steps instead of rewriting good ones unnecessarily.
        2. Return only repaired steps plus optional aiRationale, heatGuide and ovenGuide.
        3. Preserve the dish, ingredient list and overall method. FIDELITY TO THE ORIGINAL METHOD IS MANDATORY: do not change a stovetop recipe to an oven recipe (or vice versa), do not introduce a new cooking vessel, do not add ingredients that are not already in the recipe, and do not add serving/garnish suggestions. You may clarify, split, reorder or tighten steps — but the method must match what the user already has.
        4. Add a dedicated oven-preheat step IMMEDIATELY BEFORE the first step that actually uses the oven — NOT at the beginning of the recipe. If there are resting, proofing, or waiting steps before oven use, the preheat step must come after those steps so the oven is not running unnecessarily for hours.
        5. Use heat values on a 1-9 induction scale for stovetop steps.
        6. Extract timers into the timer property.
        7. Match the communication style to this instruction: ${styleInstruction}
        8. Write steps in a text-first cook mode style. Include the most important ingredient amounts directly in the step text when it improves execution clarity. Each step should be understandable without a separate ingredient overlay.
        9. Be conservative with heat. Do not default to aggressive heat just to make a step sound decisive.
        9. Reserve 9/9 for brief preheating or bringing liquid to a boil, not for sustained cooking.
        10. If a step says to bring something to a boil and then simmer, split it into separate steps or state the heat reduction explicitly so the sustained stovetop heat is lower than the initial boil.
        11. For onions, garlic and other aromatics, prefer moderate heat unless the text explicitly calls for hard browning.
        12. If a step needs two distinct heat phases, prefer splitting it into two steps so each step has one clear working heat.
        13. The structured heat field should reflect the sustained working heat, not a short initial peak, unless the whole step is truly only a brief high-heat action.
        14. When you set structured heat (heat field with a temperature or heatLevel with a number), do NOT restate the same number in the step text. The UI shows the temperature/level as a chip. Write the step text about WHAT the cook does, not the numeric heat. Bad: "Tænd ovnen på 200°C (almindelig ovn). ...". Good: "Tænd ovnen og lad den forvarme helt." Bad: "Brun kødet ved middel varme (trin 5)." Good: "Brun kødet på panden." Kernetemperatur numbers are exempt and MUST stay in text.
        RELEVANT INGREDIENT RULES:
        - Only include ingredients in relevantIngredients that are directly used in the current step.
        - Do not include future ingredients or ingredients used in other steps.
        - Do not guess.
        - Setup steps like boiling water, preheating oven, resting, waiting, and similar should return an empty relevantIngredients array.
        - It is better to return an empty relevantIngredients array than a wrong one.
        Recipe JSON:
        ${JSON.stringify(recipe)}
      `;
      const parsedData = await generateAIContent(DEFAULT_STRUCTURED_MODEL, prompt, STEP_REPAIR_SCHEMA, 2);
      // Deterministic step-count guard: if the model collapsed the step list
      // to <70% of input (and input had at least 3 steps), treat it as drift
      // and keep the input steps. Prevents generate-steps from degrading a
      // good text-first import by merging distinct actions. Generic, not
      // dish-specific.
      const inputSteps = Array.isArray(recipe.steps) ? recipe.steps : [];
      let aiSteps = Array.isArray(parsedData.steps) ? parsedData.steps : parsedData.steps;
      if (Array.isArray(aiSteps) && inputSteps.length >= 3) {
        const minAcceptable = Math.ceil(inputSteps.length * 0.7);
        if (aiSteps.length < minAcceptable) {
          console.warn(`[generate-steps] drift guard triggered (aiCount=${aiSteps.length}, inputCount=${inputSteps.length}) — reverting to input steps`);
          aiSteps = inputSteps;
        }
      }
      return res.json({
        recipe: {
          ...recipe,
          steps: aiSteps,
          aiRationale: parsedData.aiRationale || recipe.aiRationale,
          heatGuide: parsedData.heatGuide,
          ovenGuide: parsedData.ovenGuide,
          id: recipe.id,
          lastUsed: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('AI Generate Steps Error:', error);
      const failure = toAiErrorResponse(error, '/api/ai/generate-steps');
      return res.status(failure.status).json(failure.body);
    }
  });

  app.post('/api/ai/fill-rest', async (req, res) => {
    const { recipe, level } = req.body;
    if (!recipe) return res.status(400).json({ error: 'recipe is required' });
    try {
      const styleInstruction = getLevelStyleInstruction(level, 'fill');
      const prompt = `
        Du er en ekspertkok. Brugeren har kun udfyldt dele af en opskrift med titlen "${recipe.title}".
        Udfyld resten uden at ændre titlen.
        Behold eksisterende ingredienser og trin, men gør opskriften komplet.
        Sørg for heat, timer, summary, categories og servings.
        Match tonen til denne stilinstruktion: ${styleInstruction}
        Varme-regler:
        - Brug den kanoniske 1-9 induktionsskala.
        - Vær konservativ med varme. 9/9 er kun til kort opkog eller kort forvarmning, ikke stabil arbejdsvarme.
        - Hvis noget skal koges op og derefter koge videre, så beskriv nedjusteringen tydeligt eller del det i to trin.
        - Løg, hvidløg og andre aromater skal som udgangspunkt ikke have unødigt hård varme.
        - Hvis et trin har to tydelige varmefaser, så foretræk to trin frem for en enkelt vag varmeangivelse.
        Opskrift JSON:
        ${JSON.stringify(recipe)}
      `;
      const parsedData = await generateAIContent(DEFAULT_STRUCTURED_MODEL, prompt, RECIPE_SCHEMA, 2);
      return res.json({ recipe: { ...recipe, ...parsedData, title: recipe.title, id: recipe.id, lastUsed: new Date().toISOString() } });
    } catch (error) {
      console.error('AI Fill Rest Error:', error);
      const failure = toAiErrorResponse(error, '/api/ai/fill-rest');
      return res.status(failure.status).json(failure.body);
    }
  });

  app.post('/api/ai/polish-ingredients', async (req, res) => {
    const { recipe, level } = req.body;
    if (!recipe) return res.status(400).json({ error: 'recipe is required' });
    try {
      const styleInstruction = getLevelStyleInstruction(level, 'fill');
      const ingredientNames = (recipe.ingredients || []).map((i: any) => `${i.amount || ''} ${i.unit || ''} ${i.name}`.trim()).join(', ');
      const prompt = `
        Du er en ekspertkok. Gennemgå og RYD OP i ingredienslisten for opskriften "${recipe.title}".
        TROFASTHED (vigtigst): Du må IKKE opfinde nye ingredienser, udvide listen med "typiske tilbehør", foreslå alternativer eller tilføje garnish/servering-ingredienser, der ikke allerede står i listen. Kun ret, ikke udvid. Hvis en ingrediens ikke allerede er på listen, så lad være med at tilføje den.
        PRESERVE OVER REWRITE: Hvis en ingrediens allerede er veldefineret (name, amount/amountText, unit, group giver alle mening), så KOPIÉR DEN UÆNDRET. Kun ret der hvor der er en konkret fejl (typo, forkert felt, manglende gruppering). Omformulér ikke fungerende navne. Antal ingredienser må ikke falde — hver input-ingrediens SKAL have en klart tilsvarende output-ingrediens (samme kerne-navn). Hvis du er i tvivl, bevar input.
        Tilladte ændringer:
        - Ret stavefejl og standardiser navne (fx "loeg" -> "løg").
        - Flyt eksisterende ingredienser ind i korrekte grupper (rolle-baseret: "Til fyld", "Til saucen", "Til servering"). Opret KUN nye grupper, hvis eksisterende ingredienser naturligt hører hjemme der.
        - Behold eksisterende mængder og enheder medmindre de er åbenlyst forkerte (fx typo i tal).
        KVALITATIVE MÆNGDER: Hvis mængden er ikke-numerisk (fx "efter smag", "efter behov", "valgfrit", "ad libitum", "nok til ...", "per portion"), så SKAL det ind i amountText som fritekst, OG amount skal være null, OG unit skal være tom streng. Sæt ALDRIG både amount OG amountText for den samme mængdebetydning — det giver dobbelt-rendering som "efter smag 1 sukker". Eksempler:
        - "efter smag kanelsukker" -> { name: "kanelsukker", amount: null, unit: "", amountText: "efter smag" }
        - "valgfrit vaniljestang" -> { name: "vaniljestang", amount: null, unit: "", amountText: "valgfrit" }
        - "Sukker, kanel, smør eller frugt til servering efter smag" -> { name: "sukker, kanel, smør eller frugt", amount: null, unit: "", amountText: "efter smag", group: "Til servering" }
        TÆLLEBARE ENHEDER (knivspids, smule, klat, nip): "knivspids", "smule", "klat", "nip" ER enheder i dansk køkken. De skal IND i unit, ikke i amountText. Eksempler:
        - "En knivspids salt" -> { name: "salt", amount: 1, unit: "knivspids", amountText: "" }
        - "En klat smør per portion" -> { name: "smør", amount: null, unit: "", amountText: "en klat per portion" } (kun når per-portion-gør den ikke-tællelig)
        - "En smule peber" -> { name: "peber", amount: 1, unit: "smule", amountText: "" }
        DOBBELT-MÆNGDE ER FORBUDT: Hvis du sætter amount (tal), så SKAL amountText være tom. Hvis du sætter amountText, så SKAL amount være null. Eksempler på forkert output (undgå):
        - { amountText: "en knivspids", amount: 1, unit: "", name: "salt" }   // rendering bliver "en knivspids 1 salt"
        - { amountText: "valgfrit", amount: 1, unit: "stk", name: "..." }    // rendering bliver "valgfrit 1 stk ..."
        - { amountText: "efter smag", amount: 1, unit: "", name: "..." }    // rendering bliver "efter smag 1 ..."
        ALTERNATIVER: Hvis to ingredienser er angivet som alternativer (fx "vaniljestang eller kanelstang"), så behold dem i ét name-felt som "vaniljestang eller kanelstang", og sæt amount/unit efter den numeriske angivelse i kilden (typisk 1 stk).
        OPTIONAL/NOTE-GRUPPER (OBLIGATORISK):
        - Hvis en kildelinje starter med "Valgfrit", "Valgfri", "Optional" eller har karakter af note/alternativ (fx "Valgfrit: en stang vanilje eller kanelstænger"), SKAL ingrediensen lægges i gruppen "Valgfrit". IKKE i hovedgruppen med amountText="valgfrit" som et løst præfiks.
        - Hvis en kildelinje har karakter af serverings-/drys-/topping-note (fx "Sukker, kanel, smør eller frugt til servering efter smag"), SKAL den lægges i gruppen "Til servering".
        - Hvis en linje er en generel note uden klar mængde og ikke en målbar ingrediens, læg den i gruppen "Noter".
        - Når gruppen er "Valgfrit" eller "Til servering" og kilden bruger "efter smag"/"valgfrit", så må amountText være tom (gruppen bærer semantikken) — eller "efter smag" hvis det giver læsbarhed. Sæt IKKE både gruppe="Valgfrit" OG amountText="valgfrit" samtidigt; det er dobbeltmarkering.
        - Hovedgruppen ("Ingredienser"/rolle-gruppen) må kun indeholde ingredienser med en reel mængde eller en tællbar enhed.
        Ingen nye flavorBoosts/pitfalls/kategorier tilføjes her.
        Match tonen til: ${styleInstruction}
        Nuværende ingredienser: ${ingredientNames}
        Trin (til kontekst, men tilføj ALDRIG nye ingredienser fordi et trin nævner noget): ${(recipe.steps || []).map((s: any) => s.text).slice(0, 10).join(' | ')}
      `;
      const parsedData = await generateAIContent(DEFAULT_STRUCTURED_MODEL, prompt, INGREDIENT_POLISH_SCHEMA, 2);
      // Server-side shape cleanup: strip fake amount=0, rescue qualitative
      // phrases from unit, hoist countable-unit phrases out of amountText,
      // promote Valgfrit, drop dual-channel conflicts. Keeps output clean
      // before it leaves the server rather than only healing in UI.
      let aiIngredients = Array.isArray(parsedData.ingredients)
        ? parsedData.ingredients.map((ing: any) => normalizeIngredientAmountShape(ing))
        : parsedData.ingredients;
      // Deterministic drift guard: if the model dropped ingredients or renamed
      // the majority of them, fall back to input. Generic, not dish-specific.
      // Prevents polish-ingredients from degrading an already-good list.
      const inputIngredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
      if (Array.isArray(aiIngredients) && inputIngredients.length >= 2) {
        const coverage = computeIngredientCoverage(inputIngredients, aiIngredients);
        if (coverage.matchRate < 0.7 || aiIngredients.length < Math.ceil(inputIngredients.length * 0.7)) {
          console.warn(`[polish-ingredients] drift guard triggered (matchRate=${coverage.matchRate.toFixed(2)}, aiCount=${aiIngredients.length}, inputCount=${inputIngredients.length}) — reverting to input ingredients`);
          aiIngredients = inputIngredients.map((ing: any) => normalizeIngredientAmountShape(ing));
        }
      }
      return res.json({ recipe: { ...recipe, ingredients: aiIngredients, id: recipe.id, lastUsed: new Date().toISOString() } });
    } catch (error) {
      console.error('AI Polish Ingredients Error:', error);
      const failure = toAiErrorResponse(error, '/api/ai/polish-ingredients');
      return res.status(failure.status).json(failure.body);
    }
  });

  app.post('/api/ai/polish-steps', async (req, res) => {
    const { recipe, level } = req.body;
    if (!recipe) return res.status(400).json({ error: 'recipe is required' });
    try {
      const styleInstruction = getLevelStyleInstruction(level, 'fill');
      const ingredientNames = (recipe.ingredients || []).map((i: any) => `${i.amount || ''} ${i.unit || ''} ${i.name}`.trim()).join(', ');
      const prompt = `
        Du er en ekspertkok. Gennemgå og forbedre fremgangsmåden for opskriften "${recipe.title}".
        - Gør trinene klare og præcise — skriv i text-first stil så hvert trin kan forstås uden separat ingrediensvisning.
        - Inkludér de vigtigste mængder direkte i trinteksten, fx "Tilsæt de 200 g hakket oksekød".
        - Tilføj varme (heat/heatLevel på induktionsskala 1-9) hvor det mangler.
        - Når struktureret heat allerede er sat på trinet, må du IKKE gentage tal/niveau mekanisk i prose-teksten. Skriv i stedet trinet naturligt — UI viser heat-chippen separat. Undgå formuleringer som "på induktion 6/9" eller "varme niveau 6" i selve step-teksten, når heat-feltet allerede findes.
        - Tilføj timere (timer med duration i sekunder) hvor det er relevant.
        - Tilføj relevantIngredients til hvert trin — KUN ingredienser der faktisk bruges i dette specifikke trin.
        - Setup-trin som at koge vand, forvarme ovn, hvile, vente og lignende skal have tom relevantIngredients liste.
        - Det er bedre at returnere en tom relevantIngredients end en forkert en.
        - Generér heatGuide, ovenGuide (hvis relevant), flavorBoosts, pitfalls, hints og kitchenTimeline.
        Varme-regler:
        - Brug den kanoniske 1-9 induktionsskala.
        - 9/9 er kun til kort opkog, ikke stabil arbejdsvarme.
        - Løg og aromater skal ikke have unødigt hård varme.
        - Hvis et trin har to varmefaser, del det i to trin.
        Match tonen til: ${styleInstruction}
        Ingredienser: ${ingredientNames}
        Nuværende trin: ${JSON.stringify(recipe.steps || [])}
      `;
      const parsedData = await generateAIContent(DEFAULT_STRUCTURED_MODEL, prompt, STEP_POLISH_SCHEMA, 2);
      return res.json({ recipe: { ...recipe, ...parsedData, id: recipe.id, lastUsed: new Date().toISOString() } });
    } catch (error) {
      console.error('AI Polish Steps Error:', error);
      const failure = toAiErrorResponse(error, '/api/ai/polish-steps');
      return res.status(failure.status).json(failure.body);
    }
  });

  app.post('/api/ai/suggest-tags', async (req, res) => {
    const { recipe } = req.body;
    if (!recipe) return res.status(400).json({ error: 'recipe is required' });
    try {
      const ingredientNames = (recipe.ingredients || []).map((i: any) => i.name).join(', ');
      const prompt = `
        Foreslå 3-5 tags/kategorier på dansk for opskriften "${recipe.title}".
        Ingredienser: ${ingredientNames}
        Eksisterende tags: ${(recipe.categories || []).join(', ') || 'ingen'}
        Tags skal objektivt beskrive opskriftens faktiske indhold: måltidstype, køkken, hovedkomponent, sæson. IKKE spekulative eller aspirerende tags. Hellere 3 præcise tags end 5 løse. Tag må ikke trække opskriften væk fra dens reelle profil (fx ikke "Festmad" på en hverdagsret, ikke "Hurtig" på en langtidsret).
        Eksempler: Aftensmad, Italiensk, Hurtig, Comfort food, Vegetarisk, Bagværk, Frokost, Snack, Grill, Suppe, Salat, Festmad, Hverdagsmad.
        Behold eksisterende tags og tilføj kun nye, der tydeligt passer. Undgå dubletter.
      `;
      const schema = {
        type: Type.OBJECT,
        properties: {
          categories: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ['categories'],
      };
      const parsedData = await generateAIContent(DEFAULT_STRUCTURED_MODEL, prompt, schema, 2);
      return res.json({ recipe: { ...recipe, categories: parsedData.categories, id: recipe.id, lastUsed: new Date().toISOString() } });
    } catch (error) {
      console.error('AI Suggest Tags Error:', error);
      const failure = toAiErrorResponse(error, '/api/ai/suggest-tags');
      return res.status(failure.status).json(failure.body);
    }
  });

  app.post('/api/ai/enrich', async (req, res) => {
    const { recipe, level } = req.body;
    if (!recipe) return res.status(400).json({ error: 'recipe is required' });
    try {
      const styleInstruction = getLevelStyleInstruction(level, 'fill');
      const enrichSchema = {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING },
          categories: { type: Type.ARRAY, items: { type: Type.STRING } },
          flavorBoosts: { type: Type.ARRAY, items: { type: Type.STRING } },
          pitfalls: { type: Type.ARRAY, items: { type: Type.STRING } },
          hints: { type: Type.ARRAY, items: { type: Type.STRING } },
          substitutions: { type: Type.ARRAY, items: { type: Type.STRING } },
          ingredientGroups: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                ingredientName: { type: Type.STRING },
                group: { type: Type.STRING },
              },
              required: ['ingredientName', 'group'],
            },
          },
        },
        required: ['summary', 'categories', 'flavorBoosts', 'pitfalls', 'ingredientGroups'],
      };
      const ingredientNames = (recipe.ingredients || []).map((i: any) => i.name).join(', ');
      const prompt = `
        Du er en ekspertkok. Givet denne opskrift, generer de ekstra kulinariske felter.
        Match tonen til denne stilinstruktion: ${styleInstruction}

        INGREDIENT GROUPS: Assign each ingredient to a group based on its role in the dish — e.g. 'Til panering', 'Til fyld', 'Til saucen', 'Til servering'. NEVER group by ingredient type (not 'Mejeri', 'Kød', etc.). If no distinct components, use 'Ingredienser'.
        FLAVOR BOOSTS: 2-4 concrete tips to elevate flavor.
        PITFALLS: 2-3 common mistakes to avoid.

        Opskrift: "${recipe.title}" med ingredienser: ${ingredientNames}.
        Trin: ${(recipe.steps || []).map((s: any) => s.text).slice(0, 8).join(' | ')}
      `;
      const parsedData = await generateAIContent(DEFAULT_STRUCTURED_MODEL, prompt, enrichSchema, 2);
      return res.json({ enrichment: parsedData });
    } catch (error) {
      console.error('AI Enrich Error:', error);
      const failure = toAiErrorResponse(error, '/api/ai/enrich');
      return res.status(failure.status).json(failure.body);
    }
  });

  app.post('/api/ai/generate-tips', async (req, res) => {
    const { recipe } = req.body;
    if (!recipe) return res.status(400).json({ error: 'recipe is required' });
    try {
      const prompt = `Giv mig 3-5 avancerede tips, tricks, teknikker eller overvejelser til denne opskrift: \"${recipe.title}\". Returner et JSON objekt med en enkelt nøgle \"tipsAndTricks\" som er et array af strings.`;
      const schema = { type: Type.OBJECT, properties: { tipsAndTricks: { type: Type.ARRAY, items: { type: Type.STRING } } } };
      const parsedData = await generateAIContent(DEFAULT_STRUCTURED_MODEL, prompt, schema, 2);
      return res.json({ tipsAndTricks: parsedData.tipsAndTricks });
    } catch (error) {
      console.error('AI Generate Tips Error:', error);
      const failure = toAiErrorResponse(error, '/api/ai/generate-tips');
      return res.status(failure.status).json(failure.body);
    }
  });

  app.post('/api/ai/estimate-nutrition', async (req, res) => {
    const { recipe, level } = req.body;
    if (!recipe) return res.status(400).json({ error: 'recipe is required' });
    try {
      const styleInstruction = getLevelStyleInstruction(level, 'fill');
      const buildPrompt = (missingIngredients: string[] = []) => `
        Du er en nøgtern ernæringsassistent.
        Lav et vejledende makro- og kcal-estimat for hele opskriften ud fra ingredienslisten.
        Returner kun JSON, som matcher schemaet.
        Regn per 100 g og per portion.
        Brug recipe.servings som portionsantal.
        Hvis enkelte mængder eller enheder er uklare, lav konservative køkkenantagelser og forklar dem kort i rationale.
        Brug nutritionAttachment kun som ekstra reference, hvis den findes. Ingredienslisten er stadig primær kilde.
        Match tonen til denne stilinstruktion: ${styleInstruction}
        Confidence skal være en af: high, medium, low.
        ingredientBreakdown skal indeholde ALLE ingredienser fra recipe.ingredients nøjagtigt én gang hver.
        ingredientName skal kopieres direkte fra recipe.ingredients[].name og må ikke omskrives eller grupperes.
        proteinGrams, fatGrams og carbsGrams i ingredientBreakdown skal være hele ingrediensens bidrag i hele opskriften, ikke per 100 g.
        Summen af ingredientBreakdown skal passe nogenlunde med totals for hele opskriften.
        Medregn også små ingredienser som olie, smør, løg, hvidløg, bouillon, mel, sukker, krydderier, fløde, smørklatter og lignende.
        Hvis noget er uklart, skal ingrediensen stadig med i ingredientBreakdown med et konservativt estimat og en note.
        ${missingIngredients.length > 0 ? `Du mangler specifikt at medregne disse ingredienser fra forrige forsøg: ${missingIngredients.join(', ')}.` : ''}
        Opskrift JSON:
        ${JSON.stringify(recipe)}
      `;

      let normalizedEstimate = normalizeNutritionEstimate(
        await generateAIContent(DEFAULT_STRUCTURED_MODEL, buildPrompt(), NUTRITION_ESTIMATE_SCHEMA, 2),
        recipe,
      );

      if (normalizedEstimate.omittedIngredients.length > 0) {
        normalizedEstimate = normalizeNutritionEstimate(
          await generateAIContent(DEFAULT_STRUCTURED_MODEL, buildPrompt(normalizedEstimate.omittedIngredients), NUTRITION_ESTIMATE_SCHEMA, 2),
          recipe,
        );
      }

      if (normalizedEstimate.omittedIngredients.length > 0) {
        throw new Error(`Nutrition estimate omitted ingredients: ${normalizedEstimate.omittedIngredients.join(', ')}`);
      }

      return res.json({ estimate: normalizedEstimate });
    } catch (error) {
      console.error('AI Nutrition Estimate Error:', error);
      const failure = toAiErrorResponse(error, '/api/ai/estimate-nutrition');
      return res.status(failure.status).json(failure.body);
    }
  });

  app.post('/api/ai/apply-prefix', async (req, res) => {
    const { recipe, prefix } = req.body;
    if (!recipe || typeof prefix !== 'string') return res.status(400).json({ error: 'recipe and prefix are required' });
    try {
      // Send only the fields AI needs — strip metadata, ids, timestamps etc.
      const compactRecipe = {
        title: recipe.title,
        summary: recipe.summary,
        servings: recipe.servings,
        servingsUnit: recipe.servingsUnit,
        ingredients: (recipe.ingredients || []).map((i: any) => ({ name: i.name, amount: i.amount, unit: i.unit, group: i.group })),
        steps: (recipe.steps || []).map((s: any) => ({ text: s.text, heat: s.heat, heatLevel: s.heatLevel, timer: s.timer })),
      };
      const prompt = `Du er en ekspertkok. Tilpas følgende opskrift så den passer til profilen: "${prefix}".
Profilerne betyder:
- [Gourmet] -> Gastronomisk perfekt, avancerede teknikker, anretning i fokus.
- [Autentisk] -> Traditionelle metoder og ingredienser.
- [Den hurtige] -> Hurtigere og mere praktisk uden at miste kvaliteten helt.
- [Begynderen] -> Simple trin og lav kompleksitet.
- [Babyvenlig 0/1 år] -> Tilpasset de mindste og sundhedsstyrelsens retningslinjer.
- [Børnevenlig 1/3 år] -> Børnevenlige smage og passende tekstur.
- [Spice it up] -> Mere smag og krydderi.
Bevar opskriftens kerne men tilpas ingredienser, mængder, trin og sværhedsgrad efter profilen.
Opskrift: ${JSON.stringify(compactRecipe)}`;
      const parsedData = await generateAIContent(DEFAULT_STRUCTURED_MODEL, prompt, PREFIX_VARIANT_SCHEMA, 2);
      // Merge AI result with original recipe, preserving prefix as a tag
      const prefixTag = prefix.replace(/[\[\]]/g, '').trim();
      const existingCategories = Array.isArray(parsedData.categories) ? parsedData.categories : (recipe.categories || []);
      const categories = existingCategories.includes(prefixTag) ? existingCategories : [prefixTag, ...existingCategories];
      return res.json({ recipe: { ...recipe, ...parsedData, categories, variantPrefix: prefixTag } });
    } catch (error) {
      console.error('AI Apply Prefix Error:', error);
      const failure = toAiErrorResponse(error, '/api/ai/apply-prefix');
      return res.status(failure.status).json(failure.body);
    }
  });

  // Deterministic summary enforcement. The import prompt tells the model to
  // keep summary short, but models frequently concatenate step text, categories
  // and filler into the summary field. We clamp it server-side so raw
  // response is already shape-clean:
  //   - strip concatenated blocks (separated by runs of 2+ spaces)
  //   - keep only the first 1-2 sentences
  //   - drop leading/trailing filler phrases ("velbekomme", "nyd", etc.)
  //   - hard-cap at 180 chars (prompt contract)
  const SUMMARY_MAX_CHARS = 180;
  const SUMMARY_FILLER_RE = /\b(velbekomme|nyd(?:\s+(?:den|det|dette))?|god\s+fornøjelse|god\s+madlyst|denne\s+ret\s+(?:er|bliver|serveres))\b[^.!?]*[.!?]?/gi;
  const enforceSummaryRule = (raw: unknown): string => {
    if (typeof raw !== 'string') return '';
    // 1. Collapse whitespace and split on runs of 2+ spaces — models use these
    //    as implicit paragraph breaks when dumping step/category content into
    //    the summary field. Keep only the first chunk.
    const firstChunk = raw.replace(/\r/g, '').split(/\s{2,}|\n+/).map(s => s.trim()).filter(Boolean)[0] || '';
    // 2. Strip filler phrases.
    let cleaned = firstChunk.replace(SUMMARY_FILLER_RE, '').replace(/\s+/g, ' ').trim();
    // 3. Keep only the first 1-2 sentences.
    const sentences = cleaned.match(/[^.!?]+[.!?]+/g) || [cleaned];
    cleaned = sentences.slice(0, 2).join(' ').replace(/\s+/g, ' ').trim();
    // 4. Hard-cap at SUMMARY_MAX_CHARS — prefer trimming at a sentence
    //    boundary, otherwise at the last space, otherwise hard-cut.
    if (cleaned.length > SUMMARY_MAX_CHARS) {
      const oneSentence = (cleaned.match(/[^.!?]+[.!?]+/) || [''])[0].trim();
      if (oneSentence && oneSentence.length <= SUMMARY_MAX_CHARS) {
        cleaned = oneSentence;
      } else {
        const slice = cleaned.slice(0, SUMMARY_MAX_CHARS);
        const lastSpace = slice.lastIndexOf(' ');
        cleaned = (lastSpace > 80 ? slice.slice(0, lastSpace) : slice).trim();
        if (!/[.!?]$/.test(cleaned)) cleaned += '…';
      }
    }
    return cleaned;
  };

  // Shared server-side shape cleanup for imported recipes. Applies the same
  // normalizer the client uses (amount=0 / qualitative / countable-unit /
  // dual-channel / Valgfrit promotion) so import output is already clean when
  // it leaves the server — not only healed in UI on load. Also enforces the
  // summary contract deterministically.
  const cleanParsedImportData = (parsed: any): any => {
    if (!parsed || typeof parsed !== 'object') return parsed;
    const out: any = { ...parsed };
    if (Array.isArray(parsed.ingredients)) {
      out.ingredients = parsed.ingredients.map((ing: any) => normalizeIngredientAmountShape(ing));
    }
    if (typeof parsed.summary === 'string') {
      out.summary = enforceSummaryRule(parsed.summary);
    }
    return out;
  };

  app.post('/api/ai/import', async (req, res) => {
    const { sourceType, textContent, isStructuredData, fileData, level, googleAccessToken } = req.body;
    if (!sourceType || !['url', 'text', 'file', 'image'].includes(sourceType)) {
      return res.status(400).json({ error: 'sourceType is required' });
    }

    const styleInstruction = getLevelStyleInstruction(level, 'import');
    const sharedRules = `
      Return the recipe in Danish.
      OUTPUT SCOPE: This is the primary import pass. Produce ONLY these fields: title, summary, servings, servingsUnit, ingredients, steps. Do NOT produce categories, flavorBoosts, pitfalls, hints, substitutions, heatGuide, ovenGuide, kitchenTimeline, aiRationale, recipeType or folder — they are generated in dedicated later passes. Spending tokens on them here slows the import without adding value.
      FIDELITY TO SOURCE (HIGHEST PRIORITY): Stay close to the source recipe. You may RESTRUCTURE and PRECISION-EDIT (fix grammar, clarify steps, standardize units, group ingredients, extract heat/timers), but you MUST NOT:
      - invent a cooking method that is not in the source (e.g. do NOT turn a stovetop recipe into an oven recipe, or vice versa)
      - add ingredients that are not in the source (no "optional" vaniljestang, kanelstang, frugt, garnish etc. unless explicitly listed)
      - add serving suggestions, accompaniments or garnishes that are not in the source
      - modify the title by prepending marketing words like "Klassisk", "Traditionel", "Cremet", "Nem" or by adding method descriptors like "i ovn", "på pande" unless the source title uses them
      - "improve" or reinterpret the recipe — the user wants their recipe structured, not rewritten
      If a detail is not in the source, omit it rather than guessing. When in doubt, stay literal.
      INGREDIENT GROUPS: Always group ingredients by their role/component in the dish — e.g. 'Til panering', 'Til fyld', 'Til saucen', 'Til dejen', 'Til salaten', 'Til servering'. NEVER group by ingredient type (do NOT use 'Mejeri', 'Kød', 'Tørvarer' etc.). If a recipe has no distinct components, use a single group like 'Ingredienser'.
      INGREDIENT NAMES: ALWAYS restructure ingredients so the 'name' field contains ONLY the core ingredient. Move quantity words into 'unit' and 'amount'. Examples:
      - "4 skiver gouda" → { name: "gouda", amount: 4, unit: "skiver" }
      - "skiver gouda (eller emmentaler)" → { name: "gouda (eller emmentaler)", amount: 4, unit: "skiver" }
      - "2 fed hvidløg" → { name: "hvidløg", amount: 2, unit: "fed" }
      - "1 dåse flåede tomater" → { name: "flåede tomater", amount: 1, unit: "dåse" }
      - "skiver kogt skinke" → { name: "kogt skinke", amount: 4, unit: "skiver" }
      Words like 'skiver', 'stk', 'fed', 'dåse', 'bundt', 'pose' are ALWAYS units, never part of the name.
      AMOUNT RANGE RULES: If an ingredient amount is a range like "175-200 g", never collapse it to a midpoint. Store ranges as amountMin and amountMax. Use amountText to preserve the original phrasing when useful (e.g. "175-200"). Only use amount as a single number when the source clearly gives one exact amount.
      QUALITATIVE AMOUNTS: When the source uses a non-numeric amount ("efter smag", "efter behov", "en klat", "en smule", "valgfrit", "ad libitum", "nok til at dække", "per portion", "lidt", "rigeligt"), do NOT force it into amount+unit. Put the whole phrase into amountText, set amount to null, and set unit to an empty string. Never invent a fake amount=1 with unit="efter smag" — that renders as "1 efter smag" which is broken. Exceptions: "1 knivspids", "1 bundt", "1 fed", "1 stk" are real countable units and should stay as amount + unit.
      METHOD DEFAULT: When the source does not specify a cooking method, use the traditional/canonical method for the dish. Do not default to oven baking for dishes that are classically stovetop (e.g. dansk risengrød, havregrød, bearnaise, bechamel, frikadeller, stuvning). Do not default to stovetop for dishes that are classically oven-baked. If genuinely ambiguous, pick the most common Danish home-kitchen method and state it plainly — do not invent oven temperatures, vessels or serving garnishes that are not in the source.
      SUMMARY RULES: summary must be 1-2 short sentences only. Maximum 180 characters. Do not repeat phrases or sentences. Do not include filler like "Velbekomme", "nyd", "god fornøjelse", "god madlyst", "denne ret er...". If no useful summary is available, return an empty string.
      Convert English/US metrics to Danish metrics.
      TEXT-FIRST STEP RULES: Step text must stand on its own in cook mode. When an ingredient is used in a step, include the ingredient name and usually the relevant quantity directly in the step text. Prefer natural phrasing like "Tilsæt de 2 hakkede løg og 3 fed hvidløg". Do not rely on a separate ingredient box to make the step understandable. Avoid repeating heat values in prose if they already exist in the structured heat field, unless needed for clarity. Each step should be understandable even if helper overlays are hidden.
      Extract heat info into the 'heat' property and ALWAYS convert it to a 1-9 induction scale.
      Extract specific timers into the 'timer' property.
      OVEN PREHEAT: Place oven-preheat steps IMMEDIATELY BEFORE the step that uses the oven. Never put oven preheat at the start of the recipe if there are long resting, proofing, or waiting steps before oven use.
      Extract the servings unit into 'servingsUnit'.
      Match tone and detail level to this style instruction: ${styleInstruction}
    `;

    try {
      if ((sourceType === 'url' || sourceType === 'text') && typeof textContent === 'string') {
        // Guard: reject near-empty content that would cause AI hallucination
        const contentLength = textContent.replace(/\s+/g, ' ').trim().length;
        if (!isStructuredData && contentLength < 80) {
          console.warn(`[import] Content too short for AI import (${contentLength} chars), likely JS-rendered SPA`);
          return res.status(422).json({
            error: 'Siden ser ud til at være dynamisk renderet og leverede ikke brugbar opskriftstekst. Vi prøvede grundimport og ekstra fallback uden held. Prøv at kopiere selve opskriftsteksten ind manuelt.',
            code: 'content_too_short',
          });
        }

        if (isStructuredData) {
          const parsedData = await generateAIContent(
            IMPORT_MODEL,
            `Extract the recipe from this JSON-LD/Microdata. ${sharedRules}\nJSON data: ${textContent}`,
            RECIPE_IMPORT_SCHEMA,
            0,
          );
          return res.json({ parsedData: cleanParsedImportData(parsedData), importMeta: { fallbackUsed: false } });
        }
        const withFallback = sourceType === 'text'
          ? await importRecipeFromTextWithFallback(
              textContent,
              `Extract the recipe from this text. Focus on the main recipe content. ${sharedRules}\nContent: ${textContent.substring(0, 40000)}`,
              sourceType,
              1,
            )
          : await importRecipeFromTextWithFallback(
              textContent,
              `Extract the recipe from this text. Focus on the main recipe content and ignore ads, navigation, and unrelated sections. ${sharedRules}\nContent: ${textContent.substring(0, 40000)}`,
              sourceType,
              1,
            );
        return res.json({ parsedData: cleanParsedImportData(withFallback.data), importMeta: withFallback.importMeta });
      }

      if ((sourceType === 'file' || sourceType === 'image') && fileData?.data && fileData?.mimeType) {
        // For unsupported MIME types (e.g. .docx, .gdoc), extract text and use text-based import
        if (!isGeminiSupportedMime(fileData.mimeType)) {
          console.log(`[import] Unsupported MIME "${fileData.mimeType}", attempting text extraction (data length: ${fileData.data?.length})`);
          const extractedText = await extractTextFromFile(fileData.data, fileData.mimeType, googleAccessToken);
          console.log(`[import] extractTextFromFile result: ${extractedText ? extractedText.substring(0, 200) : 'null'}`);
          if (!extractedText?.trim()) {
            return res.status(400).json({ error: 'Denne filtype kunne ikke læses. Prøv PDF, billede eller indsæt teksten direkte.' });
          }
          const withFallback = await importRecipeFromTextWithFallback(
            extractedText,
            `Extract the recipe from this text. Focus on the main recipe content. ${sharedRules}\nContent: ${extractedText.substring(0, 40000)}`,
            `file:${fileData.mimeType}`,
          );
          return res.json({ parsedData: cleanParsedImportData(withFallback.data), importMeta: withFallback.importMeta });
        }

        const prompt = `Extract the recipe from this document or image. ${sharedRules}`;
        const maxRetries = 1;
        let lastInlineError: any;
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), SERVER_AI_TIMEOUT_MS);
          try {
            const result = await getAiClient().models.generateContent({
              model: IMPORT_MODEL,
              contents: [{ parts: [
                { inlineData: { data: fileData.data, mimeType: fileData.mimeType } },
                { text: prompt },
              ] }],
              config: {
                responseMimeType: 'application/json',
                responseSchema: RECIPE_IMPORT_SCHEMA,
                httpOptions: { timeout: SERVER_AI_TIMEOUT_MS },
                abortSignal: controller.signal,
              },
            });
            const responseText = extractTextFromAiResponse(result, `import ${sourceType}`);
            const parsedData = parseAiJsonResponse(responseText, `import ${sourceType}`);
            return res.json({ parsedData: cleanParsedImportData(parsedData), importMeta: { fallbackUsed: false } });
          } catch (error: any) {
            lastInlineError = error;
            if (error?.name === 'AbortError' || error?.code === 'ECONNABORTED' || error?.message?.includes('timed out')) {
              lastInlineError = new Error(`AI request to ${IMPORT_MODEL} timed out after ${SERVER_AI_TIMEOUT_MS / 1000}s`);
            }
            if (attempt < maxRetries && isRetryableError(error)) {
              const delayMs = 2000 * (attempt + 1);
              console.log(`[import] Retrying inline file import after ${delayMs}ms (attempt ${attempt + 1}/${maxRetries})`);
              await new Promise(resolve => setTimeout(resolve, delayMs));
              continue;
            }
          } finally {
            clearTimeout(timeoutId);
          }
        }
        throw lastInlineError;
      }

      return res.status(400).json({ error: 'Manglende indhold til import' });
    } catch (error) {
      console.error('AI Import Error:', error);
      const failure = toAiErrorResponse(error, '/api/ai/import');
      return res.status(failure.status).json(failure.body);
    }
  });

  app.post('/api/parse-direct', async (req, res) => {
    const { url } = req.body;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL is required' });
    }

    let extracted: Awaited<ReturnType<typeof fetchRecipeSource>> | null = null;
    try {
      recordObserverPipelineStage('url_import', 'direct_parse_started');
      extracted = await fetchRecipeSource(url);
    } catch (error: any) {
      if (error instanceof HttpError) {
        recordObserverFailure('url_import', 'direct_parse_fetch_failed', 'http_error', {
          errorCode: String(error.status),
        });
        return res.status(error.status).json({ error: error.message });
      }
      console.error('Direct Parse Fetch Error:', error);
      recordObserverFailure('url_import', 'direct_parse_fetch_failed', 'fetch_error');
      return res.status(500).json({ error: 'Direkte grundimport fejlede.' });
    }

    // B6: Always return the fetched source so the client can reuse it in an
    // AI-fallback flow without calling /api/fetch-url a second time.
    if (!extracted.json) {
      recordObserverPipelineStage('url_import', 'direct_parse_failed', {
        reason: 'missing_structured_data',
      });
      return res.status(422).json({
        error: 'Siden har ikke struktureret opskriftdata, der kan grundimporteres direkte.',
        source: extracted,
      });
    }

    try {
      const recipe = parseStructuredRecipeToRecipe(extracted.json, { sourceUrl: url });
      recordObserverPipelineStage('url_import', 'direct_parse_succeeded', {
        recipeTitle: recipe.title,
      });
      return res.json({ recipe });
    } catch (error: any) {
      if (error instanceof DirectParseError) {
        recordObserverPipelineStage('url_import', 'direct_parse_failed', {
          reason: 'structured_parse_error',
        });
        return res.status(422).json({ error: error.message, source: extracted });
      }
      console.error('Direct Parse Error:', error);
      recordObserverFailure('url_import', 'direct_parse_failed', 'parse_error');
      return res.status(500).json({ error: 'Direkte grundimport fejlede.', source: extracted });
    }
  });

  app.get('/api/fetch-url', async (req, res) => {
    const { url } = req.query;

    try {
      recordObserverPipelineStage('url_import', 'fetch_url_started');
      return res.json(await fetchRecipeSource(String(url)));
    } catch (error: any) {
      if (error instanceof HttpError) {
        recordObserverFailure('url_import', 'fetch_url_failed', 'http_error', {
          errorCode: String(error.status),
        });
        return res.status(error.status).json({ error: error.message });
      }
      console.error('Fetch URL Error:', error);
      recordObserverFailure('url_import', 'fetch_url_failed', 'fetch_error');
      return res.status(500).json({ error: 'Kunne ikke hente kildesiden' });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`[startup] GEMINI_API_KEY is ${process.env.GEMINI_API_KEY ? 'configured' : 'MISSING'}`);
    console.log(`[startup] AI model config: ${MODEL_DOC_COMMENT}`);
  });
}

startServer();


