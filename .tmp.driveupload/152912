import type { Recipe } from '../types';
import {
  buildHeatAndOvenGuides,
  findRelevantIngredientsForStep,
  inferHeatFromStepText,
  inferTimerFromStepText,
} from './cookModeHeuristics';

export class DirectParseError extends Error {}

function normalizeText(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').trim();
}

function toArray<T>(value: T | T[] | null | undefined): T[] {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined) return [];
  return [value];
}

function parseFraction(value: string): number | null {
  const trimmed = value.trim();
  if (/^\d+\/\d+$/.test(trimmed)) {
    const [numerator, denominator] = trimmed.split('/').map(Number);
    if (denominator) return numerator / denominator;
  }
  return null;
}

function parseLeadingAmount(value: string): { amount: number | null; remainder: string } {
  const normalized = value
    .replace(/½/g, ' 1/2 ')
    .replace(/¼/g, ' 1/4 ')
    .replace(/¾/g, ' 3/4 ')
    .replace(/⅓/g, ' 1/3 ')
    .replace(/⅔/g, ' 2/3 ')
    .replace(/\s+/g, ' ')
    .trim();

  const match = normalized.match(/^(\d+(?:[.,]\d+)?(?: \d+\/\d+)?|\d+\/\d+)(?:\s*-\s*\d+(?:[.,]\d+)?)?\s*(.*)$/);
  if (!match) {
    return { amount: null, remainder: normalized };
  }

  const rawAmount = match[1];
  const remainder = match[2] || '';
  const parts = rawAmount.split(' ');

  let amount = 0;
  for (const part of parts) {
    const fraction = parseFraction(part);
    if (fraction !== null) {
      amount += fraction;
      continue;
    }

    const parsed = Number(part.replace(',', '.'));
    if (Number.isFinite(parsed)) {
      amount += parsed;
    }
  }

  return {
    amount: amount > 0 ? amount : null,
    remainder: remainder.trim(),
  };
}

function parseIngredient(input: unknown, index: number) {
  const allowedUnits = [
    'g', 'kg', 'mg', 'ml', 'dl', 'cl', 'l', 'tsk', 'spsk', 'stk', 'fed',
    'daase', 'dåse', 'glas', 'knsp', 'pakke', 'pk', 'bundt', 'pose',
  ];

  if (input && typeof input === 'object') {
    const item = input as Record<string, unknown>;
    const name = normalizeText(item.name || item.text || item.recipeIngredient || '');
    const amount = typeof item.amount === 'number' ? item.amount : null;
    const unit = normalizeText(item.unit || '');

    return {
      id: `ing-${index}`,
      name: name || 'Ukendt ingrediens',
      amount,
      unit,
      group: 'Andre',
      locked: false,
    };
  }

  const raw = normalizeText(input);
  const { amount, remainder } = parseLeadingAmount(raw);
  const sortedUnits = [...allowedUnits].sort((a, b) => b.length - a.length);
  const unitMatch = remainder.match(new RegExp(`^(${sortedUnits.join('|')})(?=\\s|$)\\.?\\s*(.*)$`, 'i'));
  const unit = unitMatch ? unitMatch[1] : '';
  const name = unitMatch ? normalizeText(unitMatch[2]) : remainder;

  return {
    id: `ing-${index}`,
    name: name || raw || 'Ukendt ingrediens',
    amount,
    unit,
    group: 'Andre',
    locked: false,
  };
}

function collectInstructionTexts(input: unknown): string[] {
  if (typeof input === 'string') {
    const text = normalizeText(input);
    return text ? [text] : [];
  }

  if (Array.isArray(input)) {
    return input.flatMap(collectInstructionTexts);
  }

  if (!input || typeof input !== 'object') {
    return [];
  }

  const item = input as Record<string, unknown>;
  const nested = item.itemListElement || item.itemList || item.instructions || item.steps;
  const text = normalizeText(item.text || item.name || '');

  if (nested) {
    const nestedTexts = collectInstructionTexts(nested);
    if (nestedTexts.length > 0) return nestedTexts;
  }

  return text ? [text] : [];
}

