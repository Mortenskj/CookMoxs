import type { RecipeNutritionAttachment } from '../../types';
import type { NutritionLookupItem, NutritionLookupResult } from './nutritionLookupService';

export function createRecipeNutritionAttachment(
  result: NutritionLookupResult,
  item: NutritionLookupItem,
): RecipeNutritionAttachment {
  return {
    productId: item.id,
    title: item.title,
    brand: item.brand,
    barcode: item.barcode,
    mode: result.mode,
    query: result.query,
    attachedAt: new Date().toISOString(),
    nutrition: item.nutrition ? { ...item.nutrition } : undefined,
    provenance: { ...item.provenance },
  };
}

export function getRecipeNutritionConfidenceLabel(confidence: RecipeNutritionAttachment['provenance']['confidence']) {
  switch (confidence) {
    case 'high':
      return 'Hoj';
    case 'medium':
      return 'Middel';
    default:
      return 'Lav';
  }
}

export function getRecipeNutritionSummaryLine(attachment: RecipeNutritionAttachment) {
  const details = [
    attachment.provenance.providerLabel,
    `Sikkerhed: ${getRecipeNutritionConfidenceLabel(attachment.provenance.confidence)}`,
    attachment.provenance.isFallback ? 'Fallback-kilde' : null,
  ].filter(Boolean);

  return details.join(' · ');
}

export function getRecipeNutritionExplanation(attachment?: RecipeNutritionAttachment | null) {
  if (!attachment) {
    return 'Knyt evt. produktdata som vejledende reference. Det ændrer ikke ingredienser, trin eller portionsberegning.';
  }

  return attachment.provenance.isFallback
    ? 'Tallene er vejledende produktdata pr. 100 g fra en fallback-kilde. Kontroller emballagen, hvis det er vigtigt.'
    : 'Tallene er vejledende produktdata pr. 100 g fra den viste kilde. De er ikke automatisk omregnet til hele opskriften.';
}
