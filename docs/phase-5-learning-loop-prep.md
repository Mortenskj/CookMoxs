# Phase 5 Learning Loop Prep

## Goal
Turn the deferred learning-loop placeholder into a conservative, data-bounded phase that earns trust before any suggestion behavior exists.

## Starting point
- Phase 1 already introduced first-party event plumbing and core event names.
- Phase 2 and Phase 3 established ownership, household, and visible permission foundations.
- Phase 4 remained modular and cautious, which Phase 5 should continue rather than undo.
- `PLAN.md` explicitly says this phase should not be fully implemented until Phase 1 data and real usage from Phase 2-3 exist.

## Allowed signal categories
- Explicit first-party product events that already describe clear user actions.
- Explicit user-controlled feedback collected in a narrow, understandable way.
- Basic module state such as enabled or disabled.
- Separated profile or preference data that does not live inside recipe core data.

## Disallowed signal categories
- Hidden behavioral scoring or opaque ranking.
- Cross-user or cross-household blending of behavior.
- Sensitive inference such as health, family composition, emotions, or lifestyle assumptions.
- Creepy passive tracking, background surveillance, or broad personalization spread.
- Any signal use that changes recipe content or permissions silently.

## Non-goals
- No broad recommendation engine.
- No AI-generated personal coach behavior.
- No intrusive personalization surfaces.
- No premium, growth, creator, or public-sharing expansion.
- No recipe-core schema coupling for learning/profile data.

## Proposed execution order
### 5.1 Signal contract and profile boundary
- Document the allowed and disallowed signals clearly.
- Define the rule that profile/preference data must remain separate from recipe core data.

### 5.2 Modular profile store scaffold
- Add only the smallest reversible storage boundary for future profile/preference data.
- Prefer a feature flag if the storage path introduces non-trivial product risk.

### 5.3 Explicit feedback capture points
- Add only clear, user-controlled feedback entry points.
- Avoid hidden inference and avoid overclaiming what the app has learned.

### 5.4 Profile transparency surface
- Show the user what is stored and why before adding stronger suggestions.
- Keep any early surface narrow and explanation-first.

## Key risks to control
- Turning weak or sparse signals into overconfident suggestions.
- Mixing learning/profile data into recipe objects and making rollback hard.
- Building opaque behavior before the user can inspect or control it.
- Expanding into recommendation UI before the data contract is trustworthy.

## Suggested smoke checks for Phase 5
- Allowed and disallowed signals are documented explicitly.
- Any future profile storage remains separate from recipe data.
- Any early UI is optional, inspectable, and explanation-first.
- No recommendation logic lands before its guardrails and data boundaries are in place.

## Exit condition for Phase 5
- The app has a conservative, reversible learning/profile foundation.
- Users can understand what data may be used and what is out of scope.
- Any future intelligence work is constrained by explicit guardrails rather than guesswork.
