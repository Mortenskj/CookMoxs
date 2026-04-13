import { useEffect, useState } from 'react';
import {
  getNutritionToolsEnabled,
  NUTRITION_TOOLS_CHANGED_EVENT,
  setNutritionToolsEnabled,
} from '../services/nutritionPreferenceService';

export function useNutritionToolsEnabled() {
  const [enabled, setEnabled] = useState<boolean>(() => getNutritionToolsEnabled());

  useEffect(() => {
    const syncFromStorage = () => {
      setEnabled(getNutritionToolsEnabled());
    };

    const syncFromCustomEvent = () => {
      syncFromStorage();
    };

    window.addEventListener('storage', syncFromStorage);
    window.addEventListener(NUTRITION_TOOLS_CHANGED_EVENT, syncFromCustomEvent);

    return () => {
      window.removeEventListener('storage', syncFromStorage);
      window.removeEventListener(NUTRITION_TOOLS_CHANGED_EVENT, syncFromCustomEvent);
    };
  }, []);

  const updateEnabled = (nextEnabled: boolean) => {
    setNutritionToolsEnabled(nextEnabled);
    setEnabled(nextEnabled);
  };

  return { enabled, setEnabled: updateEnabled };
}
