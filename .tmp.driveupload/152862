import type { Recipe } from '../types';

function shouldTrackSavedRecipe(recipe: Recipe | null) {
  return Boolean(recipe && (recipe.isSaved || recipe.authorUID));
}

export function hasRecipeBeenRemoved(recipe: Recipe | null, savedRecipes: Recipe[]) {
  if (!recipe || !shouldTrackSavedRecipe(recipe)) {
    return false;
  }

  return !savedRecipes.some((savedRecipe) => savedRecipe.id === recipe.id);
}
