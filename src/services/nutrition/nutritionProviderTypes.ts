export type NutritionProviderId = 'open_food_facts' | 'mock';
export type NutritionConfidence = 'high' | 'medium' | 'low';

export interface NutritionSourceProvenance {
  providerId: NutritionProviderId;
  providerLabel: string;
  sourceUrl?: string;
  fetchedAt: string;
  confidence: NutritionConfidence;
  isFallback: boolean;
  notes?: string;
}

export interface NutritionProviderNutritionFacts {
  energyKcalPer100g?: number | null;
  fatPer100g?: number | null;
  carbsPer100g?: number | null;
  proteinPer100g?: number | null;
}

export interface NutritionProviderProductCandidate {
  providerProductId: string;
  barcode?: string;
  title: string;
  brand?: string;
  imageUrl?: string;
  nutrition?: NutritionProviderNutritionFacts;
  provenance: NutritionSourceProvenance;
}

export interface NutritionProviderResponse {
  items: NutritionProviderProductCandidate[];
  provenance: NutritionSourceProvenance;
}

export interface NutritionProviderCapabilities {
  barcodeLookup: boolean;
  textSearch: boolean;
}

export interface NutritionProviderDescriptor {
  id: NutritionProviderId;
  label: string;
  capabilities: NutritionProviderCapabilities;
}

export interface NutritionProvider {
  descriptor: NutritionProviderDescriptor;
  lookupByBarcode(barcode: string): Promise<NutritionProviderResponse>;
  searchProducts(query: string, limit?: number): Promise<NutritionProviderResponse>;
}

export const createNutritionProvenance = ({
  providerId,
  providerLabel,
  sourceUrl,
  confidence,
  isFallback,
  notes,
}: Omit<NutritionSourceProvenance, 'fetchedAt'>): NutritionSourceProvenance => ({
  providerId,
  providerLabel,
  sourceUrl,
  confidence,
  isFallback,
  notes,
  fetchedAt: new Date().toISOString(),
});
