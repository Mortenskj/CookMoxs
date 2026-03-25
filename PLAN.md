# PLAN.md — CookMoxs Execution Plan

**Plan version:** merged repo-native plan v2  
**Status:** Active  
**Execution mode:** one step at a time, with checks between each step

---

## 1. Current state summary

### Strong today
- private recipe import from link/text/file/image
- AI cleanup / transformation layer
- cook mode with steps, timers, heat indicators, level-aware language, text size
- backup/restore
- sync status work and PWA foundation
- Firestore and local data logic moved into services

### Still incomplete / future moat
- household/family model beyond simple sharing
- explicit permission model
- true AI-optional import path
- offline-first queue foundation
- nutrition/barcode module
- learning loop based on real usage
- public rollout readiness

### Current architecture snapshot
- React 19 + TypeScript + Vite 8 + Tailwind 4
- Express backend in `server.ts`
- Gemini via `@google/genai`
- current model identifiers are whatever `server.ts` currently uses
- Firestore + Firebase Auth
- `/api/fetch-url` already validates URL, blocks private hosts, extracts JSON-LD + Microdata, and falls back to text extraction
- `src/services/aiService.ts` is only a client wrapper; prompts live in `server.ts`

---

## 2. Global acceptance rules
For every step:
- follow file scope
- do not touch out-of-scope areas
- keep changes minimal and reversible
- update progress/decision logs if the step requires it
- pass health checks before asking to continue
- provide a user-facing Danish summary after completion

---

## 3. Smoke test commands and targets
Use these concrete tests when a phase calls for import smoke testing.

### Test URLs
1. `https://www.valdemarsro.dk/lasagne/`
2. `https://www.dr.dk/mad/opskrift/frikadeller`
3. `https://www.arla.dk/opskrifter/boller-i-karry/`

### Example commands
#### fetch-url smoke test
```bash
curl "http://localhost:3000/api/fetch-url?url=https%3A%2F%2Fwww.valdemarsro.dk%2Flasagne%2F"
```

#### parse-direct smoke test (when Phase 1.5 exists)
```bash
curl -X POST http://localhost:3000/api/parse-direct   -H "Content-Type: application/json"   -d '{"url":"https://www.valdemarsro.dk/lasagne/"}'
```

### Smoke test pass criteria
- endpoint returns 200
- response is valid JSON
- title, ingredients, steps exist when expected
- no raw parser crash / malformed JSON
- if a page fails, error message must be human-readable

---

## 4. Phase 0 — Baseline docs and repo control
**Risk:** Low
**Out of scope for the phase:** product features, household model, nutrition, offline queue, AI behavior changes

### Step 0.1 — Architecture docs
**Goal:** create baseline docs for architecture and product rules.
**Files in scope:**
- `/docs/architecture.md`
- `/docs/product-principles.md`
- `/docs/metrics.md`
- `/docs/roadmap.md`
- `/docs/permissions-model.md`
- `/docs/release-checklist.md`
**Acceptance criteria:**
- architecture doc includes file structure, service map, current data flow, API endpoint list, high-risk files, current stack, current AI placement
- product-principles doc mirrors AGENTS mission/rules
- metrics doc lists phase-1 events and KPI questions
- roadmap doc reflects the phases below
- permissions-model doc defines the four target sharing/privacy levels conceptually
- release-checklist exists
**Health checks:** docs present, no code changes

### Step 0.2 — Progress and decision logs
**Goal:** create and initialize execution tracking docs.
**Files in scope:**
- `/docs/progress-log.md`
- `/docs/decision-log.md`
**Acceptance criteria:** files exist and contain initial entries referencing this plan version.

---

## 5. Phase 1 — Instrumentation and clear error handling
**Risk:** Medium
**Out of scope for the phase:** household, nutrition, offline queue, permission UI, large refactors

### Phase 1 provider decision
Analytics provider for Phase 1: **internal first-party event relay** using `navigator.sendBeacon` to `/api/events`, logged server-side / in Render logs.

### Step 1.1 — Analytics service and server relay
**Goal:** establish first-party analytics plumbing.
**Files in scope:**
- `src/services/analyticsService.ts`
- `server.ts`
- small config/helper files if needed
**Acceptance criteria:**
- frontend has a single analytics abstraction
- backend accepts event posts via `/api/events`
- no third-party analytics vendor is introduced

