# CookMoxs Release Checklist

## Before merge
- Confirm the work matches the current `PLAN.md` step.
- Confirm out-of-scope areas were not changed.
- Confirm risky files only received minimal deltas when touched.
- Confirm any new env var is documented with purpose, location, and required/optional status.

## Verification
- Run the required health checks for the current step.
- Run step-specific smoke tests from `PLAN.md` when applicable.
- Check the touched flow manually from a user perspective.
- Verify that errors shown to users are readable and actionable.

## Data and safety
- Note migration impact if schema, local storage shape, backup format, permissions, or recipe type changed.
- Note backward compatibility expectations.
- Note rollback plan if the step affects risky paths.
- Confirm privacy defaults were not loosened unintentionally.

## Deploy readiness
- Confirm production build still works.
- Confirm server endpoints touched by the step still respond as expected.
- Confirm app load, import, cook mode, save flow, and backup flow still function when relevant.

## After deploy
- Verify the app loads in the target environment.
- Verify the primary flow affected by the step.
- Check logs or health output for obvious regressions.
- Record what shipped and what the next planned step is.
