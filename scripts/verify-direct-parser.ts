import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseStructuredRecipeToRecipe } from '../src/services/recipeDirectParser.ts';

interface FixtureExpectations {
  title: string;
  ingredientCount: number;
  stepCount: number;
  requiredIngredientNames: string[];
  requiredCategories: string[];
  requiredTimerDurations: number[];
  requiresStovetopHeat: boolean;
  requiresOvenGuide: boolean;
}

interface ParserFixture {
  structuredRecipe: unknown;
  expectations: FixtureExpectations;
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const fixturePath = path.resolve(scriptDir, '../tests/fixtures/structuredRecipe.fixture.json');
const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8')) as ParserFixture;

const recipe = parseStructuredRecipeToRecipe(fixture.structuredRecipe, {
  sourceUrl: 'https://example.com/fixture-opskrift',
});

const {
  title,
  ingredientCount,
  stepCount,
  requiredIngredientNames,
  requiredCategories,
  requiredTimerDurations,
  requiresStovetopHeat,
  requiresOvenGuide,
} = fixture.expectations;

assert.equal(recipe.title, title, 'Title mismatch');
assert.equal(recipe.ingredients.length, ingredientCount, 'Ingredient count mismatch');
assert.equal(recipe.steps.length, stepCount, 'Step count mismatch');

const ingredientNames = recipe.ingredients.map((ingredient) => ingredient.name.toLowerCase());
for (const name of requiredIngredientNames) {
  assert(
    ingredientNames.some((ingredientName) => ingredientName.includes(name.toLowerCase())),
    `Missing ingredient containing "${name}"`,
  );
}

for (const category of requiredCategories) {
  assert(
    recipe.categories?.includes(category),
    `Missing category "${category}"`,
  );
}

for (const duration of requiredTimerDurations) {
  assert(
    recipe.steps.some((step) => step.timer?.duration === duration),
    `Missing timer duration ${duration}`,
  );
}

if (requiresStovetopHeat) {
  assert(
    recipe.steps.some((step) => Boolean(step.heat) && !(step.heat || '').toLowerCase().includes('ovn')),
    'Expected at least one stovetop heat hint',
  );
}

if (requiresOvenGuide) {
  assert(Array.isArray(recipe.ovenGuide) && recipe.ovenGuide.length > 0, 'Expected oven guide entries');
}

console.log(`verify:parser passed for ${path.basename(fixturePath)} (${recipe.steps.length} steps, ${recipe.ingredients.length} ingredients)`);
