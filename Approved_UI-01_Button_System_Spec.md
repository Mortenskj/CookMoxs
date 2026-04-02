# Approved UI-01 — Button system spec

## Final recommendation

Implement one Autumn-led `Soft Tonal Contour` button family, and in Cook Mode reduce it to primary, secondary, icon, and danger only with stricter contrast and no decorative drift.

---

## 1. Chosen visual direction for the button family

**Family name:** `Soft Tonal Contour`

### Core character

- Blød rounded-rectangle, ikke perfekt pill
- Lavmættet tonal fill, ikke glas og ikke candy
- Tynd, præcis border
- Let skygge kun for løft, ikke wow-effekt
- Knaplabels bruger én konsekvent sans-stil
- Ét fælles formsprog på tværs af sæsoner; kun tone skifter let, ikke struktur

---

## 2. Recommended base palette direction

**Base palette: Autumn-led neutral accent**

- `Primary fill:` muted moss-sage `#98A08F`
- `Primary text:` warm ivory `#F6F2EA`
- `Surface / secondary fill:` misted stone `rgba(245,242,236,0.72)`
- `Ghost tint:` `rgba(245,242,236,0.10)`
- `Border soft dark:` `rgba(39,42,38,0.14)`
- `Border soft light:` `rgba(255,255,255,0.28)`
- `Danger accent:` muted ember `#B65F56`
- `Cook Mode fill:` deep charcoal-olive `#3B443D`
- `Cook Mode secondary fill:` `rgba(255,248,240,0.10)`

### Season drift rule

- Spring: `+8%` lighter / greener
- Summer: `+6%` warmer / fuller
- Autumn: base
- Winter: `-10%` saturation, `+cool gray bias`

---

## 3. Primary button spec

### Use

Main CTA: `Ny opskrift`, `Fortsæt madlavning`, `Gem`

### Shape

- Rounded rectangle

### Corner radius

- `20px` on L/M
- `18px` on S

### Height

- `L: 56px`
- `M: 48px`
- `S: 40px`

### Horizontal padding

- `L: 24px`
- `M: 20px`
- `S: 16px`

### Fill behavior

- Solid tonal fill
- Default: muted moss-sage
- No transparency lower than 92% opacity on light backgrounds
- On dark backgrounds: slightly lighter tonal lift, not brighter green

### Border behavior

- `1px` subtle inner/light border on dark fill
- Default border: `rgba(255,255,255,0.12)` over dark tonal fill

### Label style

- Typeface: consistent sans
- Weight: `600`
- Size:
  - `L: 19px`
  - `M: 17px`
  - `S: 15px`
- Tracking: `0.01em`
- Color: warm ivory / near-white

### Icon placement

- Optional left icon
- Gap `10px`
- Icon size:
  - `L/M: 18px`
  - `S: 16px`

### Shadow logic

- Default: `0 8px 18px rgba(28,32,28,0.14)`
- Tight and soft, no bloom

### State logic

- **Default:** full tonal fill, readable contrast
- **Hover:** `+4%` darker fill, shadow tightens slightly
- **Pressed:** `+8%` darker fill, `translateY(1px)`, shadow reduced to `0 4px 10px`
- **Disabled:** opacity lock to visual `55–60%`, but label must remain readable
- **Focus:** `2px` outer ring in `rgba(244,238,226,0.62)` plus existing border

---

## 4. Secondary button spec

### Use

Alternative high-importance actions: `Se hele opskriften`, `Tilbage`

### Shape

- Same family shape as primary

### Corner radius

- `20px` / `18px`

### Height

- `L: 56px`
- `M: 48px`
- `S: 40px`

### Horizontal padding

- `L: 24px`
- `M: 20px`
- `S: 16px`

### Fill behavior

- Frosted stone surface
- Default fill: `rgba(245,242,236,0.72)` on light backgrounds
- On dark backgrounds: `rgba(255,248,240,0.10)`

### Border behavior

