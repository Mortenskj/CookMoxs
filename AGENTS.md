# AGENTS.md — CookMoxs

## Mission
CookMoxs should become the most trustworthy place to collect private recipes, improve them with AI, and actually cook from them in practice.

The product must remain useful **without AI** and reliable **during real kitchen use**.

## Working mode
You are working in a live codebase. Make **small, reversible, verified** changes.

### Non-negotiable principles
1. Keep the base product clean: private recipes, cook mode, sync, backup.
2. AI is an enhancement, not a dependency.
3. Advanced functionality must be modular (nutrition, barcode, meal prep, insights).
4. Trust beats cleverness.
5. Cook mode is core.
6. No feature without a measurement point.
7. Do not dump new logic into giant views.
8. No speculative refactors.
9. No ambiguous completion claims.
10. Risky features land behind a setting or feature flag unless a step explicitly says otherwise.
11. Prefer practical offline-first behavior where it matters.
12. Do not change model IDs, privacy defaults, brand direction, or payment logic unless a step explicitly requires it.

## Do-not-touch list
Unless the current step explicitly says otherwise, do not modify:
- payment / premium model
- brand direction / naming
- privacy defaults
- permission defaults
- creator marketplace concepts
- ads / data monetization logic
- broad rollout assumptions

## Files to treat as high risk
These files already exist and are oversized / structurally important. Do not grow them casually.
- `src/App.tsx` (~1251 lines)
- `src/components/RecipeView.tsx` (~1366 lines)
- `src/components/CookView.tsx`
- `server.ts`
- `firestore.rules` (~7KB existing logic)

Preferred locations for new logic:
- `src/services/*`
- `src/hooks/*`
- `src/config/*`
- small focused components under `src/components/*`
- docs under `/docs/*`

## Current architecture facts (source of truth)
- Frontend: React 19 + TypeScript + Vite 8 + Tailwind 4
- Backend: Express in `server.ts`
- AI SDK: `@google/genai`
- Firestore + Firebase Auth are already in use.
- `/api/fetch-url` already does URL validation, SSRF/private-host blocking, JSON-LD extraction, Microdata extraction, and fallback text extraction.
- `src/services/aiService.ts` is a thin frontend wrapper. Prompt construction lives in `server.ts`.
- Gemini model identifiers are preview models and must be taken from `server.ts` only. Do not change model IDs unless a step explicitly requires it.

## Environment variables currently in use
- `GEMINI_API_KEY` — required for AI endpoints (local shell and Render)
- `NODE_ENV` — runtime mode (`development` / `production`)
- `PORT` — runtime port (Render injects this automatically)

Known drift / legacy references:
- Supabase-related references may still exist in docs or examples, but are not the current source of truth unless the step explicitly reintroduces them.
- AI Studio or GitHub token examples in old docs are not source of truth.

If a step introduces a new environment variable, you must explicitly report:
- variable name
- purpose
- where the user must set it (local shell / Render)
- whether it is required or optional

## Execution rules
- Execute only the **first unfinished step** in `PLAN.md`.
- Do not combine unrelated steps.
- Do not skip phases.
- Do not refactor working code unless the current step requires it.
- If a step suggests touching out-of-scope areas, stop and report.
- No newly created file should exceed ~200 lines without explicit justification.
- If an existing giant file must be touched, keep the delta minimal and explain why logic could not live elsewhere.

## Definition of done for a step
A step is not complete unless you provide:
- exact files changed
- exact commands run
- health check results
- proof mapped to the step's acceptance criteria
- a 1–2 sentence Danish summary of what the user will experience differently

## Required response format
### Before implementation
- Current phase
- Current step
- Goal
- Files I expect to touch
- Files I will not touch
- Health checks I will run
- Potential migration impact

### After implementation
- Step completed
- Files changed
- What changed
- Commands run
- Health check result
- Proof of completion
- Document status update
- Next step
- Question: `Step completed. Next step is X.Y. Should I continue now?`
- User-facing summary in plain Danish

## Health checks
Unless the step says otherwise, run:
- `npm install` (if dependencies changed or clean env)
- `npm run lint`
- `npm run build`
- step-specific smoke tests from `PLAN.md`
- targeted regression checks for touched flows

If health checks fail:
1. fix inside the same step and rerun, or
2. rollback and report clearly

Do not continue to the next step with failing checks.

## Git workflow
After an approved step:
- commit with format: `[Phase X.Y] short description`
- push to `main`
- assume Render auto-deploys from `main` unless told otherwise
- do not force-push
- do not rewrite history unless explicitly asked

## Rollback and recovery
If rollback is required:
- prefer reverting only the touched files
- if needed, use git to restore or revert the last commit
- explain in plain Danish what failed and what was rolled back
- remind the user what to verify after redeploy

## Migration notes and feature flags
Any change to Firestore schema, local storage shape, backup format, permission model, household model, offline queue schema, or Recipe type shape requires:
- migration impact note
- backward compatibility note
- rollback note

New risky features must land behind a setting or feature flag unless the step explicitly says otherwise, especially for:
- AI-optional behavior
- offline queues
- nutrition/macros
- barcode scanner
- household permissions
- learning loop

## Firestore rules safety
`firestore.rules` already contains meaningful existing logic.
Do not replace it wholesale.
Any changes to rules require:
- current-state review
- migration impact note
- backward compatibility note
- rules regression check

## AI-optional and offline-first rules
- Direct parse must build on the existing structured extraction in `/api/fetch-url`.
- The task in Phase 1.5 is **mapping structured recipe fields into CookMoxs `Recipe` objects**, not reinventing scraping.
- Offline queue work should use IndexedDB + Blob, not localStorage/base64 as the main path.
- Do not rely on fragile background sync as the only processing trigger.

## Source documents
Use `PLAN.md` as the current execution plan.
If a larger historical reference exists, use it only as supporting context — not as a replacement for `PLAN.md`.
