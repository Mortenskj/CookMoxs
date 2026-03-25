import { isNutritionModuleEnabled } from '../../config/nutritionModule';
import { getNutritionProvider } from './nutritionProviderRegistry';
import type {
  NutritionProviderNutritionFacts,
  NutritionProviderProductCandidate,
  NutritionSourceProvenance,
} from './nutritionProviderTypes';

export interface NutritionLookupItem {
  id: string;
  title: string;
  brand?: string;
  barcode?: string;
  imageUrl?: string;
  nutrition?: NutritionProviderNutritionFacts;
  provenance: NutritionSourceProvenance;
}

export interface NutritionLookupResult {
  mode: 'barcode' | 'text_search';
  query: string;
  items: NutritionLookupItem[];
  provenance: NutritionSourceProvenance;
}

export class NutritionLookupError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const mapCandidate = (candidate: NutritionProviderProductCandidate): NutritionLookupItem => ({
  id: candidate.providerProductId,
  title: candidate.title,
  brand: candidate.brand,
  barcode: candidate.barcode,
  imageUrl: candidate.imageUrl,
  nutrition: candidate.nutrition,
  provenance: candidate.provenance,
});

const assertNutritionEnabled = () => {
  if (!isNutritionModuleEnabled()) {
    throw new NutritionLookupError(503, 'module_disabled', 'Nutritionmodulet er ikke aktivt endnu.');
  }
};

const normalizeBarcode = (barcode: string) => {
  const normalized = barcode.replace(/\s+/g, '').trim();
  if (!/^\d{8,14}$/.test(normalized)) {
    throw new NutritionLookupError(400, 'invalid_barcode', 'Stregkoden skal vaere 8 til 14 cifre.');
  }
  return normalized;
};

const normalizeQuery = (query: string) => {
  const normalized = query.trim();
  if (normalized.length < 2) {
    throw new NutritionLookupError(400, 'invalid_query', 'Soegningen skal vaere mindst 2 tegn.');
  }
  return normalized;
};

const normalizeLookupFailure = (error: unknown, fallbackMessage: string) => {
  if (error instanceof NutritionLookupError) {
    throw error;
  }

  throw new NutritionLookupError(502, 'provider_error', fallbackMessage);
};

export async function lookupNutritionByBarcode(barcode: string): Promise<NutritionLookupResult> {
  assertNutritionEnabled();
  const normalizedBarcode = normalizeBarcode(barcode);

  try {
    const providerResponse = await getNutritionProvider().lookupByBarcode(normalizedBarcode);
    return {
      mode: 'barcode',
      query: normalizedBarcode,
      items: providerResponse.items.map(mapCandidate),
      provenance: providerResponse.provenance,
    };
  } catch (error) {
    normalizeLookupFailure(error, 'Kunne ikke hente produktdata for stregkoden lige nu.');
  }
}

export async function searchNutritionProducts(query: string, limit = 10): Promise<NutritionLookupResult> {
  assertNutritionEnabled();
  const normalizedQuery = normalizeQuery(query);

  try {
    const providerResponse = await getNutritionProvider().searchProducts(normalizedQuery, limit);
    return {
      mode: 'text_search',
      query: normalizedQuery,
      items: providerResponse.items.map(mapCandidate),
      provenance: providerResponse.provenance,
    };
  } catch (error) {
    normalizeLookupFailure(error, 'Kunne ikke soege efter produktdata lige nu.');
  }
}
