# CookMoxs — Repair Guide v2.2 for Codex

## Mission

Stabilize CookMoxs by:
- making Firebase / Firestore the only cloud story
- hardening server AI behavior and public URL fetching
- making cook mode deterministic and trustworthy
- removing stale state and cache leakage
- tightening docs, deploy config, and UI semantics so they all describe the same product

This is not a feature sprint. It is a correction and reliability pass.

---

# Non-negotiable product truths

1. **Firebase / Firestore is the only cloud backend.**
2. **All AI stays server-side.**
3. The core flow remains **Import → edit → cook → save**.
4. **Cook mode must prefer omission over misinformation.**
5. **Induction heat must be one exact value from 1 to 9, never a range.**
6. **Docs, deploy config, comments, and UI copy must tell the same story.**

---

# Priority order

## Phase -1 — Verify current external truth before touching code
## Phase 0 — Server AI/runtime hardening
## Phase 0.5 — Frontend failure handling and ErrorBoundary
## Phase 1 — Canonical cook-mode data contract + migration
## Phase 2 — Remove the Supabase ghost completely
## Phase 3 — Normalize the default-folder model
## Phase 4 — Narrow permission semantics to backend truth
## Phase 5 — Reduce `App.tsx` blast radius without risky rewrite
## Phase 6 — State/cache coherence hardening
## Phase 7 — Build, fixtures, and regression discipline

If time is constrained, **Phase -1 + 0 + 0.5 + 1 + 2** are the minimum acceptable repair set.

---

# Hard rules for Codex

## Do not speculate where intent is already known

Where this guide specifies:
- a model choice
- an error surface
- a migration behavior
- a heat mapping
- a trust order
- a UI narrowing decision

implement that exact behavior unless blocked by a concrete technical constraint.

## Prefer deterministic normalization over clever prompting

If a value matters to execution quality in cook mode, normalize it after AI output.
Do not rely on prompting alone.

## Prefer omission over misinformation

If confidence is low:
- do not show a heat hint
- do not show “Ingredienser nu”
- do not imply edit rights the backend does not truly allow

## Do not rewrite direct parsing unless the fixture proves it is broken

Old repair notes from earlier repo states must not be copied over blindly.
Use the fixture in Phase 7 to verify current parser behavior first.

---

# Required deliverables

Codex must produce:
1. updated code
2. updated docs
3. a concise phase-by-phase change summary
4. a regression checklist with pass/fail/could-not-verify
5. a list of user-visible behavior changes
6. a list of intentional non-changes / deferred risks

---

# Phase -1 — Verify current external truth before touching code

## Goal

Remove ambiguity around model codes and external assumptions before any implementation begins.

## Why

Model names have changed across Gemini releases. A repair guide must not lock in stale codes.

## Required actions

1. Verify current valid model codes against official Google AI docs at implementation time.
2. Record the verified codes in the change summary.
3. Update comments/docs so they match the verified codes.

## Current verified baseline for this repair pass

Documented baseline for this pass:
- `gemini-3.1-pro-preview`
- `gemini-3-flash-preview`
- `gemini-3-pro-preview` must **not** be introduced as a new target in this pass

Important instruction:
- if live verification against current official docs is possible during implementation, use the verified result and record it in the summary
- if live verification is **not** possible in the implementation environment, use the documented baseline codes above and explicitly mark them as **baseline-used / not re-verified live during implementation** in the final change summary

This avoids circular reasoning. Codex must not claim that a model code was re-verified if runtime/doc verification was not actually possible.

## Acceptance criteria

- No implementation step depends on an unverified ad hoc model string.
- The final code uses only model IDs from one central config file.
- The final summary clearly states one of: `live-verified` or `baseline-used-not-live-verified`.

---

# Phase 0 — Server AI/runtime hardening

## Goal

Make the AI layer predictable enough that failures are categorized, model IDs are centralized, and the server no longer depends on fragile assumptions like `result.text` always being present.

## Files likely in scope

- `server.ts`
- new config file such as `src/config/serverAiModels.ts`
- new server utility such as `src/server/utils/aiResponse.ts`
- new server utility such as `src/server/utils/urlSafety.ts`

## Required changes

### 0.1 Centralize model IDs

Create one server-side model config.

Minimum shape:
- `ADJUST_MODEL`
- `DEFAULT_STRUCTURED_MODEL`
- `IMPORT_MODEL`
- optional `MODEL_DOC_COMMENT` / explanatory comment

