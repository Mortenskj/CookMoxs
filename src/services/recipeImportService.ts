import { Folder, Recipe } from '../types';
import { normalizeRecipeForCookMode } from './recipeStepNormalization';

interface BuildRecipeOptions {
  parsedData: any;
  sourceType: 'url' | 'text' | 'file' | 'image';
  originalContent?: string;
  folders: Folder[];
  userId?: string;
}

export function buildRecipeFromImport({ parsedData, sourceType, originalContent, folders, userId }: BuildRecipeOptions): Recipe {
  const defaultFolder = folders.find(f => f.isDefault || f.name === 'Ikke gemte') || folders[0];

  return normalizeRecipeForCookMode({
    id: Date.now().toString(),
    title: parsedData.title || 'Uden navn',
    summary: parsedData.summary || '',
    recipeType: parsedData.recipeType || '',
    categories: parsedData.categories || [],
    folder: defaultFolder?.name || 'Ikke gemte',
    folderId: defaultFolder?.id || `default-un-saved-${userId}`,
    isSaved: false,
    notes: '',
    servings: parsedData.servings || 4,
    servingsUnit: parsedData.servingsUnit || 'personer',
    ingredients: (parsedData.ingredients || []).map((ing: any, i: number) => ({
      id: `ing-${i}`,
      amount: ing.amount || null,
      unit: ing.unit || '',
      name: ing.name || '',
      group: ing.group || 'Andre',
      locked: ing.locked || false,
    })),
    steps: (parsedData.steps || []).map((step: any, i: number) => ({
      id: `step-${i}`,
      text: step.text || '',
      heat: step.heat,
      heatLevel: step.heatLevel,
      heatSource: step.heatSource,
      timer: step.timer,
      reminder: step.reminder,
      relevantIngredients: step.relevantIngredients || [],
    })),
    flavorBoosts: parsedData.flavorBoosts || [],
    pitfalls: parsedData.pitfalls || [],
    hints: parsedData.hints || [],
    substitutions: parsedData.substitutions || [],
    heatGuide: parsedData.heatGuide || [],
    ovenGuide: parsedData.ovenGuide || [],
    kitchenTimeline: parsedData.kitchenTimeline || [],
    sourceUrl: sourceType === 'url' ? originalContent : undefined,
    lastUsed: new Date().toISOString(),
    authorUID: userId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}
