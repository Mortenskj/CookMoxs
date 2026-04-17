// Runtime validation for heat-prose cleanup + core-temp guard.
// Replays the exact evidence strings from observer product_assertion warnings.
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
require('tsx/cjs');

const heur = require(resolve('src/services/cookModeHeuristics.ts'));
const norm = require(resolve('src/services/recipeStepNormalization.ts'));
const assertions = require(resolve('src/services/observer/recipeAssertions.ts'));

function testCase(label, step, expectations) {
  const recipe = {
    id: 'test',
    title: 'Beef Wellington',
    ingredients: [],
    steps: [step],
    folder: '', folderId: '', servings: 4, servingsUnit: 'personer',
    categories: [], isSaved: false, notes: '',
    flavorBoosts: [], pitfalls: [], hints: [], substitutions: [],
    heatGuide: [], ovenGuide: [], kitchenTimeline: [],
    lastUsed: '', createdAt: '', updatedAt: '',
  };
  const normalized = norm.normalizeRecipeForCookMode(recipe);
  const out = normalized.steps.find((s) => s.id === step.id) || normalized.steps[normalized.steps.length - 1];
  const asserts = assertions.collectRecipeObserverAssertions(normalized);

  console.log(`\n=== ${label} ===`);
  console.log('in : ', JSON.stringify(step.text));
  console.log('out: ', JSON.stringify(out.text));
  console.log('heat:', out.heat, '| heatLevel:', out.heatLevel);
  console.log('assertions:', asserts.map(a => a.assertion).join(', ') || '(none)');

  let ok = true;
  for (const [k, v] of Object.entries(expectations)) {
    if (k === 'noAssertion') {
      const hit = asserts.some(a => a.assertion === v);
      if (hit) { console.log(`  FAIL: assertion "${v}" fired`); ok = false; }
    } else if (k === 'textShouldNotContain') {
      for (const needle of v) {
        if (out.text.toLowerCase().includes(needle.toLowerCase())) {
          console.log(`  FAIL: text still contains "${needle}"`); ok = false;
        }
      }
    } else if (k === 'textShouldContain') {
      for (const needle of v) {
        if (!out.text.toLowerCase().includes(needle.toLowerCase())) {
          console.log(`  FAIL: text missing "${needle}"`); ok = false;
        }
      }
    } else if (k === 'heatEquals') {
      if (out.heat !== v) { console.log(`  FAIL: heat ${JSON.stringify(out.heat)} !== ${JSON.stringify(v)}`); ok = false; }
    }
  }
  console.log(ok ? '  PASS' : '  FAIL');
  return ok;
}

let allPass = true;

// --- From observer log: generate-steps stepIndex 8 ---
allPass = testCase('BW step 8 — duplicate_heat_signal', {
  id: 'step-bw-8',
  text: 'Tænd ovnen på 200°C (almindelig ovn). Sæt en tom bageplade eller et ildfast fad ind, så det bliver gennemvarmt før bagning.',
  heat: '200°C',
}, {
  heatEquals: '200°C',
  textShouldNotContain: ['200°C', '200 °C', '(almindelig ovn)'],
  textShouldContain: ['Tænd ovnen', 'bageplade'],
  noAssertion: 'duplicate_heat_signal',
}) && allPass;

// --- From observer log: generate-steps stepIndex 9 ---
allPass = testCase('BW step 9 — core temp must stay', {
  id: 'step-bw-9',
  text: 'Flyt din Beef Wellington over på den varme bageplade (behold bagepapiret under). Bag den i ovnen i ca. 50 minutter, indtil kernetemperaturen er præcis 53°C.',
  heat: '200°C',
}, {
  heatEquals: '200°C',
  // Core-temp sentence must survive untouched
  textShouldContain: ['kernetemperaturen er præcis 53°C'],
  noAssertion: 'core_temp_not_working_heat',
}) && allPass;

// --- From observer log: polish-ingredients stepIndex 11 ---
allPass = testCase('BW step 11 — oven + core temp mixed sentence', {
  id: 'step-bw-11',
  text: 'Stil den i en forvarmet ovn ved 200 grader, almindelig ovn, og steg den, til den når en kernetemperatur på 53 grader, - så er den flot rosa når den har trukket.',
  heat: '200°C',
}, {
  heatEquals: '200°C',
  // Oven temp in same sentence as kernetemperatur — we preserve the whole
  // sentence when core-temp is present (conservative: don't risk losing the 53°C).
  textShouldContain: ['kernetemperatur på 53 grader'],
  noAssertion: 'core_temp_not_working_heat',
}) && allPass;

// --- Core-temp alone must NOT promote to oven heat ---
allPass = testCase('Core temp only, no oven mention', {
  id: 'step-core',
  text: 'Tag den ud når kernetemperaturen rammer 53°C.',
  heat: undefined,
}, {
  heatEquals: undefined,
  textShouldContain: ['kernetemperaturen rammer 53°C'],
}) && allPass;

// --- Induktions-chip case (existing B2 regression) ---
allPass = testCase('Induktions-chip — strip (trin 4) prose', {
  id: 'step-ind',
  text: 'Brun kødet på panden ved middel varme (trin 4).',
  heatLevel: 4,
  heat: 'middel-lav varme',
}, {
  textShouldNotContain: ['(trin 4)', 'ved middel varme'],
  textShouldContain: ['Brun kødet'],
}) && allPass;

// --- Plain step without heat signal must be untouched ---
allPass = testCase('No heat signal — text untouched', {
  id: 'step-plain',
  text: 'Rør creme fraiche og persille sammen og krydr med salt.',
}, {
  textShouldContain: ['Rør creme fraiche og persille sammen og krydr med salt'],
}) && allPass;

// --- Real bug: core temp mis-assigned as step heat — assertion MUST still fire ---
{
  const recipe = {
    id: 't', title: 'T', ingredients: [],
    steps: [{ id: 's', text: 'Tag den ud når kernetemperaturen rammer 53°C.', heat: '53°C' }],
    folder: '', folderId: '', servings: 4, servingsUnit: 'personer',
    categories: [], isSaved: false, notes: '',
    flavorBoosts: [], pitfalls: [], hints: [], substitutions: [],
    heatGuide: [], ovenGuide: [], kitchenTimeline: [],
    lastUsed: '', createdAt: '', updatedAt: '',
  };
  const asserts = assertions.collectRecipeObserverAssertions(norm.normalizeRecipeForCookMode(recipe));
  const kinds = asserts.map(a => a.assertion);
  console.log('\n=== Real bug: core-temp as step heat ===');
  console.log('assertions:', kinds.join(', ') || '(none)');
  const ok = kinds.includes('core_temp_not_working_heat');
  console.log(ok ? '  PASS (assertion correctly fires)' : '  FAIL (assertion should have fired)');
  allPass = allPass && ok;
}

console.log('\n' + (allPass ? 'ALL PASS' : 'SOME FAIL'));
process.exit(allPass ? 0 : 1);
