# CookMoxs Roadmap Baseline

## Phase 0
### 0.1 Architecture docs
Create baseline documentation for architecture, principles, metrics, roadmap, permissions, and release readiness.

### 0.2 Progress and decision logs
Create repo-local logs that track execution progress and decisions against the active plan.

## Phase 1
### 1.1 Analytics service and server relay
Add a first-party analytics abstraction and a server relay endpoint.

### 1.2 Core event wiring
Instrument the core import, save, cook, backup, sharing, and module-toggle flows.

### 1.3 Human-readable import and sync errors
Replace raw technical errors with readable Danish user messaging.

## Phase 1.5
### 1.5.1 Direct parser mapping path
Map structured recipe fields from `/api/fetch-url` extraction into valid CookMoxs recipes without Gemini.

### 1.5.2 Import preference setting
Add a user setting for AI-first, ask-first, or basic-only import behavior.

### 1.5.3 Direct parse first, AI second
Prefer direct parse when possible, then offer AI enhancement.

### 1.5.4 Graceful degradation
Keep the app useful and clear when AI is unavailable.

## Phase 1.7
### 1.7.1 Offline queue service
Create an IndexedDB queue foundation for pending import work.

### 1.7.2 Offline image capture queue
Let users capture recipe images offline and keep them queued after reload.

### 1.7.3 Offline URL queue
Queue URLs offline for later processing.

### 1.7.4 Queue processing on reconnect/app resume
Process queued work when online, on resume, or by explicit action.

### 1.7.5 Proactive recipe caching for cook mode
Keep already saved recipes usable in cook mode while offline.

## Phase 2
### 2.1 Household data model only
Define ownership, membership, and household IDs before broad UI work.

### 2.2 Household service layer
Add household services independent of UI.

### 2.3 Minimal household UI
Expose the smallest useful management surface.

### 2.4 Ownership and sharing labels
Show whether content is private, shared, or household-owned.

## Phase 3
### 3.1 Permission state copy and UI model
Define the visible permission vocabulary before behavior-changing controls.

### 3.2 Folder permission panel
Expose the smallest focused owner-facing permission management surface.

### 3.3 Member and invite management
Make roles and invitations manageable in the household settings area.

### 3.4 Permission-aware create and move flows
Make inherited shared or household visibility explicit when saving or moving content.

## Later phases

### Phase 4
#### 4.1 Nutrition provider interface and mock path
Define the internal provider contract first, then add Open Food Facts and a mock fallback behind it.

#### 4.2 Product lookup and result model
Normalize barcode and text-search results into a repo-owned product shape before broader UI work.

#### 4.3 Minimal nutrition and barcode UI
Expose the smallest contained nutrition surface with manual barcode entry before camera-heavy flows.

#### 4.4 Recipe nutrition attachment and explanation
Let users attach or view nutrition results with clear source labeling and limited implied certainty.

### Phase 5
#### Preparation only
Turn the deferred learning-loop phase into a conservative execution sequence before any profile or suggestion behavior lands.

#### 5.1 Signal contract and profile boundary
Document which learning signals are allowed and keep future profile data separate from recipe core data.

#### 5.2 Modular profile store scaffold
Add only a reversible storage boundary for future profile data, separate from recipes and optional behind a feature flag.

#### 5.3 Explicit feedback capture points
Prefer user-controlled feedback signals over hidden inference when the learning loop begins.

#### 5.4 Profile transparency surface
Show the user what the module knows before introducing stronger suggestions.

### Phase 6
Rollout preparation, support tooling, privacy docs, error reporting, and beta readiness.
