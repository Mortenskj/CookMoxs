import {
  createNutritionProvenance,
  type NutritionProvider,
  type NutritionProviderProductCandidate,
} from './nutritionProviderTypes';

export const createMockNutritionProvider = (): NutritionProvider => ({
  descriptor: {
    id: 'mock',
    label: 'Mock Nutrition Provider',
    capabilities: {
      barcodeLookup: true,
      textSearch: true,
    },
  },
  async lookupByBarcode(barcode: string) {
    const normalizedBarcode = barcode.trim();
    const provenance = createNutritionProvenance({
      providerId: 'mock',
      providerLabel: 'Mock Nutrition Provider',
      confidence: 'low',
      isFallback: true,
      notes: 'Mock data for local development and feature-flagged verification.',
    });

    const item: NutritionProviderProductCandidate = {
      providerProductId: `mock-${normalizedBarcode || 'sample'}`,
      barcode: normalizedBarcode || '0000000000000',
      title: normalizedBarcode ? `Mock product ${normalizedBarcode}` : 'Mock product',
      brand: 'CookMoxs Mock',
      nutrition: {
        energyKcalPer100g: 215,
        fatPer100g: 9,
        carbsPer100g: 24,
        proteinPer100g: 7,
      },
      provenance,
    };

    return {
      items: [item],
      provenance,
    };
  },
  async searchProducts(query: string, limit = 5) {
    const normalizedQuery = query.trim() || 'sample';
    const provenance = createNutritionProvenance({
      providerId: 'mock',
      providerLabel: 'Mock Nutrition Provider',
      confidence: 'low',
      isFallback: true,
      notes: 'Mock text search data for local development and verification.',
    });

    return {
      items: Array.from({ length: Math.max(1, Math.min(limit, 3)) }, (_, index) => ({
        providerProductId: `mock-search-${normalizedQuery}-${index + 1}`,
        barcode: `00000000000${index + 1}`,
        title: `Mock search result ${index + 1} for ${normalizedQuery}`,
        brand: 'CookMoxs Mock',
        nutrition: {
          energyKcalPer100g: 180 + index * 15,
          fatPer100g: 6 + index,
          carbsPer100g: 20 + index * 2,
          proteinPer100g: 5 + index,
        },
        provenance,
      })),
      provenance,
    };
  },
});
