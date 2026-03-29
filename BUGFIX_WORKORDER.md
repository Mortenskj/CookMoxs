# BUGFIX_WORKORDER.md - CookMoxs Bug Repair Queue (v3, revalidated)

**Created:** 2026-03-29
**Revalidated against current codebase:** 2026-03-29
**Governs:** Focused bugfix session for issues discovered via code analysis + visual inspection
**Rules:** See `AGENT_REPAIR.md` - all session rules apply identically

---

## Repair principles (inherited from AGENT_REPAIR.md)

1. Only touch what this work order says.
2. One repair at a time, in numbered order.
3. Minimal delta per file - no reformatting, no drive-by improvements.
4. No new dependencies.
5. No business logic changes (AI prompts, Firestore rules, auth flow, etc.).
6. Health checks after each repair (`npm run build` must pass).
7. Report format per `AGENT_REPAIR.md` section 8.
8. If a repair fails, revert and report - do not cascade.
9. Do not combine repairs even if they touch the same file.
10. If a note below says "verify first", reproduction is required before code changes.

---

## Repair 1 - Infinite re-render loop in folder reconciliation

**Priority:** Critical (app can become unstable due to repeated state churn)  
**File:** `src/services/defaultFolderService.ts`

**Problem:** `reconcileDefaultFolderState` always allocates a new `folders` array and returns it inside `{ folders, recipes, defaultFolder }`, even when the normalized result is identical to the input. In `App.tsx:545-563`, the unauthenticated `useEffect` compares by reference via `nextFolders !== folders`, so a no-op allocation is enough to retrigger `setFolders` forever.

**Fix:** Keep the existing normalization logic, but preserve the original references when normalization is a no-op.

Implementation requirements:

1. Keep the existing logic that computes:
   - `defaultFolder`
   - `nextFolders`
   - `nextRecipes`
2. Before the final return, compare the normalized result with the input.
3. If `nextFolders` is identical in content and order to `folders`, and `nextRecipes` is identical in content and order to `recipes`, return:

```ts
{
  folders,
  recipes,
  defaultFolder: existingCanonicalFolder,
}
```

4. Otherwise return the normalized `nextFolders` / `nextRecipes` as before.

Constraints:

- Do not `return folders;` because the function returns an object, not an array.
- Do not short-circuit on only `name` and `isDefault`; this function also canonicalizes `id`, `ownerUID`, share fields, sort order, and recipe folder references.
- The goal is to avoid no-op allocations, not to skip normalization when normalization is actually needed.

**Do not change** `App.tsx` or any other file in this repair.  
**Verify:** App boots without `Maximum update depth exceeded` errors. Folder state stabilizes after first render.

---

## Repair 2 - Crash on "Stop" button in ActiveView

**Priority:** Critical (runtime crash on user action)  
**File:** `src/components/ActiveView.tsx`

**Problem:** The Stop button calls `onSave(null as any)`. The `onSave` prop maps to `handleSaveRecipe` in `App.tsx`, which expects a real recipe object and reads `recipe.id`, `recipe.isSaved`, etc. Passing `null` can crash the app.

**Fix:** Change the Stop button to use the existing navigation callback instead of attempting a save with null data.

Use the callback that already exists on this component:

```ts
onClick={() => onNavigate('home')}
```

The stop action should exit the active recipe view. Do not invent a new prop for this repair.

**Do not change** `App.tsx` or any other file in this repair.  
**Verify:** Click Stop in ActiveView. App returns to the home view without crashing.

---

## Repair 3 - Re-verify recipe prop sync before editing RecipeView

**Priority:** Verification only  
**File:** `src/components/RecipeView.tsx`

**Problem:** Earlier analysis flagged stale `editData`, but the current codebase already includes a `useEffect` that resyncs `editData`, `history`, and `historyIndex` when `recipe` changes and editing is not actively in progress.

**Fix:** Do not make a code change for this repair unless the bug is reproduced in the current branch.

Verification steps:

1. Open a recipe.
2. Trigger an AI adjust/fill action while not editing.
3. Confirm the updated recipe appears immediately.

If stale data still reproduces, stop and replace this repair entry with an exact reproduction note. Do not add a duplicate `useEffect` blindly.

**Do not change** `RecipeView.tsx` in this repair unless reproduction proves the current behavior is still broken.

---

## Repair 4 - useCallback dependencies are unstable (executeImportFlow)

**Priority:** Medium (performance - unnecessary callback recreation)  
**File:** `src/App.tsx`

**Problem:** `executeImportFlow` depends on `getAnalyticsContext` and `navigateTo`, but both are plain functions recreated every render. That weakens the value of `useCallback` and forces downstream callbacks such as `processQueuedItem` to recreate too.

**Fix:** Wrap `navigateTo` and `getAnalyticsContext` in `useCallback` at their definitions.

Implementation requirements:

1. Wrap `navigateTo` in `useCallback` with the correct dependencies.
2. Wrap `getAnalyticsContext` in `useCallback` with the correct dependencies.
3. Do not change the body or dependency array of `executeImportFlow` in this repair.

**Do not change** unrelated logic in `App.tsx`.  
**Verify:** `npm run build` passes. No functional change.

---

## Repair 5 - Edit history drift after shift

**Priority:** Medium (undo baseline can be lost after 20+ edits)  
**File:** `src/components/RecipeView.tsx`

**Problem:** In `updateEditData`, history is capped with `shift()`. Once the history exceeds 20 items, the original recipe state at index 0 is discarded, so full undo can no longer return to the original baseline.

**Fix:** Keep the original entry and discard the second-oldest entry instead.

Replace:

```ts
if (newHistory.length > 20) newHistory.shift();
```

