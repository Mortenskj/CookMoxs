import { useEffect, useState } from 'react';
import {
  getRecipeNutritionEstimateVisible,
  RECIPE_NUTRITION_ESTIMATE_VISIBLE_CHANGED_EVENT,
  setRecipeNutritionEstimateVisible,
} from '../services/nutritionPreferenceService';

export function useRecipeNutritionEstimateVisible() {
  const [visible, setVisible] = useState<boolean>(() => getRecipeNutritionEstimateVisible());

  useEffect(() => {
    const syncFromStorage = () => {
      setVisible(getRecipeNutritionEstimateVisible());
    };

    const syncFromCustomEvent = () => {
      syncFromStorage();
    };

    window.addEventListener('storage', syncFromStorage);
    window.addEventListener(RECIPE_NUTRITION_ESTIMATE_VISIBLE_CHANGED_EVENT, syncFromCustomEvent);

    return () => {
      window.removeEventListener('storage', syncFromStorage);
      window.removeEventListener(RECIPE_NUTRITION_ESTIMATE_VISIBLE_CHANGED_EVENT, syncFromCustomEvent);
    };
  }, []);

  const updateVisible = (nextVisible: boolean) => {
    setRecipeNutritionEstimateVisible(nextVisible);
    setVisible(nextVisible);
  };

  return { visible, setVisible: updateVisible };
}
