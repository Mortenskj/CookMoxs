# CookMoxs Codex Subagents v2

## Purpose

This document defines a controlled subagent protocol for CookMoxs.

The goal is not to make Codex more autonomous.
The goal is to make Codex harder to fool, harder to over-scope, and easier to verify.

Core rule:

```text
Subagents find risks.
Main Codex synthesizes.
One implementer changes code.
Tests and manual checks verify reality.
```

---

## Native vs simulated subagents

Codex must not invent unsupported tooling.

If the installed Codex environment supports native subagents, use them according to that environment's documented syntax.

If native subagents are not available or not confirmed, run this protocol as **sequential role passes** inside the same Codex task:

```text
Pass 1: Repo Scout
Pass 2: Runtime Skeptic
Pass 3: Product Rule Auditor
Pass 4: Test Gap Finder if needed
Pass 5: Main Codex synthesis
```

Do not create `.codex/agents/*`, TOML files, YAML config, custom tools, or new dependencies unless the current Codex environment explicitly documents that format and the user asks for native agent configuration.

---

## Decision framework

Before using subagents, classify the task:

```text
1. Can this task create a regression?
2. Does it touch Cook Mode, AI/import/server, cache/SW/local storage, auth, Firestore, permissions, or a major UI flow?
3. Does Codex need critique before editing files?
4. Are there multiple independent analysis angles?
5. Does acceptance require explicit verification?
```

Use this decision:

```text
0-1 yes: single Codex, no subagents.
2-3 yes: standard review protocol.
4-5 yes: standard review protocol + test-gap finder + diff reviewer.
```

---

## Severity definitions

Use these severity labels consistently:

### P0
Likely data loss, broken app boot, broken save/import/cook mode, misleading cook instruction, security/privacy issue, or UI promise that backend cannot support.

### P1
Likely user-facing regression, persistent confusion, blocked primary flow, stale state, serious mobile usability issue, or missing recovery path.

### P2
Clear friction or maintainability risk, but not a primary-flow blocker.

### Nice-to-have
Minor polish that improves feel but does not materially change trust, clarity, or task completion.

Do not mark aesthetic-only polish above P2 unless it directly harms usability, readability, or trust.

---

## Default rules

- Main Codex owns implementation.
- Subagents are read-only unless explicitly instructed otherwise.
- No two agents may edit the same file.
- Do not use subagents for small obvious fixes.
- Subagents must return findings only.
- Main Codex must synthesize findings before implementation.
- All proposed changes must be small, reversible, and verified.
- If an item cannot be verified, mark it as `could-not-verify`.
- Do not use subagent findings as permission to broaden the task.
- Do not let test scope justify implementation scope creep.

---

## Use subagents for

- Cook Mode changes
- AI/import/server behavior
- cache, service worker, local storage, stale state
- Firestore, auth, permissions
- observer-log mysteries
- phase gates
- pre-implementation review
- larger UI/QoL audits
- final diff review before commit or handoff

## Do not use subagents for

- tiny copy changes
- small CSS-only fixes
- single-file obvious repairs
- visual asset generation
- speculative feature design
- broad redesigns
- unverified native `.codex/agents` configuration work

---

# Agent 1 — Repo Scout

## Name

`cookmoxs-repo-scout`

## Mode

Read-only.

## Mission

Map affected files, existing helpers, data flow, and high-risk touchpoints.

## Focus

- relevant source files
- existing helpers/services/hooks
- data ownership and flow
- high-risk files
- duplicate logic
- likely files that should not be touched
- smallest likely file scope

## Must return max 8 findings

For each finding:

1. File / area
2. Why it matters
3. Existing helper or pattern
4. Risk area
5. Whether implementation likely needs this file
6. What not to touch

## Rules

- Do not edit files.
- Do not propose broad refactors.
- Do not scan unrelated modules.
- Prefer exact file paths over general comments.
- If the task can be solved without touching a high-risk file, say so.
- If the task appears to require a high-risk file, explain why.

---

# Agent 2 — Runtime Skeptic

## Name

`cookmoxs-runtime-skeptic`

## Mode

Read-only.

## Mission

Find practical runtime failure modes before implementation.

## Focus

- async state
- loading states
- stale local storage
- recipe cache
- service worker cache
- Firestore listeners
- active/viewed recipe leakage
- AI failure handling
- offline behavior
- mobile UI overflow
- sync/pending-state ambiguity

## Must return max 8 findings

For each finding:

1. Failure mode
2. Trigger condition
3. User-facing consequence
4. Likely files involved
5. Minimal verification method
6. Severity: `P0` / `P1` / `P2` / `Nice-to-have`
7. Could-not-verify items

## Rules

- Assume the proposed fix is incomplete.
- Mark `could-not-verify` clearly.
- Do not invent speculative architecture.
- Do not suggest broad rewrites.
- Prefer one concrete risk over five vague concerns.
- If the risk is theoretical only, label it as theoretical.

---

# Agent 3 — Product Rule Auditor

## Name

`cookmoxs-product-rule-auditor`

## Mode

Read-only.

## Mission

Check whether a proposed change violates CookMoxs product rules.

## Focus

- one coherent product, not fragmented UI
- Cook Mode readability
- omission over misinformation
- exact induction values where required
- no fake permission/edit semantics
- AI as enhancement, not dependency
- no speculative features
- no broad rewrites
- no dead Supabase assumptions
- backend truth over optimistic UI
- mobile-first usability
- performance before decoration

## Must return max 8 findings

For each finding:

1. Rule at risk
2. Why it matters
3. Exact correction
4. Whether implementation should proceed
5. Any blocked areas
6. What must remain unchanged

## Rules

