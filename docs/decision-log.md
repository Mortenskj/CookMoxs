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

### 2026-03-25 - Prepare Phase 3 as a permission UI phase, not a backend rewrite
- Status: Accepted
- Scope: post-Phase-2 planning
- Decision: The next phase should focus on visible permission vocabulary, narrow control surfaces, and explicit ownership inheritance rather than broad new backend concepts.
- Rationale: Phase 2 already established household data/service foundations and basic ownership visibility, so the lowest-risk next step is to make permission state understandable before expanding more complex behavior.

### 2026-03-25 - Prepare Phase 4 as an interface-first nutrition phase
- Status: Accepted
- Scope: post-Phase-3 planning
- Decision: The next phase should begin with a repo-owned nutrition provider interface and a mockable provider path before adding barcode or nutrition UI.
- Rationale: `PLAN.md` already points to Open Food Facts as the primary provider, but an interface-first sequence reduces vendor coupling, keeps local development unblocked, and limits early nutrition scope to a reversible module.

### 2026-03-25 - Prepare Phase 5 as a conservative learning-foundation phase
- Status: Accepted
- Scope: post-Phase-4 planning
- Decision: Phase 5 should start with signal guardrails, explicit profile separation, and explanation-first foundations rather than recommendation logic or opaque personalization.
- Rationale: `PLAN.md` explicitly marks Phase 5 as deferred and data-dependent, allowing only foundations and documentation beforehand. A conservative prep path reduces risk, avoids creepy behavior, and keeps future learning data separate from recipe core data.
