import type { Recipe } from '../types';
import { RECIPE_CACHE_NAME } from '../generated/buildInfo';

export const SAVED_RECIPES_CACHE_PATH = '/__recipe-cache/saved-recipes.json';
export const ACTIVE_RECIPE_CACHE_PATH = '/__recipe-cache/active-recipe.json';

const buildCacheRequest = (path: string) => new Request(path, { method: 'GET' });

const openRecipeCache = async (): Promise<Cache | null> => {
  if (typeof window === 'undefined' || !('caches' in window)) {
    return null;
  }

  try {
    return await window.caches.open(RECIPE_CACHE_NAME);
  } catch (error) {
    console.warn('Recipe cache could not be opened:', error);
    return null;
  }
};

const writeRecipeCache = async (path: string, payload: unknown) => {
  const cache = await openRecipeCache();
  if (!cache) return false;

  const request = buildCacheRequest(path);

  if (payload === null) {
    await cache.delete(request);
    return true;
  }

  await cache.put(
    request,
    new Response(JSON.stringify(payload), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    }),
  );

  return true;
};

const readRecipeCache = async <T>(path: string): Promise<T | null> => {
  const cache = await openRecipeCache();
  if (!cache) return null;

  const response = await cache.match(buildCacheRequest(path));
  if (!response) return null;

  try {
    return await response.json() as T;
  } catch (error) {
    console.warn('Recipe cache entry could not be parsed:', error);
    await cache.delete(buildCacheRequest(path));
    return null;
  }
};

export const cacheSavedRecipesForCookMode = async (recipes: Recipe[]) =>
  writeRecipeCache(SAVED_RECIPES_CACHE_PATH, recipes);

export const cacheActiveRecipeForCookMode = async (recipe: Recipe | null) =>
  writeRecipeCache(ACTIVE_RECIPE_CACHE_PATH, recipe);

export const loadCachedSavedRecipesForCookMode = async () =>
  readRecipeCache<Recipe[]>(SAVED_RECIPES_CACHE_PATH);

export const loadCachedActiveRecipeForCookMode = async () =>
  readRecipeCache<Recipe>(ACTIVE_RECIPE_CACHE_PATH);
