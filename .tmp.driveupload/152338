# Household Migration Note

## Scope of this step
Step `2.1` defines the shared data model for future household work.
It does not create a UI, does not backfill Firestore, and does not change current sharing behavior.

## New model fields
- `householdId` becomes the shared identifier for household-owned folders and recipes.
- `ownership` becomes the normalized ownership shape for folders and recipes.
- `Household`, `HouseholdMember`, and household roles define the future membership model.

## Legacy fields that remain active
- Folders still keep `ownerUID`, `sharedWith`, `editorUids`, and `viewerUids`.
- Recipes still keep `authorUID`.
- Existing data without `householdId` or `ownership` remains valid and should be treated as personal/shared legacy content.

## Intended migration direction
- Personal folders and recipes can remain without `householdId` and should map to `ownership.type = private`.
- Existing shared folders can later gain `ownership.type = shared` without changing who currently has access.
- Future household-owned folders and recipes will set `householdId` and `ownership.type = household`.
- Recipes can reference inherited ownership from a folder via `ownership.inheritedFromFolderId`.

## No automatic backfill yet
- No migration job is required for this step.
- No local storage migration is required for this step.
- No backup import/export migration is required for this step.
- Existing Firestore documents stay readable as-is because all new model fields are optional.

## Follow-up expectation
- Step `2.2` should add the service layer for household lookup, invite flow, and membership management on top of this model.
