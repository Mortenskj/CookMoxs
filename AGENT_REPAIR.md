# AGENT_REPAIR.md — CookMoxs Repair Session

## Purpose
This document governs a focused repair session. It overrides normal PLAN.md execution order temporarily. All repairs listed in `REPAIR_GUIDE.md` must be completed before resuming the regular plan.

## Session rules

### 1. Only touch what REPAIR_GUIDE.md says
Do not refactor, rename, reorganize, or "improve" anything outside the scope of each numbered repair task. If you notice something unrelated that could be better, add it as a note at the end of your response — do not fix it.

### 2. One repair at a time
Execute repairs in the exact numbered order from `REPAIR_GUIDE.md`. Complete one, report results, then ask whether to continue.

### 3. Minimal delta per file
Each repair should change as few lines as possible. Do not rewrite surrounding code. Do not reformat adjacent lines. Do not move code between files unless the repair explicitly requires it.

### 4. No new dependencies
Do not add npm packages, new config files, new services, or new components unless a repair task explicitly says to.

### 5. No business logic changes
Do not change AI prompts, Firestore rules, authentication flow, household logic, nutrition module, learning module, analytics events, backup format, or permission model.

### 6. No model ID changes
Do not change Gemini model identifiers in `server.ts` unless a repair task explicitly requires it.

### 7. Health checks after each repair
After each repair:
- `npm run lint` must pass (if TypeScript is involved)
- `npm run build` must pass
- Describe what the user will experience differently in 1-2 sentences in Danish

### 8. Report format
After completing each repair, respond with:

```
### Repair [number] completed
**Files changed:** [list]
**What changed:** [1-2 sentences]
**Lint:** pass/fail
**Build:** pass/fail
**User-facing change (DA):** [Danish sentence]
**Next repair:** [number and title]
Continue? (yes/no)
```

### 9. If a repair fails
If lint or build fails after a repair:
1. Fix inside the same repair step
2. If you cannot fix it, revert all changes for that repair
3. Report clearly what failed and why
4. Ask whether to skip or retry

### 10. Do not combine repairs
Even if two repairs touch the same file, execute them as separate steps. This makes rollback safe.

### 11. File risk awareness
These files are large and structurally important. Keep changes surgical:
- `src/App.tsx` (~1251 lines)
- `src/components/RecipeView.tsx` (~1366 lines)
- `src/components/CookView.tsx`
- `server.ts`
- `src/index.css`

### 12. Do not touch these areas
Unless a repair explicitly says otherwise:
- `firestore.rules`
- `PLAN.md`
- `AGENTS.md`
- `DESIGN_PLAN.md`
- `CookMoxs_Art_Direction_Spec.md`
- `docs/*` (except adding repair log entries if needed)
- `supabase/*`
- `public/manifest.webmanifest`
- `render.yaml`
- Seasonal theme token values in `src/index.css`

### 13. Completion
When all repairs in `REPAIR_GUIDE.md` are done, summarize what was fixed and confirm the regular PLAN.md execution can resume.
