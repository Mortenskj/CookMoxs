# REPAIR_GUIDE.md — CookMoxs Bug Repair Queue

**Created:** 2026-03-25  
**Governs:** One-time repair session before resuming PLAN.md  
**Rules:** See `AGENT_REPAIR.md`

---

## Repair 1 — AI diagnostics startup log

**Priority:** Critical (blocks diagnosis of all AI issues)  
**File:** `server.ts`  
**Problem:** There is no way to confirm whether GEMINI_API_KEY is present at startup. All AI endpoints fail silently if the key is missing, and the frontend remembers the failure for the entire session.  
**Fix:** Add a single console.log line right before the `startServer()` call at the bottom of `server.ts`:
```ts
console.log(`[startup] GEMINI_API_KEY is ${process.env.GEMINI_API_KEY ? 'configured (' + process.env.GEMINI_API_KEY.slice(0, 6) + '...)' : 'MISSING'}`);
```
**Do not change** anything else in server.ts.  
**Verify:** `npm run build` passes. Deploy to Render and check logs for the startup message.

---

## Repair 2 — Ingredient parser splits Danish words

**Priority:** Critical  
**File:** `src/services/recipeDirectParser.ts`  
**Problem:** The `parseIngredient` function uses `\b` (word boundary) in the unit regex. JavaScript regex treats Danish characters (ø, æ, å) as non-word characters, so "Løg" becomes unit "l" + name "øg", "Ærter" becomes unit "" but "Dåse" splits wrong, etc.  
**Fix in `parseIngredient`:**

1. Sort the `allowedUnits` array longest-first so "dl" is tried before "l", "spsk" before "stk", etc.
2. Replace `\\b` with `(?=\\s|$)` so a unit is only recognized when followed by whitespace or end-of-string.

Change this:
```ts
const unitMatch = remainder.match(new RegExp(`^(${allowedUnits.join('|')})\\b\\.?\\s*(.*)$`, 'i'));
```

To this:
```ts
const sortedUnits = [...allowedUnits].sort((a, b) => b.length - a.length);
const unitMatch = remainder.match(new RegExp(`^(${sortedUnits.join('|')})(?=\\s|$)\\.?\\s*(.*)$`, 'i'));
```

**Do not change** anything else in recipeDirectParser.ts in this repair.  
**Verify:** "1 Løg" → amount: 1, unit: "", name: "Løg". "2 dl Mælk" → amount: 2, unit: "dl", name: "Mælk". "500 g Hakket oksekød" → amount: 500, unit: "g", name: "Hakket oksekød". "3 dåse Hakkede tomater" → amount: 3, unit: "dåse", name: "Hakkede tomater".

---

## Repair 3 — Print page is nearly blank

**Priority:** Critical  
**File:** `src/index.css`  
**Problem:** The root `<div>` in App.tsx has `h-screen overflow-hidden`, which clips all content below the viewport fold during print. The existing `@media print` rules in index.css do not override this.  
**Fix:** Inside the existing `@media print` block at the bottom of `src/index.css`, add these rules **at the top** of that block (before the existing print rules):

```css
/* Undo viewport clipping for print */
.h-screen,
.overflow-hidden,
.overflow-y-auto {
  height: auto !important;
  max-height: none !important;
  overflow: visible !important;
}

.flex-1 {
  flex: none !important;
}

.flex.flex-col {
  display: block !important;
}

#root,
#root > div,
main {
  height: auto !important;
  overflow: visible !important;
  display: block !important;
}

.fixed {
  position: static !important;
}

nav,
.z-50,
.z-40,
.pointer-events-none,
.timer-widget {
  display: none !important;
}

.herbal-pattern {
  background-image: none !important;
}

.bg-noise {
  display: none !important;
}

.glass-brushed::before {
  display: none !important;
}
```

**Do not remove or move** the existing print rules already present in the file. Only prepend the new rules above them.  
**Verify:** Open a recipe, press Ctrl+P / print button. The full recipe (title, all ingredients, all steps) should be visible in print preview. No floating timers, no navigation bar, no glass/noise backgrounds.

---

## Repair 4 — Local save redirects to settings