### 0.2 Use the currently verified model choices

Use this default unless a strong route-specific reason exists:
- `ADJUST_MODEL = gemini-3.1-pro-preview`
- `DEFAULT_STRUCTURED_MODEL = gemini-3-flash-preview`
- `IMPORT_MODEL = gemini-3-flash-preview`

Do not leave ad hoc strings inline inside route handlers.

### 0.3 Harden AI response extraction

Create a helper that:
- safely reads text from the SDK response
- catches getter/runtime exceptions
- treats null / undefined / empty string as a structured failure
- returns categorized server errors such as:
  - `ai_model_error`
  - `ai_transport_error`
  - `ai_empty_response`
  - `ai_parse_error`

### 0.4 Harden JSON parsing

`parseAiJsonResponse` must:
- reject empty input cleanly
- keep fenced-JSON extraction if useful
- not crash on malformed output
- throw categorized errors, not generic ambiguous errors

### 0.5 Stop leaking API-key prefixes in logs

Allowed startup logging:
- `configured`
- `MISSING`

Not allowed:
- any substring or masked prefix of `GEMINI_API_KEY`

### 0.6 Harden URL fetching

`fetchRecipeSource` must:
- reject non-http/https
- reject obvious private/local targets
- disable blind redirect following
- inspect each redirect hop manually
- re-run safety checks for every redirect hop
- keep timeout and connection error handling

If DNS rebinding hardening is still out of scope, document that as residual risk. Redirect hardening is required now.

## Acceptance criteria

- Model IDs live in one place only
- No route handler contains ad hoc model strings
- API key prefixes are not logged
- Empty or malformed AI responses become categorized failures
- Redirect-based SSRF exposure is materially reduced

---

# Phase 0.5 — Frontend failure handling and ErrorBoundary

## Goal

Make failure states predictable for users instead of leaving hanging spinners or white screens.

## Files likely in scope

- `src/App.tsx`
- `src/main.tsx`
- `src/services/aiService.ts`
- `src/components/ImportView.tsx`
- any view that triggers AI actions
- new `src/components/ErrorBoundary.tsx`

## Required changes

### 0.5.1 Add a minimal React ErrorBoundary

Wrap the app root with an ErrorBoundary that:
- prevents a total white screen
- shows a simple fallback panel
- offers a reload action
- logs the error to console in development

### 0.5.2 Standardize async failure handling for AI actions

The minimum AI-triggering flows that must be covered explicitly are:
- import
- adjust
- generate-steps
- fill-rest
- apply-prefix
- generate-tips

For all of those flows:
- `loading` / `adjusting` must always be reset in `finally`
- user-visible errors must flow through the existing error state instead of browser alerts
- the user message must be specific enough to distinguish:
  - AI unavailable
  - invalid model / server misconfiguration
  - malformed model response
  - network / fetch failure

### 0.5.3 No hanging loading states

If the server fails, the relevant screen must return to an interactive state.
No permanent spinner.

## Acceptance criteria

- App root has an ErrorBoundary
- AI failures return control to the user
- Existing screens show concrete error messages instead of silent failure or permanent loading

---

# Phase 1 — Canonical cook-mode data contract + migration

## Goal

Make cook mode deterministic by defining canonical step metadata and migrating both new and existing recipes into that contract.

## Files likely in scope

- `src/types.ts`
- `src/components/CookView.tsx`
- `src/services/cookModeHeuristics.ts`
- new `src/services/recipeStepNormalization.ts`
- `src/services/recipeImportService.ts`
- `src/services/localDataService.ts`
- `src/services/firestoreDataService.ts`
- `server.ts`
- any backup restore/import path

## Required data contract

### 1.1 Extend `Step`

Add canonical exact heat metadata.

Minimum new fields:
- `heatLevel?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9`
- `heatSource?: 'ai' | 'heuristic' | 'migrated'`

Keep `heat?: string` only as a human-readable explanation / legacy bridge, not as the source of truth.

### 1.2 Canonical induction mapping

The exact numeric mapping for this repair pass is:
- `svag varme` / very gentle heat cues → `2`
- `lav varme` / `simr` / `lad simre` / `skru ned og lad simre` → `3`
- `middel varme` / `middelvarme` → `5`
- `middel-høj` / `middelhoej` / similar sauté / strong frying cues → `7`
- `høj varme` / hard browning cues → `8`
- `bring i kog` / `kog op` → `9`

