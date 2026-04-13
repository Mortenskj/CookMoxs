# AGENTS.md

This repository uses Codex as a disciplined implementation agent, not as a freeform product designer.

## 1. Read-first rule

Before making changes, read these if present and relevant:
- `CookMoxs_Project_Command_Doc_v1.md`
- `repair_v2_2.md`
- `repair_v2_2_rationale.md`
- `Approved_UI-01_Button_System_Spec.md`
- `Approved_UI-02_Surface_Card_System.md`
- `Approved_UI-03_Bottom_Navigation_System.md`

Approved specs override older drafts.

## 2. Product rules

CookMoxs is one product, not four different apps.

Always preserve these priorities:
1. Autumn is the base/default world
2. Seasons may shift tone, but not component geometry or family identity
3. Vivaldi is hidden structure, never literal decoration
4. Cook Mode readability and function always beat atmosphere
5. Performance, crop safety, and mobile clarity are non-negotiable
6. Omission is better than misinformation in Cook Mode and AI-driven output

## 3. Scope discipline

Stay inside the requested task.

Do not:
- redesign unrelated views
- create new art direction during implementation tasks
- combine multiple phases unless explicitly asked
- broaden permissions
- silently keep dead legacy assumptions alive
- replace approved system logic with “simpler” guesses

If a task is too broad, narrow it instead of improvising.

## 4. UI implementation rules

When implementing approved UI specs:
- preserve one shared product family
- use the approved button, surface, and bottom-nav specs as source of truth
- prefer tokens/utilities over one-off styling
- avoid generic glassmorphism
- avoid game-like motion or CTA styling
- do not let Spring/Winter wash out surfaces or nav
- keep Cook Mode surfaces darker, calmer, and more functional than the rest of the app

## 5. Cook Mode rules

Cook Mode is sacred.

Do not:
- introduce decorative scenic backgrounds
- reduce text contrast for atmosphere
- add strong blur by default
- allow important actions to depend on ghost styling
- let timers, heat indicators, or step text lose dominance

Prefer:
- dark neutral surfaces
- controlled contrast
- minimal decorative density
- strong functional clarity

## 6. Design asset rules

If the task involves design assets or references:
- treat approved assets as calibration only
- do not invent new directions unless explicitly requested
- do not turn contour studies into UI mockups
- do not turn background references into scenic wallpaper art during code tasks

## 7. Change style

Prefer:
- small, coherent diffs
- explicit migrations when data shape changes
- clear naming
- maintainable utilities
- minimal blast radius

Avoid:
- opportunistic cleanup
- speculative refactors
- mass rewrites without clear need

## 8. Validation rules

Run the relevant checks you can run.

At minimum, report:
1. what was changed
2. what checks were run
3. what could not be verified
4. what remains intentionally out of scope

Never pretend runtime verification happened if it did not.

## 9. Reporting format

End substantive tasks with:
1. completed scope
2. files changed
3. key implementation decisions
4. checks run
5. could-not-verify items
6. remaining work only if intentionally left incomplete

## 10. Final rule

Something is not good enough just because it works technically.
It also has to be right for the product.