### Step 1.2 — Core event wiring
**Goal:** instrument the core flows without changing product behavior.
**Files in scope:**
- `src/App.tsx`
- `src/components/ImportView.tsx`
- `src/components/CookView.tsx`
- `src/components/RecipeView.tsx`
- `src/components/SettingsView.tsx`
- `src/services/analyticsService.ts`
**Required events and exact trigger points:**
- `recipe_import_started` → fires when user explicitly starts an import action
- `recipe_import_succeeded` → fires when parsed recipe is successfully created and shown in UI
- `recipe_import_failed` → fires when import flow ends in visible error state
- `recipe_saved` → fires when recipe save succeeds
- `recipe_deleted` → fires when delete is confirmed and queued/performed
- `cook_mode_started` → fires when user enters cook mode
- `cook_mode_completed` → fires when user explicitly ends cook mode or reaches and confirms the final step
- `ai_adjust_used` → fires when AI-adjusted recipe result is successfully applied
- `backup_exported` → fires when backup file is generated
- `backup_restored` → fires when validated backup is restored successfully
- `folder_shared` → fires when sharing action succeeds
- `folder_deleted_undone` → fires when folder deletion is undone
- `module_enabled` / `module_disabled` → fires when a feature/module toggle changes
**Acceptance criteria:**
- all events above are wired once at the intended trigger point
- no duplicate firing in normal flows

### Step 1.3 — Human-readable import and sync errors
**Goal:** replace raw technical errors with user-readable Danish messages.
**Files in scope:**
- import-related UI files
- sync-status related UI files
- relevant services/helpers
**Acceptance criteria:**
- import failures are categorized (network / timeout / malformed response / unsupported source / AI failure)
- UI shows readable Danish messages
- no raw JSON parse error is shown to users

---

## 6. Phase 1.5 — AI-optional import pipeline
**Risk:** Medium
**Out of scope for the phase:** offline queue, nutrition, household model, learning loop

### Step 1.5.1 — Direct parser mapping path
**Goal:** create a true non-AI direct parse path for structured recipe pages.
**Files in scope:**
- `server.ts`
- `src/services/recipeDirectParser.ts` (new)
- small helper/config files if needed
**Important note:**
`/api/fetch-url` already extracts JSON-LD and Microdata.
This step must **build on that existing extraction**.
The main task is **mapping structured recipe fields into the CookMoxs `Recipe` type**, not rebuilding scraping.
**Minimum mapping responsibilities:**
- `recipeYield` → `servings` / `servingsUnit`
- `recipeIngredient[]` → `ingredients[]`
- `recipeInstructions` (including `HowToStep` structures) → `steps[]`
- title/summary/category where available
**Acceptance criteria:**
- at least 2 known recipe pages can be imported without Gemini
- output is a valid CookMoxs recipe object
- malformed structured data fails cleanly

### Step 1.5.2 — Import preference setting
**Goal:** add a user-facing import preference.
**Files in scope:**
- `src/components/SettingsView.tsx`
- relevant config/storage files
- `src/App.tsx` only if wiring is required
**Preferred UI wording:**
- Improve automatically with AI
- Ask me first
- Use basic import only
**Acceptance criteria:**
- setting is saved and restored
- import flow respects the setting

### Step 1.5.3 — Direct parse first, AI second
**Goal:** route import through direct parsing first where possible, then offer AI enhancement.
**Files in scope:**
- `server.ts`
- `src/App.tsx`
- `src/services/aiService.ts`
- relevant import UI files
**Acceptance criteria:**
- direct parse works without AI key for supported pages
- AI improvement can be applied afterward
- if AI is unavailable, base import still works

### Step 1.5.4 — Graceful degradation
**Goal:** ensure missing AI key or AI-disabled mode never makes the app feel blocked.
**Files in scope:**
- relevant import/settings/UI files
**Acceptance criteria:**
- AI-only actions are disabled or explained clearly
- app remains useful without Gemini

---

## 7. Phase 1.7 — Offline-first foundation
**Risk:** Medium to High
**Out of scope for the phase:** household, nutrition, learning loop

### Step 1.7.1 — Offline queue service
**Goal:** add IndexedDB-based queue foundation.
**Files in scope:**
- `src/services/offlineQueueService.ts`
- optional IndexedDB helper/wrapper
- `src/hooks/usePendingQueue.ts` (if needed)
**Acceptance criteria:**
- queue store supports image/url/text/edit item types
- Blob is used for images; not base64 as the primary path
- pending items survive reload

### Step 1.7.2 — Offline image capture queue
**Goal:** allow users to capture recipe images while offline.
**Files in scope:**
- `src/components/ImportView.tsx`
- offline queue service/hook
**Acceptance criteria:**
- user can capture/store image offline
- UI shows pending item count
- item remains queued after reload

### Step 1.7.3 — Offline URL queue
**Goal:** allow URL submission offline for later processing.
**Files in scope:**
- `src/components/ImportView.tsx`
- offline queue service/hook
**Acceptance criteria:**
- URL can be queued offline
- queue item can be processed later when online

### Step 1.7.4 — Queue processing on reconnect/app resume
**Goal:** process pending queue items when conditions allow.
**Files in scope:**
- `src/App.tsx`
- offline queue service/hook
- relevant UI notification components
**Acceptance criteria:**
- processing can trigger on app resume, online event, or explicit user action
- one failed item does not block the rest
- no dependency on fragile background sync as the only trigger

