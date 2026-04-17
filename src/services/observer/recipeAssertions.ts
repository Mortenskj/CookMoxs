import type { Recipe, Step } from '../../types';

export type RecipeObserverAssertion = {
  assertion: string;
  stepIndex?: number | null;
  evidence?: string | null;
  heat?: string | null;
  note: string;
};

function normalizeText(value?: string | null) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function looksLikeTemperature(value?: string | null) {
  const normalized = normalizeText(value);
  return /\b\d{1,3}\s*°?\s*c\b/.test(normalized);
}

function looksLikeGrillContext(value?: string | null) {
  const normalized = normalizeText(value);
  return (
    normalized.includes('grill')
    || normalized.includes('grillrist')
    || normalized.includes('direkte varme')
    || normalized.includes('indirekte varme')
    || normalized.includes('bbq')
  );
}

function looksLikeOvenSignal(value?: string | null) {
  const normalized = normalizeText(value);
  return (
    normalized.includes('ovn')
    || normalized.includes('forvarm')
    || normalized.includes('bag ')
    || normalized.includes('bages')
  );
}

function collectStepAssertions(step: Step, index: number): RecipeObserverAssertion[] {
  const assertions: RecipeObserverAssertion[] = [];
  const normalizedText = normalizeText(step.text);
  const normalizedHeat = normalizeText(step.heat);
  const heatLevel = typeof step.heatLevel === 'number' ? step.heatLevel : null;

  if ((normalizedText.includes('drej 45 grader') || normalizedText.includes('45 grader igen')) && looksLikeTemperature(step.heat)) {
    assertions.push({
      assertion: 'rotation_not_temperature',
      stepIndex: index,
      evidence: step.text.slice(0, 180),
      heat: step.heat || null,
      note: '45 graders rotation blev behandlet som temperatur.',
    });
  }

  if (normalizedText.includes('kernetemperatur') && looksLikeTemperature(step.heat)) {
    assertions.push({
      assertion: 'core_temp_not_working_heat',
      stepIndex: index,
      evidence: step.text.slice(0, 180),
      heat: step.heat || null,
      note: 'Kernetemperatur blev behandlet som step-varme.',
    });
  }

  if (looksLikeGrillContext(step.text) && heatLevel != null && step.heatSource !== 'grill') {
    assertions.push({
      assertion: 'grill_as_induction',
      stepIndex: index,
      evidence: step.text.slice(0, 180),
      heat: step.heat || null,
      note: 'Grillstep fik induktionsniveau uden eksplicit grill-kilde.',
    });
  }

  if (looksLikeTemperature(step.heat) && normalizedText.includes(normalizedHeat) && !normalizedText.includes('kernetemperatur')) {
    assertions.push({
      assertion: 'duplicate_heat_signal',
      stepIndex: index,
      evidence: step.text.slice(0, 180),
      heat: step.heat || null,
      note: 'Temperatur findes både i structured heat og i step-tekst.',
    });
  }

  return assertions;
}

export function collectRecipeObserverAssertions(recipe?: Recipe | null): RecipeObserverAssertion[] {
  if (!recipe) return [];

  const assertions: RecipeObserverAssertion[] = [];
  const grillRecipe = looksLikeGrillContext(recipe.title)
    || (recipe.categories || []).some((category) => looksLikeGrillContext(category))
    || (recipe.steps || []).some((step) => looksLikeGrillContext(step.text));

  if (grillRecipe) {
    const ovenGuideSignal = (recipe.ovenGuide || []).find((entry) => looksLikeOvenSignal(entry));
    const ovenStepSignal = (recipe.steps || []).find((step) => looksLikeOvenSignal(step.text));
    if (ovenGuideSignal || ovenStepSignal) {
      assertions.push({
        assertion: 'grill_not_oven',
        evidence: (ovenStepSignal?.text || ovenGuideSignal || '').slice(0, 180),
        heat: ovenStepSignal?.heat || null,
        note: 'Grill-opskrift indeholder ovn-signal i guide eller steps.',
      });
    }
  }

  (recipe.steps || []).forEach((step, index) => {
    assertions.push(...collectStepAssertions(step, index));
  });

  return assertions.slice(0, 8);
}
