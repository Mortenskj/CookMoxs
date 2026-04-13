# Phase 3 Permission UI Prep

## Goal
Turn the existing ownership foundations into a visible and understandable permission model without broad UI sprawl or hidden behavior changes.

## Starting point
- Phase 2 already defines household data, services, minimal household UI, and ownership labels.
- Current users can see ownership state, but cannot yet manage privacy or permission state in a clear, guided way.
- Folder sharing exists today and must remain stable while Phase 3 improves the visible model around it.

## Non-goals
- No new premium logic.
- No creator marketplace or public-sharing model.
- No large multi-surface redesign.
- No rollout-wide permission rewrite in one step.

## Proposed execution order
### 3.1 Permission state copy and UI model
- Add a shared UI model for `private`, `shared_view`, `shared_edit`, and `household`.
- Define visible labels, helper copy, and safeguards before behavior-changing controls.

### 3.2 Folder permission panel
- Add the smallest useful owner-facing control surface for folder privacy or sharing mode.
- Show current state, who has access, and what the selected mode means.

### 3.3 Member and invite management
- Let owners/admins adjust household member role visibility and remove pending/active members from the same settings-family surface.
- Keep edits focused on the household area rather than spreading controls through library and recipe screens.

### 3.4 Permission-aware create and move flows
- Make folder pickers and relevant save or move surfaces warn clearly when content is entering a shared or household-owned space.
- Prefer explanation and confirmation over hidden inheritance.

## Key risks to control
- Accidentally breaking existing folder sharing while adding more explicit controls.
- Letting recipe-level UI imply permissions that the backend does not actually enforce yet.
- Growing large views like `RecipeView.tsx` or `App.tsx` instead of keeping logic in small helpers/components.

## Suggested smoke checks for Phase 3
- Existing shared folder still opens and lists recipes.
- Owner can still share a folder the old way after new permission UI lands.
- Labels and permission copy stay consistent across settings, library, and recipe screens.
- Household-owned content never appears as private in visible UI.

## Exit condition for Phase 3
- Users can understand what is private, shared, or household-owned.
- Owners/admins can see and manage the most important permission states without reading docs.
- Existing shared-folder behavior remains intact.
