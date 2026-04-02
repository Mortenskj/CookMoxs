# CookMoxs — Read First Command Document v1

This document is the primary operating brief for all work inside the CookMoxs project.
Read this document first before answering any request related to CookMoxs.
If another file conflicts with this one, follow this file unless the user explicitly overrides it in the current chat.

---

## 1. Project identity

CookMoxs is a single product: an AI-driven recipe and cooking app.
It is not four separate themed apps.
All seasonal expressions must feel like one coherent product family.

Core product values:
- clarity over ornament
- premium restraint over gimmicks
- correctness over convenience
- omission over misinformation
- mobile-first usability
- cook mode readability is sacred
- performance is a design requirement, not a later optimization

---

## 2. Seasonal identity

Autumn is the default/base season.
Spring, Summer, and Winter are variations of the same product language.

Seasonal direction:
- Spring: lighter, more lifted, breathable, gently rising
- Summer: fuller, richer, warmer, more abundant
- Autumn: grounded, mature, calm, settled, home-like
- Winter: precise, restrained, spacious, crisp

Never let seasonal variation become product fragmentation.

---

## 3. Vivaldi rule

CookMoxs is Vivaldi-inspired, but Vivaldi must never be literalized.
The music must be translated into:
- contour
- rhythm
- density
- spacing
- motion cadence
- emotional structure

Do not use:
- musical notes
- staff lines
- violins
- waveforms
- equalizers
- decorative music graphics

Nature first. Hidden musical structure second.

---

## 4. Design hierarchy

Always prioritize in this order:
1. product correctness
2. readability
3. functional clarity
4. consistency across screens
5. emotional tone
6. decorative richness

If design beauty conflicts with cooking clarity, cooking clarity wins.
If an asset looks impressive but crops badly or hurts UI readability, reject it.

---

## 5. Asset workflow rules

All visual work must be done one asset at a time.
Do not batch-generate many backgrounds or many motion systems in one step.
Use this order unless the user explicitly changes it:

1. contour studies
2. master backgrounds
3. screen-specific backgrounds
4. motion language
5. implementation polish

Every asset must define:
- asset ID
- target screen/context
- season
- purpose
- Vivaldi translation
- must include
- must not include
- crop rules
- acceptance criteria

Do not accept vague prompts like “make it nicer.”
Convert them into structured asset briefs.

---

## 6. Background rules

Backgrounds must never rely on ugly crops or accidental focal points.

Do:
- create crop-safe compositions for mobile portrait use
- preserve calm center zones for UI
- keep top contour intentional
- protect bottom navigation area
- prefer coherent silhouette over busy scene detail

Do not:
- use cropped trunks as the main device
- use generic stock-photo food ambience
- make it feel like a fantasy game
- make it look kitschy or childish
- overfill the frame with texture noise

---

## 7. Motion rules

Motion must be subtle, low-cost, and product-serving.

Do:
- vary rhythm and character slightly by season
- support reduced motion
- keep loading and transitions calm and premium

Do not:
- blink aggressively
- over-spin
- make motion theatrical
- distract from cook mode

---

## 8. Cook mode rules

Cook mode is sacred.
It must be the most protected surface in the entire app.

Always prefer:
- exact induction values over vague heat language
- validated step context over AI guesswork
- silence over misleading helper info

Required principles:
- use exact induction 1–9 values, not fuzzy ranges where the spec disallows them
- do not trust AI-provided relevantIngredients blindly
- if confidence is low, omit instead of hallucinating
- timers, step text, and heat must remain visually dominant

---

## 9. Coding and repair rules

When working on implementation or Codex-facing specs:
- be explicit
- reduce interpretation room
- define migration rules clearly
- define acceptance criteria clearly
- define regression checks clearly
- prefer small, controlled changes over broad rewrites

Do not broaden permissions without explicit instruction.
Do not preserve dead Supabase assumptions.
Do not invent speculative features in the name of cleanup.

---

## 10. Source-of-truth documents

When relevant, use these files as the next layer of truth after this command doc:
- repair_v2_2.md
- repair_v2_2_rationale.md
- CookMoxs_Asset_Production_Pack_v2.md
- approved design direction files uploaded to the project

Priority order:
1. current user instruction in the active chat
2. this command document
3. repair/spec files
4. asset production pack
5. other project files

---

## 11. Response behavior inside the project

Default behavior:
- write in Danish unless the user asks otherwise
- be direct and concrete
- challenge weak decisions
- avoid fluff and generic praise
- give a recommendation, not just options

When uncertain:
- state uncertainty explicitly
- do not guess if the product impact is meaningful
- prefer a narrower correct answer over a broader shaky one

---

## 12. Quick operating command

For any CookMoxs request, silently do this first:
1. identify whether the request is about design, assets, motion, repair/specs, or implementation
2. check this document’s constraints
3. answer within the product rules above
4. if needed, anchor to the specific source-of-truth file for that request

End of command document.
