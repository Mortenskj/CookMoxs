# CookMoxs — Claude Patch Brief  
## Haptics, ratings, delete-flow, import quality, amount ranges, and relevant-ingredient trust

**Purpose**  
This document captures the problems and proposed fixes discussed after the earlier cook mode review.  
It is **not** a rewrite brief. It is a **targeted patch brief** for Claude to implement in small, controlled steps.

**Important operating rule**  
Treat this as **guided feedback, not infallible truth**.  
Verify assumptions against the current code before changing behavior.  
Where this document proposes a heuristic, prefer the **narrowest safe implementation** that improves product correctness without broad regressions.

**Execution order recommendation**
1. Delete-flow trust fix
2. Global error surfacing / dialog consistency
3. Relevant-ingredient confidence guard
4. Import summary sanitation
5. Amount range support
6. Haptics
7. Rating model
8. Optional UX polish after the above

---

# 1. Haptic feedback

## Diagnosis
Haptic feedback makes sense in CookMoxs, but **not** as constant feedback while the user is scrolling.  
That would become noisy and irritating.

The right behavior is **event-based**, not raw scroll-based.

## Correct product behavior
Use light haptics only when there is a meaningful state change:

- active cook step changes
- a timer starts
- a timer stops
- a timer completes

Do **not** vibrate on every scroll event.

## Technical note
On web, this is a progressive enhancement only. `navigator.vibrate()` is not universally supported, so unsupported devices should fail silently.

## Recommended implementation
Create a shared helper.

### File to add
`src/services/haptics.ts`

### Suggested code
```ts
export const haptics = {
  light() {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(10);
    }
  },
  medium() {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(20);
    }
  },
  timerDone() {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([120, 60, 160]);
    }
  },
};
```

## Where to wire it
### `src/components/CookView.tsx`
Trigger `haptics.light()` when the **active step index actually changes**, not while scroll is ongoing.

Use a ref:
```ts
const prevActiveStepRef = useRef<number | null>(null);

useEffect(() => {
  if (activeStepIndex !== prevActiveStepRef.current) {
    if (prevActiveStepRef.current !== null) {
      haptics.light();
    }
    prevActiveStepRef.current = activeStepIndex;
  }
}, [activeStepIndex]);
```

### Timer actions
- start manual timer → `haptics.light()`
- start step timer → `haptics.light()`
- timer complete → `haptics.timerDone()`

## Acceptance criteria
- No vibration spam during continuous scroll
- Small haptic tick when active step changes
- Timer complete gives stronger, distinct vibration pattern
- No runtime errors on browsers without Vibration API support

---

# 2. Recipe rating (1–6 stars) with shared rating

## Diagnosis
A 1–6 rating model makes sense for recipes, and a **shared rating** for recipes visible to multiple people is product-relevant.

The trap to avoid: storing one mutable shared number directly on the recipe and letting users overwrite it.

## Correct product behavior
Each user should rate a recipe **individually**.  
The app should then show:

- **your rating**
- **combined/shared rating**

## Data model recommendation
### `src/types.ts`
Add summary fields to `Recipe`:

```ts
ratingAverage?: number;
ratingCount?: number;
```

### Firestore / persistence model
Use one record per user per recipe, for example:

`recipes/{recipeId}/ratings/{userId}`

Example:
```ts
{
  recipeId: string;
  userId: string;
  score: 1 | 2 | 3 | 4 | 5 | 6;
  updatedAt: string;
}
```

## Why this is the right model
- one vote per user
- editable without conflict
- shared average can be recomputed safely
- works for household/shared recipes
- avoids destructive overwriting

## UI recommendation
### `src/components/RecipeView.tsx`
Add a rating strip under title/meta for saved recipes only.

Show:
- six tappable stars
- “Din rating: X”
- “Fælles rating: 4.7 (3)”

## Important scope rule
Do **not** enable shared rating for unsaved drafts.

## Suggested rollout
### Phase 1
- local UI and model fields only
- saved recipes only
- if cloud store not ready, keep your own rating local

### Phase 2
- wire to Firestore subcollection
- aggregate `ratingAverage` and `ratingCount`

