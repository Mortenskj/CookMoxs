import { useEffect, useState } from 'react';
import {
  getRecipeNutritionVisible,
  RECIPE_NUTRITION_VISIBLE_CHANGED_EVENT,
  setRecipeNutritionVisible,
} from '../services/nutritionPreferenceService';

export function useRecipeNutritionVisible() {
  const [visible, setVisible] = useState<boolean>(() => getRecipeNutritionVisible());

  useEffect(() => {
    const syncFromStorage = () => {
      setVisible(getRecipeNutritionVisible());
    };

    const syncFromCustomEvent = () => {
      syncFromStorage();
    };

    window.addEventListener('storage', syncFromStorage);
    window.addEventListener(RECIPE_NUTRITION_VISIBLE_CHANGED_EVENT, syncFromCustomEvent);

    return () => {
      window.removeEventListener('storage', syncFromStorage);
      window.removeEventListener(RECIPE_NUTRITION_VISIBLE_CHANGED_EVENT, syncFromCustomEvent);
    };
  }, []);

  const updateVisible = (nextVisible: boolean) => {
    setRecipeNutritionVisible(nextVisible);
    setVisible(nextVisible);
  };

  return { visible, setVisible: updateVisible };
}