**Priority:** Critical  
**File:** `src/App.tsx`  
**Problem:** `handleSaveRecipe` rejects all saves and calls `navigateTo('settings')` when the user is not authenticated. This means guest/local users cannot save anything — they get kicked to settings.  
**Fix:** Replace the early return at the top of `handleSaveRecipe`. When there is no logged-in user, save locally instead of blocking.

Change this block:
```ts
const handleSaveRecipe = async (recipe: Recipe) => {
    if (!user) {
      setError("Du skal være logget ind for at gemme opskrifter.");
      navigateTo('settings');
      return;
    }
```

To:
```ts
const handleSaveRecipe = async (recipe: Recipe) => {
    if (!user) {
      const updatedRecipe: Recipe = {
        ...recipe,
        isSaved: true,
        createdAt: recipe.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setSavedRecipes(prev => {
        const index = prev.findIndex(r => r.id === recipe.id);
        const next = index >= 0
          ? prev.map(r => r.id === recipe.id ? updatedRecipe : r)
          : [updatedRecipe, ...prev];
        saveLocalRecipes(next);

        const updatedFolders = mergeMissingFoldersFromRecipes(next, folders);
        if (updatedFolders !== folders) {
          setFolders(updatedFolders);
          saveLocalFolders(updatedFolders);
        }

        return next;
      });

      if (viewingRecipe?.id === recipe.id) {
        setViewingRecipe(updatedRecipe);
      }
      if (activeRecipe?.id === recipe.id) {
        saveActiveRecipe(updatedRecipe);
      }

      trackEvent('recipe_saved', {
        ...getAnalyticsContext(),
        recipeId: updatedRecipe.id,
        folderId: updatedRecipe.folderId || null,
      });
      return;
    }
```

**Do not change** any other part of `handleSaveRecipe`. The authenticated cloud path below stays exactly as-is.  
**Verify:** Log out. Import or create a recipe. Edit it and press "Gem ændringer". You should stay on the recipe view. The recipe should appear in the library.

---

## Repair 5 — Deleted recipe stays in "I gang nu"

**Priority:** Critical  
**File:** `src/App.tsx`  
**Problem:** `handleDeleteRecipe` clears `viewingRecipe` when it matches the deleted recipe, but never clears `activeRecipe`. The ActiveView still shows the deleted recipe.  
**Fix:** In `handleDeleteRecipe`, immediately after the existing `viewingRecipe` cleanup block:

```ts
if (viewingRecipe?.id === recipeId) {
  setViewingRecipe(null);
  navigateTo('home');
}
```

Add:
```ts
if (activeRecipe?.id === recipeId) {
  saveActiveRecipe(null);
}
```

**Do not change** anything else in handleDeleteRecipe.  
**Verify:** Start cook mode on a recipe. Go back to recipe view. Delete it. Navigate to "I gang" — it should show the empty state, not the deleted recipe.

---

## Repair 6 — Direct parse creates only 1 step

**Priority:** High  
**File:** `src/services/recipeDirectParser.ts`  
**Problem:** Many Danish recipe sites provide `recipeInstructions` as one concatenated string instead of an array of HowToStep objects. The parser treats it as a single step.  
**Fix:** Add a helper function before `parseStructuredRecipeToRecipe`:

```ts
function splitLongInstructionText(texts: string[]): string[] {
  if (texts.length !== 1) return texts;
  const single = texts[0];

  // Split on numbered patterns: "1. ", "1) ", "Trin 1"
  const numberedParts = single.split(/(?<=\.)\s+(?=\d+[\.\)]\s)|(?=(?:Trin|Step)\s+\d+)/i)
    .map(s => normalizeText(s))
    .filter(Boolean);
  if (numberedParts.length > 1) return numberedParts;

  // Split on sentence-ending period followed by a capital letter with extra whitespace
  const sentenceParts = single.split(/\.\s{2,}(?=[A-ZÆØÅ])|\.(?:\s*\n)+(?=[A-ZÆØÅ])/)
    .map((s, i, arr) => normalizeText(i < arr.length - 1 ? s + '.' : s))
    .filter(Boolean);
  if (sentenceParts.length > 1) return sentenceParts;

  // Last resort: split on period-space-capital if the text is very long
  if (single.length > 300) {
    const longSplit = single.split(/\.(?:\s)(?=[A-ZÆØÅ])/)
      .map((s, i, arr) => normalizeText(i < arr.length - 1 ? s + '.' : s))
      .filter(Boolean);
    if (longSplit.length > 1) return longSplit;
  }

  return texts;
}
```

