# CookMoxs Permissions Model (Conceptual Baseline)

## Purpose
This document defines the target conceptual sharing/privacy levels for future product work.
It is intentionally product-level, not a final database or UI specification.

## Four target levels
### 1. Private
- Default ownership state for personal recipes and folders.
- Only the owner can view or edit.
- This must remain the safest and simplest default.

### 2. Shared view
- The owner shares a folder or recipe with specific people as read-only.
- Recipients can see content but cannot change the source object.
- Best for inspiration, family viewing, and controlled collaboration boundaries.

### 3. Shared edit
- The owner shares with explicit edit permission.
- Collaborators can update shared content, but ownership is still anchored to the original owner or folder owner.
- Activity and conflict rules should stay understandable and auditable.

### 4. Household-owned
- The content belongs to a household space rather than a single person.
- Membership and role rules control who can view, edit, manage, and invite others.
- This is the foundation for the future family/household model.

## Principles for the model
- Privacy defaults should remain conservative.
- Ownership should always be visible in the UI.
- Invitation and membership state should be explicit.
- Permissions should be understandable without reading support docs.
- Migration from today's simple sharing should preserve access whenever possible.

## Current implementation note
- The live codebase already contains owner and folder-sharing metadata:
  `ownerUID`, `sharedWith`, `editorUids`, and `viewerUids`.
- That metadata supports the direction above, but it is not yet the complete final permission model.

## Future design checkpoints
- Define clear actions allowed for viewers, editors, owners, and household admins.
- Decide whether recipe-level sharing and folder-level sharing should coexist or converge.
- Make ownership labels visible before introducing more complex permission controls.
