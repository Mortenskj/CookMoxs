import type { Recipe } from '../types';
import { getObserverSessionId } from './observerClient';

type CaptureTarget = 'ingredients' | 'steps';
type CapturePhase = 'before' | 'after';

function formatIngredientLine(ingredient: Recipe['ingredients'][number]) {
  const amountParts = [
    ingredient.amountText,
    ingredient.amountMin != null && ingredient.amountMax != null ? `${ingredient.amountMin}-${ingredient.amountMax}` : null,
    ingredient.amount != null ? String(ingredient.amount) : null,
    ingredient.unit || null,
  ].filter(Boolean);

  const prefix = amountParts.join(' ').trim();
  const name = ingredient.name?.trim() || '';
  const group = ingredient.group?.trim() || '';
  return `${group ? `[${group}] ` : ''}${prefix ? `${prefix} ` : ''}${name}`.trim();
}

function formatStepLine(step: Recipe['steps'][number], index: number) {
  const heat = step.heat ? ` {heat:${step.heat}}` : '';
  const timer = step.timer ? ` {timer:${step.timer.duration}:${step.timer.description}}` : '';
  return `${index + 1}. ${step.text}${heat}${timer}`.trim();
}

export function buildAiTransformationSnapshot(recipe: Recipe, action: string) {
  if (action === 'polish_ingredients' || action === 'smart_adjust' || action === 'fill_rest') {
    return {
      target: 'ingredients' as const,
      text: (recipe.ingredients || []).map(formatIngredientLine).join('\n').slice(0, 12000),
      count: recipe.ingredients?.length || 0,
    };
  }

  return {
    target: 'steps' as const,
    text: (recipe.steps || []).map(formatStepLine).join('\n').slice(0, 12000),
    count: recipe.steps?.length || 0,
  };
}

async function captureSectionPng(target: CaptureTarget) {
  if (typeof document === 'undefined') return null;

  const selector = target === 'ingredients'
    ? '[data-observer-section="ingredients"]'
    : '[data-observer-section="steps"]';
  const element = document.querySelector(selector) as HTMLElement | null;
  if (!element) return null;

  const { default: html2canvas } = await import('html2canvas');
  const canvas = await html2canvas(element, {
    backgroundColor: '#fdfbf7',
    scale: 1,
    logging: false,
    useCORS: true,
  });

  return canvas.toDataURL('image/png');
}

export async function recordAiTransformationCapture(params: {
  action: string;
  phase: CapturePhase;
  recipeBefore?: Recipe | null;
  recipeAfter?: Recipe | null;
  recipeId: string;
}) {
  if (typeof window === 'undefined') return;

  const sourceRecipe = params.phase === 'before' ? params.recipeBefore : params.recipeAfter;
  if (!sourceRecipe) return;

  const snapshot = buildAiTransformationSnapshot(sourceRecipe, params.action);
  let imageDataUrl: string | null = null;

  try {
    imageDataUrl = await captureSectionPng(snapshot.target);
  } catch {
    imageDataUrl = null;
  }

  const body = JSON.stringify({
    sessionId: getObserverSessionId(),
    recipeId: params.recipeId,
    action: params.action,
    phase: params.phase,
    target: snapshot.target,
    text: snapshot.text,
    itemCount: snapshot.count,
    imageDataUrl,
  });

  await fetch('/api/__observer/client-capture', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-cookmoxs-session-id': getObserverSessionId(),
    },
    body,
    keepalive: true,
  }).catch(() => {});
}
