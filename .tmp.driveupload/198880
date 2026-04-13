# CookMoxs — Steps 7–9 Master Track
## Visual asset integration, motion system, final polish and release hardening

## Purpose
This document is the master execution spec for the next major CookMoxs track after Steps 1–6.

The track is split into:
- Step 7 — Visual asset integration
- Step 8 — Motion and micro-interactions
- Step 9 — Final polish, regression control and release hardening

This is not a freeform redesign track.

It exists to:
- preserve accepted UI/system work from Steps 1–6
- integrate approved seasonal and cook-mode visual assets correctly
- add restrained, product-appropriate motion
- close regressions before merge/release

The goal is to make the app feel finished, not merely improved.

---

## Core principle
Nothing already accepted gets casually reopened.

Build on the accepted direction:
- one product, not four apps
- Autumn remains the default/base world
- seasonal variation is tonal, not structural fragmentation
- Vivaldi stays hidden in rhythm, density, motion, and visual phrasing — never literal
- Cook Mode is sacred: readability and function beat atmosphere
- light cards inside dark shell still use dark readable ink
- product polish must not reintroduce visual chaos, scenic wallpaper logic, or game-like UI

---

## Precondition
This track assumes the current post-Step-6 branch is the baseline.

If Step 6 is not fully finished at runtime, Codex must still:
- preserve the current accepted structure
- avoid reopening Steps 1–6 broadly
- only correct direct regressions encountered while doing Steps 7–9

---

## Required source material
Codex must read and follow all of these before starting.

### Required repo/project guidance
- `AGENTS.md`
- `CookMoxs_Project_Command_Doc_v1.md` if present
- `CookMoxs_Codex_Workflow_and_Agents_v1.md` if present

### Required approved system specs
- `Approved_UI-01_Button_System_Spec.md`
- `Approved_UI-02_Surface_Card_System.md`
- `Approved_UI-03_Bottom_Navigation_System.md`

### Required recent execution guidance
- `CookMoxs_Step_5_Dansk_Copy_Encoding_UI_Tekstklarhed.md`
- `CookMoxs_Step_6_Interaktionsstater_Feedback_og_Flow_Robusthed.md`

### Required approved visual references / assets
- `Approved BG-01 — Autumn master background`
- `Approved BG-02 — Spring master background`
- `Approved BG-03 — Summer master background`
- `Approved BG-04 — Winter master background`
- `BG-09 visual target`
- approved contour studies if present and relevant

If approved assets exist both as raw files and as already-implemented runtime equivalents, use the approved source of truth and do not invent new variants.

---

## Global execution rules

### 1. Sequential execution with continuation
Codex should execute:
- Step 7
- then Step 8
- then Step 9

It should continue automatically unless a hard blocker prevents safe continuation.

### 2. Step gating
For each step, Codex must:
- state completed scope
- list files changed
- list checks run
- list could-not-verify items
- state whether the step is internally complete

It may continue to the next step in the same run unless:
- build is broken
- a core regression appears
- approved direction cannot be followed safely

### 3. Preserve accepted direction
Do not reopen:
- global card direction
- button system direction
- bottom-nav direction
- dark-shell/light-card polarity
- accepted recipe/settings structure
unless directly required to fix a regression introduced by Steps 7–9

### 4. No broad re-layout
This track is not permission to redesign:
- Settings
- RecipeView
- Library
- Home
- Cook Mode structure
- nutrition/product-data structure
except where direct asset or motion integration demands tiny safe adjustments

### 5. Performance is part of quality
Asset and motion work must not:
- create obvious lag
- add large janky transitions
- cause layout shift
- visibly fight mobile containment
- break sticky CTA safety
- make text less readable

### 6. Reduced motion support is mandatory
Any motion added in Step 8 must degrade cleanly when reduced motion is requested.

---

# STEP 7 — Visual asset integration

## Purpose
Integrate the approved background system and related visual assets into runtime correctly and consistently.

This is not a background-generation step.
This is an integration step.

## Step 7 goals
1. Use the approved seasonal background assets correctly in runtime
2. Preserve crop-safety and mobile safety
3. Ensure the app no longer falls back to old scenic/wallpaper behavior
4. Keep Cook Mode on its approved neutral base direction
5. Make seasonal identity felt clearly without damaging usability

