// Runtime validation for inferIngredientStructureGroups.
// Builds a tiny TS-on-the-fly bridge via tsx so we run the real source.
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
require('tsx/cjs'); // register TS loader for require()

const mod = require(resolve('src/services/ingredientStructureInference.ts'));
const { inferIngredientStructureGroups } = mod;

function run(label, ingredients) {
  const out = inferIngredientStructureGroups(ingredients.map((x, i) => ({ id: `i${i}`, group: 'Andre', ...x })));
  console.log(`\n=== ${label} ===`);
  for (const ing of out) {
    console.log(`  [${ing.group.padEnd(10)}] ${ing.name}`);
  }
}

// --- Pirog (dough + filling): expected SPLIT into Dej / Fyld ---
run('Pirog', [
  { name: 'hvedemel' },
  { name: 'tørgær' },
  { name: 'smør' },
  { name: 'mælk' },
  { name: 'salt' },
  { name: 'æg' },
  { name: 'hakket oksekød' },
  { name: 'løg' },
  { name: 'hvidløg' },
  { name: 'tomatpuré' },
  { name: 'persille' },
]);

// --- Frikadeller (single mass): expected UNCHANGED ---
run('Frikadeller', [
  { name: 'hakket svinekød' },
  { name: 'løg' },
  { name: 'æg' },
  { name: 'mel' },
  { name: 'rasp' },
  { name: 'mælk' },
  { name: 'salt' },
  { name: 'peber' },
]);

// --- Karbonader (single mass + flour): expected UNCHANGED ---
run('Karbonader', [
  { name: 'hakket svinekød' },
  { name: 'løg' },
  { name: 'æg' },
  { name: 'mel' },
  { name: 'smør' },
  { name: 'salt' },
]);

// --- Hakkebøf m. bløde løg (no flour): expected UNCHANGED ---
run('Hakkebøf', [
  { name: 'hakket oksekød' },
  { name: 'løg' },
  { name: 'salt' },
  { name: 'peber' },
  { name: 'smør' },
]);

// --- Gryderet m. creme fraiche: expected UNCHANGED (no Dej cluster) ---
run('Gryderet', [
  { name: 'hakket oksekød' },
  { name: 'løg' },
  { name: 'gulerod' },
  { name: 'tomat' },
  { name: 'creme fraiche' },
  { name: 'salt' },
]);

// --- Boller/brød (dough only, no filling): Dej-only, <2 structural? ---
run('Boller', [
  { name: 'hvedemel' },
  { name: 'tørgær' },
  { name: 'vand' },
  { name: 'salt' },
  { name: 'olie' },
]);

// --- Kanelsnegle (dough + filling + dressing) ---
run('Kanelsnegle', [
  { name: 'hvedemel' },
  { name: 'gær' },
  { name: 'sødmælk' },
  { name: 'smør' },
  { name: 'sukker' },
  { name: 'kardemomme' },
  { name: 'æg' },
  { name: 'brun farin' },
  { name: 'kanel' },
]);
