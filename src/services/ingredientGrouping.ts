import type { Ingredient } from '../types';

/**
 * Groups that the AI/import layer falls back to when it has no real culinary
 * subdivision (fars, dej, dressing, rørt fyld, single-mass recipes in general).
 * We normalize before comparison: lowercase + trimmed.
 */
const GENERIC_GROUP_LABELS = new Set([
  '',
  'andre',
  'diverse',
  'ingredienser',
  'øvrigt',
  'ovrigt',
]);

function normalizeLabel(value: string | undefined | null): string {
  return (value || '').trim().toLowerCase();
}

/**
 * Returns true when all ingredients share a single generic group label
 * (or no group at all). In that case the caller should render a flat list
 * instead of a synthetic type-group header.
 */
export function hasSingleGenericGroup(ingredients: Ingredient[]): boolean {
  if (ingredients.length === 0) return true;

  const first = normalizeLabel(ingredients[0].group);
  if (!GENERIC_GROUP_LABELS.has(first)) {
    // If the first ingredient has a real label, check if ALL share that exact label.
    // A true "single-mass" case is when every ingredient lives in one bucket.
    return ingredients.every((ing) => normalizeLabel(ing.group) === first);
  }

  // First is generic — require every ingredient to also be generic for a flat render.
  return ingredients.every((ing) => GENERIC_GROUP_LABELS.has(normalizeLabel(ing.group)));
}

/**
 * Builds a grouping view model for RecipeView.
 * - When all ingredients share a single generic group, returns one logical block
 *   labelled "Ingredienser" (flat list, no type subdivision).
 * - Otherwise preserves the original group structure.
 */
export function buildIngredientSections(
  ingredients: Ingredient[],
): Array<{ label: string; items: Ingredient[] }> {
  if (ingredients.length === 0) return [];

  if (hasSingleGenericGroup(ingredients)) {
    return [{ label: 'Ingredienser', items: ingredients }];
  }

  const map = new Map<string, Ingredient[]>();
  for (const ing of ingredients) {
    const raw = ing.group?.trim() || 'Andre';
    if (!map.has(raw)) map.set(raw, []);
    map.get(raw)!.push(ing);
  }
  return Array.from(map.entries()).map(([label, items]) => ({ label, items }));
}
