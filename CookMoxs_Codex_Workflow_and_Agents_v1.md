# CookMoxs — Codex Workflow and Agents v1

This document defines how Codex should be used on CookMoxs from this point onward.

It is designed to reduce scope creep, stop premature redesigns, and make Codex behave as a disciplined implementation agent rather than a creative co-designer.

This workflow aligns with official Codex concepts around prompting, subagents, workflows, and repository-level instruction files such as `AGENTS.md`. OpenAI’s Codex docs explicitly document workflows, subagents, and `AGENTS.md` as first-class parts of Codex usage. citeturn250304view0turn250304view2turn250304view3

---

## 1. Purpose

Use Codex for:
- controlled implementation
- repo-aware repair work
- component/system implementation from approved specs
- migrations and cleanup
- tightly scoped polish passes

Do **not** use Codex as the primary place to invent product direction.

Product direction should be decided first in design/spec work.
Codex should then implement against those decisions.

---

## 2. Source of truth priority

Codex must treat the following order as authoritative:

1. `AGENTS.md`
2. the current task brief
3. approved spec files
4. approved visual references
5. current repo code
6. historical drafts

If files conflict:
- follow `AGENTS.md`
- then follow the current task brief
- then follow the newest approved spec

Never let old drafts override approved specs.

---

## 3. Required repo files

These files should exist in or alongside the repo before larger Codex work:

### Product / command layer
- `CookMoxs_Project_Command_Doc_v1.md`

### Approved design specs
- `Approved_UI-01_Button_System_Spec.md`
- `Approved_UI-02_Surface_Card_System.md`
- `Approved_UI-03_Bottom_Navigation_System.md`

### Approved visual references
- `Approved BG-01 — Autumn master background`
- `Approved BG-02 — Spring master background`
- `Approved BG-03 — Summer master background`
- `Approved BG-04 — Winter master background`
- `Approved CS-03 — Autumn contour study`
- `Approved CS-01 — Spring contour study`
- `Approved CS-02 — Summer contour study`
- `Approved CS-04 — Winter contour study`

### Repair / implementation specs
- `repair_v2_2.md`
- `repair_v2_2_rationale.md`

### Agent governance
- `AGENTS.md`

---

## 4. Operating modes

CookMoxs should use Codex in four distinct modes only.

### Mode A — Repair mode
Use when:
- fixing regressions
- cleaning architecture
- normalizing data
- tightening runtime behavior

Examples:
- AI reliability fixes
- folder/default migration
- permission alignment
- BG-09 implementation
- state/cache cleanup

### Mode B — System implementation mode
Use when:
- implementing approved design systems in code
- introducing tokens
- refactoring components to match locked specs

Examples:
- UI-01 implementation
- UI-02 implementation
- UI-03 implementation

### Mode C — View polish mode
Use when:
- applying already-approved system logic to specific screens
- refining spacing, alignment, hierarchy, and layering

Examples:
- HomeView polish
- LibraryView polish
- RecipeView polish
- ImportView polish
- Cook Mode polish

### Mode D — Review mode
Use when:
- auditing what changed
- checking for regressions
- checking adherence to specs
- comparing before/after

Examples:
- “Review this branch against approved UI-01/UI-02/UI-03”
- “Find where the implementation drifts from the spec”

Do not mix all four modes in one Codex task unless absolutely necessary.

---

## 5. Task size rules

### Good Codex tasks
- one repair phase
- one foundation implementation
- one screen polish
- one review pass

### Bad Codex tasks
- “redesign the app”
- “finish everything”
- “make it premium”
- “implement all visuals, animations, layouts, and logic in one pass”

Rule:
**If the task cannot be verified with a short acceptance checklist, it is too broad.**

---

## 6. Branch and execution discipline

For any non-trivial Codex pass:

- create a dedicated branch
- one branch per workstream
- no mixing repair and redesign in the same branch unless specified

Suggested branch naming:
- `repair/v2-2-foundation`
- `design/bg-09-implementation`
- `ui/foundation-v1`
- `polish/home-library-v1`

Codex should:
- work only in the current branch
- avoid unrelated file churn
- not “clean up” extra things unless explicitly requested

---

## 7. Agent behavior rules

Codex must behave like a disciplined implementation agent.

### It must
- read the spec files first
- stay in the requested phase
- prefer small, controlled edits
- say when something could not be verified
- preserve product identity
- protect Cook Mode readability above aesthetics

