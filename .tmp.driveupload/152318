# Phase 4 Nutrition and Barcode Prep

## Goal
Turn the deferred nutrition and barcode placeholder into a narrow, interface-first phase that can be built without spreading product complexity too early.

## Starting point
- Phase 1 through 3 now cover import clarity, offline foundations, household basics, and visible permission behavior.
- The repo already has product space for recipe structure and cook usage, but no stable nutrition provider interface or barcode flow yet.
- `PLAN.md` already names Open Food Facts as the primary provider direction for this phase.

## Non-goals
- No premium meal-planner or shopping ecosystem.
- No broad pantry or inventory system.
- No rewrite of recipe import around nutrition data.
- No hard dependency on live provider access during early implementation.

## Proposed execution order
### 4.1 Nutrition provider interface and mock path
- Define a stable nutrition/barcode provider contract first.
- Add an Open Food Facts provider behind that interface plus a mock fallback for local development.

### 4.2 Product lookup and result model
- Add a small service layer for barcode lookup and text search.
- Normalize external product data into a repo-owned product result shape before any UI is added.

### 4.3 Minimal nutrition/barcode UI
- Expose the smallest useful nutrition surface in one contained place.
- Support manual barcode entry and product lookup before camera-heavy flows.

### 4.4 Recipe nutrition attachment and explanation
- Let users attach a looked-up product or nutrition result to a recipe-facing surface in a clearly labeled way.
- Keep nutrition read-only or lightly editable at first, with visible provenance.

## Key risks to control
- Building UI around provider-specific response fields instead of a repo-owned interface.
- Letting barcode/nutrition scope expand into pantry, shopping, or meal planning too early.
- Making live provider availability a blocker for local development and verification.
- Presenting nutrition values with too much certainty when data source quality varies.

## Suggested smoke checks for Phase 4
- Mock provider and Open Food Facts provider both satisfy the same internal interface.
- Barcode/text lookup failures produce readable messages instead of raw provider errors.
- Nutrition UI stays isolated and does not disrupt import, cook mode, or library flows.
- Attached nutrition data remains clearly labeled with its source or fallback status.

## Exit condition for Phase 4
- The app has a stable nutrition provider abstraction.
- Users can look up a product by barcode or text in a minimal, understandable flow.
- Nutrition data can be shown or attached without implying more certainty than the source supports.