If only oven heat is detected, do not set `heatLevel`.

### 1.3 UI display rule

Cook mode must display:
- `Induktion 2/9`
- `Induktion 3/9`
- `Induktion 5/9`
- `Induktion 7/9`
- `Induktion 8/9`
- `Induktion 9/9`

Not allowed:
- `2-3/9`
- `5-6/9`
- `7-8/9`
- vague labels without an exact numeric value

### 1.4 Relevant-ingredient trust order

For each step, the trust order must be:
1. validate existing `step.relevantIngredients`
2. if invalid or low-confidence, recompute from step text
3. if confidence is still low, show no ingredient hint

### 1.5 Validation rule for `relevantIngredients`

A step like `Brun kødet af` must not show `Løg` unless onion is actually relevant to that step text.

Low-confidence or stale AI ingredient hints must be discarded.

### 1.6 Migration for existing recipes

This is mandatory.

Create a normalization function such as:
- `normalizeRecipeForCookMode(recipe)`
- or `normalizeRecipeStepsForCookMode(recipe)`

It must run:
- when loading recipes from local storage
- when receiving recipes from Firestore listeners
- when hydrating **shared** recipes loaded through folder-sharing / shared-recipe listeners
- when restoring backup data
- when importing a recipe
- after AI-generated or AI-adjusted recipe data enters the app

Migration targets include at minimum:
- legacy `heat` ranges like `5-6/9`
- vague `heat` strings like `middel varme`
- stale or clearly irrelevant `relevantIngredients`
- missing `heatLevel` on otherwise inferable stovetop steps

### 1.7 Do not guess on low-confidence steps

If heat cannot be inferred with reasonable confidence:
- leave `heatLevel` empty
- optionally keep a human-readable `heat` note for non-cook contexts
- do not invent a numeric value

## Acceptance criteria

- Cook mode shows exact single induction values only
- Existing recipes are normalized on load, not only new recipes
- “Ingredienser nu” never shows clearly irrelevant items for the current step
- Low-confidence metadata is omitted instead of guessed

---

# Phase 2 — Remove the Supabase ghost completely

## Goal

Make Firebase / Firestore the only backend story in code, docs, config, and project artifacts.

## Files likely in scope

- `README.md`
- `render.yaml`
- repo comments mentioning Supabase
- any leftover `supabase/` directory or files
- `firebase-applet-config.json`
- `firebase-blueprint.json`

## Required changes

### 2.1 Remove Supabase references

Remove or rewrite all references that present Supabase as current or optional runtime infrastructure.

### 2.2 Fix deploy docs/config

`render.yaml` and README must describe Firebase/Firestore reality.
Do not leave `SUPABASE_URL` or `SUPABASE_ANON_KEY` in deploy instructions.

### 2.3 Handle Firebase artifact files explicitly

Do not ignore these root files:
- `firebase-applet-config.json`
- `firebase-blueprint.json`

Required outcome:
- either keep and document their role clearly
- or remove them if they are obsolete / misleading

No ambiguous orphan artifacts.

### 2.4 Dependency guardrail for this pass

Do **not** perform opportunistic dependency churn in this repair pass.

Rules:
- do not remove `firebase` just because `server.ts` does not import it; it is part of the client runtime
- do not add, remove, or reshuffle unrelated packages unless required by a concrete code change in this repair
- if dead Supabase packages exist, remove them and mention that explicitly in the summary
- if no Supabase packages exist, state that clearly and leave the dependency list stable

## Acceptance criteria

- Repo docs and config describe Firebase/Firestore only
- Supabase env vars are removed from deploy docs/config
- root-level Firebase artifact files are either documented or removed intentionally
- dependency changes are minimal and justified

---

# Phase 3 — Normalize the default-folder model

## Goal

Stop creating the logical default folder through multiple ID schemes.

## Files likely in scope

- `src/App.tsx`
- `src/services/localDataService.ts`
- any folder creation helpers

## Required changes

1. Introduce one canonical helper for default-folder identity.
2. Use the same identity strategy in guest mode, logged-in mode, direct import, and reconciliation paths.
3. Reconcile legacy duplicate default-folder identities safely.

## Acceptance criteria

