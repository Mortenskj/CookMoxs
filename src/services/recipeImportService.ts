import { Folder, Recipe } from '../types';
import { DEFAULT_FOLDER_NAME, findDefaultFolder, getCanonicalDefaultFolderId } from './defaultFolderService';
import { normalizeRecipeForCookMode } from './recipeStepNormalization';

/* ── Summary sanitizer ── */

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function splitIntoSentences(value: string): string[] {
  return value
    .split(/(?<=[.!?])\s+/)
    .map((s) => normalizeWhitespace(s))
    .filter(Boolean);
}

function isLowValueSummarySentence(sentence: string): boolean {
  const lower = sentence.toLowerCase();
  const bannedFragments = [
    'velbekomme',
    'god fornøjelse',
    'nyd dit måltid',
    'nyd denne',
    'denne ret er',
    'her er opskriften',
    'god madlyst',
    'bon appétit',
  ];
  return bannedFragments.some((fragment) => lower.includes(fragment));
}

function sanitizeImportedSummary(summary: unknown): string {
  if (typeof summary !== 'string') return '';

  const clean = normalizeWhitespace(summary);
  if (!clean) return '';

  const sentences = splitIntoSentences(clean);
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const sentence of sentences) {
    const normalized = sentence.toLowerCase();
    if (seen.has(normalized)) continue;
    if (isLowValueSummarySentence(sentence)) continue;
    seen.add(normalized);
    unique.push(sentence);
  }

  const result = unique.slice(0, 2).join(' ').trim();
  if (!result) return '';
  if (result.length > 180) return result.slice(0, 177).trimEnd() + '...';

  return result;
}

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
    summary: sanitizeImportedSummary(parsedData.summary),
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
      amount: typeof ing.amount === 'number' ? ing.amount : null,
      amountMin: typeof ing.amountMin === 'number' ? ing.amountMin : null,
      amountMax: typeof ing.amountMax === 'number' ? ing.amountMax : null,
      amountText: typeof ing.amountText === 'string' ? ing.amountText.trim() : '',
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
