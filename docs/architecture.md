# CookMoxs Architecture Baseline

## Purpose

This document captures the active runtime shape of the repository.

## Current stack

- Frontend: React 19 + TypeScript + Vite 8 + Tailwind 4
- Backend: Express in `server.ts`
- AI SDK: `@google/genai`
- Data/auth: Firebase Auth + Firestore
- Hosting shape: one Node server in development and production

## File structure

```text
/
|- server.ts
|- src/
|  |- App.tsx
|  |- components/
|  |- config/
|  |- hooks/
|  |- services/
|  |- firebase.ts
|  |- types.ts
|- public/
|- firebase-applet-config.json
|- firestore.rules
|- PLAN.md
|- AGENTS.md
```

## Service map

- `src/services/aiService.ts`
  Client wrapper around server AI endpoints. The browser never calls Gemini directly.
- `src/services/recipeImportService.ts`
  Maps parsed import payloads into the app `Recipe` shape.
- `src/services/recipeStepNormalization.ts`
  Canonical cook-mode migration and normalization for recipe steps.
- `src/services/localDataService.ts`
  Local storage read/write helpers for recipes, folders, and active recipe hydration.
- `src/services/firestoreDataService.ts`
  Firestore listeners and write/delete operations for recipes and folders.
- `src/services/backupService.ts`
  Backup payload validation, export payload creation, and download helper.
- `src/firebase.ts`
  Firebase app bootstrapping plus Firestore/Auth exports and error shaping.

## Runtime data flow

### Import flow

1. `ImportView` starts import.
2. The browser calls `/api/fetch-url` or `/api/parse-direct` when relevant.
3. The browser calls `/api/ai/import` through `src/services/aiService.ts`.
4. `server.ts` builds prompts and returns structured recipe JSON.
5. `src/services/recipeImportService.ts` maps the parsed data into the app `Recipe` shape.
6. `src/services/recipeStepNormalization.ts` normalizes cook-mode metadata before the recipe is used or saved.

### Save and sync flow

1. App state lives in `src/App.tsx`.
2. Guests read and write through `localDataService`.
3. Authenticated users subscribe through `firestoreDataService`.
4. Shared recipes are hydrated through Firestore listeners and normalized before cook mode uses them.

## Firebase artifacts

- `firebase-applet-config.json` is the active client bootstrap config used by `src/firebase.ts`.
- `firebase-blueprint.json` is not part of the active runtime and was removed during the repair pass to avoid orphaned Firebase artifacts.
