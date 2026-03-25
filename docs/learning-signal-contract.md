# Learning Signal Contract

## Purpose
This document defines the conservative signal boundary for Phase 5.

Step 5.1 does not add recommendations, hidden inference, or user-facing suggestion behavior.
It only defines what future learning/profile work may and may not use.

## Allowed signal categories
### 1. Explicit first-party product events
Only clear, user-triggered product events already tracked by the app are allowed as future signal inputs.

Examples from the current app:
- `recipe_import_started`
- `recipe_import_succeeded`
- `recipe_import_failed`
- `recipe_saved`
- `recipe_deleted`
- `cook_mode_started`
- `cook_mode_completed`
- `ai_adjust_used`
- `backup_exported`
- `backup_restored`
- `folder_shared`
- `folder_deleted_undone`
- `module_enabled`
- `module_disabled`

### 2. Explicit user-controlled feedback
Future learning signals may include feedback the user intentionally gives in a narrow, understandable flow.

Allowed examples:
- explicit thumbs up/down style feedback
- explicit "useful / not useful" feedback
- explicit opt-in preferences chosen in settings

### 3. Explicit module or preference state
The app may later use feature/module state that the user has clearly chosen.

Allowed examples:
- module enabled/disabled state
- import preference mode
- future learning-profile module opt-in state

### 4. Separate learning/profile records
Future profile or preference data is allowed only when it is stored as a separate learning/profile record and not embedded into recipe core data.

Allowed examples:
- separate learning profile snapshot
- separate preference summary record
- separate explicit feedback history

## Disallowed signal categories
### 1. Opaque behavioral scoring
Do not invent hidden scores, secret rankings, or unexplained confidence about a user.

### 2. Cross-user or cross-household blending
Do not merge behavior across different users or households to shape a person's profile implicitly.

### 3. Sensitive inference
Do not infer health conditions, family composition, emotions, religion, lifestyle, or other sensitive traits from usage.

### 4. Passive or creepy tracking
Do not collect surveillance-style background behavior, passive monitoring, or data the user would not reasonably expect.

### 5. Silent behavioral action
Do not use signals to silently rewrite recipe content, change permissions, or broaden visibility.

### 6. Growth or monetization signal expansion
Do not use this phase to introduce payment, premium targeting, creator logic, public-sharing expansion, or growth experimentation.

## Profile boundary rules
- Learning/profile data must remain separate from recipe core data.
- Recipe objects must not become the storage home for learning profile state.
- Backup format must not grow learning/profile state in Step 5.1.
- Local storage shape must not change in Step 5.1.
- Firestore structure must not change in Step 5.1.
- Any later storage path should be modular and reversible.

## Interpretation rules
- Prefer explicit user action over hidden inference.
- Prefer explanation over cleverness.
- Prefer inspectable data over opaque modeling.
- If a future signal does not fit clearly into an allowed category, it should be treated as disallowed until a later plan step explicitly approves it.

## Non-goals for Step 5.1
- No recommendation logic
- No user-facing suggestion UI
- No AI-generated personal intelligence
- No recipe model changes
- No runtime storage changes
