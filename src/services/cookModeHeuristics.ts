import type { Ingredient, StepIngredient, StepTimer } from '../types';

type InductionHeatLevel = 'low' | 'medium' | 'high' | 'boil';

// Fixed induction mapping so cook mode can show explicit levels instead of vague labels.
const INDUCTION_HEAT_LABELS: Record<InductionHeatLevel, string> = {
  low: 'Induktion 2-3/9 · lav varme',
  medium: 'Induktion 5-6/9 · middel varme',
  high: 'Induktion 7-8/9 · høj varme',
  boil: 'Induktion 9/9 · bring i kog',
};

const INGREDIENT_STOPWORDS = new Set([
  'eller',
  'til',
  'med',
  'frisk',
  'finthakket',
  'groftrevet',
  'koncentreret',
  'toerret',
  'ekstra',
  'bredbladet',
  'friskkvaernet',
  'rigeligt',
  'smurt',
  'ovnfast',
  'ovn',
  'fast',
  'revet',
  'hakket',
  'grovthakket',
  'drys',
  'servering',
]);

function normalizeForMatch(value: string): string {
  return value
    .toLowerCase()
    .replace(/æ/g, 'ae')
    .replace(/ø/g, 'oe')
    .replace(/å/g, 'aa')
    .replace(/Ã¦/g, 'ae')
    .replace(/Ã¸/g, 'oe')
    .replace(/Ã¥/g, 'aa')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function getIngredientTerms(name: string): string[] {
  const normalized = normalizeForMatch(name);
  const segments = normalized
    .split(/,|\(|\)|\beller\b|\btil\b|\bfor\b/g)
    .map((segment) => segment.trim())
    .filter(Boolean);

  const words = segments
    .flatMap((segment) => segment.split(/\s+/))
    .map((word) => word.trim())
    .filter((word) => word.length >= 3 && !INGREDIENT_STOPWORDS.has(word));

  const aliases: string[] = [];
  if (normalized.includes('oksekoed') || normalized.includes('lammekoed') || normalized.includes('svinekoed')) {
    aliases.push('koed');
  }
  if (normalized.includes('bouillon')) {
    aliases.push('bouillon');
  }
  if (normalized.includes('parmesan')) {
    aliases.push('parmesanost');
  }

  return uniqueStrings([...segments, ...words, ...aliases]);
}

function hasTermMatch(normalizedStepText: string, stepWords: string[], term: string): boolean {
  if (!term) return false;

  if (term.includes(' ') && normalizedStepText.includes(term)) {
    return true;
  }

  if (stepWords.includes(term)) {
    return true;
  }

  if (term.length >= 5) {
    const prefixLength = Math.min(6, term.length - 1);
    const prefix = term.slice(0, prefixLength);
    if (prefix.length >= 4 && stepWords.some((word) => word.startsWith(prefix))) {
      return true;
    }
  }

  return false;
}

function getInductionHeatLevel(value: string): InductionHeatLevel | undefined {
  const normalizedValue = normalizeForMatch(value);

  if (normalizedValue.includes('kog op') || normalizedValue.includes('bring i kog')) {
    return 'boil';
  }

  if (
    normalizedValue.includes('simr')
    || normalizedValue.includes('skru ned for varmen')
    || normalizedValue.includes('lav varme')
    || normalizedValue.includes('svag varme')
  ) {
    return 'low';
  }

  if (normalizedValue.includes('hoej varme') || normalizedValue.includes('brun')) {
    return 'high';
  }

  if (
    normalizedValue.includes('middelvarme')
    || normalizedValue.includes('middel varme')
    || normalizedValue.includes('sauter')
  ) {
    return 'medium';
  }

  return undefined;
}

export function formatHeatDisplay(heat?: string): string | undefined {
  if (!heat) {
    return undefined;
  }

  const ovenMatch = heat.match(/(\d{2,3})\s*(?:grader|\u00B0)\s*(varmluft|over\/undervarme|over-?\s*undervarme)?/i);
  if (ovenMatch) {
    const mode = ovenMatch[2] ? ` ${ovenMatch[2].trim().toLowerCase()}` : '';
    return `${ovenMatch[1]}\u00B0C${mode}`;
  }

  const level = getInductionHeatLevel(heat);
  if (level) {
    return INDUCTION_HEAT_LABELS[level];
  }

  return heat;
}

export function formatHeatGuideEntry(entry: string): string {
  const separatorIndex = entry.indexOf(':');
  if (separatorIndex === -1) {
    return formatHeatDisplay(entry) ?? entry;
  }

  const heat = entry.slice(0, separatorIndex).trim();
  const text = entry.slice(separatorIndex + 1).trim();
  const formattedHeat = formatHeatDisplay(heat) ?? heat;

  return text ? `${formattedHeat}: ${text}` : formattedHeat;
}

export function findRelevantIngredientsForStep(text: string, ingredients: Ingredient[]): StepIngredient[] {
  const normalizedStepText = normalizeForMatch(text);
  const stepWords = normalizedStepText.split(/\s+/).filter(Boolean);

  return ingredients
    .filter((ingredient) => {
      const terms = getIngredientTerms(ingredient.name);
      return terms.some((term) => hasTermMatch(normalizedStepText, stepWords, term));
    })
    .map((ingredient) => ({
      name: ingredient.name,
      amount: ingredient.amount,
      unit: ingredient.unit,
    }));
}

function detectTimerLabel(normalizedText: string): string {
  if (normalizedText.includes('bag') || normalizedText.includes('ovn')) return 'Bagetid';
  if (normalizedText.includes('simr') || normalizedText.includes('kog')) return 'Kogetid';
  if (normalizedText.includes('steg') || normalizedText.includes('brun') || normalizedText.includes('sauter')) return 'Stegetid';
  if (normalizedText.includes('hvile')) return 'Hviletid';
  if (normalizedText.includes('haev')) return 'Hævetid';
  return 'Timer';
}

function convertDurationToMinutes(rawValue: number, unit: string): number {
  if (unit.startsWith('time')) return rawValue * 60;
  if (unit.startsWith('sek')) return Math.max(1, Math.round(rawValue / 60));
  return rawValue;
}

export function inferTimerFromStepText(text: string): StepTimer | undefined {
  const normalizedText = normalizeForMatch(text);
  const rangeMatch = normalizedText.match(/(\d+)\s*-\s*(\d+)\s*(min(?:ut(?:ter)?)?|sek(?:under)?|time(?:r)?)/);
  const singleMatch = normalizedText.match(/(\d+)\s*(min(?:ut(?:ter)?)?|sek(?:under)?|time(?:r)?)/);
  const match = rangeMatch ?? singleMatch;

  if (!match) {
    return undefined;
  }

  const durationValue = Number(match[1]);
  if (!Number.isFinite(durationValue) || durationValue <= 0) {
    return undefined;
  }

  return {
    duration: convertDurationToMinutes(durationValue, match[match.length - 1]),
    description: detectTimerLabel(normalizedText),
  };
}

export function inferHeatFromStepText(text: string): string | undefined {
  const ovenMatch = text.match(/(\d{2,3})\s*(?:grader|\u00B0)\s*(varmluft|over\/undervarme|over-?\s*undervarme)?/i);
  if (ovenMatch) {
    const mode = ovenMatch[2] ? ` ${ovenMatch[2].trim().toLowerCase()}` : '';
    return `${ovenMatch[1]}\u00B0C${mode}`;
  }

  const level = getInductionHeatLevel(text);
  return level ? INDUCTION_HEAT_LABELS[level] : undefined;
}

export function buildHeatAndOvenGuides(steps: Array<{ text: string; heat?: string }>): { heatGuide: string[]; ovenGuide: string[] } {
  const heatGuide: string[] = [];
  const ovenGuide: string[] = [];

  for (const step of steps) {
    const formattedHeat = formatHeatDisplay(step.heat);
    if (!formattedHeat) continue;

    const entry = `${formattedHeat}: ${step.text}`;
    if (formattedHeat.includes('\u00B0C')) {
      if (!ovenGuide.includes(entry)) ovenGuide.push(entry);
    } else if (!heatGuide.includes(entry)) {
      heatGuide.push(entry);
    }
  }

  return { heatGuide, ovenGuide };
}
