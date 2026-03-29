import { STORAGE_KEYS } from '../config/storageKeys';

export const NUTRITION_TOOLS_CHANGED_EVENT = 'cookmoxs:nutrition-tools-changed';
export const RECIPE_NUTRITION_EXPANDED_BY_DEFAULT_CHANGED_EVENT = 'cookmoxs:recipe-nutrition-expanded-by-default-changed';
export const DEFAULT_NUTRITION_TOOLS_ENABLED = true;
export const DEFAULT_RECIPE_NUTRITION_EXPANDED_BY_DEFAULT = false;

export function getNutritionToolsEnabled() {
  if (typeof window === 'undefined') {
    return DEFAULT_NUTRITION_TOOLS_ENABLED;
  }

  const stored = window.localStorage.getItem(STORAGE_KEYS.nutritionToolsEnabled);
  if (stored === null) {
    return DEFAULT_NUTRITION_TOOLS_ENABLED;
  }

  return stored === 'true';
}

export function setNutritionToolsEnabled(enabled: boolean) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(STORAGE_KEYS.nutritionToolsEnabled, String(enabled));
  window.dispatchEvent(new CustomEvent(NUTRITION_TOOLS_CHANGED_EVENT, { detail: enabled }));
}

export function getRecipeNutritionExpandedByDefault() {
  if (typeof window === 'undefined') {
    return DEFAULT_RECIPE_NUTRITION_EXPANDED_BY_DEFAULT;
  }

  const stored = window.localStorage.getItem(STORAGE_KEYS.recipeNutritionExpandedByDefault);
  if (stored === null) {
    return DEFAULT_RECIPE_NUTRITION_EXPANDED_BY_DEFAULT;
  }

  return stored === 'true';
}

export function setRecipeNutritionExpandedByDefault(expanded: boolean) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(STORAGE_KEYS.recipeNutritionExpandedByDefault, String(expanded));
  window.dispatchEvent(new CustomEvent(RECIPE_NUTRITION_EXPANDED_BY_DEFAULT_CHANGED_EVENT, { detail: expanded }));
}
