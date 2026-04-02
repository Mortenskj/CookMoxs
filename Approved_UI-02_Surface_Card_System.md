# Approved UI-02 — Surface / card system

## Valgt retning

`Soft Tonal Veil`

Én samlet surface-familie med **bløde, tonale, semi-opake flader**, tydelig kantdefinition og kontrolleret dybde. Ikke hård glassmorphism, ikke flade hvide bokse, og ikke dekorative “frosted” effekter overalt. Systemet skal holde CookMoxs som **ét produkt**, med Autumn som base, og med Cook Mode som en strammere, mere funktionel underfamilie.

Det følger projektets prioritet om én samlet produktidentitet, sæsonvariation som stemning frem for nyt formsprog, og cook mode med klarhed over atmosfære.

---

## 1. Chosen surface/card direction for the system

### Navn

`Soft Tonal Veil`

### Kernekarakter

- Blød rounded-rectangle geometri
- Tonal, let diffus fill
- Synlig men diskret border
- Lav til moderat blur kun hvor baggrunden faktisk kræver separation
- Skygger bruges til løft og lagdeling, ikke wow-effekt
- Samme familie på tværs af Home, Library, Recipe og Import
- Cook Mode bruger samme familie, men reduceret og strammet

### Hvorfor denne retning

Den passer til de godkendte baggrunde og til UI-01’s `Soft Tonal Contour` knapsystem, uden at drive over i tung glasæstetik. Den beskytter læsbarhed over lyse sæsonbaggrunde, især Spring/Winter, og kan strammes ned i Cook Mode, hvor baggrund og flader skal være mere funktionelle end atmosfæriske.

---

## 2. Primary content card spec

### Rolle / use

Hovedbeholder for vigtigt indhold:

- opskriftskort
- bibliotekskort
- hovedsektioner i RecipeView
- “fortsæt madlavning”-kort
- større tomme tilstande med CTA

### Shape

- Rounded rectangle
- Ingen pill-form
- Ingen asymmetrisk form

### Corner radius

- **Desktop / roomy mobile:** `28px`
- **Standard mobile:** `24px`
- Må ikke under `22px`

### Fill behavior

- Lys tonal fill med varm neutral base
- Standard: `rgba(244, 241, 235, 0.78)` over sæsonbaggrunde
- Winter/Spring må løftes til `0.82–0.86` ved behov
- Fill skal være stabil, ikke gradienttung

### Opacity / transparency logic

- Semi-opak, ikke transparent “glas”
- Minimum effektiv opacitet på lyse baggrunde: **78%**
- Maximum på normale views: **88%**
- Ingen fuld transparency på primære kort

### Border behavior

- `1px` border altid synlig
- Lys baggrund: `rgba(34, 38, 34, 0.10)`
- Mørkere baggrund: `rgba(255,255,255,0.20)`
- Border skal hjælpe separation mere end skyggen gør

### Shadow logic

- Standard: `0 10px 28px rgba(26, 30, 26, 0.10)`
- Tæt, blød, lav kontrast
- Ingen farvet shadow
- Ingen lange “floating card” skygger

### Blur logic

- Valgfri baggrundsblur: `8px`
- Kun på views med atmosfærisk baggrund bag kortet
- Hvis blur bruges, skal den være sekundær til fill og border
- Ingen blur i print eller performance-fallback

### Spacing / padding logic

- Indvendig padding:
  - `24px` compact
  - `28px` standard
  - `32px` stor sektion
- Vertikal spacing mellem indholdsblokke: `16–20px`

### Contrast behavior

- Kortet skal kunne bære mørk tekst sikkert over alle fire sæsoner
- Tekst på kortet går mod mørk neutral, ikke ren sort
- Kortet må aldrig “forsvinde” ind i Spring/Winter baggrund

### Intended content

- titel + metadata
- badges
- primær CTA
- preview-tekst
- opskriftssammendrag
- sektioner med flere indholdstyper

