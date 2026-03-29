import { useEffect, useState } from 'react';
import {
  getRecipeNutritionExpandedByDefault,
  RECIPE_NUTRITION_EXPANDED_BY_DEFAULT_CHANGED_EVENT,
  setRecipeNutritionExpandedByDefault,
} from '../services/nutritionPreferenceService';

export function useRecipeNutritionExpandedByDefault() {
  const [expandedByDefault, setExpandedByDefault] = useState<boolean>(() => getRecipeNutritionExpandedByDefault());

  useEffect(() => {
    const syncFromStorage = () => {
      setExpandedByDefault(getRecipeNutritionExpandedByDefault());
    };

    const syncFromCustomEvent = () => {
      syncFromStorage();
    };

    window.addEventListener('storage', syncFromStorage);
    window.addEventListener(RECIPE_NUTRITION_EXPANDED_BY_DEFAULT_CHANGED_EVENT, syncFromCustomEvent);

    return () => {
      window.removeEventListener('storage', syncFromStorage);
      window.removeEventListener(RECIPE_NUTRITION_EXPANDED_BY_DEFAULT_CHANGED_EVENT, syncFromCustomEvent);
    };
  }, []);

  const updateExpandedByDefault = (nextExpandedByDefault: boolean) => {
    setRecipeNutritionExpandedByDefault(nextExpandedByDefault);
    setExpandedByDefault(nextExpandedByDefault);
  };

  return { expandedByDefault, setExpandedByDefault: updateExpandedByDefault };
}
