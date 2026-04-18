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

// Cached decision: does this runtime produce CSS values that html2canvas
// 1.4.1 cannot parse (modern color functions via Tailwind v4)? We evaluate
// once per session — the answer does not change mid-session. The preflight
// probe looks at a broad sample of nodes because the problem may live on
// descendants (e.g. the observer target itself) even if <body> happens to
// use legacy rgb() values. Additionally, once html2canvas has thrown a
// color-function parse error at runtime, we latch the cached reason so
// subsequent captures skip silently — no more repeated warn spam.
let cachedPngUnsupportedReason: string | null | undefined;
const MODERN_COLOR_FN_RE = /\b(color|color-mix|oklch|oklab|lab|lch)\(/i;
const PROBED_PROPS = [
  'color',
  'background-color',
  'background-image',
  'border-top-color',
  'border-right-color',
  'border-bottom-color',
  'border-left-color',
  'outline-color',
  'box-shadow',
  'fill',
  'stroke',
];

function sampleHasModernColorFn(el: Element): boolean {
  try {
    const cs = window.getComputedStyle(el);
    for (const prop of PROBED_PROPS) {
      const v = cs.getPropertyValue(prop);
      if (v && MODERN_COLOR_FN_RE.test(v)) return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

function detectPngUnsupportedReason(): string | null {
  if (cachedPngUnsupportedReason !== undefined) return cachedPngUnsupportedReason;
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    cachedPngUnsupportedReason = 'no_dom';
    return cachedPngUnsupportedReason;
  }
  try {
    const candidates: Element[] = [document.documentElement, document.body];
    // Probe the actual observer targets and a small random sample of their
    // descendants — Tailwind v4 can emit color() on utility classes applied
    // deep in the tree even when body itself reads as legacy rgb().
    const observerTargets = Array.from(
      document.querySelectorAll('[data-observer-section]'),
    ) as Element[];
    candidates.push(...observerTargets);
    for (const target of observerTargets) {
      const descendants = Array.from(target.querySelectorAll('*')).slice(0, 40) as Element[];
      candidates.push(...descendants);
    }
    for (const el of candidates) {
      if (sampleHasModernColorFn(el)) {
        cachedPngUnsupportedReason = 'modern_css_color_function';
        reportClientDiagnostic({
          level: 'info',
          kind: 'observer_capture_skipped',
          message: 'html2canvas skipped — computed styles expose modern CSS color functions (Tailwind v4 / color() / oklch). Text snapshot remains active.',
          details: { reason: cachedPngUnsupportedReason },
        });
        return cachedPngUnsupportedReason;
      }
    }
  } catch {
    // if probe fails, let capture attempt proceed
  }
  cachedPngUnsupportedReason = null;
  return cachedPngUnsupportedReason;
}

/**
 * Latch the cached reason after a runtime parse error so subsequent captures
 * skip silently. Called from the capture error handler when the error matches
 * the unsupported color-function signature.
 */
function latchPngUnsupportedFromRuntimeError(message: string): void {
  if (cachedPngUnsupportedReason) return;
  cachedPngUnsupportedReason = 'modern_css_color_function_runtime';
  reportClientDiagnostic({
    level: 'info',
    kind: 'observer_capture_skipped',
    message: 'html2canvas disabled for remainder of session — runtime hit an unsupported CSS color function. Text snapshot remains active.',
    details: { reason: cachedPngUnsupportedReason, trigger: message.slice(0, 200) },
  });
}

function isUnsupportedColorFnError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? '');
  return /unsupported color function/i.test(msg) || /Attempting to parse an unsupported color/i.test(msg);
}

async function captureSectionPng(target: CaptureTarget) {
  if (typeof document === 'undefined') return null;

  const unsupportedReason = detectPngUnsupportedReason();
  if (unsupportedReason) {
    // Narrow bail-out: html2canvas 1.4.1 cannot parse the modern CSS color
    // functions Tailwind v4 emits. Repeatedly invoking it only fills the log
    // with the same error. Skip silently — text snapshot remains primary
    // evidence. See captureError="Attempting to parse an unsupported color
    // function \"color\"" in earlier observer logs.
    return null;
  }

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

  // html2canvas 1.4.1's CSS parser throws on modern color functions
  // ("color(display-p3 ...)", "color(srgb ...)") that Tailwind v4 can emit.
  // We normalize relevant color properties to rgb() inline via the browser's
  // own canvas color parser, which downgrades color()/oklch()/lab() to rgb().
  // See observer evidence: captureError="Attempting to parse an unsupported color function \"color\"".
  const colorNormalizer = (() => {
    const probe = document.createElement('canvas').getContext('2d');
    return (value: string): string => {
      if (!value) return value;
      if (!/\b(color|color-mix|oklch|oklab|lab|lch)\(/i.test(value)) return value;
      try {
        if (!probe) return value;
        probe.fillStyle = '#000';
        probe.fillStyle = value;
        const normalized = probe.fillStyle;
        return typeof normalized === 'string' ? normalized : value;
      } catch {
        return value;
      }
    };
  })();
  const COLOR_PROPS = [
    'color',
    'background-color',
    'border-top-color',
    'border-right-color',
    'border-bottom-color',
    'border-left-color',
    'outline-color',
    'text-decoration-color',
    'caret-color',
    'fill',
    'stroke',
  ];

  const allNodes = [clone, ...Array.from(clone.querySelectorAll<HTMLElement>('*'))];
  const originalNodes = [element, ...Array.from(element.querySelectorAll<HTMLElement>('*'))];
  allNodes.forEach((node, idx) => {
    node.style.animation = 'none';
    node.style.transition = 'none';
    node.style.transform = 'none';
    node.style.backdropFilter = 'none';
    node.style.setProperty('-webkit-backdrop-filter', 'none');
    if (node.style.position === 'sticky') {
      node.style.position = 'relative';
      node.style.top = 'auto';
    }
    const original = originalNodes[idx];
    if (!original || !(original instanceof Element)) return;
    try {
      const computed = window.getComputedStyle(original);
      for (const prop of COLOR_PROPS) {
        const raw = computed.getPropertyValue(prop);
        const fixed = colorNormalizer(raw);
        if (fixed && fixed !== raw) {
          node.style.setProperty(prop, fixed, 'important');
        }
      }
      // background-image may hold gradients with color() stops
      const bgImage = computed.getPropertyValue('background-image');
      if (bgImage && /\b(color|color-mix|oklch|oklab|lab|lch)\(/i.test(bgImage)) {
        node.style.setProperty('background-image', 'none', 'important');
      }
    } catch {
      // ignore — leaving original styles is safer than crashing the walker
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
    // If the error is the known Tailwind-v4 color() / oklch() parser crash,
    // latch the skip flag so subsequent captures this session are silent
    // no-ops rather than repeatedly emitting the same warn. Report a single
    // info-level diagnostic from latchPngUnsupportedFromRuntimeError instead.
    if (isUnsupportedColorFnError(error)) {
      latchPngUnsupportedFromRuntimeError(captureError);
    } else {
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