---

## 3. Secondary / supporting card spec

### Rolle / use

Mindre vigtige eller mere støttende flader:

- underkort
- mindre preview cards
- filter/sort container
- små metadata-paneler
- modulære informationsblokke

### Shape

- Samme familie som primary
- Lidt mindre visuel masse

### Corner radius

- `22px`

### Fill behavior

- Lettere og en anelse køligere end primary
- Standard: `rgba(246, 243, 238, 0.64)`

### Opacity / transparency logic

- Mere gennemslip end primary, men stadig tydelig
- På Winter/Spring må den ikke under `0.70`, hvis den ligger direkte over lys atmosfære
- På Autumn/Summer kan den ligge `0.60–0.68`

### Border behavior

- `1px` synlig border
- En anelse tydeligere end ved primary, hvis fill er lettere
- Typisk: `rgba(34, 38, 34, 0.12)`

### Shadow logic

- `0 6px 16px rgba(26,30,26,0.07)`
- Meget rolig
- Må gerne næsten forsvinde på lyse temaer

### Blur logic

- `6px` max
- Ofte kan den undvære blur helt

### Spacing / padding logic

- `18–24px` padding
- Kompakt informationsrytme
- God til 1–3 små indholdsgrupper, ikke lange læseflader

### Contrast behavior

- Skal stadig holde labels, sekundær tekst og ikoner tydelige
- Ikke bruge så lys fill, at metadata mister spændstighed

### Intended content

- tags
- mindre handlingspaneler
- infochips grupperet på surface
- lette previewmoduler
- sekundære handlingsområder

---

## 4. Utility surface spec

### Rolle / use

Små funktionelle beholdere:

- søgefelt-shell
- segmented controls container
- topbar action groups
- lille statusflade
- badge- eller chip-baggrunde
- ikonknappers base, når de ikke står frit

### Shape

- Rounded rectangle eller mild capsule
- Ingen perfekt cirkel som surface-familie

### Corner radius

- `18px` for små utility boxes
- `16px` for chip-lignende containere

### Fill behavior

- Mere neutral og mindre “kortagtig”
- Standard: `rgba(244, 241, 235, 0.58)`

### Opacity / transparency logic

- Synlig, men lavere vægt
- Ikke under `0.56` på lyse baggrunde

### Border behavior

- `1px`
- Tydeligere end shadow
- `rgba(34,38,34,0.10)` eller `rgba(255,255,255,0.18)` alt efter baggrund

### Shadow logic

- Som udgangspunkt meget let eller ingen
- `0 2px 8px rgba(26,30,26,0.05)` når løft er nødvendigt

### Blur logic

- `4–6px` kun ved behov
- Ofte unødvendig

### Spacing / padding logic

- `12–16px` horisontalt
- `10–14px` vertikalt
- Tæt men stadig premium

### Contrast behavior

- Skal kunne bære knapper, inputs, små labels og ikoner
- Må ikke blive så “airy”, at den ligner disabled state

### Intended content

- søg
- sortering
- små toggles
- mikrostatus
- handlingsikoner

---

## 5. Modal / sheet / overlay surface spec

### Rolle / use

Tydeligt fokusskift:

- modal
- bottom sheet
- dialog
- import-choice overlay
- bekræftelser
- folder/share paneler

### Shape

- Samme surface-familie, men mere lukket og mere substantiel

### Corner radius

- **Modal:** `30px`
- **Sheet:** `30px` top corners, `24px` bottom hvis flydende
- Ikke skarpere end standardsystemet

### Fill behavior

- Højere opacitet end andre flader
- Standard: `rgba(245, 242, 236, 0.90)`
- I mørkere temaer kan den gå til `0.92`

### Opacity / transparency logic

- Skal være næsten massiv
- Formålet er fokus, ikke atmosfære

### Border behavior

