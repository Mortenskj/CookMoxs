# CookMoxs Metrics Baseline

## Purpose
Phase 1 needs basic first-party measurement before larger feature work continues.

## Phase 1 event set
- `recipe_import_started`
  Trigger when the user explicitly starts an import action.
- `recipe_import_succeeded`
  Trigger when a parsed recipe is successfully created and shown in the UI.
- `recipe_import_failed`
  Trigger when the import flow ends in a visible error state.
- `recipe_saved`
  Trigger when a recipe save succeeds.
- `recipe_deleted`
  Trigger when delete is confirmed and queued or performed.
- `cook_mode_started`
  Trigger when the user enters cook mode.
- `cook_mode_completed`
  Trigger when the user explicitly ends cook mode or confirms the final step.
- `ai_adjust_used`
  Trigger when an AI-adjusted recipe result is successfully applied.
- `backup_exported`
  Trigger when a backup file is generated.
- `backup_restored`
  Trigger when a validated backup is restored successfully.
- `folder_shared`
  Trigger when a folder sharing action succeeds.
- `folder_deleted_undone`
  Trigger when folder deletion is undone.
- `module_enabled`
  Trigger when a feature/module toggle is enabled.
- `module_disabled`
  Trigger when a feature/module toggle is disabled.

## Suggested base event fields
- `eventName`
- `occurredAt`
- `userState` (`guest` or `authenticated`)
- `view`
- `sourceType` when relevant (`url`, `text`, `file`, `image`, `manual`)
- `recipeId` or `folderId` when relevant
- `success` and `errorCategory` when relevant

## KPI questions for Phase 1
- How many started imports become successful imports?
- Which import sources fail most often?
- How often do users save a recipe after import?
- How many saved recipes are actually used in cook mode?
- How often are AI adjustments used after base import?
- Are backup export and restore used as trust-building features or only as support actions?
- How often are module toggles changed, and which modules create confusion?
- Do shared-folder flows get used enough to justify deeper household work?

## Decision use
- If import success is low, Phase 1.3 and Phase 1.5 should be prioritized harder.
- If cook mode completion is low, usability in `CookView` needs investigation before expansion work.
- If AI adjustments are low but import success is high, the base product is carrying value without AI dependency.
- If backup usage rises during support incidents, release and recovery flows need more visibility.