## Acceptance criteria
- One user can set 1–6 stars
- Shared recipes can show a combined rating
- One user updating their rating does not erase others
- Unsaved drafts do not show shared rating UI

---

# 3. Delete flow is still wrong

## Observed behavior
The current delete flow still feels broken:

> to delete a recipe, the user must press edit → delete → exit editing, and only then the delete feedback appears

That is the wrong mental model.

## Root problem
Delete is still too tightly coupled to **edit mode**, instead of being a first-class recipe action.

## Current symptom source
### `src/components/RecipeView.tsx`
The delete action is still located inside the edit-mode controls.

That means:
- user has to enter editing to delete
- deletion feels delayed / indirect
- the feedback appears tied to exiting editor state, not to deletion intent

## Correct product behavior
Delete should be available directly from normal recipe view for mutable recipes.

### Desired behavior
- normal recipe view topbar contains delete action
- tap delete
- confirm dialog appears immediately
- deletion executes immediately
- undo feedback appears immediately

## Required changes
### `src/components/RecipeView.tsx`
Add delete button to the normal topbar when `canMutateRecipe === true`.

Do **not** keep delete as edit-only.

### `src/App.tsx`
Ensure `handleDeleteRecipe()` behaves correctly for two cases:

#### Saved recipe
- optimistic removal
- immediate global undo feedback
- navigate away cleanly

#### Unsaved draft
- direct discard
- no “saved recipe delete” semantics
- button/label should say **Kassér kladde**

## Acceptance criteria
- User can delete without entering edit mode
- Confirm dialog appears at the moment delete is pressed
- Undo/feedback appears immediately after deletion
- Unsaved drafts use discard language, not saved-delete language

---

# 4. Error messages should be global dismissible dialogs/toasts

## Diagnosis
Errors currently leak into unrelated screens.  
Example already observed: an AI import error later appears while viewing a recipe.

That means error state is too persistent and too screen-coupled.

## Correct product behavior
Errors should be shown as:
- a global toast
- or a dismissible global dialog
- scoped to the action that failed

They should **not** persist invisibly until the user happens to land on a screen where the inline error box is rendered.

## Recommended model
### `src/App.tsx`
Replace “shared inline page error” with a global transient state, for example:

```ts
type GlobalUiError = {
  id: string;
  title?: string;
  message: string;
  source?: 'import' | 'ai_adjust' | 'ai_generate' | 'save' | 'delete' | 'unknown';
};
```

### Add component
`src/components/GlobalErrorToast.tsx`

Behavior:
- appears immediately when an action fails
- visible regardless of current page
- dismissible
- auto-dismiss optional
- error cleared when user closes it

## Important rule
Action-specific errors should be surfaced **where the user is now**, not where the failing code path happened to store a message.

## Acceptance criteria
- Import error appears immediately as global feedback
- User can dismiss it
- Error does not reappear later inside unrelated recipe views
- Error state is cleared after dismiss

---

# 5. Imported summary can become spam / repeated filler

## Observed issue
Importing recipes can produce a long, repeated summary such as repeated “Velbekomme!” phrases.

This is not a UI problem. It is a **data quality problem** in the import pipeline.

## Root cause
### `src/services/recipeImportService.ts`
The summary is currently accepted raw:

```ts
summary: parsedData.summary || '',
```

There is no:
- deduplication
- length cap
- filler filtering
- fallback to empty summary if low quality

### `server.ts`
The import prompt asks for `summary`, but does not constrain it hard enough.

## Correct product behavior
A bad summary should be:
- cleaned
- shortened
- or dropped entirely

Better no summary than spam summary.

## Required changes

### A. Tighten import prompt in `server.ts`
Inside the shared import rules, add something like:

```txt
SUMMARY RULES:
- summary must be 1-2 short sentences only
- maximum 180 characters
- do not repeat phrases or sentences
- do not include filler like "Velbekomme", "nyd", "god fornøjelse", "denne ret er..."
- if no useful summary is available, return an empty string
```

### B. Add sanitizer in `src/services/recipeImportService.ts`