- `1px` border
- `rgba(34,38,34,0.10)` eller `rgba(255,255,255,0.16)`
- Må gerne kombineres med meget subtil indre highlight

### Shadow logic

- `0 20px 50px rgba(18,20,18,0.18)`
- Tydeligere end andre flader
- Stadig blød og kontrolleret

### Blur logic

- Overlay backdrop blur: `10–14px`
- Surface selv behøver ikke intern blur
- Backdrop mørknes let i stedet for tung glas-effekt

### Spacing / padding logic

- `24–32px`
- Klar zone mellem header, indhold og handlinger

### Contrast behavior

- Skal fungere sikkert over alle baggrunde
- Overlay-surface må ikke tage farveforurening fra baggrunden

### Intended content

- formularer
- importvalg
- deling
- advarsler
- bekræftelser
- fokuseret læsning eller handling

---

## 6. Cook Mode surface subset

Cook Mode skal være en **reduceret underfamilie** af samme system — ikke et nyt system.

### Cook Mode primary surface

#### Rolle / use

- step container
- timer/heat panel
- næste-trin preview
- større funktionelle infofelter

#### Shape

- Rounded rectangle
- Mere disciplineret og mindre “soft floating”

#### Corner radius

- `20px`

#### Fill behavior

- Mørk, neutral, næsten massiv tonal flade
- `rgba(27, 33, 29, 0.84)` til `rgba(33, 39, 35, 0.88)`

#### Opacity / transparency logic

- Høj opacitet
- Baggrunden må kun anes svagt

#### Border behavior

- `1px` i `rgba(255,255,255,0.08)` eller `rgba(154,169,154,0.16)`
- Border må gerne være mere teknisk præcis

#### Shadow logic

- Meget lav
- `0 6px 18px rgba(0,0,0,0.18)`
- Ikke dramatisk separation

#### Blur logic

- Som udgangspunkt **ingen**
- Max `2–4px` hvis needed i enkelte overlays
- Cook Mode må ikke blive tåget

#### Spacing / padding logic

- `18–24px`
- Meget klar intern rytme
- Store tekstfelter skal have mere luft end små utility-flader

#### Contrast behavior

- Høj kontrast mellem surface og tekst
- Lys tekst, varme lyse toner eller afdæmpet rød/stone til status
- Timer, varme og steptekst skal dominere klart

#### Intended content

- trintekst
- varmeangivelse
- kogetid
- oveninfo
- navigation mellem trin

### Cook Mode secondary surface

#### Rolle / use

- små statuschips
- næste-trin bar
- neutral supporting info

#### Corner radius

- `16px`

#### Fill behavior

- `rgba(255,248,240,0.08)` til `rgba(255,248,240,0.11)`

#### Border behavior

- `1px` `rgba(255,255,255,0.10)`

#### Shadow logic

- Ingen eller næsten ingen

#### Blur logic

- Ingen

### Cook Mode overlay / modal surface

- Samme som global modal-logik, men mørkere
- Fill: `rgba(24, 28, 25, 0.94)`
- Border: `rgba(255,255,255,0.08)`
- Backdrop blur max `6px`

---

## 7. Border, blur, shadow, radius, and fill logic

### Border logic

- Borders er **obligatoriske** på alle surfaces i dette system
- Borders bærer separationen mere end blur gør
- På lyse baggrunde må border ikke være så svag, at kortet opløses
- På mørke flader må border ikke blive lys rammeeffekt

#### Standard

- Light surfaces: `1px rgba(34,38,34,0.10–0.12)`
- Dark surfaces: `1px rgba(255,255,255,0.08–0.20)`

### Blur logic

- Blur er et hjælpeværktøj, ikke identiteten
- Brug kun blur, når baggrunden ellers presser separationen
- Ingen tung glassmorphism
- Ingen blur i Cook Mode primært
- Ingen blur som erstatning for for lav fill-opacitet

#### Range

