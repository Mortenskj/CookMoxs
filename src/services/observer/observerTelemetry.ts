import type { Recipe } from '../../types';
import { getRuntimeBuildInfo } from '../../config/runtimeBuildInfo';
import { reportObserverStructuredEvent } from '../observerClient';

export type ObserverFeature =
  | 'url_import'
  | 'text_import'
  | 'file_import'
  | 'image_import'
  | 'smart_adjust'
  | 'save_recipe';

export type ObserverUserState = 'guest' | 'authenticated';

function hashText(value: string) {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) + hash) ^ value.charCodeAt(index);
  }

  return (hash >>> 0).toString(16);
}

function normalizeText(value: string) {
  return value
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 2000);
}

export function buildTextObserverSignature(value?: string | null) {
  const normalized = normalizeText(value || '');
  if (!normalized) return null;
  return `txt:${normalized.length}:${hashText(normalized)}`;
}

export function buildRecipeObserverSignature(recipe?: Recipe | null) {
  if (!recipe) return null;

  const normalized = normalizeText([
    recipe.title,
    recipe.summary,
    (recipe.ingredients || []).map((ingredient) => {
      const amount = ingredient.amountText
        || (ingredient.amountMin != null && ingredient.amountMax != null
          ? `${ingredient.amountMin}-${ingredient.amountMax}`
          : ingredient.amount != null
            ? String(ingredient.amount)
            : '');
      return `${ingredient.group || ''}|${amount}|${ingredient.unit || ''}|${ingredient.name || ''}`;
    }).join(';'),
    (recipe.steps || []).map((step) => `${step.text || ''}|${step.heat || ''}|${step.heatLevel || ''}`).join(';'),
  ].filter(Boolean).join('||'));

  if (!normalized) return null;

  return `recipe:${recipe.ingredients?.length || 0}:${recipe.steps?.length || 0}:${hashText(normalized)}`;
}

function postObserverPayload(name: 'observer_pipeline' | 'observer_failure' | 'product_assertion', payload: Record<string, unknown>) {
  const runtime = getRuntimeBuildInfo();
  reportObserverStructuredEvent(name, {
    release: runtime.release,
    buildId: runtime.buildId,
    environment: runtime.environment,
    gitCommit: runtime.gitCommit,
    ...payload,
  });
}

export function recordObserverPipelineStage(params: {
  feature: ObserverFeature;
  stage: string;
  userState: ObserverUserState;
  durationMs?: number | null;
  recipeId?: string | null;
  sourceType?: string | null;
  fallbackUsed?: string | null;
  inputSignature?: string | null;
  outputSignature?: string | null;
  note?: string | null;
}) {
  postObserverPayload('observer_pipeline', {
    feature: params.feature,
    stage: params.stage,
    userState: params.userState,
    durationMs: params.durationMs ?? null,
    recipeId: params.recipeId ?? null,
    sourceType: params.sourceType ?? null,
    fallbackUsed: params.fallbackUsed ?? null,
    inputSignature: params.inputSignature ?? null,
    outputSignature: params.outputSignature ?? null,
    note: params.note ?? null,
  });
}

export function recordObserverFailure(params: {
  feature: ObserverFeature;
  stage: string;
  userState: ObserverUserState;
  errorCategory: string;
  errorCode?: string | null;
  durationMs?: number | null;
  recipeId?: string | null;
  sourceType?: string | null;
  fallbackUsed?: string | null;
  inputSignature?: string | null;
  outputSignature?: string | null;
}) {
  postObserverPayload('observer_failure', {
    feature: params.feature,
    stage: params.stage,
    userState: params.userState,
    errorCategory: params.errorCategory,
    errorCode: params.errorCode ?? null,
    durationMs: params.durationMs ?? null,
    recipeId: params.recipeId ?? null,
    sourceType: params.sourceType ?? null,
    fallbackUsed: params.fallbackUsed ?? null,
    inputSignature: params.inputSignature ?? null,
    outputSignature: params.outputSignature ?? null,
  });
}

export function recordObserverProductAssertion(params: {
  feature: ObserverFeature | string;
  assertion: string;
  recipeId?: string | null;
  recipeTitle?: string | null;
  stepIndex?: number | null;
  evidence?: string | null;
  heat?: string | null;
  note?: string | null;
}) {
  postObserverPayload('product_assertion', {
    feature: params.feature,
    assertion: params.assertion,
    recipeId: params.recipeId ?? null,
    recipeTitle: params.recipeTitle ?? null,
    stepIndex: params.stepIndex ?? null,
    evidence: params.evidence ?? null,
    heat: params.heat ?? null,
    note: params.note ?? null,
  });
}
