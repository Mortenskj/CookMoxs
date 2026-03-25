# CookMoxs Architecture Baseline

## Purpose
This document captures the current repo shape and runtime architecture for the active CookMoxs codebase.
`PLAN.md` and `AGENTS.md` are the current source of truth for execution rules.

## Current stack
- Frontend: React 19 + TypeScript + Vite 8 + Tailwind 4
- Backend: Express in `server.ts`
- AI SDK: `@google/genai`
- Data/auth: Firebase Auth + Firestore
- Hosting shape: single Node server in development and production, with Vite middleware in development and `dist/` static serving in production

## File structure
```text
/
|- server.ts
|- src/
|  |- App.tsx
|  |- components/
|  |- services/
|  |- hooks/
|  |- config/
|  |- firebase.ts
|  |- types.ts
|- public/
|- supabase/
|- firestore.rules
|- PLAN.md
|- AGENTS.md
```

## Service map
- `src/services/aiService.ts`
  Client wrapper around server AI endpoints. No direct model usage in the browser.
- `src/services/recipeImportService.ts`
  Maps parsed import payloads into the app `Recipe` shape.
- `src/services/localDataService.ts`
  Local storage read/write helpers for recipes, folders, active recipe, and default-folder recovery.
- `src/services/firestoreDataService.ts`
  Firestore listeners and write/delete operations for recipes and folders.
- `src/services/backupService.ts`
  Backup payload validation, export payload creation, and download helper.
- `src/firebase.ts`
  Firebase app bootstrapping, Firestore/Auth exports, sanitizing, and structured Firestore error logging.
- `src/hooks/useNetworkStatus.ts`
  Online/offline status for UX decisions.
- `src/hooks/useServiceWorkerUpdate.ts`
  Update detection and apply/dismiss helpers for the PWA shell.

## UI composition
- `src/App.tsx`
  Main state coordinator for navigation, local persistence, cloud sync state, auth state, import flow, backup flow, and timer state.
- `src/components/ImportView.tsx`
  Import entry points for URL, text, files, images, and manual input.
- `src/components/RecipeView.tsx`
  Recipe detail, editing, AI adjustments, and save behavior.
- `src/components/CookView.tsx`
  Step-by-step cook mode with timers and cooking guidance.
- `src/components/LibraryView.tsx`
  Saved recipe and folder browsing.
- `src/components/SettingsView.tsx`
  Preferences, auth actions, backup actions, and module toggles.

## Current data flow
### Import flow
1. User starts import in `ImportView`.
2. Browser calls `GET /api/fetch-url` for URL extraction when relevant.
3. Browser calls `/api/ai/import` through `src/services/aiService.ts`.
4. `server.ts` builds prompts and returns structured recipe JSON.
5. `src/services/recipeImportService.ts` maps parsed data into the app `Recipe` type.
6. `App.tsx` stores the result in active state and later saves locally or to Firestore.

### Save and sync flow
1. App state lives in `App.tsx`.
2. Unauthenticated users read/write via `localDataService`.
3. Authenticated users subscribe to Firestore via `firestoreDataService`.
4. Folder access determines which shared recipes are also subscribed.
5. Sync status messages are shown from `App.tsx`.

### Backup flow
1. `backupService.ts` creates a versioned export payload from recipes, folders, active recipe, and preferences.
2. Import validates the backup payload before restoring local state and optional cloud writes.

## API endpoints
- `POST /api/ai/adjust`
  Adjust an existing recipe with AI.
- `POST /api/ai/generate-steps`
  Generate or improve recipe steps and metadata.
- `POST /api/ai/fill-rest`
  Fill missing parts of a partially completed recipe.
- `POST /api/ai/generate-tips`
  Generate advanced tips/tricks for a recipe.
- `POST /api/ai/apply-prefix`
  Re-style a recipe to a named profile.
- `POST /api/ai/import`
  Parse recipe content from URL text, raw text, files, or images.
- `GET /api/fetch-url`
  Fetch and extract recipe data from a URL with validation, SSRF/private-host blocking, JSON-LD extraction, Microdata extraction, and text fallback.

## AI placement
- All model calls happen on the server in `server.ts`.
- The browser only calls app-owned endpoints in `src/services/aiService.ts`.
- Prompt construction lives on the server, not in frontend components.
- Current model identifiers are defined in `server.ts` and should only be changed there.

## Current domain model
- Core types live in `src/types.ts`.
- `Recipe` is the main product object and includes title, summary, servings, ingredients, steps, timeline, AI rationale, tips, and ownership metadata.
- `Folder` stores sharing metadata (`ownerUID`, `sharedWith`, `editorUids`, `viewerUids`) and supports an "Ikke gemte" default folder.

## High-risk files
These should receive minimal, carefully scoped changes:
- `src/App.tsx`
- `src/components/RecipeView.tsx`
- `src/components/CookView.tsx`
- `server.ts`
- `firestore.rules`

## Known drift and active source of truth
- `README.md` still mentions Supabase in places.
- `PLAN.md` and `AGENTS.md` state that Firebase Auth + Firestore are the active architecture.
- Historical references can remain in docs/examples, but current implementation work should follow the repo-native plan and the live codebase.
