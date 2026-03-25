import type { Recipe } from '../types';

export function mergeAutoImportEnhancement(baseRecipe: Recipe, enhancedRecipe: Recipe): Recipe {
  const now = new Date().toISOString();

  return {
    ...baseRecipe,
    ...enhancedRecipe,
    id: baseRecipe.id,
    title: enhancedRecipe.title || baseRecipe.title,
    folder: baseRecipe.folder,
    folderId: baseRecipe.folderId,
    isSaved: baseRecipe.isSaved,
    sourceUrl: baseRecipe.sourceUrl,
    authorUID: baseRecipe.authorUID,
    createdAt: baseRecipe.createdAt,
    lastUsed: now,
    updatedAt: now,
  };
}