Suggested helper:
```ts
function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function splitIntoSentences(value: string): string[] {
  return value
    .split(/(?<=[.!?])\s+/)
    .map((s) => normalizeWhitespace(s))
    .filter(Boolean);
}

function isLowValueSummarySentence(sentence: string): boolean {
  const lower = sentence.toLowerCase();

  const bannedFragments = [
    'velbekomme',
    'god fornøjelse',
    'nyd dit måltid',
    'nyd denne',
    'denne ret er',
    'denne pasta',
    'her er opskriften',
    'sand favorit',
    'fantastisk tid sammen',
    'hver mundfuld',
    'god madlyst',
  ];

  return bannedFragments.some((fragment) => lower.includes(fragment));
}

function sanitizeImportedSummary(summary: unknown): string {
  if (typeof summary !== 'string') return '';

  const clean = normalizeWhitespace(summary);
  if (!clean) return '';

  const sentences = splitIntoSentences(clean);

  const uniqueSentences: string[] = [];
  const seen = new Set<string>();

  for (const sentence of sentences) {
    const normalized = sentence.toLowerCase();
    if (seen.has(normalized)) continue;
    if (isLowValueSummarySentence(sentence)) continue;
    seen.add(normalized);
    uniqueSentences.push(sentence);
  }

  const result = uniqueSentences.slice(0, 2).join(' ').trim();

  if (!result) return '';
  if (result.length > 180) return result.slice(0, 177).trimEnd() + '...';

  const words = result.toLowerCase().split(/\s+/);
  const repeatedVelbekommeCount = words.filter((w) => w.includes('velbekomme')).length;
  if (repeatedVelbekommeCount > 1) return '';

  return result;
}
```

Then replace:

```ts
summary: parsedData.summary || '',
```

with:

```ts
summary: sanitizeImportedSummary(parsedData.summary),
```

## Acceptance criteria
- repeated filler summaries are removed or collapsed
- bad summary can become empty string
- imported recipe view no longer shows wall-of-text spam

---

# 6. Ingredient amount ranges are being collapsed incorrectly

## Observed issue
When a source says:

- `175-200 g`
- `2-3 fed hvidløg`
- `ca. 250-300 ml`

the app currently collapses the range to a midpoint or a single number.

That is wrong for cooking.

## Root cause
### `src/types.ts`
`Ingredient.amount` only supports one number:

```ts
amount: number | null;
```

### `server.ts`
`RECIPE_SCHEMA` also expects amount as a single number.

The model therefore has no place to store a range.

## Correct product behavior
Ingredient amounts must support:
- exact value
- min/max range
- optional original text representation

## Recommended model change
### `src/types.ts`
Change `Ingredient` to support both fixed and ranged values:

```ts
export interface Ingredient {
  id: string;
  name: string;
  amount: number | null;
  amountMin?: number | null;
  amountMax?: number | null;
  amountText?: string;
  unit: string;
  group?: string;
  locked?: boolean;
}
```

## Schema change
### `server.ts`
Allow:
```ts
amount: { type: Type.NUMBER },
amountMin: { type: Type.NUMBER },
amountMax: { type: Type.NUMBER },
amountText: { type: Type.STRING },
```

and change required fields so `name` and `unit` remain required, but not a single exact amount.

## Prompt rule to add
```txt
AMOUNT RANGE RULES:
- If an ingredient amount is a range like "175-200 g", never collapse it to a midpoint.
- Store ranges as amountMin and amountMax.
- Use amountText to preserve the original phrasing when useful, e.g. "ca. 175-200".
- Only use amount as a single number when the source clearly gives one exact quantity.
```

## Import mapping fix
### `src/services/recipeImportService.ts`
Map all range fields instead of only `amount`.

## Formatter helper
Create a shared formatter for ingredient display:

```ts
export function formatIngredientAmount(ingredient: Ingredient): string {
  if (
    typeof ingredient.amountMin === 'number' &&
    typeof ingredient.amountMax === 'number'
  ) {
    if (ingredient.amountText?.trim()) {
      return ingredient.amountText.trim();
    }
    return `${ingredient.amountMin}-${ingredient.amountMax}`;
  }

  if (typeof ingredient.amount === 'number') {
    return `${ingredient.amount}`;
  }

  return ingredient.amountText?.trim() || '';
}
```