### It must not
- jump ahead to the next phase
- redesign layouts when only component work was requested
- create placeholder art or random scenic assets
- swap in new generated images when code/system work was requested
- broaden permissions
- silently reinterpret approved specs
- “helpfully” combine multiple workstreams

---

## 8. When to use subagents

OpenAI documents subagents as part of Codex concepts. For CookMoxs, use subagents only when the work genuinely benefits from separation. citeturn250304view0turn250304view2

### Good subagent splits
- `repo-audit` for tracing where a component/system currently exists
- `spec-check` for mapping approved specs to current code
- `implementation` for making the targeted edits
- `review` for checking drift and regressions

### Bad subagent splits
- splitting tiny tasks into many agents
- making one subagent “design” while another “codes” if the design is already approved
- creating agent trees for simple component work

Rule:
**Use subagents to separate concerns, not to simulate a team for its own sake.**

---

## 9. Recommended Codex workflow per task

### Step 1 — Read
Codex should first read:
- `AGENTS.md`
- current task brief
- approved spec files relevant to the task
- relevant screenshots or visual references
- current implementation files

### Step 2 — Restate
Codex should restate:
- what the task is
- what is not in scope
- the acceptance criteria
- the files most likely to change

### Step 3 — Implement
Codex should:
- make the smallest coherent set of code changes
- preserve existing behavior outside scope
- create or update tokens/utilities if that reduces duplication

### Step 4 — Validate
Codex should run:
- lint/type/build checks as appropriate
- targeted smoke checks
- spec-adherence review

### Step 5 — Report
Codex should return:
1. completed scope
2. files changed
3. key implementation decisions
4. checks run
5. could-not-verify items
6. remaining work only if intentionally left incomplete

---

## 10. Standard task template for Codex

Use this template for most CookMoxs Codex tasks.

```text
Read AGENTS.md and the relevant approved spec files first.

Task:
[one narrowly defined task]

In scope:
- [exact items]

Out of scope:
- [exact exclusions]

Use as source of truth:
- [approved spec files]
- [approved screenshots/assets]

Rules:
- stay within scope
- do not redesign unrelated areas
- prefer controlled edits
- do not guess if something cannot be verified
- protect Cook Mode readability and product consistency

Acceptance criteria:
1. ...
2. ...
3. ...

Return:
1. completed scope
2. files changed
3. checks run
4. could-not-verify items
```

---

## 11. Current recommended Codex work order

Now that UI-01, UI-02, and UI-03 are approved, the recommended next implementation sequence is:

### Pack v1
1. `BG-09 — Cook mode neutral base` implementation
2. `UI-01 — Button system` implementation
3. `UI-02 — Surface / card system` implementation
4. `UI-03 — Bottom navigation system` implementation

### Then
5. HomeView polish
6. LibraryView polish
7. RecipeView polish
8. Cook Mode polish
9. ImportView polish

### Then later
10. Motion/animation system
11. Seasonal Cook Mode adaptations
12. Recipe background variants
13. remaining view-specific refinements

---

## 12. Approval gates

CookMoxs should use explicit approval gates.

### Gate A — Spec approved
The design/system spec is locked.

### Gate B — Implementation accepted
Codex implementation matches the spec well enough to proceed.

### Gate C — View accepted
A screen-level polish is approved.

Do not skip directly from draft to full rollout when the foundation is still unstable.

---

## 13. How to handle visual assets in Codex tasks

Codex can use attached screenshots and approved assets as calibration, but it should not invent new scenic imagery when the task is implementation. OpenAI’s Codex docs emphasize prompting, workflows, and repo-aware usage; for CookMoxs that means using assets as references, not letting Codex improvise new art directions during code tasks. citeturn250304view0turn250304view3

Rule:
- visual references inform implementation
- they do not reopen approved design decisions

---

## 14. What “done” means in CookMoxs

A Codex task is done only when:
- it matches the approved spec closely enough
- the code changes are coherent
- the task stayed within scope
- checks were run
- known uncertainty is disclosed
- product behavior is improved without new drift

Technical correctness alone is not enough.
It also has to be right for the product.

---

## 15. Recommended companion repo file

Use the separate `AGENTS.md` file together with this workflow document.

This workflow document explains **how CookMoxs should use Codex**.
`AGENTS.md` tells Codex **how to behave inside the repo by default**.
