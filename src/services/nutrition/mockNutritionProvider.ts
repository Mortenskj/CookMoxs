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
      textSearch: false,
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
});