- `1px` visible border
- Light bg: `rgba(39,42,38,0.12)`
- Dark bg: `rgba(255,255,255,0.22)`

### Label style

- Typeface: consistent sans
- Weight: `600`
- Size:
  - `L: 19px`
  - `M: 17px`
  - `S: 15px`
- Color:
  - light bg: `#2E342E`
  - dark bg: `#F3EEE5`

### Icon placement

- Optional left icon
- Gap `10px`

### Shadow logic

- Default: `0 4px 12px rgba(28,32,28,0.08)`

### State logic

- **Default:** light surface, clear border
- **Hover:** fill gains `+6%` opacity
- **Pressed:** border darkens, fill compresses visually, `translateY(1px)`
- **Disabled:** fill drops to `rgba(...,0.38)` equivalent, border softened
- **Focus:** same `2px` ring as primary

---

## 5. Ghost / subtle button spec

### Use

Low-priority utility, sort/filter, inline actions

### Shape

- Same family shape

### Corner radius

- `18px`

### Height

- `L: 48px`
- `M: 40px`
- `S: 32px`

### Horizontal padding

- `L: 20px`
- `M: 16px`
- `S: 12px`

### Fill behavior

- Transparent by default
- Optional faint tint:
  - light bg: `rgba(245,242,236,0.12)`
  - dark bg: `rgba(255,255,255,0.05)`

### Border behavior

- `1px` stroke always visible
- light bg: `rgba(39,42,38,0.10)`
- dark bg: `rgba(255,255,255,0.16)`

### Label style

- Typeface: consistent sans
- Weight: `500`
- Size:
  - `L: 17px`
  - `M: 15px`
  - `S: 14px`
- Color:
  - light bg: `rgba(46,52,46,0.88)`
  - dark bg: `rgba(243,238,229,0.88)`

### Icon placement

- Left or icon-only companion use
- Gap `8px`

### Shadow logic

- None by default
- Hover may add `0 2px 6px rgba(28,32,28,0.04)`

### State logic

- **Default:** mostly border-led
- **Hover:** subtle tint appears
- **Pressed:** tint deepens slightly
- **Disabled:** border and label both fade, no tint
- **Focus:** `2px` ring remains required

### Hard rule

- Ghost buttons must only be used on stable surface layers or visually controlled background zones
- Never place ghost buttons directly on highly variable atmospheric areas

---

## 6. Icon button spec

### Use

Add, edit, share, settings, quick tools

### Shape

- Rounded square, not circle

### Corner radius

- `16px`

### Height / width

- `L: 48x48`
- `M: 40x40`
- `S: 32x32`

### Horizontal padding

- None; fixed square

### Fill behavior

- Secondary-surface style by default
- `rgba(245,242,236,0.68)` on light backgrounds
- `rgba(255,248,240,0.10)` on dark backgrounds

### Border behavior

- `1px` subtle border
- Same as secondary

### Label style

- None for icon-only
- If icon+label utility chip exists, use Ghost label spec

### Icon placement

- Centered
- Icon sizes:
  - `L: 20px`
  - `M: 18px`
  - `S: 16px`

### Shadow logic

- `0 3px 8px rgba(28,32,28,0.06)`

### State logic

- **Default:** neutral utility
- **Hover:** `+5%` opacity and slightly firmer border
- **Pressed:** icon remains same size, button darkens slightly
- **Disabled:** icon to `45%` opacity equivalent
- **Focus:** `2px` ring

### Implementation caution

- `32x32` icon-only is reserved for dense, non-critical utility only
- Avoid this size in first implementation unless clearly necessary

---

## 7. Danger button spec

### Use

`Stop`, `Slet`, destructive confirmations

### Shape

- Same as primary/secondary family

### Corner radius

- `20px` / `18px`

### Height

- `L: 56px`
- `M: 48px`
- `S: 40px`

### Horizontal padding

- `L: 24px`
- `M: 20px`
- `S: 16px`

### Fill behavior

- **Not** solid red
- Light bg default: `rgba(182,95,86,0.08)`
- Dark bg default: `rgba(182,95,86,0.14)`