## In scope
- seasonal runtime background mapping
- asset usage for Home / Library / Recipe / Settings and similar non-cook surfaces
- Cook Mode neutral background finalization from approved BG-09 direction
- background fallback logic
- asset containment, crop-safety, safe zones, dark-shell compatibility
- performance-safe asset loading and fallback behavior

## Out of scope
- generating new backgrounds
- inventing new seasonal art direction
- changing UI system geometry
- broad layout redesign
- changing text/copy
- changing nutrition structure
- adding decorative overlays not present in the approved direction

## Step 7 required rules
### 7.1 Seasonal mapping
Autumn is the base/default.
All seasonal variants must still feel like the same product.

### 7.2 No scenic relapse
Do not reintroduce:
- scenic wallpaper behavior
- literal illustrative landscapes
- decorative curve leakage
- hero-art that competes with UI

### 7.3 Crop-safe integration
Each seasonal background must:
- survive 360px and 375px widths
- keep UI-safe center zones readable
- avoid important motifs in unsafe top/bottom corners
- not rely on exact screenshot crops to look correct

### 7.4 Cook Mode background
Cook Mode must stay on its neutral, restrained base.
It may be refined to match BG-09 more closely, but must not drift back into scenic or overly textured behavior.

### 7.5 Runtime fallback
If assets fail or a mode is unavailable:
- fallback must remain product-correct
- no old wallpaper/scenic fallback may return

### 7.6 Asset loading discipline
Prefer:
- stable runtime assignment
- low visual jump when switching theme/season
- safe preloading where justified
- no obvious flash of wrong background

## Step 7 acceptance criteria
Step 7 is only complete if:
1. approved seasonal backgrounds are mapped correctly
2. no old scenic/wallpaper fallback remains
3. Cook Mode remains neutral and text-safe
4. no obvious crop-safety failures appear at 360px / 375px
5. asset changes do not create layout regressions
6. runtime still feels like one product family

## Step 7 screenshots required for review
- Home in each seasonal theme
- Library in each seasonal theme
- Recipe in at least Autumn + one lighter theme
- Settings in at least Autumn + one lighter theme
- Cook Mode neutral base
- one dark-shell example with light cards over seasonal background
- at least one narrow-width screenshot for crop-safety

---

# STEP 8 — Motion and micro-interactions

## Purpose
Add restrained, premium, product-appropriate motion and state transitions.

This step is about behavioral finish, not spectacle.

## Step 8 goals
1. Create a coherent motion language across the app
2. Improve transitions between states without harming clarity
3. Make loading and modal/sheet behavior feel more intentional
4. Preserve performance and readability
5. Support reduced motion cleanly

## In scope
- view-level transitions where already structurally supported
- modal/sheet open-close motion
- button/state transitions
- hover/press/selected transitions where appropriate
- toast/status fade/arrival if relevant
- loading-state micro-motion if subtle and already compatible with the system
- Cook Mode micro-motion only where it improves clarity, never where it competes with reading

## Out of scope
- flashy page animations
- theatrical parallax
- game-like motion
- heavy spring/bounce behavior
- broad visual redesign
- animation-driven layout changes
- new loaders as a design-language reset

## Step 8 motion rules
### 8.1 General motion character
Motion must feel:
- calm
- premium
- low amplitude
- deliberate
- supportive

Motion must not feel:
- playful for its own sake
- app-store-demo flashy
- gaming-like
- excessive
- attention-seeking

### 8.2 Durations
Use a small, consistent duration family.
Prefer short-to-medium transitions.
No slow floaty transitions.

### 8.3 Easing
Use soft, controlled easing.
Avoid exaggerated bounce or overshoot.

### 8.4 View changes
If a view transition exists, it must:
- support orientation and continuity
- not blur text during readability-critical moments
- not create the feeling that the app is “sliding around” without purpose

### 8.5 Modal/sheet behavior
Modals and sheets must:
- open from a coherent origin
- close predictably
- feel stable and contained
- not compete with sticky CTA or lower bars

### 8.6 Buttons and controls
Buttons/chips/segmented controls may use:
- tiny opacity changes
- tiny transform/press depth changes
- subtle state transitions

They must not:
- jump
- bounce
- pulse
- glow dramatically

### 8.7 Cook Mode
Cook Mode motion must be reduced and disciplined.
Reading flow and timing comprehension beat flourish.

### 8.8 Reduced motion
All introduced motion must respect reduced-motion preferences.