### Step 1.7.5 — Proactive recipe caching for cook mode
**Goal:** ensure saved/active recipes remain usable in cook mode offline.
**Files in scope:**
- service worker files
- relevant cook/start-save integration points
**Acceptance criteria:**
- saved/active recipes are cached for cook mode use
- offline cook mode remains usable for already saved recipes

---

## 8. Phase 2 — Household / family foundation
**Risk:** High
**Out of scope for the phase:** nutrition/barcode, learning loop, premium logic

### Step 2.1 — Household data model only
**Goal:** define household entities and ownership structure without UI-first shortcuts.
**Files in scope:**
- Firestore service layer
- shared types/config
- `firestore.rules` if truly required
**Acceptance criteria:**
- `householdId`, roles, and ownership shape are defined
- migration note is written
- rules changes, if any, extend existing logic instead of replacing it

### Step 2.2 — Household service layer
**Goal:** create service functions for household lookup/invite/membership.
**Files in scope:**
- household-related services/hooks
- shared types
**Acceptance criteria:**
- service layer exists independent of UI
- current sharing behavior is not broken

### Step 2.3 — Minimal household UI
**Goal:** expose the smallest useful household management surface.
**Files in scope:**
- settings/family-related UI only
**Acceptance criteria:**
- owner can see household state
- member roles are visible
- no broad UI sprawl

### Step 2.4 — Ownership / sharing labels
**Goal:** show whether content is private, shared, or household-owned.
**Files in scope:**
- library / recipe metadata UI
**Acceptance criteria:**
- users can see ownership state clearly

---

## 9. Later phases (deferred detail)
### Phase 3 — Permission model UI
Build the visible privacy/permission model once household basics are real.

### Phase 4 — Nutrition / barcode module
Provider decision: **Open Food Facts** as primary provider for Phase 4. If unavailable in development, use a mock provider behind the same interface.

### Phase 5 — Learning loop / personal intelligence
**Deferred detail:** do not fully implement until data from Phase 1 and real usage from Phase 2–3 exist. Only foundations and documentation may be prepared beforehand.
**Progress note (2026-03-25):** Preparation only completed. Conservative execution detail added below; no learning behavior or suggestions implemented yet.

### Phase 6 — Rollout preparation
Versioning, support tooling, error reporting, privacy docs, controlled beta readiness.

---

## 10. Git, deploy, recovery, env
### 10.1 Git / deploy workflow
After a user-approved step:
- commit with `[Phase X.Y] short description`
- push to `main`
- Render auto-deploys from `main`
- no force push / no history rewriting unless explicitly asked

### 10.2 Recovery plan (non-technical)
If a step breaks something:
- Codex must stop and explain in plain Danish what failed
- Codex must either fix in the same step or rollback
- after deploy, the user should verify: app loads, import still works, cook mode still works, saved recipes still open, backup still exports/restores
- if rollback is required, prefer reverting touched files or the last commit

### 10.3 Environment variables
Current env vars:
- `GEMINI_API_KEY` — required for AI endpoints
- `NODE_ENV` — runtime mode
- `PORT` — runtime port
If a new env var is introduced, Codex must explicitly tell the user:
- variable name
- purpose
- where to set it (local / Render)
- whether required or optional

---

## 11. Progress and decision logs
Codex must keep progress and decision tracking up to date if the current step requires it. If no repo-local docs exist yet, create them in Phase 0.


### Phase 3 execution detail (prepared 2026-03-25)
**Risk:** High
**Out of scope for the phase:** nutrition/barcode, learning loop, premium logic, public-sharing concepts

#### Step 3.1 â€” Permission state copy and UI model
**Goal:** define the visible permission vocabulary before adding more controls.
**Files in scope:**
- shared permission/ownership helpers
- small config/docs files for UI copy if needed
- settings/library metadata components only if wiring is needed
**Acceptance criteria:**
- the UI model distinguishes `private`, `shared_view`, `shared_edit`, and `household`
- labels and helper copy are consistent with existing ownership metadata
- no hidden behavior change is introduced in this step

#### Step 3.2 â€” Folder permission panel
**Goal:** show and manage the current permission state for a folder from a focused owner-facing surface.
**Files in scope:**
- settings/family-related UI
- library permission panel/modal components
- household/share helpers if needed
**Acceptance criteria:**
- owner can see current folder permission state clearly
- owner can understand who currently has access
- current sharing flow is not broken

#### Step 3.3 â€” Member and invite management
**Goal:** expose role and membership management in a narrow household control surface.
**Files in scope:**
- household settings UI only
- household services/hooks
**Acceptance criteria:**
- owner/admin can see active vs invited members
- role visibility is clear
- removal / role changes are available without broad UI sprawl

