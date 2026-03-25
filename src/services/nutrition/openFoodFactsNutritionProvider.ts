import axios from 'axios';
import {
  createNutritionProvenance,
  type NutritionProvider,
  type NutritionProviderProductCandidate,
} from './nutritionProviderTypes';

const OPEN_FOOD_FACTS_API_BASE = 'https://world.openfoodfacts.org/api/v2';
const OPEN_FOOD_FACTS_SEARCH_BASE = 'https://world.openfoodfacts.org/cgi/search.pl';
const OPEN_FOOD_FACTS_FIELDS = [
  'code',
  'product_name',
  'brands',
  'image_front_url',
  'nutriments',
].join(',');

const OPEN_FOOD_FACTS_USER_AGENT = 'CookMoxs/1.1.1 (nutrition-module-disabled@example.invalid)';

type OpenFoodFactsProductResponse = {
  status?: number;
  product?: {
    code?: string;
    product_name?: string;
    brands?: string;
    image_front_url?: string;
    nutriments?: Record<string, number | string | null | undefined>;
  };
};

type OpenFoodFactsSearchResponse = {
  products?: Array<OpenFoodFactsProductResponse['product']>;
};

const toNumber = (value: unknown) => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

export const createOpenFoodFactsNutritionProvider = (): NutritionProvider => ({
  descriptor: {
    id: 'open_food_facts',
    label: 'Open Food Facts',
    capabilities: {
      barcodeLookup: true,
      textSearch: true,
    },
  },
  async lookupByBarcode(barcode: string) {
    const normalizedBarcode = barcode.trim();
    const sourceUrl = `${OPEN_FOOD_FACTS_API_BASE}/product/${encodeURIComponent(normalizedBarcode)}.json?fields=${encodeURIComponent(OPEN_FOOD_FACTS_FIELDS)}`;
    const response = await axios.get<OpenFoodFactsProductResponse>(sourceUrl, {
      headers: {
        'User-Agent': OPEN_FOOD_FACTS_USER_AGENT,
        Accept: 'application/json',
      },
      timeout: 10000,
    });

    const product = response.data?.product;
    const hasProduct = response.data?.status === 1 && product?.product_name;
    const provenance = createNutritionProvenance({
      providerId: 'open_food_facts',
      providerLabel: 'Open Food Facts',
      sourceUrl,
      confidence: hasProduct ? 'medium' : 'low',
      isFallback: false,
      notes: hasProduct ? 'Open Food Facts product data.' : 'No product was returned for the requested barcode.',
    });

    const item: NutritionProviderProductCandidate | null = hasProduct ? {
      providerProductId: product?.code || normalizedBarcode,
      barcode: product?.code || normalizedBarcode,
      title: product?.product_name || 'Unknown product',
      brand: product?.brands || undefined,
      imageUrl: product?.image_front_url || undefined,
      nutrition: {
        energyKcalPer100g: toNumber(product?.nutriments?.['energy-kcal_100g']),
        fatPer100g: toNumber(product?.nutriments?.fat_100g),
        carbsPer100g: toNumber(product?.nutriments?.carbohydrates_100g),
        proteinPer100g: toNumber(product?.nutriments?.proteins_100g),
      },
      provenance,
    } : null;

    return {
      items: item ? [item] : [],
      provenance,
    };
  },
  async searchProducts(query: string, limit = 10) {
    const normalizedQuery = query.trim();
    const response = await axios.get<OpenFoodFactsSearchResponse>(OPEN_FOOD_FACTS_SEARCH_BASE, {
      headers: {
        'User-Agent': OPEN_FOOD_FACTS_USER_AGENT,
        Accept: 'application/json',
      },
      params: {
        search_terms: normalizedQuery,
        search_simple: 1,
        action: 'process',
        json: 1,
        page_size: Math.max(1, Math.min(limit, 20)),
        fields: OPEN_FOOD_FACTS_FIELDS,
      },
      timeout: 10000,
    });

    const sourceUrl = response.request?.res?.responseUrl || `${OPEN_FOOD_FACTS_SEARCH_BASE}?search_terms=${encodeURIComponent(normalizedQuery)}`;
    const products = response.data?.products || [];
    const provenance = createNutritionProvenance({
      providerId: 'open_food_facts',
      providerLabel: 'Open Food Facts',
      sourceUrl,
      confidence: products.length > 0 ? 'medium' : 'low',
      isFallback: false,
      notes: products.length > 0 ? 'Open Food Facts text search data.' : 'No products matched the requested search terms.',
    });

    return {
      items: products
        .filter((product): product is NonNullable<OpenFoodFactsProductResponse['product']> => Boolean(product?.product_name))
        .map((product) => ({
          providerProductId: product.code || product.product_name || 'unknown',
          barcode: product.code || undefined,
          title: product.product_name || 'Unknown product',
          brand: product.brands || undefined,
          imageUrl: product.image_front_url || undefined,
          nutrition: {
            energyKcalPer100g: toNumber(product.nutriments?.['energy-kcal_100g']),
            fatPer100g: toNumber(product.nutriments?.fat_100g),
            carbsPer100g: toNumber(product.nutriments?.carbohydrates_100g),
            proteinPer100g: toNumber(product.nutriments?.proteins_100g),
          },
          provenance,
        })),
      provenance,
    };
  },
});
