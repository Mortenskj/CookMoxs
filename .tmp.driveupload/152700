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

### 2026-03-25 - Define learning signals as an explicit contract before any profile storage
- Status: Accepted
- Scope: Phase 5.1 foundation
- Decision: The first executable Phase 5 step should define allowed and disallowed signal categories and a separate learning-profile boundary in shared docs/config before any profile store or feedback collection is added.
- Rationale: This satisfies the Step 5.1 acceptance criteria with the smallest reversible change, avoids hidden inference, and prevents recipe-core coupling before later Phase 5 steps exist.

### 2026-03-25 - Keep the first profile store scaffold disabled and non-persistent
- Status: Accepted
- Scope: Phase 5.2 foundation
- Decision: The first profile store scaffold should be a separate module boundary with a disabled-by-default, no-op store contract rather than an active persistence path.
- Rationale: This satisfies Step 5.2 while keeping the base product unchanged, avoiding local storage/backup/Firestore coupling too early, and preserving a reversible path for later Phase 5 work.

### 2026-03-25 - Make early feedback explicit, opt-in, and local-only
- Status: Accepted
- Scope: Phase 5.3 foundation
- Decision: The first real feedback capture point should live in Settings, require explicit opt-in, and store only separate local learning-profile feedback rather than hidden behavioral signals.
- Rationale: This satisfies Step 5.3 by preferring user-controlled input over inference, keeps the surface narrow and understandable, and avoids opaque scoring or broader personalization.

### 2026-03-25 - Show the stored learning state before adding stronger behavior
- Status: Accepted
- Scope: Phase 5.4 foundation
- Decision: The first transparency surface should remain settings-only and show only inspectable local learning-profile state, status, and recent explicit feedback.
- Rationale: This satisfies Step 5.4 by making the module understandable before any stronger intelligence behavior exists, while keeping wording cautious and avoiding broad recommendation UI.

### 2026-03-25 - Prepare Phase 6 as an operational rollout phase, not a feature phase
- Status: Accepted
- Scope: post-Phase-5 planning
- Decision: Phase 6 should begin with a conservative operational sequence covering support surfaces, diagnostics boundaries, privacy/help alignment, and controlled beta readiness rather than broad launch logic or new product work.
- Rationale: `PLAN.md` defines Phase 6 as rollout preparation. Converting that into narrow operational steps improves supportability and transparency while avoiding unrelated feature expansion.

### 2026-03-25 - Use copyable support info as the first beta report path
- Status: Accepted
- Scope: Phase 6.1 rollout support
- Decision: The first support/report path should be a simple settings-based version and support surface with copyable support info, rather than a larger reporting system or technical diagnostics UI.
- Rationale: This satisfies Step 6.1 with a low-risk, support-friendly flow that helps beta users self-report clearly without introducing infrastructure that belongs to later rollout steps.

### 2026-03-25 - Keep early diagnostics to a redacted support summary
- Status: Accepted
- Scope: Phase 6.2 rollout support
- Decision: The first diagnostics boundary should stay inside the settings support surface and expose only coarse app-health signals such as network, cloud, and AI availability, with copyable support text but no raw dumps, stack traces, user IDs, recipe content, or broader reporting infrastructure.
- Rationale: This satisfies Step 6.2 with the smallest privacy-conscious change that improves beta supportability while leaving heavier diagnostics and reporting concerns for later rollout work.

### 2026-03-25 - Align beta wording to actual behavior before broader rollout docs
- Status: Accepted
- Scope: Phase 6.3 rollout support
- Decision: Help, support, and privacy wording should stay narrowly tied to the current product behavior: cloud sync is not backup, AI is optional, learning feedback is local-only in this step, and copied support info is only short status text.
- Rationale: This satisfies Step 6.3 with precise wording instead of legal-sounding promises, reduces beta confusion, and avoids claiming support or privacy behavior the current app does not actually implement.

### 2026-03-25 - Use a human-run beta gate instead of rollout automation
- Status: Accepted
- Scope: Phase 6.4 rollout readiness
- Decision: Controlled beta readiness should be documented as a human-executed checklist with explicit verification, ownership, stop conditions, and rollback readiness rather than launch automation or growth logic.
- Rationale: This satisfies Step 6.4 with a conservative, supportable rollout process that matches the current maturity of the product and avoids introducing public-launch assumptions.
