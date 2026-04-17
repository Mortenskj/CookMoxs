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

function parseCompoundNumber(raw: string): number | null {
  const parts = raw.trim().split(/\s+/);
  let total = 0;
  for (const part of parts) {
    const fraction = parseFraction(part);
    if (fraction !== null) {
      total += fraction;
      continue;
    }
    const parsed = Number(part.replace(',', '.'));
    if (Number.isFinite(parsed)) {
      total += parsed;
    }
  }
  return total > 0 ? total : null;
}

interface LeadingAmount {
  amount: number | null;
  amountMin?: number | null;
  amountMax?: number | null;
  amountText?: string;
  remainder: string;
}

function parseLeadingAmount(value: string): LeadingAmount {
  const normalized = value
    .replace(/½/g, ' 1/2 ')
    .replace(/¼/g, ' 1/4 ')
    .replace(/¾/g, ' 3/4 ')
    .replace(/⅓/g, ' 1/3 ')
    .replace(/⅔/g, ' 2/3 ')
    .replace(/\s+/g, ' ')
    .trim();

  // Range: e.g. "175-200", "1-2", "1/2 - 1", "ca. 1-2"
  // Capture an optional leading approximation marker ("ca.", "ca") so amountText
  // preserves the original phrasing instead of silently dropping it.
  const rangeMatch = normalized.match(/^(ca\.?\s*)?(\d+(?:[.,]\d+)?(?:\s+\d+\/\d+)?|\d+\/\d+)(\s*[-–]\s*)(\d+(?:[.,]\d+)?(?:\s+\d+\/\d+)?|\d+\/\d+)\s*(.*)$/i);
  if (rangeMatch) {
    const approxPrefix = rangeMatch[1] || '';
    const minRaw = rangeMatch[2];
    const separator = rangeMatch[3];
    const maxRaw = rangeMatch[4];
    const remainder = rangeMatch[5] || '';

    const min = parseCompoundNumber(minRaw);
    const max = parseCompoundNumber(maxRaw);
    if (min !== null && max !== null) {
      const originalRange = `${approxPrefix}${minRaw}${separator}${maxRaw}`.replace(/\s+/g, ' ').trim();
      return {
        amount: null,
        amountMin: min,
        amountMax: max,
        amountText: originalRange,
        remainder: remainder.trim(),
      };
    }
  }

  const match = normalized.match(/^(\d+(?:[.,]\d+)?(?: \d+\/\d+)?|\d+\/\d+)\s*(.*)$/);
  if (!match) {
    return { amount: null, remainder: normalized };
  }

  const amount = parseCompoundNumber(match[1]);
  return {
    amount,
    remainder: (match[2] || '').trim(),
  };
}

function parseIngredient(input: unknown, index: number) {
  const allowedUnits = [
    'g', 'kg', 'mg', 'ml', 'dl', 'cl', 'l', 'tsk', 'spsk', 'stk', 'fed',
    'daase', 'dåse', 'glas', 'knsp', 'pakke', 'pk', 'bundt', 'pose',
    'skiver', 'skive', 'blade', 'blad', 'nip', 'håndfuld', 'kviste', 'kvist',
  ];

  if (input && typeof input === 'object') {
    const item = input as Record<string, unknown>;
    const name = normalizeText(item.name || item.text || item.recipeIngredient || '');
    const amount = typeof item.amount === 'number' ? item.amount : null;
    const amountMin = typeof item.amountMin === 'number' ? item.amountMin : null;
    const amountMax = typeof item.amountMax === 'number' ? item.amountMax : null;
    const amountText = typeof item.amountText === 'string' ? item.amountText : undefined;
    const unit = normalizeText(item.unit || '');

    return {
      id: `ing-${index}`,
      name: name || 'Ukendt ingrediens',
      amount,
      amountMin,
      amountMax,
      amountText,
      unit,
      group: 'Andre',
      locked: false,
    };
  }

  const raw = normalizeText(input);
  const leading = parseLeadingAmount(raw);
  const { amount, amountMin, amountMax, amountText, remainder } = leading;
  const sortedUnits = [...allowedUnits].sort((a, b) => b.length - a.length);
  const unitMatch = remainder.match(new RegExp(`^(${sortedUnits.join('|')})(?=\\s|$)\\.?\\s*(.*)$`, 'i'));
  const unit = unitMatch ? unitMatch[1] : '';
  const name = unitMatch ? normalizeText(unitMatch[2]) : remainder;

  return {
    id: `ing-${index}`,
    name: name || raw || 'Ukendt ingrediens',
    amount,
    amountMin: amountMin ?? null,
    amountMax: amountMax ?? null,
    amountText,
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

const INGREDIENT_SECTION_PATTERNS = [
  /^ingredienser\b/,
  /^det skal du bruge\b/,
  /^du skal bruge\b/,
];

const STEP_SECTION_PATTERNS = [
  /^fremgangsmaade\b/,
  /^tilberedning\b/,
  /^metode\b/,
  /^saadan goer du\b/,
  /^saadan laver du\b/,
  /^trin(?: for trin)?\b/,
  /^fremgang\b/,
];

function normalizeForMatch(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\u00e6/g, 'ae')
    .replace(/\u00f8/g, 'oe')
    .replace(/\u00e5/g, 'aa')
    .trim();
}

function stripListPrefix(value: string): string {
  return value
    .replace(/^\s*[\u2022*•\-–]\s*/, '')
    .replace(/^\s*\d+\s*[\.\)]\s*/, '')
    .replace(/^\s*(?:trin|step)\s*\d+\s*[:.)-]?\s*/i, '')
    .trim();
}