- one canonical default-folder identity strategy
- no duplicate logical “Ikke gemte” folders caused by divergent ID patterns

---

# Phase 4 — Narrow permission semantics to backend truth

## Goal

Do not let the UI promise collaborative edit behavior that Firestore rules do not truly support.

## Files likely in scope

- `firestore.rules`
- `src/services/firestoreDataService.ts`
- `src/services/folderPermissionService.ts`
- `src/App.tsx`
- `src/components/LibraryView.tsx`
- any share dialog or folder settings UI

## Required product decision for this repair pass

Unless recipe-write rules are expanded and fully tested in the same pass, **sharing UI must be narrowed to view-only semantics**.

### Concrete UI changes required

1. Remove the viewer/editor role picker from user-facing sharing UI for this pass.
2. Any existing share action must create view-only sharing.
3. Replace labels implying edit rights with labels implying visibility only.
4. On folders not owned by the current user:
   - hide or disable rename controls
   - hide or disable delete controls
   - hide or disable permission-mode mutation controls
   - do not imply recipe mutation rights
5. Any copy like `Kan redigere`, `editor`, `shared edit`, or similar must be removed from user-facing UI unless backend support is proven and tested.

### Important rule

Do not silently leave backend-unsupported editor semantics in the UI just because the data model has `viewer` / `editor` types.
Product truth beats schema breadth.

## Acceptance criteria

- share UI exposes view-only semantics unless rule expansion is implemented and verified
- no label implies recipe edit rights the backend denies
- non-owners do not see destructive or mutating controls they cannot reliably use

---

# Phase 5 — Reduce `App.tsx` blast radius without risky rewrite

## Goal

Lower coupling by extracting only the most error-prone logic clusters.

## Files likely in scope

- `src/App.tsx`
- new helpers/hooks

## Required extraction targets

Extract only where it reduces risk clearly:
1. default-folder reconciliation helpers
2. cloud sync status helpers
3. recipe normalization entry points
4. active-recipe cleanup helpers

Do not perform a large architectural rewrite in this pass.

## Acceptance criteria

- `App.tsx` no longer owns the most fragile normalization/reconciliation logic inline
- no broad rewrite that expands regression risk

---

# Phase 6 — State/cache coherence hardening

## Goal

Prevent stale recipe state from leaking into cook mode, local cache, or service-worker-backed caches.

## Files likely in scope

- `src/App.tsx`
- `src/services/recipeCacheService.ts`
- `src/services/localDataService.ts`
- `public/sw.js`
- `src/main.tsx`
- any service-worker update helper

## Required changes

### 6.1 Active-recipe cleanup on delete

If the currently active recipe is deleted:
- clear active recipe state
- clear persisted active-recipe cache/local representation
- do not leave cook mode pointing at removed data

### 6.2 Viewed-recipe cleanup on delete

If the currently viewed recipe is deleted:
- clear or redirect predictably
- do not keep stale recipe view mounted

### 6.3 Cache version strategy must be explicit and build-driven

Do not leave cache-version bumps as a manual ritual.

Required implementation direction:
- derive service-worker cache version from `package.json` version at build time
- derive recipe-cache version from the same source or from a single shared version constant
- implement this via a build/prebuild step or generated file, not by hoping a human remembers to update two strings

Minimum acceptable approach:
- a script such as `scripts/sync-cache-version.mjs` reads `package.json`
- rewrites or generates the cache version consumed by `public/sw.js`
- the same source is used by the app version surface where practical

### 6.4 No stale normalized payload carryover

A new build or new normalization logic must not keep incompatible stale recipe payloads alive behind old cache names.

## Acceptance criteria

- deleting the active recipe clears active state and persisted active cache
- stale recipe view does not survive deletion
- service-worker and recipe-cache versioning are tied to one build-driven source of truth

---

# Phase 7 — Build, fixtures, and regression discipline

## Goal

Make verification reproducible instead of relying on internet-dependent smoke tests or memory.

## Files likely in scope

- `package.json`
- `README.md`
- fixture files under a new `tests/fixtures/` or `src/test-fixtures/`
- optional lightweight scripts for validation
- `src/services/recipeDirectParser.ts` only if fixture proves failure

## Required changes

### 7.1 Add strict build path

Add scripts such as:
- `typecheck`
- `build:strict` = typecheck + build

If a prebuild cache-version sync script is added, wire it into the build path.