## Scaling rule
When recipe scale changes:
- exact amount → scale `amount`
- range → scale both `amountMin` and `amountMax`
- never collapse range to midpoint during scaling

## Acceptance criteria
- `175-200 g` stays a range after import
- range survives rendering and scaling
- edit mode can preserve interval instead of converting it to one value

---

# 7. Relevant ingredients are shown with low confidence and can be wrong

## Observed issue
In cook mode, a step like:

> “Bring en stor gryde med letsaltet vand i kog.”

can show:

> `1 stk stort løg`

inside “Ingredienser nu”.

That is clearly wrong.

## Root cause
This is almost certainly a **step-to-ingredient mapping** problem, not a pure UI bug.

Either:
- AI is returning bad `relevantIngredients`
- or client heuristics are too weak
- or the UI always shows the box even when confidence is low

## Correct product behavior
If relevant ingredient confidence is low, **do not show the ingredient box**.

This is directly aligned with CookMoxs command logic:
> omission over misinformation

## Required changes

### A. Tighten prompt rules in `server.ts`
For step generation / polishing, add:

```txt
RELEVANT INGREDIENT RULES:
- Only include ingredients that are directly used in the specific step.
- Do not guess future ingredients.
- Do not include ingredients from later steps.
- If the step is about boiling water, preheating the oven, resting, or similar setup actions, relevantIngredients may be empty.
- It is better to return an empty relevantIngredients array than a wrong one.
```

### B. Add client-side visibility guard in CookView
Before rendering “Ingredienser nu”, validate that at least one relevant ingredient is a strong match.

Example:
```ts
function shouldShowRelevantIngredients(step: Step) {
  if (!step.relevantIngredients?.length) return false;

  const stepText = step.text.toLowerCase();

  const strongMatches = step.relevantIngredients.filter((ingredient) => {
    const name = ingredient.name.toLowerCase().trim();
    return name && stepText.includes(name);
  });

  return strongMatches.length > 0;
}
```

### C. Add explicit no-show cases
If step text is mainly:
- “bring vand i kog”
- “forvarm ovnen”
- “lad hvile”
- “sæt til side”
- “kog op”

and there is no clear ingredient reference, suppress the box.

## Acceptance criteria
- Wrong ingredient cards are hidden instead of guessed
- Water/boil/preheat/rest setup steps often have no ingredient card
- “Ingredienser nu” only appears when confidence is reasonably high

---

# 8. Delete, error, and cook mode trust are all one theme

## Product synthesis
These issues are not isolated. They are all symptoms of the same design weakness:

- too much willingness to show uncertain data
- too much coupling between action and the wrong screen state
- too little global, immediate feedback

## Design rule to apply across all patches
For CookMoxs, the safe hierarchy is:

1. correctness
2. trust
3. clarity
4. convenience

If the app is uncertain:
- hide
- defer
- or ask later

Do not bluff.

---

# 9. Suggested implementation order

## Phase 1 — trust / correctness
1. Delete-flow moved out of edit-only UI
2. Global dismissible error surface
3. Relevant-ingredient confidence guard
4. Summary sanitizer

## Phase 2 — data model
5. Ingredient amount range support
6. Shared formatter + scaling update

## Phase 3 — enhancement
7. Haptics
8. Ratings

---

# 10. Regression checklist

After implementation, verify:

## Delete
- delete works directly from recipe view
- draft discard is immediate and correctly labeled
- saved recipe delete shows immediate feedback

## Error handling
- import errors appear immediately as global feedback
- dismissed errors do not leak into later recipe views

## Summary import
- bad repeated summary text is suppressed or shortened
- empty summary is allowed

## Amount ranges
- `175-200 g` remains a range after import
- ranges scale correctly

## Relevant ingredients
- boil-water step does not show onion
- setup-only steps can show no ingredient box

## Haptics
- step-change tick only
- no scroll spam

## Ratings
- one user can rate 1–6
- shared recipes can aggregate rating without overwriting each other

---

# 11. Final implementation note to Claude

Prefer:
- small patches
- explicit helpers
- shared formatting functions
- conservative visibility rules

Do not:
- broaden cook mode helper info unless confidence is high
- collapse ranges into midpoint values
- keep delete behavior tied to edit mode
- keep page-local errors for global failures