function isSectionHeading(line: string, patterns: RegExp[]): boolean {
  const normalized = normalizeForMatch(stripListPrefix(line));
  return patterns.some((pattern) => pattern.test(normalized));
}

function isIngredientSectionHeading(line: string): boolean {
  return isSectionHeading(line, INGREDIENT_SECTION_PATTERNS);
}

function isStepSectionHeading(line: string): boolean {
  return isSectionHeading(line, STEP_SECTION_PATTERNS);
}

function isLikelyIngredientGroupHeading(line: string): boolean {
  const stripped = stripListPrefix(line);
  if (!stripped.endsWith(':')) return false;
  if (isIngredientSectionHeading(stripped) || isStepSectionHeading(stripped)) return false;
  return stripped.length <= 60;
}

function isLikelyIngredientLine(line: string): boolean {
  const stripped = stripListPrefix(line);
  if (!stripped) return false;
  if (isIngredientSectionHeading(stripped) || isStepSectionHeading(stripped) || isLikelyIngredientGroupHeading(stripped)) {
    return false;
  }

  if (/^\s*[\u2022*•\-–]\s+/.test(line) || /^\s*\d+\s*[\.\)]\s+/.test(line)) {
    return true;
  }

  if (/^(?:ca\.?\s*)?\d/.test(stripped)) {
    return true;
  }

  if (/^(?:en|et|to|tre|fire|fem|seks|syv|otte|ni|ti|halv|halve|½)\b/i.test(stripped)) {
    return true;
  }

  return /\b(g|kg|mg|ml|dl|cl|l|tsk|spsk|stk|fed|d[åa]se|glas|knsp|pakke|pk|bundt|pose|skiver|skive|blade|blad|nip|h[åa]ndfuld|kviste|kvist)\b/i.test(stripped);
}

function isLikelyInstructionLine(line: string): boolean {
  const normalized = normalizeForMatch(stripListPrefix(line));
  return /^(forvarm|varm|smelt|snit|hak|roer|bland|kom|tilsaet|steg|saute|sauter|svits|bring|kog|lad|bag|server|anret|vend|haeld|skyl|rens|skaer|riv|pres|pisk|mos|top|drys|fordel|smag|juster|mariner|brun|saenk|skru)\b/.test(normalized);
}

function parseServingsFromPlainText(lines: string[]): { servings: number; servingsUnit?: string } {
  for (const line of lines.slice(0, 12)) {
    const normalized = normalizeForMatch(line);
    if (!/\b(til|giver|raekker til|serverer|personer|portioner|stk|stykker|frikadeller|boller)\b/.test(normalized)) {
      continue;
    }
    const match = normalized.match(/(?:til|giver|raekker til|serverer)?\s*(?:ca\s*)?(\d+(?:[.,]\d+)?)(?:\s*[-–]\s*(\d+(?:[.,]\d+)?))?\s*(personer|portioner|stk|stykker|frikadeller|boller)?/);
    if (!match) continue;

    const min = Number(match[1].replace(',', '.'));
    const max = match[2] ? Number(match[2].replace(',', '.')) : min;
    const servings = Number.isFinite(max) && max > 0 ? max : min;
    if (!Number.isFinite(servings) || servings <= 0) continue;

    return {
      servings,
      servingsUnit: match[3] || 'personer',
    };
  }

  return { servings: 4, servingsUnit: 'personer' };
}

