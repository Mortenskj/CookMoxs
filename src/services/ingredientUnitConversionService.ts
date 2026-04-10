import type { Ingredient } from '../types';
import { normalizeForMatch } from './cookModeHeuristics';

type DensityEntry = {
  terms: string[];
  gramsPerDl: number;
};

type IngredientUnitConversionSuccess = {
  ok: true;
  ingredient: Ingredient;
  direction: string;
};

type IngredientUnitConversionFailure = {
  ok: false;
  message: string;
};

export type IngredientUnitConversionResult =
  | IngredientUnitConversionSuccess
  | IngredientUnitConversionFailure;

const DENSITY_TABLE: DensityEntry[] = [
  { terms: ['havregryn'], gramsPerDl: 35 },
  { terms: ['hvedemel', 'mel'], gramsPerDl: 60 },
  { terms: ['sukker'], gramsPerDl: 85 },
  { terms: ['maelk', 'letmaelk', 'soedmaelk', 'minimaelk'], gramsPerDl: 100 },
  { terms: ['vand', 'bouillon'], gramsPerDl: 100 },
  { terms: ['olie', 'olivenolie', 'rapsolie'], gramsPerDl: 90 },
  { terms: ['smoer'], gramsPerDl: 95 },
  { terms: ['kakao'], gramsPerDl: 40 },
  { terms: ['flormelis'], gramsPerDl: 50 },
  { terms: ['floede', 'madlavningsfloede'], gramsPerDl: 100 },
  { terms: ['ris'], gramsPerDl: 80 },
  { terms: ['pasta'], gramsPerDl: 35 },
];

// Simple mathematical conversion pairs (no density needed)
const SIMPLE_CONVERSIONS: Record<string, { target: string; factor: number }> = {
  kg: { target: 'g', factor: 1000 },
  l: { target: 'dl', factor: 10 },
  ml: { target: 'dl', factor: 0.1 },
  cl: { target: 'dl', factor: 0.1 },
  tsk: { target: 'spsk', factor: 1 / 3 },
  spsk: { target: 'tsk', factor: 3 },
};

// Reverse lookups for units that can also convert back
const SIMPLE_CONVERSIONS_REVERSE: Record<string, { target: string; factor: number }> = {
  g: { target: 'kg', factor: 0.001 },
  dl: { target: 'l', factor: 0.1 },
};

function normalizeUnit(unit: string) {
  return unit.trim().toLowerCase().replace(/\./g, '');
}

function findGramsPerDl(name: string) {
  const normalizedName = normalizeForMatch(name);
  const match = DENSITY_TABLE.find((entry) => entry.terms.some((term) => normalizedName.includes(term)));
  return match?.gramsPerDl;
}

export function canConvertIngredientBetweenGramsAndDeciliters(ingredient: Ingredient): boolean {
  const unit = normalizeUnit(ingredient.unit || '');
  if (unit !== 'g' && unit !== 'dl') return false;
  return findGramsPerDl(ingredient.name || '') != null;
}

export function convertIngredientBetweenGramsAndDeciliters(ingredient: Ingredient): IngredientUnitConversionResult {
  return convertIngredientUnit(ingredient);
}

export function canConvertIngredientUnit(ingredient: Ingredient): boolean {
  const unit = normalizeUnit(ingredient.unit || '');
  if (!unit) return false;

  // Density-based g↔dl
  if ((unit === 'g' || unit === 'dl') && findGramsPerDl(ingredient.name || '') != null) {
    return true;
  }

  // Simple math conversions
  if (unit in SIMPLE_CONVERSIONS || unit in SIMPLE_CONVERSIONS_REVERSE) {
    return true;
  }

  return false;
}

export function getConversionLabel(ingredient: Ingredient): string | null {
  const unit = normalizeUnit(ingredient.unit || '');
  if (!unit) return null;

  if (unit === 'g' && findGramsPerDl(ingredient.name || '') != null) return 'g → dl';
  if (unit === 'dl' && findGramsPerDl(ingredient.name || '') != null) return 'dl → g';

  const simple = SIMPLE_CONVERSIONS[unit];
  if (simple) return `${unit} → ${simple.target}`;

  const reverse = SIMPLE_CONVERSIONS_REVERSE[unit];
  if (reverse) return `${unit} → ${reverse.target}`;

  return null;
}

export function convertIngredientUnit(ingredient: Ingredient): IngredientUnitConversionResult {
  const amount = typeof ingredient.amount === 'number' ? ingredient.amount : Number(ingredient.amount);
  const unit = normalizeUnit(ingredient.unit || '');
  const label = ingredient.name || 'denne ingrediens';

  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, message: `Kan ikke konvertere ${label} uden en gyldig mængde.` };
  }

  // Density-based g↔dl
  if (unit === 'g' || unit === 'dl') {
    const gramsPerDl = findGramsPerDl(ingredient.name || '');
    if (gramsPerDl) {
      if (unit === 'g') {
        return {
          ok: true,
          direction: 'g_to_dl',
          ingredient: { ...ingredient, amount: Number((amount / gramsPerDl).toFixed(1)), unit: 'dl' },
        };
      }
      return {
        ok: true,
        direction: 'dl_to_g',
        ingredient: { ...ingredient, amount: Math.round(amount * gramsPerDl), unit: 'g' },
      };
    }
  }

  // Simple math conversions
  const simple = SIMPLE_CONVERSIONS[unit];
  if (simple) {
    const converted = amount * simple.factor;
    return {
      ok: true,
      direction: `${unit}_to_${simple.target}`,
      ingredient: { ...ingredient, amount: Number(converted.toFixed(2)), unit: simple.target },
    };
  }

  const reverse = SIMPLE_CONVERSIONS_REVERSE[unit];
  if (reverse) {
    const converted = amount * reverse.factor;
    return {
      ok: true,
      direction: `${unit}_to_${reverse.target}`,
      ingredient: { ...ingredient, amount: Number(converted.toFixed(2)), unit: reverse.target },
    };
  }

  return { ok: false, message: `Kan ikke konvertere ${label} fra ${unit}.` };
}
