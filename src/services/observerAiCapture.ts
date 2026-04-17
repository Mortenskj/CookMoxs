import type { Recipe } from '../types';
import { getObserverSessionId, reportClientDiagnostic } from './observerClient';

type CaptureTarget = 'ingredients' | 'steps';
type CapturePhase = 'before' | 'after';
const CAPTURE_ROOT_ID = 'cookmoxs-observer-capture-root';

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
  if (!element) {
    reportClientDiagnostic({
      level: 'warn',
      kind: 'observer_capture_target_missing',
      message: `Observer capture target not found for ${target}`,
      details: { selector, target },
    });
    return null;
  }

  // Let layout settle after React updates before we clone/capture.
  await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
  await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));

  const { default: html2canvas } = await import('html2canvas');
  const existingRoot = document.getElementById(CAPTURE_ROOT_ID);
  if (existingRoot) existingRoot.remove();

  const captureRoot = document.createElement('div');
  captureRoot.id = CAPTURE_ROOT_ID;
  captureRoot.setAttribute('aria-hidden', 'true');
  captureRoot.style.position = 'fixed';
  captureRoot.style.left = '-100000px';
  captureRoot.style.top = '0';
  captureRoot.style.zIndex = '-1';
  captureRoot.style.pointerEvents = 'none';
  captureRoot.style.opacity = '0';
  captureRoot.style.background = '#fdfbf7';
  captureRoot.style.padding = '24px';
  captureRoot.style.width = `${Math.max(element.scrollWidth, element.clientWidth, 320)}px`;

  const clone = element.cloneNode(true) as HTMLElement;
  clone.style.transform = 'none';
  clone.style.filter = 'none';
  clone.style.backdropFilter = 'none';
  clone.style.setProperty('-webkit-backdrop-filter', 'none');
  clone.style.animation = 'none';
  clone.style.transition = 'none';
  clone.style.opacity = '1';
  clone.style.boxShadow = 'none';
  clone.style.maxWidth = 'none';
  clone.style.width = '100%';
  clone.style.margin = '0';
  clone.style.background = '#fdfbf7';

  clone.querySelectorAll<HTMLElement>('*').forEach((node) => {
    node.style.animation = 'none';
    node.style.transition = 'none';
    node.style.transform = 'none';
    node.style.backdropFilter = 'none';
    node.style.setProperty('-webkit-backdrop-filter', 'none');
    if (node.style.position === 'sticky') {
      node.style.position = 'relative';
      node.style.top = 'auto';
    }
  });

  captureRoot.appendChild(clone);
  document.body.appendChild(captureRoot);

  try {
    const canvas = await html2canvas(clone, {
      backgroundColor: '#fdfbf7',
      scale: Math.min(window.devicePixelRatio || 1, 2),
      logging: false,
      useCORS: true,
      removeContainer: true,
      width: Math.ceil(clone.scrollWidth || captureRoot.clientWidth),
      height: Math.ceil(clone.scrollHeight || clone.offsetHeight || captureRoot.clientHeight),
      windowWidth: Math.ceil(clone.scrollWidth || captureRoot.clientWidth),
      windowHeight: Math.ceil(clone.scrollHeight || clone.offsetHeight || captureRoot.clientHeight),
      scrollX: 0,
      scrollY: 0,
    });

    return canvas.toDataURL('image/png');
  } finally {
    captureRoot.remove();
  }
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
  let captureError: string | null = null;

  try {
    imageDataUrl = await captureSectionPng(snapshot.target);
  } catch (error) {
    imageDataUrl = null;
    captureError = error instanceof Error ? error.message : String(error);
    reportClientDiagnostic({
      level: 'warn',
      kind: 'observer_capture_failed',
      message: captureError,
      details: {
        action: params.action,
        phase: params.phase,
        target: snapshot.target,
      },
    });
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
    captureError,
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
