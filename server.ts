import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import axios from 'axios';
import * as cheerio from 'cheerio';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { GoogleGenAI, Type } from '@google/genai';
import { getNutritionModuleConfig } from './src/config/nutritionModule.ts';
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

function getAiClient() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured on the server');
  }
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}

async function generateAIContent(model: string, prompt: string, responseSchema: any) {
  const result = await getAiClient().models.generateContent({
    model,
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      responseMimeType: 'application/json',
      responseSchema,
    },
  });
  return JSON.parse(result.text);
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

function isPrivateHostname(hostname: string) {
  const host = hostname.toLowerCase();
  if (['localhost', '127.0.0.1', '0.0.0.0', '::1'].includes(host)) return true;
  if (/^10\./.test(host)) return true;
  if (/^192\.168\./.test(host)) return true;
  if (/^169\.254\./.test(host)) return true;
  const match172 = host.match(/^172\.(\d+)\./);
  if (match172) {
    const second = Number(match172[1]);
    if (second >= 16 && second <= 31) return true;
  }
  return false;
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

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new HttpError(400, 'URL er ugyldig');
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw new HttpError(400, 'Kun http og https er tilladt');
  }
  if (isPrivateHostname(parsedUrl.hostname)) {
    throw new HttpError(400, 'Private eller lokale adresser er ikke tilladt');
  }

  try {
    const response = await axios.get(parsedUrl.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'da-DK,da;q=0.9,en-US;q=0.8,en;q=0.7',
      },
      timeout: 10000,
    });

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
  } catch (error: any) {
    console.error('Error fetching URL:', error.message);
    if (axios.isAxiosError(error) && error.code === 'ECONNABORTED') {
      throw new HttpError(504, 'Kilden brugte for lang tid paa at svare');
    }
    if (axios.isAxiosError(error) && (error.code === 'ENOTFOUND' || error.code === 'EAI_AGAIN' || error.code === 'ECONNREFUSED')) {
      throw new HttpError(502, 'Kunne ikke oprette forbindelse til kilden');
    }
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
        Recipe JSON:
        ${JSON.stringify(recipe)}
      `;
      const parsedData = await generateAIContent('gemini-3.1-pro-preview', prompt, RECIPE_SCHEMA);
      return res.json({ recipe: { ...recipe, ...parsedData, id: recipe.id, lastUsed: new Date().toISOString() } });
    } catch (err: any) {
      console.error('AI Adjust Error:', err);
      return res.status(500).json({ error: err?.message || 'Kunne ikke tilpasse opskriften' });
    }
  });

  app.post('/api/ai/generate-steps', async (req, res) => {
    const { recipe, level } = req.body;
    if (!recipe) return res.status(400).json({ error: 'recipe is required' });
    try {
      const styleInstruction = getLevelStyleInstruction(level, 'steps');
      const prompt = `
        You are an expert chef. Generate or enhance the recipe steps and missing metadata.
        Rules:
        1. Improve existing steps instead of rewriting good ones unnecessarily.
        2. Add oven preheat only when contextually appropriate.
        3. Use heat values on a 1-9 induction scale.
        4. Extract timers into the timer property.
        5. Provide aiRationale.
        6. Group ingredients into meaningful Danish groups.
        7. Match the communication style to this instruction: ${styleInstruction}
        Recipe JSON:
        ${JSON.stringify(recipe)}
      `;
      const parsedData = await generateAIContent('gemini-3-flash-preview', prompt, RECIPE_SCHEMA);
      return res.json({ recipe: { ...recipe, ...parsedData, id: recipe.id, lastUsed: new Date().toISOString() } });
    } catch (err: any) {
      console.error('AI Generate Steps Error:', err);
      return res.status(500).json({ error: err?.message || 'Kunne ikke generere fremgangsmåde' });
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
        Opskrift JSON:
        ${JSON.stringify(recipe)}
      `;
      const parsedData = await generateAIContent('gemini-3-flash-preview', prompt, RECIPE_SCHEMA);
      return res.json({ recipe: { ...recipe, ...parsedData, title: recipe.title, id: recipe.id, lastUsed: new Date().toISOString() } });
    } catch (err: any) {
      console.error('AI Fill Rest Error:', err);
      return res.status(500).json({ error: err?.message || 'Kunne ikke udfylde resten' });
    }
  });

  app.post('/api/ai/generate-tips', async (req, res) => {
    const { recipe } = req.body;
    if (!recipe) return res.status(400).json({ error: 'recipe is required' });
    try {
      const prompt = `Giv mig 3-5 avancerede tips, tricks, teknikker eller overvejelser til denne opskrift: \"${recipe.title}\". Returner et JSON objekt med en enkelt nøgle \"tipsAndTricks\" som er et array af strings.`;
      const schema = { type: Type.OBJECT, properties: { tipsAndTricks: { type: Type.ARRAY, items: { type: Type.STRING } } } };
      const parsedData = await generateAIContent('gemini-3-flash-preview', prompt, schema);
      return res.json({ tipsAndTricks: parsedData.tipsAndTricks });
    } catch (err: any) {
      console.error('AI Generate Tips Error:', err);
      return res.status(500).json({ error: err?.message || 'Kunne ikke generere tips' });
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
      const parsedData = await generateAIContent('gemini-3-flash-preview', prompt, RECIPE_SCHEMA);
      return res.json({ recipe: { ...recipe, ...parsedData } });
    } catch (err: any) {
      console.error('AI Apply Prefix Error:', err);
      return res.status(500).json({ error: err?.message || 'Kunne ikke tilpasse opskriften' });
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
        const parsedData = await generateAIContent('gemini-3-flash-preview', prompt, RECIPE_SCHEMA);
        return res.json({ parsedData });
      }

      if ((sourceType === 'file' || sourceType === 'image') && fileData?.data && fileData?.mimeType) {
        const prompt = `Extract the recipe from this document or image. ${sharedRules}`;
        const result = await getAiClient().models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: [{ parts: [
            { inlineData: { data: fileData.data, mimeType: fileData.mimeType } },
            { text: prompt },
          ] }],
          config: {
            responseMimeType: 'application/json',
            responseSchema: RECIPE_SCHEMA,
          },
        });
        const parsedData = JSON.parse(result.text);
        return res.json({ parsedData });
      }

      return res.status(400).json({ error: 'Manglende indhold til import' });
    } catch (err: any) {
      console.error('AI Import Error:', err);
      return res.status(500).json({ error: err?.message || 'Kunne ikke importere opskriften' });
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
  });
}

console.log(`[startup] GEMINI_API_KEY is ${process.env.GEMINI_API_KEY ? 'configured (' + process.env.GEMINI_API_KEY.slice(0, 6) + '...)' : 'MISSING'}`);
startServer();
