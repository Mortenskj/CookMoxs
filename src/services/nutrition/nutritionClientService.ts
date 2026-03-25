import type { NutritionLookupResult } from './nutritionLookupService';

interface NutritionStatusResponse {
  enabled: boolean;
  envKey: string;
  primaryProviderId: string;
  fallbackProviderId: string;
  providers: Array<{
    id: string;
    label: string;
    capabilities: {
      barcodeLookup: boolean;
      textSearch: boolean;
    };
  }>;
}

async function request<T>(url: string): Promise<T> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new Error('Du er offline. Nutritionsoegning kraever internetforbindelse.');
  }

  let response: Response;
  try {
    response = await fetch(url);
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to fetch');
  }

  const data = await response.json().catch(() => '__MALFORMED_RESPONSE__');

  if (!response.ok) {
    if (data && typeof data === 'object' && 'error' in data && typeof data.error === 'string') {
      throw new Error(data.error);
    }
    throw new Error('Der opstod en fejl under nutritionsoegningen.');
  }

  if (data === '__MALFORMED_RESPONSE__') {
    throw new Error('Vi fik et ugyldigt svar tilbage fra nutritionmodulet.');
  }

  return data as T;
}

export async function getNutritionStatus() {
  return request<NutritionStatusResponse>('/api/nutrition/status');
}

export async function lookupNutritionBarcode(barcode: string) {
  return request<NutritionLookupResult>(`/api/nutrition/barcode/${encodeURIComponent(barcode)}`);
}

export async function searchNutritionProductsByText(query: string, limit = 5) {
  return request<NutritionLookupResult>(`/api/nutrition/search?q=${encodeURIComponent(query)}&limit=${encodeURIComponent(String(limit))}`);
}
