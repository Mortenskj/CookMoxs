import type { Ingredient } from '../types';
import { normalizeForMatch } from './cookModeHeuristics';

type DensityEntry = {
  terms: string[];
  gramsPerDl: number;
};

type IngredientUnitConversionSuccess = {
  ok: true;
  ingredient: Ingredient;
  direction: 'g_to_dl' | 'dl_to_g';
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
  if (unit !== 'g' && unit !== 'dl') {
    return false;
  }

  return findGramsPerDl(ingredient.name || '') != null;
}

export function convertIngredientBetweenGramsAndDeciliters(ingredient: Ingredient): IngredientUnitConversionResult {
  const amount = typeof ingredient.amount === 'number' ? ingredient.amount : Number(ingredient.amount);
  const unit = normalizeUnit(ingredient.unit || '');

  if (!Number.isFinite(amount) || amount <= 0) {
    return {
      ok: false,
      message: `Kan ikke konvertere ${ingredient.name || 'denne ingrediens'} uden en gyldig maengde.`,
    };
  }

  if (unit !== 'g' && unit !== 'dl') {
    return {
      ok: false,
      message: `Kan kun konvertere mellem g og dl for ${ingredient.name || 'denne ingrediens'}.`,
    };
  }

  const gramsPerDl = findGramsPerDl(ingredient.name || '');
  if (!gramsPerDl) {
    return {
      ok: false,
      message: `Kan ikke konvertere ${ingredient.name || 'denne ingrediens'} sikkert mellem g og dl uden kendt taethed.`,
    };
  }

  if (unit === 'g') {
    return {
      ok: true,
      direction: 'g_to_dl',
      ingredient: {
        ...ingredient,
        amount: Number((amount / gramsPerDl).toFixed(1)),
        unit: 'dl',
      },
    };
  }

  return {
    ok: true,
    direction: 'dl_to_g',
    ingredient: {
      ...ingredient,
      amount: Math.round(amount * gramsPerDl),
      unit: 'g',
    },
  };
}
