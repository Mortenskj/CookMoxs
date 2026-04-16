import { Ingredient } from '../types';

/**
 * Defensive normalizer for ingredient amount shape.
 * Ensures old recipes (amount-only) and new recipes (range fields) coexist safely.
 * Use this before render, before scale logic, and when loading from storage.
 */
export function normalizeIngredientAmountShape(ingredient: Ingredient): Ingredient {
  return {
    ...ingredient,
    amount: typeof ingredient.amount === 'number' ? ingredient.amount : null,
    amountMin: typeof ingredient.amountMin === 'number' ? ingredient.amountMin : null,
    amountMax: typeof ingredient.amountMax === 'number' ? ingredient.amountMax : null,
    amountText: typeof ingredient.amountText === 'string' ? ingredient.amountText : '',
  };
}