## Step 8 acceptance criteria
Step 8 is only complete if:
1. motion feels coherent across touched views
2. no motion fights reading or decision-making
3. reduced motion is supported
4. no new performance or layout regression appears
5. motion improves polish without changing design direction

## Step 8 review artifacts required
Because motion cannot be judged only from stills, Codex must provide:
- list of touched transitions/interactions
- any GIF/video capture suggestions if Codex cannot capture motion directly
- screenshots of affected states before/after if needed
- exact runtime flows to test manually:
  - modal open/close
  - theme switch if affected
  - load/save/import action state transition
  - cook-mode relevant micro-states if touched

---

# STEP 9 — Final polish, regression control and release hardening

## Purpose
Close the track cleanly:
- remove regressions
- verify the integrated product feel
- tighten last inconsistencies
- prepare for merge/release

This is a final hardening and validation step.

## Step 9 goals
1. Check that Steps 7–8 did not break Steps 1–6
2. Close obvious visual/runtime regressions
3. Tighten small inconsistency clusters
4. Ensure release-readiness in practice, not just in code
5. Produce a clear final review packet

## In scope
- regression control
- final spacing/state inconsistency fixes caused by Steps 7–8
- final screenshot matrix preparation
- final runtime sanity pass
- tiny visual/runtime fixes only where directly needed
- release/readiness checklist

## Out of scope
- new features
- new visual systems
- new assets
- broad redesign
- large copy rewrites
- reopening previously accepted foundations without direct evidence

## Step 9 required rules
### 9.1 Regression-first
If a final polish choice conflicts with preserving accepted stability, preserve stability.

### 9.2 No “one more redesign”
Step 9 must not become another design exploration cycle.

### 9.3 Tiny fixes only
Only make:
- direct regression fixes
- tiny consistency fixes
- tiny spacing/state/containment adjustments

### 9.4 Cross-step validation
Codex must actively consider:
- Step 1–6 accepted baseline
- Step 7 asset integration
- Step 8 motion additions
and check whether the combined result still feels coherent

### 9.5 Final review packet
Codex must produce a final review-oriented output:
- what changed in Step 7
- what changed in Step 8
- what Step 9 fixed
- remaining could-not-verify items
- exact manual screenshots/states still needed before merge

## Step 9 acceptance criteria
Step 9 is only complete if:
1. no major regression from Steps 7–8 remains obvious
2. the app still feels like one product
3. final screenshot/manual review can be run cleanly
4. no broad unstable area remains unresolved
5. the branch is realistically close to merge/release

## Step 9 final screenshot matrix
At minimum, final review should include:

### Core surfaces
- Home light / dark
- Library light / dark
- Recipe light / dark
- Settings light / dark
- Cook Mode

### Seasonal coverage
- Autumn
- one lighter theme
- one darker/cooler theme

### Narrow-width checks
- 375px
- 360px

### Known sensitive areas
- Household invite
- Recipe meta block
- ingredient right rail
- nutrition/product-data
- sticky CTA clearance
- cook-mode overlay/menu
- modal/sheet example
- one flow with success/error/local feedback
- one loading/disabled-state flow

---

## Shared quality rules across Steps 7–9
### A. Preserve trust
Do not let visuals or motion undermine clarity.

### B. Preserve containment
No overlap, clipping, broken stacking, detached controls, or floating feedback.

### C. Preserve mobile discipline
Nothing may “almost fit.”
It either fits properly or must be restacked.

### D. Preserve hierarchy
No random emphasis changes from one screen to another.

### E. Preserve product identity
No random external-app mimicry.
No generic SaaS look.
No visual fragmentation between seasons or modes.

---

## Hard stop conditions
Codex must stop and report before continuing if:
- build breaks and cannot be safely repaired inside scope
- accepted direction cannot be followed due to missing approved assets or conflicting repo state
- a direct regression makes the product meaningfully worse and requires user review before continuing

---

## Output format for Codex
Codex must return one structured final report with separate sections for Step 7, Step 8, and Step 9.

For each step include:
1. completed scope
2. files changed
3. key implementation decisions
4. checks run
5. could-not-verify items
6. exact screenshots/manual review flows required

Then add:
7. final regression summary
8. final merge/release readiness assessment

---

## Final rule
If Codex is in doubt, it must:
- preserve the accepted product direction
- choose stricter integration over decorative ambition
- choose readability over atmosphere
- choose stability over novelty

This document is a master execution spec, not an invitation to reinterpret CookMoxs from scratch.