function parseServings(recipeYield: unknown): { servings: number; servingsUnit?: string } {
  const raw = normalizeText(Array.isArray(recipeYield) ? recipeYield[0] : recipeYield);
  if (!raw) {
    return { servings: 4, servingsUnit: 'personer' };
  }

  const match = raw.match(/(\d+(?:[.,]\d+)?)/);
  const servings = match ? Number(match[1].replace(',', '.')) : 4;
  const servingsUnit = normalizeText(raw.replace(/^\D*(\d+(?:[.,]\d+)?)/, '').replace(/^\s+/, '')) || 'personer';

  return {
    servings: Number.isFinite(servings) && servings > 0 ? servings : 4,
    servingsUnit,
  };
}

function parseCategories(recipe: Record<string, unknown>): string[] {
  const rawValues = [
    ...toArray(recipe.recipeCategory),
    ...toArray(recipe.keywords),
  ];

  const categories = rawValues
    .flatMap((value) => normalizeText(value).split(','))
    .map((value) => normalizeText(value))
    .filter(Boolean);

  return Array.from(new Set(categories));
}

function splitLongInstructionText(texts: string[]): string[] {
  if (texts.length !== 1) return texts;
  const single = texts[0];

  // Split on numbered patterns: "1. ", "1) ", "Trin 1"
  const numberedParts = single.split(/(?<=\.)\s+(?=\d+[\.\)]\s)|(?=(?:Trin|Step)\s+\d+)/i)
    .map(s => normalizeText(s))
    .filter(Boolean);
  if (numberedParts.length > 1) return numberedParts;

  // Split on sentence-ending period followed by a capital letter with extra whitespace
  const sentenceParts = single.split(/\.\s{2,}(?=[A-ZÆØÅ])|\.(?:\s*\n)+(?=[A-ZÆØÅ])/)
    .map((s, i, arr) => normalizeText(i < arr.length - 1 ? s + '.' : s))
    .filter(Boolean);
  if (sentenceParts.length > 1) return sentenceParts;

  // Last resort: split on period-space-capital if the text is very long
  if (single.length > 300) {
    const longSplit = single.split(/\.(?:\s)(?=[A-ZÆØÅ])/)
      .map((s, i, arr) => normalizeText(i < arr.length - 1 ? s + '.' : s))
      .filter(Boolean);
    if (longSplit.length > 1) return longSplit;
  }

  return texts;
}

export function parseStructuredRecipeToRecipe(structuredRecipe: unknown, options?: { sourceUrl?: string }): Recipe {
  if (!structuredRecipe || typeof structuredRecipe !== 'object') {
    throw new DirectParseError('Den strukturerede opskriftdata var ugyldig.');
  }

  const recipeNode = structuredRecipe as Record<string, unknown>;
  const title = normalizeText(recipeNode.name || recipeNode.headline || '');
  const ingredients = toArray(recipeNode.recipeIngredient).map(parseIngredient);
  const instructionTexts = splitLongInstructionText(collectInstructionTexts(recipeNode.recipeInstructions));

  if (!title) {
    throw new DirectParseError('Opskriftens titel manglede i den strukturerede data.');
  }
  if (ingredients.length === 0) {
    throw new DirectParseError('Opskriften manglede ingredienser i den strukturerede data.');
  }
  if (instructionTexts.length === 0) {
    throw new DirectParseError('Opskriften manglede trin i den strukturerede data.');
  }

  const now = new Date().toISOString();
  const categories = parseCategories(recipeNode);
  const { servings, servingsUnit } = parseServings(recipeNode.recipeYield);
  const steps = instructionTexts.map((text, index) => ({
    id: `step-${index}`,
    text,
    heat: inferHeatFromStepText(text),
    timer: inferTimerFromStepText(text),
    relevantIngredients: findRelevantIngredientsForStep(text, ingredients),
  }));
  const { heatGuide, ovenGuide } = buildHeatAndOvenGuides(steps);

  return {
    id: `direct-${Date.now()}`,
    title,
    summary: normalizeText(recipeNode.description || ''),
    recipeType: categories[0] || '',
    categories,
    folder: 'Ikke gemte',
    folderId: 'default-un-saved-direct',
    isSaved: false,
    notes: '',
    servings,
    servingsUnit,
    ingredients,
    steps,
    flavorBoosts: [],
    pitfalls: [],
    hints: [],
    substitutions: [],
    heatGuide,
    ovenGuide,
    kitchenTimeline: [],
    sourceUrl: options?.sourceUrl,
    lastUsed: now,
    createdAt: now,
    updatedAt: now,
  };
}
