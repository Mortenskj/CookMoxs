# Seasonal Theme Token Spec

## Purpose
This document defines the centralized seasonal token layer introduced in Design Phase D1.

## Source of truth
- `CookMoxs_Art_Direction_Spec.md`
- `DESIGN_PLAN.md`
- `src/index.css`
- `src/config/seasonalThemes.ts`

## Seasonal token groups
The token layer now centralizes these groups for all four seasons:
- `--season-bg-main`
- `--season-bg-surface`
- `--season-bg-surface-muted`
- `--season-bg-surface-strong`
- `--season-text-primary`
- `--season-text-secondary`
- `--season-border-soft`
- `--season-accent`
- `--season-highlight`
- `--season-atmosphere-overlay`
- `--season-contour-tone`
- `--season-shadow-color`
- `--season-illustration-opacity`
- `--season-motion-duration`
- `--season-motion-ease`
- `--season-bg-image`

## Seasonal differentiation tokens
D3 extends the shared token layer with mood-tuning tokens so each season can feel distinct without changing component structure:
- `--season-atmosphere-halo`
- `--season-contour-mask`
- `--season-contour-height`
- `--season-contour-opacity`
- `--season-atmosphere-opacity`
- `--season-pattern-tone`
- `--season-pattern-size`
- `--season-panel-blur`
- `--season-panel-saturation`
- `--season-panel-shadow`

## Motion and loading tokens
D4 adds a small, shared motion language for loading and cooking-adjacent presentation components:
- `--season-motion-float-duration`
- `--season-motion-bubble-duration`
- `--season-motion-steam-duration`
- `--season-motion-stir-duration`
- `--season-motion-glow-duration`
- `--season-motion-loader-duration`
- `--season-loading-accent`

These tokens are used through shared motion utilities rather than ad hoc animation strings in each component.

## D3 mood direction
- Spring is the lightest and airiest with softer panel weight, higher lift, and gentler density.
- Summer is the richest and fullest with denser contour mass, warmer halo, and heavier surface presence.
- Autumn remains the strongest base with the most balanced warmth, tactility, and domestic calm.
- Winter is the crispest and most restrained with cleaner spacing feel, lower texture presence, and lighter surface weight.

## D4 motion direction
- Spring moves fastest and lightest.
- Summer is fuller and slightly heavier.
- Autumn stays the most settled and natural.
- Winter is the slowest and most restrained.
- Reduced-motion users get static fallbacks for the shared seasonal motion classes.

## D5 maintenance rules
- Reusable overlay surfaces such as toasts should use shared seasonal surface utilities before introducing one-off blur, border, or shadow combinations in components.
- New seasonal tuning should enter the system through centralized tokens or narrow presentation helpers, not scattered view-specific color overrides.
- Autumn remains the baseline for polish decisions when a new surface needs a default balance of warmth, contrast, and depth.
- Presentation hardening should prefer additive cleanup in style helpers and small components rather than expanding core product views.

## Compatibility layer
Legacy aliases still exist so D1 does not require a broad component restyle:
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

## D1 constraints
- Autumn remains the default theme.
- Theme switching still uses body classes.
- No atmospheric contour assets are introduced yet.
- No motion system rollout is introduced yet.
- No business logic changes are part of D1.