#### Step 3.4 â€” Permission-aware create and move flows
**Goal:** make ownership inheritance explicit when saving or moving content into shared or household spaces.
**Files in scope:**
- recipe save / folder picker surfaces
- small ownership helper components
**Acceptance criteria:**
- user gets clear feedback before content inherits shared/household visibility
- labels stay consistent with Phase 2 ownership UI
- no silent permission escalation is introduced

---

**Deferred note:** Offline edit queue is intentionally deferred and is not part of Phase 1.7 in this plan; it may be reconsidered later after AI-optional import and basic offline queue flows are stable.


### Phase 4 execution detail (prepared 2026-03-25)
**Risk:** Medium to High
**Out of scope for the phase:** pantry/inventory systems, shopping flows, premium nutrition logic, broad recipe import rewrites

#### Step 4.1 â€” Nutrition provider interface and mock path
**Goal:** define a stable nutrition/barcode provider contract before UI or provider-specific flow spread.
**Files in scope:**
- nutrition-related services/config only
- optional mock provider files
- `server.ts` only if a narrow relay/helper is required
**Acceptance criteria:**
- internal provider interface exists
- Open Food Facts path is behind that interface
- mock provider can satisfy the same contract for local development
**Progress note (2026-03-25):** Completed.

#### Step 4.2 â€” Product lookup and result model
**Goal:** normalize barcode and text-search results into repo-owned product data before broader UI work.
**Files in scope:**
- nutrition/barcode services
- shared result types/helpers
- small server relay files if required
**Acceptance criteria:**
- barcode lookup and text search return a consistent internal result shape
- provider errors fail with readable messages
- no UI is required beyond minimal verification hooks
**Progress note (2026-03-25):** Completed.

#### Step 4.3 â€” Minimal nutrition and barcode UI
**Goal:** expose the smallest useful nutrition surface without camera-heavy complexity first.
**Files in scope:**
- one contained nutrition/barcode UI surface
- limited wiring in parent view(s) only if required
**Acceptance criteria:**
- user can enter a barcode or search text manually
- result list or product summary is understandable
- UI remains isolated and does not disrupt import/library/cook flows
**Progress note (2026-03-25):** Completed.

#### Step 4.4 â€” Recipe nutrition attachment and explanation
**Goal:** let users view or attach nutrition results with clear provenance and limited implied certainty.
**Files in scope:**
- recipe-facing nutrition summary UI
- nutrition helper components/services
**Acceptance criteria:**
- attached nutrition data is visibly sourced or marked as fallback
- nutrition state does not silently overwrite recipe core data
- wording avoids overclaiming precision
**Progress note (2026-03-25):** Completed.

### Phase 5 execution detail (prepared 2026-03-25)
**Risk:** Medium to High
**Out of scope for the phase:** broad recommendation systems, opaque personalization, speculative AI behavior, payment/premium logic, creator/public-sharing logic, and growth experiments

#### Step 5.1 â€” Signal contract and profile boundary
**Goal:** define the allowed learning signals and keep any future profile data outside recipe core data before behavioral features exist.
**Files in scope:**
- shared learning/profile docs, config, or types only
- no recipe core model changes
**Acceptance criteria:**
- allowed vs disallowed signal categories are explicitly documented
- future profile/preference data is defined as separate from recipe core data
- no user-facing suggestion behavior is implemented
**Progress note (2026-03-25):** Completed.

#### Step 5.2 â€” Modular profile store scaffold
**Goal:** add the smallest reversible storage boundary for future profile/preferences without changing recipe objects.
**Files in scope:**
- dedicated profile/preference services/config only
- feature flag/config files if risk is non-trivial
**Acceptance criteria:**
- profile storage is separate from recipe core data
- the module can remain disabled without affecting the base product
- no recommendation or suggestion logic is introduced
**Progress note (2026-03-25):** Completed.

#### Step 5.3 â€” Explicit feedback capture points
**Goal:** prefer user-controlled feedback over hidden inference when the learning loop begins collecting signals.
**Files in scope:**
- narrow settings or recipe-adjacent feedback surfaces only if required
- dedicated learning/profile services
**Acceptance criteria:**
- any new feedback signals are explicit and understandable
- feedback collection is optional and clearly scoped
- no opaque scoring or auto-personalization is introduced
**Progress note (2026-03-25):** Completed.

#### Step 5.4 â€” Profile transparency surface
**Goal:** show the user what the learning module knows before acting on it with stronger suggestions.
**Files in scope:**
- one contained settings/profile transparency surface
- dedicated learning/profile helpers
**Acceptance criteria:**
- the user can inspect the currently stored preference/profile state
- wording stays cautious and non-creepy
- no broad recommendation UI is introduced in this step
**Progress note (2026-03-25):** Completed.
