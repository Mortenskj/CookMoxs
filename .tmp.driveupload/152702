# Seasonal Theme Audit

## Scope
Audit only. No visual or behavior changes are introduced in this step.

## Source of truth used
- `CookMoxs_Art_Direction_Spec.md`
- `DESIGN_PLAN.md`

## Current theme-related file map
### Core token and style layer
- `src/index.css`
  Current seasonal tokens, glass surfaces, background image logic, texture helpers, and print overrides live here.

### Theme switching entry points
- `src/App.tsx`
  Holds the persisted theme state, default theme, and body class switching.
- `src/components/SettingsView.tsx`
  Exposes the visible season picker for spring, summer, autumn, and winter.
- `src/config/storageKeys.ts`
  Persists the selected theme under the theme storage key.
- `src/services/backupService.ts`
  Backup preferences already include theme, so visual preference survives export/restore.

### Background and decorative usage
- `src/index.css`
  Applies `--theme-bg-image`, `herbal-pattern`, `glass-brushed`, `text-engraved`, and inline noise texture.
- `public/backgrounds/*.jpg`
  Seasonal background images are referenced from CSS.
- `public/manifest.webmanifest`
  Theme and background colors are fixed to a dark autumn-like value and are not yet seasonal.

### High-risk visual views
- `src/components/HomeView.tsx`
- `src/components/LibraryView.tsx`
- `src/components/RecipeView.tsx`
- `src/components/CookView.tsx`
- `src/components/SettingsView.tsx`

These are high risk because they carry the main reading, browsing, cooking, and settings surfaces that must remain readable.

## Current token logic
### What exists now
The current system already has four seasonal body classes:
- `theme-spring`
- `theme-summer`
- `theme-autumn`
- `theme-winter`

The current centralized token set is still narrow and mostly autumn/forest-named:
- `--theme-dark`
- `--theme-mid`
- `--theme-accent-mid`
- `--theme-accent-dark`
- `--theme-light`
- `--theme-bg-image`
- `--theme-panel-bg`
- `--theme-panel-border`
- `--theme-panel-hover`
- `--theme-panel-strong`

Tailwind-facing aliases are then mapped from these:
- `--color-forest-dark`
- `--color-forest-mid`
- `--color-heath-mid`
- `--color-heath-dark`
- `--color-sand`

### Gaps versus the design source of truth
The current token layer does not yet expose the broader groups requested by the art direction and design plan, such as:
- background vs surface vs surface-muted separation
- text-primary vs text-secondary separation
- border-soft
- atmosphere overlay
- contour or skyline tone
- motion mood
- shadow-color
- illustration opacity

## Current background usage
### What exists now
- The body uses one seasonal background image plus a lightening gradient.
- `background-attachment: fixed` is enabled globally.
- A subtle repeated herbal pattern is used on some main wrappers.
- `glass-brushed` creates the current frosted panel look.
- Noise is embedded as inline SVG data URIs.

### Audit observations
- The current atmosphere is image-first, not contour-first.
- There is no shared seasonal contour or skyline layer yet.
- Decorative language is cohesive but not yet aligned with the Vivaldi contour guidance from the art direction spec.
- The current naming still suggests an older forest/heath palette system rather than a neutral seasonal design system.

## Theme switching entry points
### Current behavior
- Default theme is `theme-autumn`, which matches the art direction and design plan.
- Theme is read from local storage on startup.
- `App.tsx` updates the body class to one of the four seasonal theme classes.
- Settings exposes one picker card per season.

### Risk note
Theme switching currently depends on body classes and shared global CSS. Later design phases should preserve this central switching path instead of spreading seasonal logic into view components.

## High-risk readability areas
### Home
- Large atmospheric wrappers and surface treatments can affect first-impression clarity.

### Library
- Dense card lists and mixed metadata make contrast drift visible quickly.

### RecipeView
- Long reading surfaces, chips, badges, and modals already rely heavily on the current glass treatment.

### CookView
- Must remain the strictest readability surface. Any later atmospheric layer must be reduced or simplified here.

### Settings
- Already contains the visible theme picker and many glass panels, so it is the safest place to inspect seasonal styling without touching core cooking flows.

## Performance and implementation risks
- `background-attachment: fixed` can become expensive on some devices.
- Large JPEG background dependence may complicate later atmospheric layering.
- Inline SVG noise is light, but repeated overlay stacking could become visually muddy if D2 adds more layers without consolidation.
- Many components directly use utility combinations like `bg-white/40`, `bg-white/60`, and `glass-brushed`, so future tokenization must stay centralized to avoid scattering seasonal exceptions.

## D0 conclusion
The repo already has:
- four seasonal theme classes
- autumn as default
- centralized seasonal colors in one main CSS file
- one visible theme switching surface

The repo does not yet have:
- a full seasonal token architecture matching the art direction spec
- a shared contour or skyline language
- a neutralized naming scheme for broader seasonal expansion
- explicit motion mood tokens

## Recommended next design step
Proceed to `Design Phase D1 - Central seasonal token system`.
That is the first phase where implementation should begin, because D0 confirms the current theme layer is centralized enough to evolve without broad redesign.
