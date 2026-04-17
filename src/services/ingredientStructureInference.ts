import type { Ingredient } from '../types';

/**
 * Deterministic ingredient structure grouping.
 *
 * Motivation: Import paths (direct-parse from JSON-LD especially) flatten all
 * ingredients into a single generic "Andre" group. The AI polish layer can
 * recover structural groups (DEJ / FYLD / DRESSING / SERVERING), but we should
 * not require an extra API call for this. This module assigns the same
 * structural groups heuristically from ingredient names alone, so baseline
 * import already lands close to polish quality.
 *
 * Design rules:
 * - Only activates when the recipe has NO structural signal today (all
 *   ingredients fall into a generic-group label).
 * - Only emits groups when clusters are clearly present. If clusters aren't
 *   obvious, we leave everything as-is rather than guessing.
 * - Matches are whole-word-ish on normalized (lowercased, æøå-safe) name.
 */

const GENERIC_GROUP_LABELS = new Set(['', 'andre', 'andet', 'diverse', 'ingredienser', 'øvrigt', 'ovrigt']);

function normalize(value: string | undefined | null): string {
  return (value || '').toLowerCase().trim();
}

function hasWord(name: string, words: string[]): boolean {
  for (const w of words) {
    const re = new RegExp(`(^|[^a-zA-ZæøåÆØÅ])${w}([^a-zA-ZæøåÆØÅ]|$)`, 'i');
    if (re.test(name)) return true;
  }
  return false;
}

// Core markers — if present, recipe clearly has this component
const DEJ_CORE = ['mel', 'hvedemel', 'rugmel', 'speltmel', 'fuldkornsmel', 'gær', 'tørgær', 'bagepulver', 'natron', 'havregryn', 'marcipan'];
// Allies — only count as DEJ when a DEJ_CORE marker is also present
const DEJ_ALLIES = ['sukker', 'rørsukker', 'brun farin', 'farin', 'salt', 'smør', 'olie', 'vand', 'mælk', 'sødmælk', 'kærnemælk', 'æg', 'vanilje', 'vaniljesukker', 'kardemomme', 'kanel'];

// Core markers for filling/main mass
const FYLD_CORE = ['kød', 'fars', 'kødfars', 'oksekød', 'svinekød', 'hakket oksekød', 'hakket kød', 'kylling', 'kyllingebryst', 'kyllingefilet', 'fisk', 'laks', 'torsk', 'tun', 'rejer', 'bacon', 'spegepølse', 'chorizo', 'feta', 'mozzarella', 'emmentaler', 'cheddar', 'parmesan', 'parmesanost'];
// Allies — veg/aromatics, only classified as FYLD when a FYLD_CORE is present
const FYLD_ALLIES = ['løg', 'rødløg', 'skalotteløg', 'hvidløg', 'gulerod', 'selleri', 'tomat', 'tomater', 'peberfrugt', 'paprika', 'chili', 'kål', 'spinat', 'svamp', 'svampe', 'champignon', 'broccoli', 'blomkål', 'porre', 'ærter', 'majs', 'kartoffel', 'kartofler'];

// Sauce/dressing markers
const DRESSING_CORE = ['creme fraiche', 'crème fraîche', 'skyr', 'yoghurt', 'mayonnaise', 'mayo', 'ketchup', 'sennep', 'dressing', 'vinaigrette', 'aioli', 'hummus', 'pesto', 'sauce'];

// Serving / garnish markers
const SERVERING_CORE = ['frisk persille', 'frisk dild', 'friskhakket persille', 'friskhakket dild', 'persille til pynt', 'dild til pynt', 'garnish', 'til pynt', 'til servering', 'til anretning'];

function matchesAny(name: string, wordLists: string[][]): boolean {
  return wordLists.some((list) => hasWord(name, list));
}

function allGroupsAreGeneric(ingredients: Ingredient[]): boolean {
  return ingredients.every((ing) => GENERIC_GROUP_LABELS.has(normalize(ing.group)));
}

type StructuralGroup = 'Dej' | 'Fyld' | 'Dressing' | 'Servering' | null;

function classifySingle(ing: Ingredient, recipeHasDej: boolean, recipeHasFyld: boolean): StructuralGroup {
  const name = normalize(ing.name);
  if (!name) return null;

  // Explicit serving/garnish phrases take priority
  if (SERVERING_CORE.some((phrase) => name.includes(phrase))) return 'Servering';

  // Sauces/dressings
  if (hasWord(name, DRESSING_CORE)) return 'Dressing';

  // Dough core markers always count as Dej
  if (hasWord(name, DEJ_CORE)) return 'Dej';

  // Filling core markers always count as Fyld
  if (hasWord(name, FYLD_CORE)) return 'Fyld';

  // Allies — only classified when recipe has clear cluster
  if (recipeHasDej && !recipeHasFyld && hasWord(name, DEJ_ALLIES)) return 'Dej';
  if (recipeHasFyld && !recipeHasDej && hasWord(name, FYLD_ALLIES)) return 'Fyld';

  // If BOTH clusters exist (typical baked recipe with filling):
  // - ally ingredients with typical filling words → Fyld
  // - ally ingredients with typical dough words → Dej
  if (recipeHasDej && recipeHasFyld) {
    if (hasWord(name, FYLD_ALLIES)) return 'Fyld';
    if (hasWord(name, DEJ_ALLIES)) return 'Dej';
  }

  return null;
}

/**
 * Returns ingredients with structural groups assigned in-place when a clear
 * cluster is detected. If no cluster is detected, or if the recipe already has
 * non-generic groups, returns the input unchanged.
 */
export function inferIngredientStructureGroups(ingredients: Ingredient[]): Ingredient[] {
  if (!ingredients || ingredients.length === 0) return ingredients;

  // Respect existing structure — don't overwrite AI-polish or section-header groups.
  if (!allGroupsAreGeneric(ingredients)) return ingredients;

  // Cluster detection
  const hasDejCore = ingredients.some((ing) => hasWord(normalize(ing.name), DEJ_CORE));
  const hasFyldCore = ingredients.some((ing) => hasWord(normalize(ing.name), FYLD_CORE));

  // If no core markers at all, don't guess — leave ingredients as-is
  if (!hasDejCore && !hasFyldCore) return ingredients;

  const classified = ingredients.map((ing) => {
    const group = classifySingle(ing, hasDejCore, hasFyldCore);
    return group ? { ...ing, group } : ing;
  });

  // Require that at least 2 ingredients land in non-'Andet' groups total,
  // otherwise a single sauce/garnish mention shouldn't split the view.
  const structuralCount = classified.filter((ing) => !GENERIC_GROUP_LABELS.has(normalize(ing.group))).length;
  if (structuralCount < 2) return ingredients;

  // Anything still generic after classification → "Andet"
  return classified.map((ing) =>
    GENERIC_GROUP_LABELS.has(normalize(ing.group)) ? { ...ing, group: 'Andet' } : ing,
  );
}
