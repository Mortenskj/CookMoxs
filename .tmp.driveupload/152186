import {
  getNutritionModuleConfig,
  NUTRITION_FALLBACK_PROVIDER_ID,
  NUTRITION_PRIMARY_PROVIDER_ID,
} from '../../config/nutritionModule';
import { createMockNutritionProvider } from './mockNutritionProvider';
import { createOpenFoodFactsNutritionProvider } from './openFoodFactsNutritionProvider';
import type { NutritionProvider, NutritionProviderDescriptor, NutritionProviderId } from './nutritionProviderTypes';

const providers: Record<NutritionProviderId, NutritionProvider> = {
  open_food_facts: createOpenFoodFactsNutritionProvider(),
  mock: createMockNutritionProvider(),
};

export const getNutritionProvider = (providerId: NutritionProviderId = NUTRITION_PRIMARY_PROVIDER_ID) =>
  providers[providerId];

export const getNutritionFallbackProvider = () => providers[NUTRITION_FALLBACK_PROVIDER_ID];

export const getAvailableNutritionProviders = (): NutritionProviderDescriptor[] =>
  Object.values(providers).map((provider) => provider.descriptor);

export const getNutritionProviderStatus = () => {
  const config = getNutritionModuleConfig();

  return {
    enabled: config.enabled,
    envKey: config.envKey,
    primaryProvider: getNutritionProvider().descriptor,
    fallbackProvider: getNutritionFallbackProvider().descriptor,
    availableProviders: getAvailableNutritionProviders(),
  };
};