With:

```ts
if (newHistory.length > 20) newHistory.splice(1, 1);
```

**Do not change** `undo` or `redo`.  
**Verify:** Make 25+ edits. Undo all the way back. The original recipe state is restored.

---

## Repair 6 - Dead code in server.ts (unreachable return statements)

**Priority:** Low  
**File:** `server.ts`

**Problem:** Several catch blocks return `res.status(failure.status)...` and then contain unreachable fallback `return res.status(500)...` statements plus unused `const err = error as any;` declarations. `parseAiJsonResponse` also returns immediately and then carries unreachable fallback parsing code below that return.

**Fix:** Remove only the unreachable code.

Scope:

- Remove the unreachable `return res.status(500)...` line from:
  - `/api/ai/generate-steps`
  - `/api/ai/fill-rest`
  - `/api/ai/generate-tips`
  - `/api/ai/apply-prefix`
  - `/api/ai/import`
- Remove the corresponding unused `const err = error as any;` declarations.
- Remove the unreachable code below the early return in `parseAiJsonResponse`.

**Do not change** the reachable error handling logic.  
**Verify:** `npm run build` passes. Server behavior is unchanged.

---

## Repair 7 - Dead code in App.tsx (parseAIError + dead conditional)

**Priority:** Low  
**File:** `src/App.tsx`

**Problem:**

1. `parseAIError` returns immediately, leaving the rest of the function unreachable.
2. `if (false && !user)` is dead code and can never execute.

**Fix:**

1. Remove the unreachable lines after the early return in `parseAIError`.
2. Remove the entire dead conditional block.

**Do not change** any surrounding logic.  
**Verify:** `npm run build` passes.

---

## Repair 8 - Duplicate IDs on manual recipe creation

**Priority:** Low (can cause React key collisions)  
**File:** `src/App.tsx`

**Problem:** Both manual recipe creation flows in `App.tsx` initialize the first ingredient and first step with the same `Date.now().toString()` value. Within the same millisecond, this can produce duplicate IDs.

**Fix:** Update both manual recipe creation blocks so ingredient and step IDs cannot collide.

Preferred pattern:

```ts
const baseId = Date.now().toString();
const ingredientId = `${baseId}-ingredient`;
const stepId = `${baseId}-step`;
```

Use any equally small deterministic variant if preferred, but apply it in both manual creation flows.

**Do not change** anything else in those blocks.  
**Verify:** Create a manual recipe from Import and from Library. In both flows, confirm `ingredient[0].id !== steps[0].id`.

---

## Repair 9 - Timer interval torn down every second

**Priority:** Low (performance - interval recreated 1x/sec)  
**File:** `src/App.tsx`

**Problem:** The timer `useEffect` depends on `[timers]`. Because `setTimers` creates a new array each second, the effect tears down and recreates the interval on every tick.

**Fix:** Use a ref for the current timers and drive the effect from a stable `hasActiveTimers` signal instead of the full `timers` array.

Implementation requirements:

```ts
const timersRef = useRef(timers);
timersRef.current = timers;
const hasActiveTimers = timers.some(t => t.active && t.remaining > 0);
```

Then:

1. Reference `timersRef.current` inside the interval callback.
2. Make the effect depend on `hasActiveTimers`, not `timers`.
3. Do not switch the dependency array to `[]`; new timers created after mount would not start the interval.

**Do not change** the timer logic or UI.  
**Verify:** Start a timer in cook mode. The timer still ticks correctly.

---

## Repair 10 - Bottom nav nearly invisible on some views

**Priority:** Low (visual - readability issue on warm backgrounds)  
**File:** `src/App.tsx`

**Problem:** The bottom nav relies mainly on the shared `glass-brushed` surface, whose background is theme-driven. On sparse views, contrast against the page background can be too weak.

**Fix:** Strengthen the nav directly in `App.tsx` by adding explicit background/backdrop utilities on the `<nav>` element itself.

Preferred direction:

- add a stronger explicit panel background such as `bg-white/70` and `dark:bg-black/70`
- keep the existing nav structure and theme classes
- do not modify global `index.css` in this repair

**Do not change** icons, labels, layout, or behavior.  
**Verify:** Navigate to sparse views such as Active/Home. Bottom nav remains readable against the background.

---

## Repair 11 - Content clipped behind bottom nav

**Priority:** Low  
**File:** Affected view root component(s) only - not `App.tsx` by default

**Problem:** The shared `<main>` container is not obviously missing bottom padding, and several views already have `pb-24` or `pb-32`. If clipping still occurs, it is likely view-specific rather than a shared layout bug.

**Fix:** Reproduce the issue first, then adjust only the affected view root wrapper(s), for example `ImportView.tsx` or `LibraryView.tsx`, if and only if the current padding is insufficient.

Rules:

1. Do not add blanket bottom padding to `App.tsx` unless reproduction proves the shared container is the source.
2. Prefer the smallest per-view padding adjustment that clears the fixed nav.
3. Change only the view(s) that actually reproduce the clipping.

**Do not change** unrelated view components.  
**Verify:** Scroll to the bottom of each affected view. The final card or CTA is fully visible above the nav.

---

## Post-repair notes (do not fix in this session)

- `createCloudSyncStatusHelpers` is called every render and could be memoized, but that touches cloud sync behavior and is out of scope here.
- `onStepChange` is intentionally excluded from deps in `CookView.tsx`; risk is low.
- `recipe!` non-null assertion in a CookView touch handler still exists, but practical risk is low.
- Some original repair notes were stale against the 2026-03-29 codebase. Re-verify before implementing any low-priority UI repair that depends on reproduction.