- Utility: `0–6px`
- Primary/secondary cards: `0–8px`
- Overlay backdrop: `10–14px`
- Cook Mode: `0–4px`

### Shadow logic

- Skygger skal være korte, bløde, neutrale
- Ingen glow
- Ingen “lifted frosted panel” look
- På Winter/Spring må shadow godt være lidt tydeligere end i Autumn/Summer, fordi baggrunden er lysere

### Radius logic

- Produktfamilien skal holdes samlet via radius
- Store cards: `24–28px`
- Secondary: `22px`
- Utility: `16–18px`
- Cook Mode: `16–20px`
- Modals: `30px`

### Fill logic

- Fill er tonal og rolig
- Ikke ren hvid, ikke hård grå, ikke mælket glas overalt
- Varm neutral base i det globale system
- Mere mørk neutral base i Cook Mode
- Seasonal drift må kun være **svag toning**, ikke ny surfacefarve pr. sæson

---

## 8. Contrast behavior

### Over light seasonal backgrounds

Problemzonen er Spring og Winter, hvor nuværende flader nemt kan drukne visuelt.

#### Regel

- Primary og secondary cards skal have højere fill-opacitet her
- Border skal være tydeligt læsbar
- Shadow må hjælpe lidt mere
- Tekst på card skal være mørk neutral, ikke lavkontrast grå

#### Praktisk

- Spring/Winter: hæv fill `+4–8%`
- Border må styrkes `+0.02–0.04 alpha`
- Utility surfaces må ikke stå frit, hvis baggrunden er meget aktiv

### Over dark Cook Mode backgrounds

#### Regel

- Surfaces skal være klart afgrænset, men ikke lysende
- Lys tekst på mørke flader
- Ingen blød atmosfærisk dis i surface-laget
- Danger/status må være kontrolleret og funktionelt

#### Praktisk

- Mørke flader med let lys border
- Lav skygge
- Ingen afhængighed af blur for læsbarhed

---

## 9. Do / do not

### Do

- Brug én samlet surface-familie på tværs af alle views
- Lad border være en reel del af separationen
- Hæv surface-opacitet over Spring/Winter, når baggrunden er lys
- Hold cards tonale og premium, ikke glasagtige
- Brug Cook Mode som en reduceret, strammere subset
- Lad Autumn være det kalibrerende udgangspunkt, med små sæsondrift i tone og vægt, ikke i geometri

### Do not

- Gå all-in på glassmorphism
- Lad cards forsvinde i Winter/Spring
- Lave helt hvide, sterile bokse der bryder verdensfølelsen
- Lade Cook Mode overtage airy seasonal card-behavior
- Bruge blur som løsning på dårlig kontrast
- Introducere en ny surface-stil per sæson
- Gøre overlays dekorative i stedet for fokuserede

---

## 10. Additional implementation guardrails

- Blur is off by default and only enabled when background interference clearly harms readability.
- Utility surfaces must not combine strong tint, visible blur, and visible shadow at the same time.
- Primary content cards should prefer the lowest opacity that still preserves stable readability.

---

## 11. Short final recommendation

**Implementér `Soft Tonal Veil` som den ene surface-retning, og gør to ting stramt fra start:**

1. **Skru separationen tydeligt op på Spring/Winter**, så cards ikke drukner.
2. **Reducer Cook Mode til mørke, næsten massive funktionelle flader** med minimal blur og stærk tekstkontrast.

Det er den rigtige næste designlås før layoutarbejde eller implementation, fordi det stabiliserer hele produktets læsbarhed uden at splitte identiteten. Det er også den naturlige fortsættelse af UI-01’s knapsystem.

---

## 12. Approval note

This document is approved as the design specification for the CookMoxs surface and card system.

It is a design spec, not yet the final implementation spec.

Recommended next design step:
- **UI-03 — Bottom navigation system**

Recommended implementation timing:
- implement together with **BG-09** and **Approved UI-01 — Button system spec**
