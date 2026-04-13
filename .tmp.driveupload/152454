# CookMoxs Design Plan

## Purpose
This document is the execution plan for implementing CookMoxs' seasonal visual system in a controlled way.

The goal is to introduce four Vivaldi-inspired seasonal themes without harming:
- readability
- performance
- cook mode clarity
- architectural discipline
- product consistency

This is a **presentation-layer plan**, not a product-logic plan.

---

## North Star
CookMoxs should feel like:

> a calm, sensory, intelligent cooking product where the atmosphere of the four seasons lives in backgrounds, surfaces, rhythm, and motion — without sacrificing clarity, trust, or usability.

---

## Core Design Thesis
CookMoxs should not become four different apps with four unrelated skins.

Instead, it should become:

> one coherent product with one core visual system and four mood variations.

The four themes should be inspired by the emotional and structural feeling of **Vivaldi's Four Seasons**, but that inspiration must remain subtle.

### This means:
- no literal music notes
- no staff lines
- no violin graphics
- no decorative "classical music" clichés

The music should be translated into:
- contour
- rhythm
- density
- air
- light
- motion feel
- seasonal atmosphere

---

## Non-Negotiable Rules

### 1. One base, four mood layers
The following must stay consistent across all themes:
- layout
- component structure
- information hierarchy
- spacing logic
- navigation patterns
- cook mode usability

Only these things should vary:
- color palette
- atmospheric background treatment
- decorative contour / treetop silhouette
- motion feel
- surface emphasis
- subtle tone of UI presentation

### 2. Autumn remains the default
Autumn is the default/base theme unless explicitly changed in a future step.

Reason:
- strongest fit for food, warmth, home, wood, and calm
- most grounded and usable base palette

### 3. Vivaldi must be felt, not read
The musical inspiration should be structural, not literal.

Examples of acceptable translation:
- skyline / treetop contours based on melodic rise and fall
- slightly different motion tempo between seasons
- different visual density and spacing mood between seasons

Examples of unacceptable translation:
- literal notation in UI
- clefs, notes, staves, sheet music overlays
- heavy-handed "classical music" motifs

### 4. Cook mode is sacred
No theme work may reduce:
- readability in cook mode
- touch clarity
- timer usability
- focus under kitchen conditions

### 5. Performance before decoration
The visual system must remain light.
Avoid:
- heavy animations
- video backgrounds
- constant particle effects
- large layered image stacks unless clearly justified

### 6. No business logic changes
This plan does **not** allow changes to:
- AI behavior
- permissions
- sync logic
- analytics
- import logic
- household logic
- nutrition logic
- learning loop behavior

---

## Seasonal Art Direction

## Spring
### Mood
- lifted
- fresh
- opening
- lightness
- upward movement

### Visual character
- pale greens
- young leaf tones
- soft sky light
- slightly more lively contour rhythm

### Motion feel
- lighter
- slightly quicker
- more buoyant

### Atmosphere
Spring should feel like the product is breathing in.

---

## Summer
### Mood
- warmth
- fullness
- ripeness
- richness
- slight dramatic depth

### Visual character
- warm greens
- golden light
- richer contrast
- denser foliage feeling
- subtle sense of heat and abundance

### Motion feel
- richer and fuller
- a touch heavier than spring
- never sluggish

### Atmosphere
Summer should feel expansive and alive, with a little tension under the surface.

---

## Autumn
### Mood
- grounded
- warm
- mature
- home-like
- calm
- generous

### Visual character
- amber
- ochre
- muted olive
- wood and earth undertones
- balanced contrast

### Motion feel
- most settled
- most natural
- most "at home"

### Atmosphere
Autumn is the truest CookMoxs base world.

---

## Winter
### Mood
- crisp
- quiet
- clear
- airy
- restrained
- elegant

### Visual character
- cool gray-blue
- silvered neutrals
- bare branch logic
- more open negative space
- minimal but not sterile

### Motion feel
- slow and precise
- clean
- restrained

### Atmosphere
Winter should feel calm, clear, and focused.

---

## Shared Visual Language

## Background logic
All seasonal themes should share one common atmospheric language:
- broad soft backgrounds
- subtle nature silhouettes
- skyline / treetop contour lines
- restrained texture
- gentle layering

## Treetop contour principle
The decorative top-line / skyline / treetop silhouette can draw inspiration from the **melodic contour** of the best-known passages from each season.

Important:
- this must be abstracted
- it must feel like nature first
- it must never feel like visible notation

## Surface logic
Surfaces should be differentiated through:
- opacity
- warmth/coolness
- accent restraint
- surface depth

Not through wildly different component structures.

## Typography feel
Typography should remain readable and stable across themes.
Differences in mood should come from:
- spacing
- contrast
- surface framing
- supporting ornament
not from dramatic font changes.

---

## Phase Plan

## Design Phase D0 — Theme audit
### Goal
Audit the current theme system before any visual changes.

### Files in scope
- theme token/config files
- global style files
- theme switch logic
- background/decorative helpers
- top-level presentation wrappers if needed for inspection

### Tasks
- identify where current themes are defined
- identify current seasonal token logic
- identify background asset usage
- identify theme switching entry points
- identify high-risk visual views:
  - Home
  - Library
  - RecipeView
  - CookView
  - Settings

### Acceptance criteria
- all theme-related files are mapped
- current token logic is understood
- no visual change is introduced
- risk areas are documented

### Validation
- build passes
- theme switching still works
- no UI differences introduced
**Progress note (2026-03-25):** Completed.

