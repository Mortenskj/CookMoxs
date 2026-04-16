import { Ingredient } from '../types';

/**
 * Formats the display amount for an ingredient, supporting both exact amounts
 * and ranges (amountMin/amountMax). Falls back gracefully to the old model.
 */
export function formatIngredientAmount(ingredient: Ingredient, scale = 1): string {
  // Range model
  if (
    typeof ingredient.amountMin === 'number' &&
    typeof ingredient.amountMax === 'number'
  ) {
    if (ingredient.amountText?.trim()) return ingredient.amountText.trim();
    const min = ingredient.amountMin * scale;
    const max = ingredient.amountMax * scale;
    return `${formatNumber(min)}-${formatNumber(max)}`;
  }

  // Exact amount model
  if (typeof ingredient.amount === 'number') {
    return formatNumber(ingredient.amount * scale);
  }

  // amountText fallback (e.g. "et nip", "efter smag")
  return ingredient.amountText?.trim() || '';
}

function formatNumber(n: number): string {
  // Avoid floating-point noise: round to at most 3 significant decimals
  const rounded = Math.round(n * 1000) / 1000;
  // If it's a whole number, no decimals
  if (Number.isInteger(rounded)) return String(rounded);
  // Otherwise up to 2 decimal places, trimming trailing zeros
  return parseFloat(rounded.toFixed(2)).toString();
}
