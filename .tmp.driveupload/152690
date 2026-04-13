# Controlled Beta Checklist

## Purpose
Use this checklist before exposing a new beta build to real users.

## Scope
- Controlled beta only.
- No public launch assumptions.
- No growth, premium, creator, or automation work.

## Release gate
Ship only if all items below are answered with a clear yes or a documented reason to wait.

## Verification steps
### App basics
- App loads without blank screen.
- Saved recipes still open.
- Cook mode still starts and remains usable.
- Backup export still works.
- Backup restore still works when relevant to the shipped step.

### Current support surfaces
- Settings shows the current app version.
- Support card can copy support info.
- Support wording still matches actual app behavior.
- If relevant to the shipped step, user-facing errors remain readable.

### Current trust boundaries
- Cloud is still described as sync, not backup.
- AI is still described as optional help, not a requirement.
- Learning feedback is still described as local-only when that is true.
- No new wording implies hidden profiling or invisible recommendations.

### Step-specific verification
- Run the health checks required by `AGENTS.md`.
- Run step-specific smoke tests from `PLAN.md` when they exist.
- Check the main user flow touched by the step from the UI, not only from code.

## Support ownership
### During rollout
- One person owns the go/no-go decision for this beta push.
- One person owns first response to incoming beta problems.
- One person owns rollback or fix-forward if the build is not safe.

### What support should ask for
- App version
- Short support info from Settings
- What the user tried to do
- What happened instead
- Whether the issue is repeatable

### What support should not ask for by default
- Full recipe library export unless truly needed
- Personal notes or unrelated screenshots
- Raw browser internals when the support card already explains enough

## Stop conditions
Pause rollout if any of these are true:
- A core flow is broken: app load, import, cook mode, save, backup, or sync for the affected area.
- The shipped wording makes privacy, backup, or AI claims that are no longer true.
- Support cannot tell users what to collect or who is responding.
- A step introduced risk outside the approved scope.

## Rollback readiness
- The touched files for the step are known.
- The rollback path is clear: fix forward now or revert the touched files/last commit.
- After rollback, verify app load, import, cook mode, saved recipes, and backup again.

## Release note minimum
Record these before calling the beta ready:
- What changed
- What did not change
- What users should watch for
- Who is watching support
