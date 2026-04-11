import type { Ingredient, Recipe, Step, StepIngredient } from '../types';
import {
  buildHeatAndOvenGuides,
  findRelevantIngredientsForStep,
  hasRelevantIngredientConfidence,
  inferHeatMetadataFromText,
  normalizeForMatch,
} from './cookModeHeuristics';

function toCanonicalIngredientHint(stepIngredient: StepIngredient, ingredients: Ingredient[]): StepIngredient {
  const normalizedName = normalizeForMatch(stepIngredient.name);
  const canonical = ingredients.find((ingredient) => normalizeForMatch(ingredient.name) === normalizedName);

  if (!canonical) {
    return {
      name: stepIngredient.name,
      amount: stepIngredient.amount ?? null,
      unit: stepIngredient.unit || '',
    };
  }

  return {
    name: canonical.name,
    amount: canonical.amount,
    unit: canonical.unit,
  };
}

function normalizeRelevantIngredients(step: Step, ingredients: Ingredient[]): StepIngredient[] {
  const existing = Array.isArray(step.relevantIngredients) ? step.relevantIngredients : [];
  const recomputed = findRelevantIngredientsForStep(step.text, ingredients);

  if (existing.length > 0 && recomputed.length > 0) {
    const recomputedNames = new Set(recomputed.map((ingredient) => normalizeForMatch(ingredient.name)));
    const validated = existing
      .map((ingredient) => toCanonicalIngredientHint(ingredient, ingredients))
      .filter((ingredient) => recomputedNames.has(normalizeForMatch(ingredient.name)));

    if (validated.length === existing.length) {
      return validated;
    }
  }

  if (recomputed.length > 0 && hasRelevantIngredientConfidence(step.text, ingredients)) {
    return recomputed;
  }

  return [];
}

function normalizeHeat(step: Step) {
  const explicitHeatLevel = step.heatLevel;
  if (explicitHeatLevel && explicitHeatLevel >= 1 && explicitHeatLevel <= 9) {
    return {
      heat: step.heat,
      heatLevel: explicitHeatLevel,
      heatSource: step.heatSource || 'ai',
    };
  }

  const heatFromField = inferHeatMetadataFromText(step.heat);
  if (heatFromField.oven) {
    return {
      heat: heatFromField.oven,
      heatLevel: undefined,
      heatSource: undefined,
    };
  }

  if (heatFromField.heatLevel) {
    return {
      heat: heatFromField.heat,
      heatLevel: heatFromField.heatLevel,
      heatSource: 'migrated' as const,
    };
  }

  const heatFromText = inferHeatMetadataFromText(step.text);
  if (heatFromText.oven) {
    return {
      heat: step.heat || heatFromText.oven,
      heatLevel: undefined,
      heatSource: undefined,
    };
  }

  if (heatFromText.heatLevel) {
    return {
      heat: step.heat || heatFromText.heat,
      heatLevel: heatFromText.heatLevel,
      heatSource: 'heuristic' as const,
    };
  }

  return {
    heat: step.heat,
    heatLevel: undefined,
    heatSource: undefined,
  };
}

function normalizeStep(step: Step, ingredients: Ingredient[], index: number): Step {
  const normalizedHeat = normalizeHeat(step);

  return {
    ...step,
    id: step.id || `step-${index}`,
    heat: normalizedHeat.heat,
    heatLevel: normalizedHeat.heatLevel,
    heatSource: normalizedHeat.heatSource,
    relevantIngredients: normalizeRelevantIngredients(step, ingredients),
  };
}

function hasOvenPreheatStep(steps: Step[]) {
  return steps.some((step) => {
    const normalizedText = normalizeForMatch(step.text || '');
    return (
      normalizedText.includes('forvarm ovnen')
      || normalizedText.includes('taend ovnen')
      || normalizedText.includes('saet ovnen paa')
    );
  });
}

function getFirstDetectedOvenHeat(steps: Step[]) {
  for (const step of steps) {
    const heatFromField = inferHeatMetadataFromText(step.heat);
    if (heatFromField.oven) {
      return heatFromField.oven;
    }

    const heatFromText = inferHeatMetadataFromText(step.text);
    if (heatFromText.oven) {
      return heatFromText.oven;
    }
  }

  return undefined;
}

function ensureOvenPreheatStep(steps: Step[]) {
  if (steps.length === 0 || hasOvenPreheatStep(steps)) {
    return steps;
  }

  const ovenHeat = getFirstDetectedOvenHeat(steps);
  if (!ovenHeat) {
    return steps;
  }

  const preheatStep: Step = {
    id: 'step-oven-preheat',
    text: `Tænd ovnen og forvarm til ${ovenHeat}.`,
    heat: ovenHeat,
    reminder: 'Lad ovnen blive helt varm, før retten sættes ind.',
    relevantIngredients: [],
  };

  return [preheatStep, ...steps];
}

export function normalizeRecipeForCookMode(recipe: Recipe): Recipe {
  const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
  const normalizedSteps = (recipe.steps || []).map((step, index) => normalizeStep(step, ingredients, index));
  const steps = ensureOvenPreheatStep(normalizedSteps);
  const guides = buildHeatAndOvenGuides(steps);

  return {
    ...recipe,
    steps,
    heatGuide: guides.heatGuide,
    ovenGuide: guides.ovenGuide,
  };
}

export function normalizeRecipesForCookMode(recipes: Recipe[]): Recipe[] {
  return recipes.map((recipe) => normalizeRecipeForCookMode(recipe));
}
