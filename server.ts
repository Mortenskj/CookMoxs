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
import { fetchWithSafeRedirects, UnsafeUrlError } from './src/server/utils/urlSafety.ts';
import { DirectParseError, parseStructuredRecipeToRecipe } from './src/services/recipeDirectParser.ts';
import {
  NutritionLookupError,
  lookupNutritionByBarcode,
  searchNutritionProducts,
} from './src/services/nutrition/nutritionLookupService.ts';
import { getNutritionProviderStatus } from './src/services/nutrition/nutritionProviderRegistry.ts';

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
          unit: { type: Type.STRING },
          group: { type: Type.STRING },
          locked: { type: Type.BOOLEAN },
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

const SERVER_AI_TIMEOUT_MS = 40000;

async function generateAIContent(model: string, prompt: string, responseSchema: any) {
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

function parseAiJsonResponse(rawText: string, context: string) {
  return parseAiJsonPayload(rawText, context);
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
      : 'AI-estimat baseret paa ingredienslisten.',
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
      return { json: recipeJson };
    }

    const recipeElement = $('[itemtype*="schema.org/Recipe"]');
    if (recipeElement.length > 0) {
      const ingredients: string[] = [];
      recipeElement.find('[itemprop="recipeIngredient"]').each((_, el) => { ingredients.push($(el).text().trim()); });
      const instructions: string[] = [];
      recipeElement.find('[itemprop="recipeInstructions"]').each((_, el) => { instructions.push($(el).text().trim()); });
      if (ingredients.length > 0 || instructions.length > 0) {
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
    return { html: contentElement.text().replace(/\s+/g, ' ').trim() };
  } catch (error) {
    if (error instanceof UnsafeUrlError) {
      throw new HttpError(error.status, error.message);
    }

    console.error('Error fetching URL:', error);
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

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT || 3000);

  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
  }));
  app.use(express.json({ limit: '10mb' }));
  app.use('/api/events', express.text({ type: 'text/plain' }));

  const aiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'For mange AI-kald lige nu. Prøv igen om et øjeblik.' },
  });
  app.use('/api/ai', aiLimiter);

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
      return res.status(500).json({ error: 'Kunne ikke soege efter produktdata lige nu.', code: 'unknown_error' });
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
      const parsedData = await generateAIContent(ADJUST_MODEL, prompt, RECIPE_SCHEMA);
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
        1. Improve existing steps instead of rewriting good ones unnecessarily.
        2. Return only repaired steps plus optional aiRationale, heatGuide and ovenGuide.
        3. Preserve the dish, ingredient list and overall method.
        4. Add a dedicated oven-preheat step when later steps use an oven temperature and no preheat step exists yet.
        5. Use heat values on a 1-9 induction scale for stovetop steps.
        6. Extract timers into the timer property.
        7. Match the communication style to this instruction: ${styleInstruction}
        8. Be conservative with heat. Do not default to aggressive heat just to make a step sound decisive.
        9. Reserve 9/9 for brief preheating or bringing liquid to a boil, not for sustained cooking.
        10. If a step says to bring something to a boil and then simmer, split it into separate steps or state the heat reduction explicitly so the sustained stovetop heat is lower than the initial boil.
        11. For onions, garlic and other aromatics, prefer moderate heat unless the text explicitly calls for hard browning.
        12. If a step needs two distinct heat phases, prefer splitting it into two steps so each step has one clear working heat.
        13. The structured heat field should reflect the sustained working heat, not a short initial peak, unless the whole step is truly only a brief high-heat action.
        Recipe JSON:
        ${JSON.stringify(recipe)}
      `;
      const parsedData = await generateAIContent(DEFAULT_STRUCTURED_MODEL, prompt, STEP_REPAIR_SCHEMA);
      return res.json({
        recipe: {
          ...recipe,
          steps: parsedData.steps,
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
        - Vaer konservativ med varme. 9/9 er kun til kort opkog eller kort forvarmning, ikke stabil arbejdsvarme.
        - Hvis noget skal koges op og derefter koge videre, saa beskriv nedjusteringen tydeligt eller del det i to trin.
        - Loeg, hvidloeg og andre aromater skal som udgangspunkt ikke have unodigt haard varme.
        - Hvis et trin har to tydelige varmefaser, saa foretraek to trin frem for en enkelt vag varmeangivelse.
        Opskrift JSON:
        ${JSON.stringify(recipe)}
      `;
      const parsedData = await generateAIContent(DEFAULT_STRUCTURED_MODEL, prompt, RECIPE_SCHEMA);
      return res.json({ recipe: { ...recipe, ...parsedData, title: recipe.title, id: recipe.id, lastUsed: new Date().toISOString() } });
    } catch (error) {
      console.error('AI Fill Rest Error:', error);
      const failure = toAiErrorResponse(error, '/api/ai/fill-rest');
      return res.status(failure.status).json(failure.body);
    }
  });

  app.post('/api/ai/generate-tips', async (req, res) => {
    const { recipe } = req.body;
    if (!recipe) return res.status(400).json({ error: 'recipe is required' });
    try {
      const prompt = `Giv mig 3-5 avancerede tips, tricks, teknikker eller overvejelser til denne opskrift: \"${recipe.title}\". Returner et JSON objekt med en enkelt nøgle \"tipsAndTricks\" som er et array af strings.`;
      const schema = { type: Type.OBJECT, properties: { tipsAndTricks: { type: Type.ARRAY, items: { type: Type.STRING } } } };
      const parsedData = await generateAIContent(DEFAULT_STRUCTURED_MODEL, prompt, schema);
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
        Du er en noegtern ernæringsassistent.
        Lav et vejledende makro- og kcal-estimat for hele opskriften ud fra ingredienslisten.
        Returner kun JSON, som matcher schemaet.
        Regn per 100 g og per portion.
        Brug recipe.servings som portionsantal.
        Hvis enkelte maengder eller enheder er uklare, lav konservative koekkenantagelser og forklar dem kort i rationale.
        Brug nutritionAttachment kun som ekstra reference, hvis den findes. Ingredienslisten er stadig primaer kilde.
        Match tonen til denne stilinstruktion: ${styleInstruction}
        Confidence skal vaere en af: high, medium, low.
        ingredientBreakdown skal indeholde ALLE ingredienser fra recipe.ingredients noejagtigt en gang hver.
        ingredientName skal kopieres direkte fra recipe.ingredients[].name og maa ikke omskrives eller grupperes.
        proteinGrams, fatGrams og carbsGrams i ingredientBreakdown skal vaere hele ingrediensens bidrag i hele opskriften, ikke per 100 g.
        Summen af ingredientBreakdown skal passe nogenlunde med totals for hele opskriften.
        Medregn ogsaa smaa ingredienser som olie, smør, løg, hvidløg, bouillon, mel, sukker, krydderier, fløde, smørklatter og lignende.
        Hvis noget er uklart, skal ingrediensen stadig med i ingredientBreakdown med et konservativt estimat og en note.
        ${missingIngredients.length > 0 ? `Du mangler specifikt at medregne disse ingredienser fra forrige forsøg: ${missingIngredients.join(', ')}.` : ''}
        Opskrift JSON:
        ${JSON.stringify(recipe)}
      `;

      let normalizedEstimate = normalizeNutritionEstimate(
        await generateAIContent(DEFAULT_STRUCTURED_MODEL, buildPrompt(), NUTRITION_ESTIMATE_SCHEMA),
        recipe,
      );

      if (normalizedEstimate.omittedIngredients.length > 0) {
        normalizedEstimate = normalizeNutritionEstimate(
          await generateAIContent(DEFAULT_STRUCTURED_MODEL, buildPrompt(normalizedEstimate.omittedIngredients), NUTRITION_ESTIMATE_SCHEMA),
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
      const prompt = `Du er en ekspertkok. Tilpas følgende opskrift så den passer til profilen: "${prefix}".
      Profilerne betyder:
      - [Gourmet] -> Gastronomisk perfekt, avancerede teknikker, anretning i fokus.
      - [Autentisk] -> Traditionelle metoder og ingredienser.
      - [Den hurtige] -> Hurtigere og mere praktisk uden at miste kvaliteten helt.
      - [Begynderen] -> Simple trin og lav kompleksitet.
      - [Babyvenlig 0/1 år] -> Tilpasset de mindste og sundhedsstyrelsens retningslinjer.
      - [Børnevenlig 1/3 år] -> Børnevenlige smage og passende tekstur.
      - [Spice it up] -> Mere smag og krydderi.
      Opskrift JSON:
      ${JSON.stringify(recipe, null, 2)}`;
      const parsedData = await generateAIContent(DEFAULT_STRUCTURED_MODEL, prompt, RECIPE_SCHEMA);
      return res.json({ recipe: { ...recipe, ...parsedData } });
    } catch (error) {
      console.error('AI Apply Prefix Error:', error);
      const failure = toAiErrorResponse(error, '/api/ai/apply-prefix');
      return res.status(failure.status).json(failure.body);
    }
  });

  app.post('/api/ai/import', async (req, res) => {
    const { sourceType, textContent, isStructuredData, fileData, level } = req.body;
    if (!sourceType || !['url', 'text', 'file', 'image'].includes(sourceType)) {
      return res.status(400).json({ error: 'sourceType is required' });
    }

    const styleInstruction = getLevelStyleInstruction(level, 'import');
    const sharedRules = `
      Return the recipe in Danish.
      Group ingredients by their component in the recipe (e.g., 'Til saucen', 'Til dejen', 'Til salaten'). If there are no specific components, group them by logical Danish categories like 'Grøntsager', 'Kød', 'Mejeri', 'Krydderier', 'Tørvarer'.
      Convert English/US metrics to Danish metrics.
      Do not repeat ingredient amounts or heat levels in step text if they already exist in structured fields.
      Extract heat info into the 'heat' property and ALWAYS convert it to a 1-9 induction scale.
      Extract specific timers into the 'timer' property.
      Extract the servings unit into 'servingsUnit'.
      Match tone and detail level to this style instruction: ${styleInstruction}
    `;

    try {
      if ((sourceType === 'url' || sourceType === 'text') && typeof textContent === 'string') {
        const prompt = isStructuredData
          ? `Extract the recipe from this JSON-LD/Microdata. ${sharedRules}\nJSON data: ${textContent}`
          : `Extract the recipe from this text. Focus on the main recipe content and ignore ads, navigation, and unrelated sections. ${sharedRules}\nContent: ${textContent.substring(0, 40000)}`;
        const parsedData = await generateAIContent(IMPORT_MODEL, prompt, RECIPE_SCHEMA);
        return res.json({ parsedData });
      }

      if ((sourceType === 'file' || sourceType === 'image') && fileData?.data && fileData?.mimeType) {
        const prompt = `Extract the recipe from this document or image. ${sharedRules}`;
        const result = await getAiClient().models.generateContent({
          model: IMPORT_MODEL,
          contents: [{ parts: [
            { inlineData: { data: fileData.data, mimeType: fileData.mimeType } },
            { text: prompt },
          ] }],
          config: {
            responseMimeType: 'application/json',
            responseSchema: RECIPE_SCHEMA,
          },
        });
        const responseText = extractTextFromAiResponse(result, `import ${sourceType}`);
        const parsedData = parseAiJsonResponse(responseText, `import ${sourceType}`);
        return res.json({ parsedData });
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

    try {
      const extracted = await fetchRecipeSource(url);
      if (!extracted.json) {
        return res.status(422).json({ error: 'Siden har ikke struktureret opskriftdata, der kan grundimporteres direkte.' });
      }

      const recipe = parseStructuredRecipeToRecipe(extracted.json, { sourceUrl: url });
      return res.json({ recipe });
    } catch (error: any) {
      if (error instanceof DirectParseError) {
        return res.status(422).json({ error: error.message });
      }
      if (error instanceof HttpError) {
        return res.status(error.status).json({ error: error.message });
      }
      console.error('Direct Parse Error:', error);
      return res.status(500).json({ error: 'Direkte grundimport fejlede.' });
    }
  });

  app.get('/api/fetch-url', async (req, res) => {
    const { url } = req.query;

    try {
      return res.json(await fetchRecipeSource(String(url)));
    } catch (error: any) {
      if (error instanceof HttpError) {
        return res.status(error.status).json({ error: error.message });
      }
      console.error('Fetch URL Error:', error);
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