Then in `parseStructuredRecipeToRecipe`, change:
```ts
const instructionTexts = collectInstructionTexts(recipeNode.recipeInstructions);
```
To:
```ts
const instructionTexts = splitLongInstructionText(collectInstructionTexts(recipeNode.recipeInstructions));
```

**Do not change** `collectInstructionTexts` itself.  
**Verify:** `curl -X POST http://localhost:3000/api/parse-direct -H "Content-Type: application/json" -d '{"url":"https://www.valdemarsro.dk/lasagne/"}'` should return more than 1 step.

---

## Repair 7 — AppUpdateToast never renders

**Priority:** High  
**File:** `src/App.tsx`  
**Problem:** `AppUpdateToast` is imported, and `useServiceWorkerUpdate()` returns `{ updateAvailable, applyUpdate, dismiss }`, but the component is never rendered in JSX. Users never see update notifications.  
**Fix:** In the JSX, add the toast right after the existing `<PendingQueueToast />` component:

```tsx
{updateAvailable && (
  <AppUpdateToast onUpdate={applyUpdate} onDismiss={dismiss} />
)}
```

**Do not change** AppUpdateToast.tsx or useServiceWorkerUpdate.ts.  
**Verify:** `npm run build` passes. The toast exists in the component tree (inspect with React devtools or verify the JSX is present in source).

---

## Repair 8 — Offline banner shows in Cook Mode

**Priority:** High  
**File:** `src/App.tsx`  
**Problem:** The offline warning banner renders inside `<main>` before the view switch. It shows in Cook Mode, which should be distraction-free.  
**Fix:** Change the offline banner condition from:

```tsx
{!isOnline && (
```

To:

```tsx
{!isOnline && currentView !== 'cook' && (
```

**Do not change** the banner content or styling.  
**Verify:** Enter cook mode while offline (disable network in devtools). The offline banner should not appear inside cook mode.

---

## Repair 9 — UI layout: edit mode servings inputs overflow

**Priority:** High  
**File:** `src/components/RecipeView.tsx`  
**Problem:** In edit mode, the servings container has `w-full sm:w-24` (96px on small-medium screens), but the two children are `w-12` (48px) + `w-16` (64px) + gap-2 (8px) = 120px total. This causes clipping or overflow on mobile where the + and unit field are hidden or cut off.  
**Fix:** Change the servings container width and the child input widths in the edit mode section.

Find this in the edit mode JSX:
```tsx
<div className="w-full sm:w-24">
  <label className="text-xs font-bold text-forest-mid dark:text-white/70 uppercase tracking-[0.2em] block mb-2 opacity-60 dark:opacity-100">Antal</label>
  <div className="flex gap-2">
    <input 
      type="number" 
      value={editData.servings}
      ...
      className="w-12 bg-transparent border-b border-black/5 dark:border-white/10 focus:border-heath-mid outline-none pb-1 text-sm text-forest-dark dark:text-white"
    />
    <input 
      type="text" 
      value={editData.servingsUnit || 'pers.'}
      ...
      className="w-16 bg-transparent border-b border-black/5 dark:border-white/10 focus:border-heath-mid outline-none pb-1 text-sm text-forest-dark dark:text-white"
    />
  </div>
</div>
```

Change to:
```tsx
<div className="w-full sm:w-40">
  <label className="text-xs font-bold text-forest-mid dark:text-white/70 uppercase tracking-[0.2em] block mb-2 opacity-60 dark:opacity-100">Antal</label>
  <div className="flex gap-2 items-end">
    <input 
      type="number" 
      value={editData.servings}
      ...
      className="w-16 bg-transparent border-b border-black/5 dark:border-white/10 focus:border-heath-mid outline-none pb-1 text-sm text-forest-dark dark:text-white"
    />
    <input 
      type="text" 
      value={editData.servingsUnit || 'pers.'}
      ...
      className="w-20 bg-transparent border-b border-black/5 dark:border-white/10 focus:border-heath-mid outline-none pb-1 text-sm text-forest-dark dark:text-white"
    />
  </div>
</div>
```