function buildPlainTextStepTexts(lines: string[]): string[] {
  const steps: string[] = [];
  let current = '';

  for (const rawLine of lines) {
    const stripped = stripListPrefix(rawLine);
    if (!stripped) continue;

    const startsNewStep = /^\s*[\u2022*•\-–]\s+/.test(rawLine)
      || /^\s*\d+\s*[\.\)]\s+/.test(rawLine)
      || /^\s*(?:trin|step)\s*\d+/i.test(rawLine)
      || !current
      || (/^[A-ZÆØÅ]/.test(stripped) && /[.!?]$/.test(current));

    if (startsNewStep) {
      if (current) {
        steps.push(normalizeText(current));
      }
      current = stripped;
      continue;
    }

    current = `${current} ${stripped}`.trim();
  }

  if (current) {
    steps.push(normalizeText(current));
  }

  return splitLongInstructionText(steps);
}

export function parsePlainTextRecipeToRecipe(rawText: string, options?: { sourceUrl?: string }): Recipe {
  const lines = rawText
    .replace(/\u00a0/g, ' ')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    throw new DirectParseError('Opskriftsteksten var tom.');
  }

  const title = stripListPrefix(lines[0]);
  if (!title || isIngredientSectionHeading(title) || isStepSectionHeading(title)) {
    throw new DirectParseError('Opskriftens titel kunne ikke findes i teksten.');
  }

  const summaryLines: string[] = [];
  const ingredientLines: Array<{ raw: string; group: string }> = [];
  const stepLines: string[] = [];
  let mode: 'lead' | 'ingredients' | 'steps' = 'lead';
  let currentGroup = 'Andre';

  for (const line of lines.slice(1)) {
    if (isIngredientSectionHeading(line)) {
      mode = 'ingredients';
      currentGroup = 'Andre';
      continue;
    }

    if (isStepSectionHeading(line)) {
      mode = 'steps';
      continue;
    }

    if (mode !== 'steps' && mode !== 'ingredients' && isLikelyIngredientLine(line)) {
      mode = 'ingredients';
    }

    if (mode === 'ingredients' && isLikelyInstructionLine(line)) {
      mode = 'steps';
    }

    if (mode === 'lead') {
      summaryLines.push(stripListPrefix(line));
      continue;
    }

    if (mode === 'ingredients') {
      if (isLikelyIngredientGroupHeading(line)) {
        currentGroup = stripListPrefix(line).replace(/:$/, '').trim() || 'Andre';
        continue;
      }

      if (!isLikelyIngredientLine(line)) {
        continue;
      }

      ingredientLines.push({
        raw: stripListPrefix(line),
        group: currentGroup,
      });
      continue;
    }

    stepLines.push(line);
  }

  const ingredients = ingredientLines.map(({ raw, group }, index) => ({
    ...parseIngredient(raw, index),
    group: group || 'Andre',
  }));
  const stepTexts = buildPlainTextStepTexts(stepLines);

  if (ingredients.length === 0) {
    throw new DirectParseError('Opskriftsteksten manglede genkendelige ingredienser.');
  }

  if (stepTexts.length === 0) {
    throw new DirectParseError('Opskriftsteksten manglede genkendelige trin.');
  }

  const now = new Date().toISOString();
  const { servings, servingsUnit } = parseServingsFromPlainText(lines);
  const steps = stepTexts.map((text, index) => ({
    id: `step-${index}`,
    text,
    heat: inferHeatFromStepText(text),
    timer: inferTimerFromStepText(text),
    relevantIngredients: findRelevantIngredientsForStep(text, ingredients),
  }));
  const { heatGuide, ovenGuide } = buildHeatAndOvenGuides(steps);

  return {
    id: `plain-${Date.now()}`,
    title,
    summary: normalizeText(summaryLines.join(' ')),
    recipeType: '',
    categories: [],
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
