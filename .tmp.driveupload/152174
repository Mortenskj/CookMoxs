import type { Ingredient, Step, StepIngredient, StepTimer } from '../types';

export type CanonicalHeatLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

type IngredientMatchConfidence = 'high' | 'medium';

type HeatInference = {
  heat?: string;
  heatLevel?: CanonicalHeatLevel;
  oven?: string;
};

const HEAT_NOTE_BY_LEVEL: Partial<Record<CanonicalHeatLevel, string>> = {
  2: 'svag varme',
  3: 'lav varme',
  4: 'middel-lav varme',
  5: 'middel varme',
  6: 'rolig stegning',
  7: 'middel-høj varme',
  8: 'høj varme',
  9: 'bring i kog',
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

const OVEN_HEAT_PATTERN = /(\d{2,3})\s*(?:grader|°)\s*(varmluft|over\/undervarme|over-?\s*undervarme)?/i;

export function normalizeForMatch(value: string): string {
  return value
    .toLowerCase()
    .replace(/æ/g, 'ae')
    .replace(/ø/g, 'oe')
    .replace(/å/g, 'aa')
    .replace(/Ã¦/g, 'ae')
    .replace(/Ã¸/g, 'oe')
    .replace(/Ã¥/g, 'aa')
    .replace(/ÃƒÂ¦/g, 'ae')
    .replace(/ÃƒÂ¸/g, 'oe')
    .replace(/ÃƒÂ¥/g, 'aa')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9/]+/g, ' ')
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

function getIngredientMatchConfidence(normalizedStepText: string, stepWords: string[], term: string): IngredientMatchConfidence | null {
  if (!term) return null;

  if (term.includes(' ') && normalizedStepText.includes(term)) {
    return 'high';
  }

  if (stepWords.includes(term)) {
    return 'high';
  }

  if (term.length >= 5) {
    const prefixLength = Math.min(6, term.length - 1);
    const prefix = term.slice(0, prefixLength);
    if (prefix.length >= 4 && stepWords.some((word) => word.startsWith(prefix))) {
      return 'medium';
    }
  }

  return null;
}

function findIngredientMatchesForStep(text: string, ingredients: Ingredient[]) {
  const normalizedStepText = normalizeForMatch(text);
  const stepWords = normalizedStepText.split(/\s+/).filter(Boolean);

  return ingredients.flatMap((ingredient) => {
    const terms = getIngredientTerms(ingredient.name);
    let confidence: IngredientMatchConfidence | null = null;

    for (const term of terms) {
      const nextConfidence = getIngredientMatchConfidence(normalizedStepText, stepWords, term);
      if (nextConfidence === 'high') {
        confidence = 'high';
        break;
      }
      if (nextConfidence === 'medium') {
        confidence = 'medium';
      }
    }

    return confidence ? [{ ingredient, confidence }] : [];
  });
}

export function findRelevantIngredientsForStep(text: string, ingredients: Ingredient[]): StepIngredient[] {
  return findIngredientMatchesForStep(text, ingredients).map(({ ingredient }) => ({
    name: ingredient.name,
    amount: ingredient.amount,
    unit: ingredient.unit,
  }));
}

export function hasRelevantIngredientConfidence(text: string, ingredients: Ingredient[]): boolean {
  return findIngredientMatchesForStep(text, ingredients).length > 0;
}

function formatOvenHeat(temperature: string, mode?: string) {
  const normalizedMode = mode ? ` ${mode.trim().toLowerCase()}` : '';
  return `${temperature}\u00B0C${normalizedMode}`;
}

export function extractOvenHeat(value?: string): string | undefined {
  if (!value) return undefined;
  const match = value.match(OVEN_HEAT_PATTERN);
  if (!match) return undefined;
  return formatOvenHeat(match[1], match[2]);
}