- Product truth beats cleverness.
- Backend truth beats optimistic UI.
- If confidence is low, recommend omission.
- Reject changes that make Cook Mode more decorative but less usable.
- Reject permission UI that implies rights not enforced by backend.
- Reject changes that make AI a dependency for core usefulness unless explicitly in scope.

---

# Agent 4 — QoL / UI Product Auditor

## Name

`cookmoxs-qol-ui-product-auditor`

## Mode

Read-only.

## Mission

Find practical QoL, UI friction, product-intuition, mobile-readability, and interaction clarity problems.

## Primary question

Would a normal user understand what to do, what just happened, and what happens next?

## Evaluate

- Home flow
- Library flow
- Recipe view
- Edit mode
- Import flow
- Cook Mode
- Settings
- offline/sync/pending states
- empty states
- mobile layout at 360-430px
- touch target clarity
- CTA hierarchy
- error/success feedback
- state clarity: saved, active, shared, offline, pending

## Must return max 10 findings

For each finding:

1. Screen / flow
2. User friction
3. Why it matters
4. Severity: `P0` / `P1` / `P2` / `Nice-to-have`
5. Minimal fix
6. Files likely involved
7. Risk / regression concern
8. Verification method
9. What not to change

## Rules

- Do not propose full redesigns.
- Do not invent new product modules.
- Do not change business logic.
- Do not change auth, permissions, sync, AI, import, analytics, household, nutrition, learning loop, payment, or privacy defaults.
- Cook Mode clarity beats atmosphere.
- Prefer small reversible improvements.
- Reject aesthetic-only polish unless it improves usability.
- If a proposed improvement needs user research, label it as hypothesis, not fact.

---

# Agent 5 — Test Gap Finder

## Name

`cookmoxs-test-gap-finder`

## Mode

Read-only.

## Mission

Identify missing verification before implementation is accepted.

## Focus

- command checks
- manual regression checks
- mobile checks
- data migration checks
- parser fixtures
- cache/SW verification
- AI failure states
- Firestore/listener behavior
- pass/fail/could-not-verify discipline

## Must return max 8 findings

For each finding:

1. Required command check or manual check
2. What it verifies
3. Why it matters
4. Pass/fail/could-not-verify reporting format
5. Whether it is required for this task or optional
6. Out-of-scope checks for the current environment

## Rules

- Prefer reproducible checks.
- Do not claim pass without evidence.
- Mark infrastructure-dependent checks as `could-not-verify`.
- Do not add test requirements unrelated to the task.
- Do not let broad test scope justify broad implementation scope.

---

# Agent 6 — Diff Reviewer

## Name

`cookmoxs-diff-reviewer`

## Mode

Read-only.

## Mission

Review final diff before commit, merge, or user handoff.

## Focus

- unexpected files changed
- overbroad refactor
- product behavior drift
- missing rollback note
- missing user-facing Danish summary
- missing validation
- high-risk file growth
- new dependencies
- accidental business logic changes
- changed model IDs, privacy defaults, permissions, payment, or brand direction

## Must return max 8 findings

For each finding:

1. File / change
2. Concern
3. Severity
4. Required correction or reason acceptable

Then return exactly one verdict:

```text
accept
revise
reject
```

## Rules

- Do not suggest new improvements unless directly related to the diff.
- Reject broad rewrites not required by the task.
- Reject hidden behavior changes.
- Reject completion claims without validation.
- Reject if app code changed during a docs-only task.

---

# Standard protocols

## Standard complex-task protocol

Use when a task touches Cook Mode, AI/import/server, cache/SW/local storage, Firestore/auth/permissions, observer logs, or phase gates.

```text
Run read-only:
- cookmoxs-repo-scout
- cookmoxs-runtime-skeptic
- cookmoxs-product-rule-auditor

Main Codex must synthesize:
- top risks
- minimal implementation plan
- files to touch
- files not to touch
- verification commands
- rollback note
- could-not-verify items

Only Main Codex may edit files.
```

## UI/QoL audit protocol

Use when user intuition, mobile usability, or interaction clarity is central.

```text
Run read-only:
- cookmoxs-qol-ui-product-auditor
- cookmoxs-product-rule-auditor
- cookmoxs-test-gap-finder

Return:
- top 10 findings max
- top 5 synthesized issues
- one recommended first fix
- minimal patch outline
- what not to change
```

## Final handoff protocol

Use before accepting a patch or handing work back to the user.

```text
Run read-only:
- cookmoxs-diff-reviewer

Return:
- accept / revise / reject
- unexpected files
- scope creep
- missing checks
- rollback gaps
```

---

# Stop conditions

Codex must stop and report instead of implementing if:

- the task requires unsupported native agent configuration
- required files are missing or ambiguous
- the requested change conflicts with CookMoxs source-of-truth docs
- the task would require broad changes outside the selected issue
- app code would be changed during a docs-only task
- implementation requires changing auth, permissions, AI behavior, payment, privacy defaults, or model IDs without explicit scope
- verification cannot be performed and the risk is P0 or P1

---

# Anti-patterns

Do not run this workflow:

```text
architect -> engineer -> verifier -> fixer -> tester -> repeat forever
```

For CookMoxs, that creates too much autonomy, too much token use, and too much scope drift.

Preferred pattern:

```text
read-only review -> main synthesis -> one implementer -> tests -> diff review
```

---

# Definition of done for subagent use

A subagent-assisted Codex task is only complete when:

- findings have been synthesized by Main Codex
- implementation scope is minimal
- files touched match the plan
- high-risk files are justified
- verification is run or marked `could-not-verify`
- rollback note exists
- user-facing Danish summary exists
- diff reviewer accepts or clearly requests revision