### Border behavior

- `1px` border in `rgba(182,95,86,0.30)`

### Label style

- Typeface: consistent sans
- Weight: `600`
- Text color: `#A34F47`

### Icon placement

- Optional left icon
- Gap `10px`

### Shadow logic

- None by default on light bg
- Dark bg may use `0 4px 10px rgba(0,0,0,0.10)`

### State logic

- **Default:** outlined/tinted danger
- **Hover:** fill deepens to `12–16%` tint
- **Pressed:** border and tint strengthen
- **Disabled:** tint drops, label becomes muted rose-gray
- **Focus:** outer ring in `rgba(182,95,86,0.28)`

---

## 8. States — shared system

| State | Rule |
|---|---|
| Default | Stable fill/border hierarchy, no dramatic gradients |
| Hover | Max one visual step stronger; no glow |
| Pressed | Slight darkening + `translateY(1px)` on filled buttons only |
| Disabled | Contrast reduced but still legible; never confused with ghost |
| Focus | Always `2px` external ring; no browser-blue fallback |

### No state may introduce

- neon glow
- glossy highlight sweep
- bounce
- oversized shadow
- game-like pulse

---

## 9. Size system

| Size | Height | Radius | Horizontal padding | Label size | Typical use |
|---|---:|---:|---:|---:|---|
| L | 56px | 20px | 24px | 19px | hero CTA, empty states, main start actions |
| M | 48px | 20px | 20px | 17px | standard page actions |
| S | 40px | 18px | 16px | 15px | card actions, compact controls |
| Icon-only L | 48x48 | 16px | — | — | major utility |
| Icon-only M | 40x40 | 16px | — | — | standard utility |
| Icon-only S | 32x32 | 14px | — | — | dense utility only where safe |

### Minimum hit target

- Never below `40x40` for touch-critical actions
- `32x32` icon-only reserved for non-critical dense utility

---

## 10. Contrast behavior

### Over light seasonal backgrounds

Use:
- stronger fill opacity for primary
- visible border for secondary and icon buttons
- darker label `#2E342E` on all non-primary buttons
- avoid white-on-mist without framed fill

### Over Cook Mode dark backgrounds

Use:
- darker green-gray primary with light text
- secondary as translucent warm-light surface
- ghost only for tertiary actions
- icon buttons one step brighter than page background
- danger stays tinted/outlined, not loud red

This matches the project rule that Cook Mode must be simplified/darkened and remain highly legible, with readability over atmosphere.

---

## 11. Reduced Cook Mode button subset

Use only these in Cook Mode:

1. **Primary M/L** — for continue / next / core execution
2. **Secondary M** — for view full recipe / neutral support action
3. **Icon button M** — back, timer-adjacent tools, utility
4. **Danger M** — stop / exit cook flow only

### Do not use in Cook Mode

- Ghost buttons for important actions
- S-sized text buttons for primary tasks
- Multiple competing CTA colors
- Decorative tonal drift per season

Reason: Cook Mode is the most protected surface; timer, heat, and step text must remain dominant.

---

## 12. Do / do not

### Do

- Keep one consistent shape family
- Let Autumn-led neutral tone anchor the system
- Make primary clearly stronger than secondary
- Keep shadows soft and shallow
- Use danger as tinted/outlined, not bright red
- Use fewer button variants in Cook Mode

### Do not

- Do not use glassy white pills everywhere
- Do not use glossy gradients
- Do not use circular fantasy/game buttons
- Do not let secondary read as disabled
- Do not make seasonal themes change button geometry
- Do not let Cook Mode inherit airy low-contrast button styling
- Do not use serif labels inside buttons

---

## 13. Approval note

This document is approved as the design specification for the CookMoxs button system.

It is a design spec, not yet the final implementation spec.

Recommended next design step:
- **UI-02 — Surface / card system**

Recommended implementation timing:
- implement after **BG-09** direction is settled and **UI-02** is approved
