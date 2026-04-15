import { Folder, Recipe } from '../types';
import { DEFAULT_FOLDER_NAME, findDefaultFolder, getCanonicalDefaultFolderId } from './defaultFolderService';
import { normalizeRecipeForCookMode } from './recipeStepNormalization';

interface BuildRecipeOptions {
  parsedData: any;
  sourceType: 'url' | 'text' | 'file' | 'image';
  originalContent?: string;
  folders: Folder[];
  userId?: string;
}

export class EmptyRecipeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EmptyRecipeError';
  }
}

export function buildRecipeFromImport({ parsedData, sourceType, originalContent, folders, userId }: BuildRecipeOptions): Recipe {
  const defaultFolder = findDefaultFolder(folders, userId || 'local') || folders[0];

  const ingredients = (parsedData.ingredients || []).filter((ing: any) => ing?.name?.trim());
  const steps = (parsedData.steps || []).filter((s: any) => s?.text?.trim());
  const title = (parsedData.title || '').trim();

  if (!title && ingredients.length === 0 && steps.length === 0) {
    throw new EmptyRecipeError('AI returnerede en tom opskrift. Prøv at kopiere teksten ind manuelt eller brug et andet link.');
  }

  return normalizeRecipeForCookMode({
    id: Date.now().toString(),
    title: title || 'Uden navn',
    summary: parsedData.summary || '',
    recipeType: parsedData.recipeType || '',
    categories: parsedData.categories || [],
    folder: defaultFolder?.name || DEFAULT_FOLDER_NAME,
    folderId: defaultFolder?.id || getCanonicalDefaultFolderId(userId || 'local'),
    isSaved: false,
    notes: '',
    servings: parsedData.servings || 4,
    servingsUnit: parsedData.servingsUnit || 'personer',
    ingredients: ingredients.map((ing: any, i: number) => ({
      id: `ing-${i}`,
      amount: ing.amount || null,
      unit: ing.unit || '',
      name: ing.name.trim(),
      group: ing.group || 'Andre',
      locked: ing.locked || false,
    })),
    steps: steps.map((step: any, i: number) => ({
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