### Out of scope
- no styling changes
- no new assets
- no animation work

---

## Design Phase D1 — Central seasonal token system
### Goal
Introduce a centralized token structure for all four seasonal themes.

### Files in scope
- theme token/config files
- global variables
- small theme helpers only

### Tasks
Define and centralize tokens for:
- background
- surface
- surface-muted
- text-primary
- text-secondary
- border
- accent
- highlight
- atmosphere overlay
- contour / skyline tone
- motion mood

### Acceptance criteria
- all seasonal tokens are centralized
- no hardcoded seasonal colors are scattered through views
- Autumn remains default
- theme switching uses the token layer

### Validation
- build passes
- theme switching works
- no readability regression in core views
**Progress note (2026-03-25):** Completed.

### Out of scope
- no custom loading animations yet
- no large atmospheric assets yet

---

## Design Phase D2 — Shared atmospheric layer
### Goal
Introduce the shared atmospheric visual language used by all four themes.

### Files in scope
- background assets
- decorative helpers/components
- top-level background wrappers
- presentation-only seasonal helpers

### Tasks
- add subtle skyline / treetop contour treatment
- introduce shared atmospheric overlays
- create a coherent seasonal background language
- keep all visual treatment subtle and structural

### Acceptance criteria
- the four themes feel related
- contour language is visible but restrained
- readability is preserved
- no heavy performance cost is introduced

### Validation
- build passes
- core screens remain readable
- no layout overlap with important UI
- no obvious performance regression
**Progress note (2026-03-25):** Completed.

### Out of scope
- no season-specific motion tuning yet
- no loading states yet

---

## Design Phase D3 — Seasonal differentiation
### Goal
Make each season feel distinct while preserving one product family.

### Files in scope
- seasonal token files
- seasonal assets
- presentation-only theme components

### Tasks
- tune each season according to its mood profile
- spring = lifted / fresh / airy
- summer = warm / rich / full
- autumn = grounded / warm / mature
- winter = crisp / calm / minimal

### Acceptance criteria
- all four themes are recognizably different
- all four still feel like CookMoxs
- no theme harms usability
- Autumn remains the strongest base theme

### Validation
- build passes
- theme switching works
- contrast and readability remain acceptable
- no broken spacing or hierarchy
**Progress note (2026-03-25):** Completed.

### Out of scope
- no component redesigns
- no core UX behavior changes

---

## Design Phase D4 — Loading and motion language
### Goal
Add subtle, theme-aware loading and motion patterns.

### Files in scope
- loading components
- small animation helpers
- theme motion tokens
- presentation-layer components only

### Tasks
- define motion mood tokens per season
- create one shared loading system with seasonal variations
- tune transition feel lightly where safe
- ensure motion remains subtle and supportive

### Acceptance criteria
- loading feels branded and atmospheric
- motion remains light
- no cook mode distraction is introduced
- seasonal differences are perceptible but restrained

### Validation
- build passes
- no obvious performance regression
- loading works across themes
- no noisy motion in cook mode
**Progress note (2026-03-25):** Completed.

### Out of scope
- no heavy ambient animation systems
- no constant background movement
- no large hero animation layer

---

## Design Phase D5 — Polish and regression hardening
### Goal
Consolidate, reduce duplication, and harden the visual system.

### Files in scope
- theme files
- presentation components
- small style helpers
- design docs if required

### Tasks
- remove duplicated seasonal logic
- remove one-off hacks
- tighten token naming
- verify the same hierarchy exists in all four themes
- document any theme-system rules needed for future work

### Acceptance criteria
- no loose seasonal hacks remain
- themes are understandable and maintainable
- no major readability regressions remain
- the system is future-safe

### Validation
- build passes
- theme switching works
- no core-view regressions
- visual system remains coherent
**Progress note (2026-03-25):** Completed.

### Out of scope
- no unrelated refactors
- no product feature changes

---

## QoL Design Backlog
These are **not** part of the main design phases unless explicitly scheduled later.

### High-value later items
- wake-lock visual cue in cook mode
- clipboard-import polish
- offline-banner polish in cook mode
- scroll-to-current-step affordance polish
- haptics-aligned visual feedback

### Lower priority
- swipe-to-advance visual affordance
- ingredient-check persistence visuals
- richer library card previews

---

## Risk Register

### Risk 1 — Fragmented identity
If the four themes diverge too far, CookMoxs will feel like four separate products.

**Mitigation:** one token system, one layout system, one component family.

### Risk 2 — Over-decoration
If atmosphere dominates usability, the app becomes less trustworthy.

**Mitigation:** readability and cook mode come first.

### Risk 3 — Performance drag
If themes rely on heavy assets or effects, the product becomes slower and less robust.

**Mitigation:** light assets, low-motion design, strong validation after each phase.

### Risk 4 — Codex scope creep
If the design work is not tightly bounded, Codex may start redesigning product flows.

**Mitigation:** one design phase at a time, presentation layer only, no business logic changes.

---

## Required Codex behavior for this plan
When Codex executes this design plan, it must:
- execute one design phase at a time
- not combine phases
- not touch business logic
- list files in scope before coding
- explain what is out of scope
- run validation after completion
- stop and ask whether to continue

---

## Suggested repo placement
Place this file in the repo root as:

`DESIGN_PLAN.md`

Recommended companion file:
- `CookMoxs_Art_Direction_Spec.md`

Together these should act as the visual source of truth for Codex.