Key changes: parent `sm:w-24` → `sm:w-40`, inputs `w-12` → `w-16` and `w-16` → `w-20`, add `items-end` to the flex container.

**Do not change** the view mode servings scaler (the +/- buttons for scaling). Only change the edit mode servings inputs.  
**Verify:** Enter edit mode on a recipe. The servings number and unit should both be fully visible and editable on mobile.

---

## Repair 10 — UI layout: view mode +/- scaler clipped by glass-brushed overflow

**Priority:** High  
**File:** `src/components/RecipeView.tsx`  
**Problem:** The ingredient section uses `glass-brushed` which has `overflow: hidden` (from the `::before` pseudo-element pattern). On narrow screens, the flex layout wrapping inside the ingredients header can cause the +/- scaler buttons to be clipped at the edges.  
**Fix:** On the ingredients section's header flex container, ensure wrapping works correctly. Find this in the view mode (not edit mode):

```tsx
<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
```

Change to:
```tsx
<div className="flex flex-col gap-4">
```

Then wrap the two child groups separately so they always stack on mobile:

The first child (title + buttons) stays as-is.
The second child (the +/- scaler) should get `w-full` to ensure it takes full width when stacked:

Find:
```tsx
<div className="flex items-center gap-4 bg-white/60 dark:bg-black/20 rounded-2xl px-4 py-2 border border-black/5 dark:border-white/10 shadow-sm w-full sm:w-auto justify-center print:border-none print:shadow-none print:bg-transparent print:p-0">
```

Change to:
```tsx
<div className="flex items-center gap-4 bg-white/60 dark:bg-black/20 rounded-2xl px-4 py-2 border border-black/5 dark:border-white/10 shadow-sm w-full justify-center print:border-none print:shadow-none print:bg-transparent print:p-0">
```

(Remove `sm:w-auto` so it always takes full width — the buttons are easier to tap.)

**Do not change** the actual +/- handler logic.  
**Verify:** Open a recipe in view mode on a narrow screen (use devtools responsive mode ~375px). The - number + scaler should be fully visible without any clipping.

---

## Repair 11 — Remove dead imports from App.tsx

**Priority:** Medium  
**File:** `src/App.tsx`  
**Problem:** Several imported symbols are never used in the JSX: `AnimatePresence` from framer-motion, and `Sprout`, `Leaf`, `Utensils`, `PlayCircle` from lucide-react. This is dead code that increases bundle size.  
**Fix:** Remove `AnimatePresence` from the framer-motion import. Remove `Sprout`, `Leaf`, `Utensils`, `PlayCircle` from the lucide-react import. Keep all other imports from both libraries.

Check after removal that the remaining imports are still valid. If `motion` is also unused, remove it too — but verify first.

**Do not remove** any other imports.  
**Verify:** `npm run lint` passes. `npm run build` passes. No runtime errors.

---

## Repair 12 — Service worker cache version mismatch

**Priority:** Medium  
**File:** `public/sw.js`  
**Problem:** `CACHE_NAME` is `'cookmoxs-v1-1-3'` but `package.json` version is `1.1.1`. The mismatch means the old cache is never cleared on deploy.  
**Fix:** Change:
```js
const CACHE_NAME = 'cookmoxs-v1-1-3';
```
To:
```js
const CACHE_NAME = 'cookmoxs-v1-1-1';
```

**Do not change** `RECIPE_CACHE_NAME` or any other part of sw.js.  
**Verify:** The value matches the version in package.json.

---

## Post-repair notes (do not fix now)

These are observations for future work, not part of this repair session:

- **No React Error Boundary:** A crash in any component takes down the entire app with a white screen.
- **Nutrition module always disabled:** `ENABLE_NUTRITION_MODULE` env var is undocumented and not in render.yaml.
- **render.yaml still references Supabase:** Confusing but harmless.
- **manifest.webmanifest theme_color is static:** Does not adapt to seasonal theme.
- **RecipeView.tsx is 1366 lines:** Should be decomposed into smaller components in a future phase.
- **glass-brushed overflow:hidden may clip other content:** The `::before` pseudo-element pattern forces `overflow: hidden` on all glass panels. A broader fix would use a wrapper div for the pseudo-element instead.