function inferHeatLevelFromNormalizedText(normalizedText: string): CanonicalHeatLevel | undefined {
  const reduceMatch = normalizedText.match(/skru ned(?: igen)?(?: til)?\s+([1-9])\s*\/\s*9/);
  if (reduceMatch) {
    return Number(reduceMatch[1]) as CanonicalHeatLevel;
  }

  const simmerMatch = normalizedText.match(/(?:lad|skal)\s+simre(?: videre)?(?: ved| paa)?\s+([1-9])\s*\/\s*9/);
  if (simmerMatch) {
    return Number(simmerMatch[1]) as CanonicalHeatLevel;
  }

  if (normalizedText.includes('bring i kog') && normalizedText.includes('skru ned og lad simre')) {
    return 3;
  }

  if (
    (normalizedText.includes('bring i kog') || normalizedText.includes('kog op'))
    && (normalizedText.includes('lad simre') || normalizedText.includes('simr'))
  ) {
    return 3;
  }

  if (
    (normalizedText.includes('bring i kog') || normalizedText.includes('kog op'))
    && (normalizedText.includes('skru ned') || normalizedText.includes('lad koge videre') || normalizedText.includes('lad koge'))
  ) {
    return 5;
  }

  const explicitMatch = normalizedText.match(/(?:induktion\s*)?([1-9])\s*\/\s*9/);
  if (explicitMatch) {
    return Number(explicitMatch[1]) as CanonicalHeatLevel;
  }

  if (
    normalizedText.includes('bring i kog')
    || normalizedText.includes('kog op')
  ) {
    return 9;
  }

  if (
    normalizedText.includes('svag varme')
    || normalizedText.includes('meget lav varme')
    || normalizedText.includes('gentle heat')
  ) {
    return 2;
  }

  if (
    normalizedText.includes('skru ned og lad simre')
    || normalizedText.includes('lad simre')
    || normalizedText.includes('simr')
    || normalizedText.includes('lav varme')
    || normalizedText.includes('skru ned')
  ) {
    return 3;
  }

  if (
    (
      normalizedText.includes('loeg')
      || normalizedText.includes('hvidloeg')
      || normalizedText.includes('skalotteloeg')
      || normalizedText.includes('aromater')
    )
    && (
      normalizedText.includes('sauter')
      || normalizedText.includes('saute')
      || normalizedText.includes('sved')
      || normalizedText.includes('klar')
    )
  ) {
    return 4;
  }

  if (
    (
      normalizedText.includes('loeg')
      || normalizedText.includes('hvidloeg')
      || normalizedText.includes('skalotteloeg')
      || normalizedText.includes('aromater')
    )
    && (
      normalizedText.includes('brun ')
      || normalizedText.endsWith(' brun')
      || normalizedText.includes(' afbrun')
    )
  ) {
    return 5;
  }

  if (
    normalizedText.includes('hoej varme')
    || normalizedText.includes('hard browning')
    || normalizedText.includes('brun ')
    || normalizedText.endsWith(' brun')
    || normalizedText.includes(' afbrun')
  ) {
    return 7;
  }

  if (
    normalizedText.includes('middel hoej')
    || normalizedText.includes('middelhoej')
    || normalizedText.includes('middel hoj')
    || normalizedText.includes('saute')
    || normalizedText.includes('sauter')
    || normalizedText.includes('kraftig stegning')
  ) {
    return 7;
  }

  if (
    normalizedText.includes('middel varme')
    || normalizedText.includes('middelvarme')
    || normalizedText.includes('medium heat')
  ) {
    return 5;
  }

  if (normalizedText.includes('5-6/9') || normalizedText.includes('5 6/9')) {
    return 5;
  }

  if (normalizedText.includes('7-8/9') || normalizedText.includes('7 8/9')) {
    return 7;
  }

  if (normalizedText.includes('2-3/9') || normalizedText.includes('2 3/9')) {
    return 3;
  }

  return undefined;
}

export function inferHeatMetadataFromText(value?: string): HeatInference {
  if (!value) {
    return {};
  }

  const oven = extractOvenHeat(value);
  if (oven) {
    return { heat: oven, oven };
  }

  const heatLevel = inferHeatLevelFromNormalizedText(normalizeForMatch(value));
  if (!heatLevel) {
    return {};
  }

  return {
    heatLevel,
    heat: HEAT_NOTE_BY_LEVEL[heatLevel],
  };
}

export function formatHeatDisplay(heat?: string): string | undefined {
  if (!heat) {
    return undefined;
  }

  const oven = extractOvenHeat(heat);
  if (oven) {
    return oven;
  }

  const inference = inferHeatMetadataFromText(heat);
  if (inference.heatLevel) {
    return `Induktion ${inference.heatLevel}/9`;
  }

  return heat;
}

export function formatStepHeatDisplay(step: Pick<Step, 'heat' | 'heatLevel'>): string | undefined {
  if (step.heatLevel) {
    return `Induktion ${step.heatLevel}/9`;
  }

  return formatHeatDisplay(step.heat);
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

function detectTimerLabel(normalizedText: string): string {
  if (normalizedText.includes('bag') || normalizedText.includes('ovn')) return 'Bagetid';
  if (normalizedText.includes('simr') || normalizedText.includes('kog')) return 'Kogetid';
  if (normalizedText.includes('steg') || normalizedText.includes('brun') || normalizedText.includes('sauter')) return 'Stegetid';
  if (normalizedText.includes('hvile')) return 'Hviletid';
  if (normalizedText.includes('haev')) return 'Haevetid';
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
  return inferHeatMetadataFromText(text).heat;
}

export function buildHeatAndOvenGuides(steps: Array<Pick<Step, 'text' | 'heat' | 'heatLevel'>>): { heatGuide: string[]; ovenGuide: string[] } {
  const heatGuide: string[] = [];
  const ovenGuide: string[] = [];

  for (const step of steps) {
    const formattedHeat = formatStepHeatDisplay(step);
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
