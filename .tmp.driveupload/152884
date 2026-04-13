import { STORAGE_KEYS } from '../config/storageKeys';

export const NUTRITION_TOOLS_CHANGED_EVENT = 'cookmoxs:nutrition-tools-changed';
export const DEFAULT_NUTRITION_TOOLS_ENABLED = true;

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