### 7.2 Add parser fixture instead of website-dependent test instructions

Create at least one local structured-recipe fixture, for example:
- `tests/fixtures/structuredRecipe.fixture.json`

It must include:
- Danish ingredient names with `æ`, `ø`, `å`
- multiple steps in a realistic structured recipe shape
- at least one stovetop step and one oven step
- enough content to verify ingredient parsing, step splitting, heat inference, and timer inference

### 7.3 Add explicit direct-parser verification rule

Before editing `src/services/recipeDirectParser.ts`, verify it against the local fixture.

Rules:
- if the parser passes the fixture, do not perform speculative parser rewrites based on old notes
- if the fixture fails, fix only the observed failure and document it

### 7.4 Add explicit manual regression checklist

Minimum checks:
1. app boots without white screen
2. guest user can save locally
3. URL import with local fixture path / mocked structured data succeeds
4. AI route failure returns user-safe error and no hanging spinner
5. exact induction heat displays as one number, not a range
6. a step like `Brun kødet af` does not show irrelevant onion-only hint
7. deleting the active recipe clears active state
8. docs and render config mention Firebase, not Supabase

## Acceptance criteria

- strict build path exists
- local fixture exists
- parser changes are fixture-driven, not speculative
- regression checklist is explicit and reproducible

---

# Explicit non-goals for this pass

- no broad backend redesign
- no speculative rule expansion for collaborative recipe editing unless fully implemented and tested
- no large UI redesign
- no attempt to make cook mode “smart” beyond deterministic, trustworthy execution hints

---

# Definition of done

The repair is only done when all of the following are true:

1. Firebase/Firestore is the only backend story in code + docs + deploy config.
2. AI model IDs are centralized and verified.
3. Server AI failures are categorized and safe.
4. The app has an ErrorBoundary and no hanging AI spinners.
5. Cook mode shows exact single induction values only.
6. Existing recipes are normalized on load.
7. “Ingredienser nu” does not show clearly irrelevant items.
8. Default-folder identity is consistent.
9. Permission UI no longer overpromises.
10. Deleted recipes do not leak into active/view/cache state.
11. Cache versioning is build-driven.
12. A local fixture and a strict build path exist.

---

# Appendix A — Expanded manual smoke test checklist

Codex must include this checklist in the final report and mark each item as:
- `pass`
- `fail`
- `could-not-verify`

If an item depends on runtime infrastructure unavailable in the implementation environment, mark `could-not-verify` instead of claiming success.

## Guest mode

1. App boots without white screen.
2. Guest user can create a manual recipe.
3. Guest user can save locally without being redirected into an auth-only flow.
4. Guest user can reopen the saved recipe after reload.
5. If the active recipe is deleted, active state is cleared and cook mode does not point at stale data.

## AI flows

6. Import failure returns the screen to an interactive state and shows a user-safe error.
7. Adjust failure returns the screen to an interactive state and shows a user-safe error.
8. Generate-steps failure returns the screen to an interactive state and shows a user-safe error.
9. Fill-rest failure returns the screen to an interactive state and shows a user-safe error.
10. Apply-prefix failure returns the screen to an interactive state and shows a user-safe error.
11. Generate-tips failure returns the screen to an interactive state and shows a user-safe error.

## Cook mode correctness

12. A stovetop step normalized as low heat displays one exact value such as `Induktion 3/9`, never a range.
13. A gentle / `svag varme` step can display `Induktion 2/9` when that cue is present.
14. A simmer step (`simr`, `lad simre`, `skru ned og lad simre`) can display `Induktion 3/9`.
15. A boil cue displays `Induktion 9/9`.
16. An oven step displays oven temperature and does not invent `heatLevel`.
17. A step like `Brun kødet af` does not show an obviously irrelevant onion-only ingredient hint.
18. When confidence is low, cook mode omits the ingredient hint rather than guessing.

## Shared / cloud semantics

19. Shared recipes loaded through listeners also pass through normalization before cook mode uses them.
20. Non-owners do not see rename/delete/permission mutation controls that imply unsupported edit rights.
21. Share UI presents view-only semantics in this repair pass.

## Repo / deploy truth

22. README and deploy config mention Firebase/Firestore, not Supabase.
23. Service-worker cache versioning is tied to a build-driven source of truth.
24. Local structured fixture exists and parser verification is reported against it.
