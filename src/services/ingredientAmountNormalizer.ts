import { Ingredient } from '../types';

/**
 * Qualitative amount phrases that must never end up in `unit`.
 * The AI keeps stuffing these into `unit` with a fake `amount: 1`, which
 * renders as "1 efter smag kanelsukker". We rescue them into amountText.
 *
 * See observer evidence recipeId 1776513980082 (polish_ingredients after):
 *   "1 efter smag Kanelsukker"  -> amount=1, unit="efter smag"
 *   "En klat per portion g Smør" -> amount="En klat per portion", unit="g"
 */
const QUALITATIVE_AMOUNT_PATTERN = /^\s*(efter\s+smag|efter\s+behov|valgfrit|ad\s+libitum|en\s+klat(?:\s+per\s+portion)?|en\s+smule|lidt|rigeligt|nok\s+til)\b/i;

function looksQualitative(value: unknown): value is string {
  return typeof value === 'string' && QUALITATIVE_AMOUNT_PATTERN.test(value);
}

/**
 * Defensive normalizer for ingredient amount shape.
 * Ensures old recipes (amount-only) and new recipes (range fields) coexist safely.
 * Use this before render, before scale logic, and when loading from storage.
 *
 * Also rescues qualitative phrases that the AI mis-placed into `unit` or
 * stringified into `amount` — routes them to `amountText` with amount=null.
 */
export function normalizeIngredientAmountShape(ingredient: Ingredient): Ingredient {
  let amount: number | null = typeof ingredient.amount === 'number' ? ingredient.amount : null;
  let unit = typeof ingredient.unit === 'string' ? ingredient.unit : '';
  let amountText = typeof ingredient.amountText === 'string' ? ingredient.amountText : '';

  // amount was a qualitative string (e.g. amount="En klat per portion") — route to amountText
  if (amount === null && looksQualitative((ingredient as any).amount)) {
    const phrase = String((ingredient as any).amount).trim();
    if (!amountText) amountText = phrase;
  }

  // unit holds a qualitative phrase — pull it into amountText and clear unit.
  // Also drop the fake amount=1 that AI paired with it.
  if (looksQualitative(unit)) {
    const phrase = unit.trim();
    if (!amountText) amountText = phrase;
    unit = '';
    if (amount === 1) amount = null;
  }

  return {
    ...ingredient,
    amount,
    amountMin: typeof ingredient.amountMin === 'number' ? ingredient.amountMin : null,
    amountMax: typeof ingredient.amountMax === 'number' ? ingredient.amountMax : null,
    amountText,
    unit,
  };
}
