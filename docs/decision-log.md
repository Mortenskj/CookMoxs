# CookMoxs Decision Log

## Log metadata
- Active plan version: `merged repo-native plan v2`
- Tracking started: `2026-03-25`
- Purpose: capture decisions that shape implementation order, source-of-truth handling, and delivery constraints.

## Decisions
### 2026-03-25 - Use repo-native plan as execution source of truth
- Status: Accepted
- Scope: execution control
- Decision: `PLAN.md` is the active execution plan, and work proceeds one unfinished step at a time.
- Rationale: `AGENTS.md` explicitly requires step-by-step execution and warns against combining phases or skipping ahead.

### 2026-03-25 - Treat Firebase/Firestore as current architecture source of truth
- Status: Accepted
- Scope: architecture baseline documentation
- Decision: Current architecture documentation should reflect Firebase Auth + Firestore, Express in `server.ts`, and server-side Gemini usage, even where older docs still mention Supabase.
- Rationale: The live code, `PLAN.md`, and `AGENTS.md` align on Firebase/Firestore and server-owned AI prompts; legacy references are noted as drift, not current truth.

### 2026-03-25 - Create lightweight repo-local logs before feature work
- Status: Accepted
- Scope: Phase 0 documentation
- Decision: Progress and decision tracking should start as simple markdown logs under `docs/` rather than a heavier process or external tool.
- Rationale: This satisfies Step 0.2 with minimal overhead and keeps execution context versioned inside the repo.
