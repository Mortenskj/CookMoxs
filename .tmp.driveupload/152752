import type { NutritionProviderId } from '../services/nutrition/nutritionProviderTypes';

export const NUTRITION_MODULE_ENV_KEY = 'always_on';
export const NUTRITION_PRIMARY_PROVIDER_ID: NutritionProviderId = 'open_food_facts';
export const NUTRITION_FALLBACK_PROVIDER_ID: NutritionProviderId = 'mock';

export const isNutritionModuleEnabled = () => true;

export const getNutritionModuleConfig = () => ({
  enabled: isNutritionModuleEnabled(),
  envKey: NUTRITION_MODULE_ENV_KEY,
  primaryProviderId: NUTRITION_PRIMARY_PROVIDER_ID,
  fallbackProviderId: NUTRITION_FALLBACK_PROVIDER_ID,
});
