# Approved UI-03 — Bottom navigation system

## Valgt retning

**Soft Tonal Dock**

Bundnavigationen skal være en rolig, flydende dock-surface i samme familie som **Approved UI-01 — Button system spec** og **Approved UI-02 — Surface / card system**. Den må ikke føles som en hård app-bar, et spil-interface eller en glas-effekt for effektens skyld.

Den skal understøtte, at CookMoxs er ét produkt, at Autumn er basis, at sæsonerne kun ændrer tone svagt, og at navigationen forbliver læsbar over lyse baggrunde og mere tilbageholdt i Cook Mode.

---

## 1. Container spec

### Rolle / use

Primær global navigation for:
- Hjem
- I gang
- Tilføj
- Arkiv

### Container shape

- Bred afrundet dock
- Ikke fuldskarp rektangel
- Ikke perfekt capsule/pill

### Radius

- Top corners: `28px`
- Bottom corners: `0px` hvis den sidder flush mod skærmkant
- Alle hjørner `28px` kun hvis den render som flydende inset-nav i et senere overlay-scenarie

### Fill behavior

- Tonal semi-opak fill
- Standard global: `rgba(244, 241, 235, 0.72)`
- På Spring/Winter: hæves til `0.78–0.84`
- Fill skal være rolig og tæt, ikke mælket glas

### Border behavior

- `1px` top/outer border er obligatorisk
- Standard: `rgba(34, 38, 34, 0.10)`
- På mørkere baggrund: `rgba(255,255,255,0.16)`

### Shadow logic

- `0 -4px 20px rgba(18, 22, 18, 0.08)`
- Kort, blød, tæt skygge
- Formål: løfte navigationen fra baggrunden, ikke skabe dramatik

### Blur logic

- `6px` max backdrop blur
- Default: `4px`
- Blur er sekundær til fill + border
- Ingen tung frostet effekt

### Padding

- `12px` top
- `12px` bottom
- `16px` horizontal outer padding

### Spacing between items

- `8px` mellem item-zoner
- Indre item spacing holdes ensartet, ikke centerdrevet “hero middle button”

### Safe-area rule

- Container skal altid respektere bottom safe area
- Visuel højde må ikke afhænge af at safe-area er `0`

### Intended height

- Target visual height: `72–76px`
- Compact fallback: `68px` hvis mindre devices kræver det
- Med safe area: `72–76px + env(safe-area-inset-bottom)`

---

## 2. Nav item spec

### Rolle / use

Enkelt destinationselement med ikon + label.

### Item shape

- Indre zone uden hård afgrænsning i default state
- Aktiv item får blød rounded-rectangle/pill-lignende aktiv flade

### Item radius

- Aktiv indikator radius: `18px`

### Item hit area

- Minimum: `64x52px`
- Preferred: `72x56px`

### Item layout

- Vertikal stak
- Ikon øverst
- Label under
- Centerjusteret
- Ingen sideordnet ikon/label i bundnav

### Internal padding

- `8px` top
- `6px` bottom
- `10px` horizontal

### Equality rule

- All primary nav items must keep equal visual weight
- All primary nav items must keep equal spatial priority
- No hero center-item behavior

---

## 3. Active state spec

### Active-state behavior

Aktivt item skal læses som stabilt valgt, ikke som CTA.

### Active surface

- Tonal inset-surface i samme familie som UI-02 utility surface
- Fill: `rgba(152, 160, 143, 0.18)` som Autumn-base
- På Winter/Spring: mere neutral og mindre grøn, fx `rgba(110, 122, 116, 0.14–0.18)`
- Ikke solid knapfarve

### Border behavior

- `1px` subtil border
- `rgba(34,38,34,0.12)` på lyse baggrunde
- `rgba(255,255,255,0.14)` på mørke

### Shadow logic

- Ingen egentlig drop shadow nødvendigt
- Kun let inset/pressed-clarity er tilladt
- Aktiv state må ikke ligne hævet CTA-button
- Active nav state must remain a tonal selection marker, never a CTA-like button treatment

### Icon behavior

- Icon bliver tydeligere og mørkere
- Ingen hop, scale eller pulse

### Label behavior

- Label går til højere kontrast og lidt højere vægt

### Motion

- State change: `140–180ms`
- Opacity + fill + color only
- Ingen spring, ingen bounce, ingen glød

---

## 4. Inactive state spec

### Inactive-state behavior

Inaktive items skal være tydeligt læsbare, men sekundære.

### Surface

- Ingen fast synlig item-baggrund i default
- Maks en meget svag tonal tint ved hover/focus

### Icon behavior

- Medium kontrast
- Ikke washed-out disabled-look

### Label behavior

- Lavere vægt og lidt lavere kontrast end aktiv
- Stadig tydelig nok til hurtigt scanning på mobil

### State rule

- Inaktiv ≠ disabled
- Inaktiv skal stadig føles klikbar

---

## 5. Icon treatment

