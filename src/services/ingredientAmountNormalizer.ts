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
const QUALITATIVE_AMOUNT_PATTERN = /^\s*(efter\s+smag|efter\s+behov|valgfrit|valgfri|optional|ad\s+libitum|en\s+klat(?:\s+per\s+portion)?|en\s+smule|lidt|rigeligt|nok\s+til|per\s+portion)\b/i;

/**
 * Countable kitchen "units" that Danish sources often write as "En knivspids"
 * etc. The AI tends to stuff these into amountText alongside a redundant
 * amount=1, producing "en knivspids 1 salt". We rescue them to unit.
 */
const COUNTABLE_UNIT_PHRASE = /^\s*en\s+(knivspids|smule|klat|nip|tsk|spsk|håndfuld|haandfuld|dåse|daase|pose|bundt|fed|skive)\b/i;

function looksQualitative(value: unknown): value is string {
  return typeof value === 'string' && QUALITATIVE_AMOUNT_PATTERN.test(value);
}

function matchCountableUnit(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const m = value.match(COUNTABLE_UNIT_PHRASE);
  return m ? m[1].toLowerCase() : null;
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

  // amount === 0 is virtually never a legitimate ingredient quantity — AI/import
  // fallbacks emit 0 as a placeholder when they couldn't parse a number but were
  // required to put *something* in the amount field. Treat it as null so the
  // qualitative/dual-channel rules below can apply cleanly. Observer evidence:
  //   { amount: 0, amountText: "efter smag", name: "sukker, kanel, smør..." }
  // This rule is generic — not tied to any specific recipe.
  if (amount === 0) {
    amount = null;
  }

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

  // amountText holds a countable unit phrase ("en knivspids") alongside a
  // redundant amount=1 — hoist it into `unit`. Observer evidence:
  //   "en knivspids 1 salt"  -> amountText="en knivspids", amount=1, name="salt"
  const countable = matchCountableUnit(amountText);
  if (countable && !unit) {
    unit = countable;
    amountText = '';
    if (amount === null) amount = 1;
  }

  // amountText is a qualitative phrase ("efter smag"/"valgfrit") AND amount
  // is also set — drop the amount; qualitative wins. Observer evidence:
  //   "valgfrit 1 stk vaniljestang"  -> both set, renders as "valgfrit 1 stk …"
  //   "efter smag 1 sukker…"          -> both set, renders as "efter smag 1 …"
  if (amountText && looksQualitative(amountText) && amount !== null) {
    amount = null;
    unit = '';
  }

  // If both amount and amountText are set for the same meaning and neither
  // of the above specific rules applied, prefer the more informative side:
  // amountText wins when it's free-text noise like "efter smag"; otherwise
  // amount wins and amountText is discarded as redundant.
  if (amount !== null && amountText) {
    if (looksQualitative(amountText)) {
      amount = null;
      unit = '';
    } else {
      // numeric-redundant amountText (e.g. amount=2, amountText="to") → drop text
      amountText = '';
    }
  }

  // Optional/valgfrit promotion: when amountText begins with valgfrit/valgfri/
  // optional and the group is missing or generic, move the item into a
  // dedicated "Valgfrit" group so it doesn't render as a loose prefix in the
  // main list. Observer evidence 1776516929706 polish_ingredients after:
  //   { amountText:"valgfrit", name:"vaniljestang eller kanelstænger" }
  // ended up alongside measurable ingredients without a group.
  let group = typeof ingredient.group === 'string' ? ingredient.group : '';
  const isGenericGroup = !group
    || /^(andre|ingredienser|hovedingredienser|main|other)$/i.test(group.trim())
    || /^(til\s+)?gr(ø|o)den$/i.test(group.trim())
    || group.trim().toLowerCase() === (ingredient.name || '').trim().toLowerCase();
  if (amountText && /^\s*(valgfrit|valgfri|optional)\b/i.test(amountText) && isGenericGroup) {
    group = 'Valgfrit';
    // Clear the prefix since the group conveys the semantic — avoids
    // double-marking ("Valgfrit" group + amountText="valgfrit").
    amountText = '';
  }

  return {
    ...ingredient,
    amount,
    amountMin: typeof ingredient.amountMin === 'number' ? ingredient.amountMin : null,
    amountMax: typeof ingredient.amountMax === 'number' ? ingredient.amountMax : null,
    amountText,
    unit,
    group,
  };
}
