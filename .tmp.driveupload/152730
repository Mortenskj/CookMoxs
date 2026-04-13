# CookMoxs — Why the v2.2 changes are required

This note exists to reduce Codex interpretation work.
The app already tells us where reliability breaks. The repair should therefore be prescriptive where product intent is known.

---

## 1. Why model verification is now a dedicated preflight phase

Gemini model codes have changed across release cycles.
A repair guide that hardcodes stale model strings creates a new failure while trying to remove one.

The right move is:
- verify official model codes first
- record the verified codes in the implementation summary
- centralize those codes in one config file

For this repair pass, the important truth is not “Gemini 3 something”.
It is the exact runtime-valid identifier.

That is why Phase -1 exists.

---

## 2. Why server hardening must happen before cook-mode polish

Cook mode quality depends on recipe-step quality.
Recipe-step quality depends on import and AI routes not silently degrading.

If the server layer can fail with:
- wrong model IDs
- empty responses
- malformed JSON
- unsafe redirect behavior in public URL fetching

then everything downstream becomes noisy and misleading.

This is why the guide prioritizes:
- model centralization
- defensive response extraction
- categorized parse failures
- redirect-aware URL safety

before broader cleanup.

---

## 3. Why frontend failure handling is explicitly specified

A technically safe server is not enough if the client still:
- leaves a spinner hanging forever
- silently fails
- throws the user into a blank screen
- surfaces a vague “Noget gik galt” with no actionable meaning

The product goal here is not perfect observability.
It is predictable user recovery.

That is why v2.1 requires:
- a minimal ErrorBoundary
- always-reset loading states in `finally`
- user-safe error categories flowing into the existing error UI

This is a reliability feature, not optional polish.

---

## 4. Why cook mode now has a canonical contract instead of loose formatting

The product requirement is not “display heat somehow”.
The requirement is “give the user a trustworthy execution instruction”.

Ranges like:
- `2-3/9`
- `5-6/9`
- `7-8/9`

still force interpretation.
That is not acceptable for a cook-mode execution surface.

So the repair deliberately moves from vague labels to canonical data:
- one exact `heatLevel`
- one deterministic mapping
- one migration path for old data

This removes ambiguity instead of repainting ambiguity.

---

## 5. Why migration for existing recipes is mandatory

It is not enough to normalize only new imports.
If old recipes remain in storage with:
- range heat values
- vague heat strings
- stale `relevantIngredients`

then the app will still behave inconsistently after repair.

That is why normalization must run:
- on local load
- on Firestore listener hydration
- on backup restore
- on import
- after AI-generated changes

The app must not have “fixed new data, broken old data”.

---

## 6. Why “Ingredienser nu” uses omission over misinformation

This is one of the most important trust corrections.

If a step says:
- `Brun kødet af`

but cook mode shows:
- `Ingredienser nu: Løg`

then the UI is actively misleading.
That is worse than showing no hint.

The right trust order is therefore:
1. validate existing `relevantIngredients`
2. recompute from step text when needed
3. show nothing when confidence is low

That rule is intentionally conservative.
Reliability matters more than seeming “smart”.

---

## 7. Why Supabase cleanup is not just cosmetic

When the repo says one backend in docs and another in runtime, every future debug session starts from a false premise.

That costs:
- onboarding time
- deployment confidence
- debugging accuracy
- maintenance discipline

The fix is not to mention both systems “for completeness”.
The fix is to remove the dead track and document the live one.

That is why the guide explicitly includes:
- README
- render config
- leftover root artifacts
- any stale comments or env names

---

## 8. Why permission semantics are narrowed instead of expanded

The repo already has schema concepts like `viewer` and `editor`.
But schema breadth is not product truth.
Backend-enforced behavior is product truth.

If the UI promises edit rights that recipe rules do not reliably support, the feature is fake.

For a stabilization pass, the correct move is to narrow semantics to what the backend already guarantees.
That is why v2.1 instructs Codex to make sharing view-only in the user-facing UI unless full edit support is truly implemented and tested in the same pass.

This is a deliberate trust-preserving tradeoff.

---

## 9. Why cache versioning must be build-driven instead of manual

Manual version bumps create stale-state bugs because humans forget.
This is especially risky when the repair changes recipe normalization behavior.

The correct pattern is:
- one build-driven source of truth
- service-worker cache names derived from it
- recipe-cache version derived from it too

This avoids the classic failure mode where code changes but old cached normalized payloads remain in circulation.

---

## 10. Why parser changes must be fixture-driven, not memory-driven

Earlier notes from earlier repo states are useful clues, but they are not proof.

The current `recipeDirectParser.ts` may already contain some fixes that older repair notes complained about.
So the right procedure is:
- add a local Danish fixture
- verify current parser behavior against that fixture
- only change the parser if the fixture exposes a real failure

This prevents cargo-cult rewrites and unnecessary parser churn.

---

## 11. Why this guide is intentionally prescriptive

In some projects, implementation creativity is valuable.
In this repair, ambiguity is expensive.

We already know the intended outcome in the high-risk areas:
- Firebase only
- verified model IDs only
- exact induction values
- no misleading ingredient hints
- no fake edit semantics
- no stale active-recipe leakage
- no manual cache-version rituals

So the guide tells Codex not only what direction to move in, but exactly which behavior to implement.

That is on purpose.

---

## Practical priority order for trade-offs

If implementation trade-offs appear, use this order:

1. correctness over convenience
2. deterministic behavior over cleverness
3. omission over misinformation
4. backend truth over optimistic UI semantics
5. small safe extractions over large rewrites

If one change makes the app feel slightly less ambitious but much more trustworthy, that is the correct decision for this repair pass.


---

## 12. Why the model baseline now includes an honesty fallback

A guide should not pretend that a model code was freshly verified when the implementation environment could not actually verify it.

That is why v2.2 adds this rule:
- if live verification is possible, record the verified result
- if live verification is not possible, use the documented baseline and explicitly mark it as baseline-used / not-live-verified

This keeps the implementation honest instead of circular.

---

## 13. Why simmer and weak-heat cues are explicitly mapped

Danish recipes use `simr`, `lad simre`, `skru ned`, and `svag varme` constantly.
If those cues are missing from the canonical mapping, normalization will omit too many otherwise reliable stovetop instructions.

That is why v2.2 restores explicit mappings for:
- `svag varme` -> 2
- `simr` / simmer-down cues -> 3

The repair still prefers omission over guessing, but common Danish cues should not be treated as unknown when they are actually stable.

---

## 14. Why shared-recipe hydration is called out explicitly

`Firestore listeners` already covers a lot, but shared recipes are an easy place for older payloads to survive because they often enter through a different listener path and a different mental model.

Calling shared-recipe hydration out explicitly reduces the chance that Codex normalizes only owned recipes and forgets the collaborative read path.

---

## 15. Why dependency churn is intentionally constrained

A stabilization pass should not invite package-level improvisation.
If Codex starts cleaning up dependencies opportunistically, the repair surface expands and new regressions become harder to attribute.

That is why v2.2 says:
- keep dependency changes minimal
- remove dead Supabase packages only if they actually exist
- do not remove Firebase just because the server does not import it

The goal is repair, not speculative package gardening.

---

## 16. Why the expanded smoke test appendix is back

The short checklist is good for gates.
The expanded checklist is better for implementation discipline because it makes the important user journeys explicit:
- guest save
- six AI failure surfaces
- exact cook-mode heat output
- shared-recipe normalization
- backend-truth UI narrowing

That appendix gives Codex less room to silently skip a path and still claim completion.