### Style

- Outline-led, enkel, rolig
- Samme visuelle familiesprog som nuværende ikoner
- Ingen fyldte illustrationer
- Ingen ornamental strokes

### Icon size

- Standard: `20px`
- Compact tolerance: `18px`
- Ikke under `18px`

### Stroke feel

- Optisk vægt: medium
- Mere præcis end dekorativ

### Icon colors

- Inaktiv: `rgba(46,52,46,0.62)`
- Aktiv: `rgba(46,52,46,0.92)`

Over mørk baggrund:
- inaktiv: `rgba(243,238,229,0.62)`
- aktiv: `rgba(243,238,229,0.92)`

---

## 6. Label treatment

### Typeface

- Samme konsekvente sans som UI-01 kræver til interaktive labels
- Ingen serif i bundnavigation labels

### Label size

- `12px`

### Weight

- Inaktiv: `500`
- Aktiv: `600`

### Tracking

- `0.01em`

### Case

- Title case eller sentence-like nav labels
- Ikke all caps

### Line count

- Kun én linje
- Labels skal være korte nok til ikke at wrappe

---

## 7. Badge / indicator logic

### Default rule

Bundnavigationen skal som udgangspunkt være ren. Ingen badges medmindre de løser et konkret brugssignal.

### Allowed usage

Kun små indikatorer til:
- aktiv opskrift i “I gang”
- ventende import/proces i “Tilføj”

### Badge shape

- Lille tonal dot eller count chip
- Radius `10px`

### Badge size

- Dot: `8px`
- Count chip: min `18px` høj

### Badge fill

- Ikke stærk rød notifikationskultur
- Brug dæmpet ember eller moss-sage afhængigt af signaltype
- Dot foretrækkes frem for tal, hvis tal ikke er nødvendigt

### Placement

- Øverst til højre relativt til ikon
- Må ikke kollidere med label

### Do not

- Ingen badges på flere faner samtidig som default
- Ingen konstant notifikationsstøj

---

## 8. Contrast behavior

### Over light seasonal backgrounds

Problemzonen er Spring/Winter. Bundnavigationen må ikke drukne i lyse baggrunde.

#### Regel

- Container fill hæves `+4–8%`
- Border styrkes `+0.02 alpha`
- Inaktive labels må ikke under `0.62` opacity
- Aktiv item surface skal være synlig uden at blive knap-agtig

### Over dark Cook Mode backgrounds

Hvis bundnavigationen overhovedet vises i Cook Mode, skal den være en reduceret subset af samme familie.

#### Cook Mode container

- Fill: `rgba(27, 33, 29, 0.88)`
- Border: `rgba(255,255,255,0.08)`
- Shadow: `0 -4px 14px rgba(0,0,0,0.16)`
- Blur: `0–2px`, helst ingen

#### Cook Mode item behavior

- Aktiv item: let lysere mørk tonal surface
- Inaktiv: lys tekst/icon på dæmpet niveau
- Ingen badge-støj
- Ingen dekorativ sæsondrift

#### Hard rule

- Cook Mode bør som udgangspunkt ikke vise fuld bundnavigation under aktiv trin-læsning
- Hvis den findes i cook mode-relaterede kontekster, skal den være sekundær i forhold til steptekst, timer og varme

---

## 9. Do / do not

### Do

- Brug én samlet dock-surface på tværs af views
- Hold containeren tonalt tydelig over Spring/Winter
- Brug aktiv state som rolig markering, ikke mini-button
- Hold ikoner simple og labels sans-baserede
- Gør Cook Mode-varianten mørkere, strammere og lettere

### Do not

- Gør midterfanen til en hero-knap
- Brug tung glassmorphism
- Gør navigationen spilagtig, hoppende eller for animeret
- Lad labels blive så lyse/svage, at de ligner disabled
- Lad bundnavigationen blive tung og massiv i Cook Mode
- Indfør sæsonspecifik geometri eller nyt ikonset pr. tema

---

## 10. Additional implementation guardrails

- Bottom nav visual height should target `72–76px`, with a compact fallback if smaller devices require it.
- Active nav state must remain a tonal selection marker, never a CTA-like button treatment.
- All primary nav items must keep equal visual weight and equal spatial priority; no hero center-item behavior.

---

## 11. Short final recommendation

Implementér **Soft Tonal Dock** som en fast, tonalt tydelig bundnavigation med én vigtig disciplin:
styrk separationen markant på Spring/Winter, og reducer den til en mørkere, enklere subset i Cook Mode i stedet for at genbruge den lyse globale variant.

Det er den rigtige næste lås, fordi navigationen let kan forsvinde i de lyse temaer, men heller ikke må blive en tung bar, der bryder CookMoxs’ rolige premium-familie.

---

## 12. Approval note

This document is approved as the design specification for the CookMoxs bottom navigation system.

It is a design spec, not yet the final implementation spec.

Recommended next step:
- **Codex implementation pack v1**
