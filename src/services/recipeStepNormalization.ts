import type { Ingredient, Recipe, Step, StepIngredient } from '../types';
import {
  buildHeatAndOvenGuides,
  findRelevantIngredientsForStep,
  hasRelevantIngredientConfidence,
  inferHeatMetadataFromText,
  normalizeForMatch,
} from './cookModeHeuristics';
/**
 * Deterministic prose cleanup for step text when a structured heat signal
 * (heatLevel) is set. The cook-mode chip already shows `Induktion N/9`, so the
 * prose should not also say "til middel varme (trin 4)" etc.
 *
 * Keep the regex set narrow and conservative — we only strip the stock Danish
 * heat phrases that appear in imports/AI output, never touch anything else.
 */
function stripRedundantHeatProse(text: string): string {
  if (!text) return text;
  let out = text;

  // Parenthetical level/step callouts: "(trin 4)", "(niveau 4)", "(4/9)", "(induktion 4/9)"
  out = out.replace(/\s*\((?:induktion\s*)?(?:trin|niveau)?\s*\d{1,2}(?:\s*\/\s*9)?\)/gi, '');

  // Inline level/step callouts: "trin 4", "niveau 4", "induktion 4/9"
  out = out.replace(/\s*(?:,\s*)?\b(?:induktion\s*)?(?:trin|niveau)\s*\d{1,2}(?:\s*\/\s*9)?\b/gi, '');
  out = out.replace(/\s*\binduktion\s*\d{1,2}\s*\/\s*9\b/gi, '');

  // Heat adjectives: "på/ved/til/med [svag|lav|middel|høj|kraftig|god] varme"
  out = out.replace(
    /\s*\b(?:på|ved|til|med)\s+(?:svag|lav|lav-middel|middel|middel-høj|høj|kraftig|god)\s+varme\b/gi,
    '',
  );

  // Cleanup stray punctuation/whitespace introduced by removals
  out = out.replace(/\s+,/g, ',');
  out = out.replace(/\s{2,}/g, ' ');
  out = out.replace(/\s+([.,;:!?])/g, '$1');
  out = out.replace(/([.,;:])\s*\./g, '$1');
  out = out.trim();

  return out;
}

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

  // When we have a structured heat chip, drop redundant heat prose from text
  // so step doesn't simultaneously say "til middel varme (trin 4)" + show chip.
  const text = normalizedHeat.heatLevel
    ? stripRedundantHeatProse(step.text || '')
    : step.text;

  return {
    ...step,
    id: step.id || `step-${index}`,
    text,
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
