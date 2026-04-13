# CookMoxs — Final UI Finish Pass v1

## Formål

Denne fil er en **deterministisk implementeringsspec** til Codex.  
Den skal bruges som styringsdokument til en **snæver finish-pass** af UI’et.

Målet er **ikke** at redesigne appen igen.  
Målet er at færdiggøre de sidste layout-, spacing-, containment- og mobilrobusthedsproblemer uden at ændre den nuværende farveretning eller det overordnede formsprog.

---

## Arbejdsmodel

Dette er en **finish- og robustness-pass**, ikke en eksplorativ design-pass.

### Grundprincip
Codex skal:
- udføre præcise ændringer
- holde sig til scope
- foretrække enkel geometri frem for ny styling
- bevare den nuværende farveretning
- bevare den nuværende card/surface-retning
- stoppe efter implementering

Codex skal **ikke**:
- fortolke frit
- “forbedre” andre områder på eget initiativ
- introducere ny visuel retning
- kompensere svag struktur med mere pynt
- skrive ny copy eller ændre sprog i denne pass

---

## Target runtime

Primær målvisning:
- **375px mobilbredde**

Sekundær sikkerhed:
- **360px mobilbredde**

Alle løsninger i denne pass skal være robuste på begge.

---

## Tilladte filer i scope

Codex må kun arbejde i disse filer, medmindre build ellers ikke kan gennemføres:

- `src/index.css`
- `src/components/SettingsView.tsx`
- `src/components/HouseholdSettingsCard.tsx`
- `src/components/RecipeView.tsx`
- `src/components/RecipeNutritionAttachmentCard.tsx`

### Ikke i scope
Codex må ikke røre:
- andre views
- assets
- animationer
- farvesystemet bredt
- copy/tekstindhold
- locale/encoding
- nye komponentfamilier

---

## Absolutte regler

### 1. Bevar nuværende farveretning
Den nuværende farveretning er bedre og skal ikke flyttes.

**Do not:**
- gøre dark mode mere udvasket igen
- gøre light cards mere blege
- indføre ny farvepalet
- skifte tonefamilie på badges, chips eller surfaces

### 2. Bevar nuværende card/surface-retning
Der må ikke laves ny stilretning.

**Do not:**
- introducere nye card-typer
- lave “glassier” UI
- tilføje ekstra shadow-lag
- bruge ny ornamental styling

### 3. Struktur over pynt
Hvis et problem kan løses med:
- bedre grid
- bedre stacking
- bedre padding
- bedre alignment
- bedre z-index
- bedre width constraints

… så skal det løses sådan.

**Do not:**
- skjule problemer med større skygger
- tilføje badges for at redde hierarki
- kompensere med ekstra visual effects

### 4. Lyse cards i dark shell bruger mørk ink
Dark mode i CookMoxs er:
- mørk shell
- lyse cards

Det betyder:
- lyse cards skal stadig have mørk, læsbar tekst
- labels og helper text inde i lyse cards må ikke fades som om de står direkte på mørk baggrund

### 5. Ingen copy-pass
Denne pass handler ikke om:
- formulering
- dansk retstavning
- æ/ø/å
- mikrotekster

**Do not rewrite copy in this pass.**

---

# A. Settings — finish og robusthed

Settings er tæt på.  
Her skal der kun laves **finish**, ikke ny retning.

## A1. Section labels / overlines

Bevar den nuværende læsbare retning, men sørg for total konsistens.

### Krav
Alle Settings-sektionslabels som fx:
- `KONTO`
- `DATA OG BACKUP`
- `DIT NIVEAU I KØKKENET`
- `TEMA OG ÅRSTID`
- `PRÆFERENCER`
- `HUSSTAND`

skal bruge **samme overline-system**.

### Fast spec
- font-size: `12px`
- line-height: `1`
- font-weight: `600`
- letter-spacing: `0.12em`
- text-transform: `uppercase`
- label color på lyse cards i dark shell: `rgba(78, 88, 82, 0.62)`
- ikonfarve: `rgba(78, 88, 82, 0.52)`
- margin-bottom under label: `16px`

### Acceptance
- ingen sektionslabel må være næsten usynlig
- alle sektioner skal læses som samme system
- ingen særskilte offsets eller tilfældige topmargins

---

## A2. Choice cards

Gælder for:
- niveau i køkkenet
- tema
- tekst i cook mode

### Grundregel
Alle choice cards skal bruge **samme indre geometri**.

### Badge-zone
Hvert card skal reservere en fast selected-state-zone:

- position: `absolute`
- top: `12px`
- right: `12px`
- z-index: `2`

### Preview/swatch-zone
Swatches eller previews skal ligge under badge-zonen:

- z-index: `1`
- ingen badge må kollidere med swatch
- ingen badge må stå bagved swatch eller tekst

### Theme cards
- swatch størrelse: `56px x 56px`
- centreret vandret
- margin-top: `8px`

### Active badge
- kun på aktivt card
- label: `AKTIV`
- højde: `22px`
- horizontal padding: `8px`
- ingen animation
- ingen ekstra glow

### Card heights
- theme cards: min-height `132px`
- text-size cards: min-height `132px`
- kitchen-level cards: min-height `156px`

### Card padding
- `16px`

### Intern spacing
- mellem titel og beskrivelse: `8px`

### Tekstbegrænsning
- description max 2 linjer på theme/text-size cards
- kitchen-level cards må være lidt mere rummelige, men må ikke bryde grid’et

### Acceptance
- selected state kan ses med ét blik
- intet overlap mellem badge, swatch og indhold
- alle kort i en gruppe læser som samme system

---

## A3. Household — mobil hardening

Household er forbedret, men er stadig et risikoområde.

### Mobile rule
Ved `<= 480px` skal invite-zonen bruge præcis denne struktur:

- **Row 1:** email input — full width
- **Row 2:** role select — full width
- **Row 3:** invite button — full width

### Kontrolhøjde
- input: `44px`
- select: `44px`
- button: `44px`

### Vertical gap
- `12px`

### Containment rules
- select-wrapper må aldrig collapse visuelt
- select må aldrig se “blank” eller ghosted ud
- ingen del af invite-zonen må flyde ud af root card
- status/result messages skal forblive inde i household root card
- margin-top for intern status/result state: `12px`

### Acceptance
- household invite-zonen er ren ved 375px
- household invite-zonen bryder ikke ved 360px
- dropdown/select ødelægger ikke kortets geometri

---

# B. RecipeView — meta/header finish

Recipe-toppen er tæt på rigtig.  
Her må der kun laves finish.

## B1. Overordnet stack

Bevar denne rækkefølge:
1. titel
2. intro
3. metadata
4. privat-række
5. utility-række
6. chips

### Krav
Stacken skal læses som **én sammenhængende blok**.

### Do not
- indføre nye controls
- splitte blokken op i flere separate stilarter
- gøre AI-kontrol til CTA

---

## B2. Privat-række

### Fast spec
- min-height: `48px`
- padding: `12px 16px`
- chip og hjælpetekst vertikalt centreret
- gap mellem chip og tekst: `12px`

### Acceptance
- rækken læser som én rolig statuslinje
- ingen tung eller “klumpet” følelse

---

## B3. AI VARIANTER utility shell

`AI VARIANTER` skal opføre sig som en ægte utility-control.

### Fast spec
- height: `40px`
- min-width: `176px`
- ikon + label til venstre
- caret til højre
- samme radius og surface-logik som utility controls
- ingen chip-opførsel
- ingen CTA-opførsel

---

## B4. HJEM-chip og øvrige chips

### Utility row
- aktiv folder chip (`HJEM`) skal ligge på samme række som `AI VARIANTER`, når pladsen tillader det

### Underliggende chip-række
- øvrige chips wrappes på separat række nedenunder

### Chip spec
Alle chips skal bruge:
- fixed height: `36px`
- ens radius
- ens shadow depth
- ens padding

### Active chip
- mørk tonal fill
- lys label

### Inactive chips
- lys surface
- mørk label

### Acceptance
- chiphierarkiet er klart
- ingen chip virker løsrevet
- ingen ujævne højder eller tilfældig spacing

---

## B5. Inline status / error box

Bevar nuværende integrerede retning, men sørg for:
- samme content width som resten af blokken
- samme alignment
- samme ro i surface containment
- ingen browser-agtig fremmed error-boks

---

# C. RecipeView — fremgangsmåde / sticky CTA finish

## C1. Vertikal rytme
Bevar step-retningen, men stram:
- gap mellem stepnummer og pills
- gap mellem pills og brødtekst
- gap mellem stepblokke

### Acceptance
- steps læses rytmisk og ikke tungt

## C2. Sticky CTA clearance
Når sticky `Start madlavning` er aktiv, skal RecipeView content altid have nok bundafstand.

### Fast rule
- minimum bottom clearance: `120px`
- hvis nødvendigt på mobil: `136px`

### Acceptance
- sticky CTA må aldrig dække:
  - sidste synlige step-linje
  - nederste nutrition controls
  - bundens aktive input-/søgezone

---

# D. Product-data / nutrition — final mobile rescue

Dette er stadig det vigtigste restproblem.

## D1. Overordnet mobilregel
Ved `<= 480px` skal produktdata-panelet være **single-column first**.

### Do not
- bruge sidekolonne-logik på mobil
- bruge absolut positionering til nutrient-metrics på højre side
- overlaye metrics oven på donut-zonen

---

## D2. Productdata-header

### Struktur
- title/description stackes lodret
- action row ligger under
- ingen absolut placering i toppen
- jævn spacing mellem tekstblok og actions

---

## D3. AI-estimat container

Intern rækkefølge skal være præcis:

1. estimate title block
2. estimate badges row
3. ingredient coverage box
4. macro card
5. assumptions card
6. macro source card

### Acceptance
- ingen sektion må hoppe rundt
- intet overlap i topområdet

---

## D4. Macro card — mobil

Macro card må kun bruge **single-column layout** på mobil.

### Skal være
- titel/description øverst
- tabs på egen fuldbredde-række
- donut centreret under
- nutrient-metrics under donut
- supporting stats under nutrient-metrics

### Tabs
- `PR. PORTION` / `PR. 100 G`
- én fuldbredde-række
- to lige brede segmenter
- fuldt inde i kortets bredde

### Donut
- centreret
- max visuel bredde: `220px`
- margin-bottom: `20px`

### Nutrient metric cards
- flyt ALLE nutrient-metrics under donut
- vis som **3-column grid** under donut
- hvis 3 kolonner bliver for stramt ved 360px, collapses til **2-column grid**
- ingen clipping
- ingen overlap
- ingen card må røre kanten
- ingen absolut højrestak

### Supporting stats
Fx:
- samlet vægt
- visning pr. portion

Skal ligge under nutrient-grid som kompakt **2-column stat layout**

### Acceptance
- nul overlap ved 375px
- nul overlap ved 360px
- donut og nutrients kolliderer aldrig

---

## D5. Nedre productdata-controls

### Barcode / productsøgning
Skal bruge præcis denne mobilstruktur:

- **Row 1:** tabs i 2 lige brede kolonner
- **Row 2:** input full width
- **Row 3:** button full width

### Gap
- `12px` mellem rækker

### Acceptance
- hele søgezonen er fuldt synlig over sticky CTA
- ingen controls bliver dækket
- ingen controls bliver komprimeret vandret

---

# E. Finish-kvalitetsregler

Codex skal aktivt sikre disse ting før den afslutter:

## E1. Ingen overlap
Ingen af disse må overlappe:
- badges og swatches
- nutrient-metrics og donut
- tabs og card edge
- sticky CTA og indhold
- select/input/button i household

## E2. Ingen ghosted controls
Ingen select/input/button må se:
- tom ud
- ghosted ud
- kollapset ud
- “halvt eksisterende” ud

## E3. Ingen uforudsigelig card growth
Ingen card må blive højere på mærkelig måde pga. helper text eller badges.

## E4. Ingen ny pynt
Ingen ekstra:
- skygger
- glows
- badges
- ornamenter
- offsets som “patch”

## E5. Stable geometry first
Hvis et problem kan løses med:
- grid
- stack
- width constraint
- min-height
- padding
- z-index
- gap

… så skal det løses sådan.

---

# F. Hvad Codex ikke må gøre

Do not:
- rewrite copy
- ændre dansk formulering
- rette locale/encoding
- redesigne Settings bredt
- redesigne RecipeView bredt
- redesigne Cook Mode
- redesigne bottom nav
- tilføje animation
- tilføje assets
- indføre ny visuel retning

---

# G. Outputformat til Codex

Efter implementering skal Codex stoppe og kun returnere:

1. completed scope  
2. files changed  
3. checks run  
4. could-not-verify items  
5. exact screenshots required for review

---

# H. Krævede review-screenshots bagefter

## Settings
- `KONTO` + `DATA OG BACKUP`
- `DIT NIVEAU I KØKKENET` + `TEMA OG ÅRSTID`
- `PRÆFERENCER`
- `HUSSTAND` med invite-zonen synlig
- gerne både ved `375px` og `360px` hvis muligt

## Recipe
- header/meta-blokken
- `Fremgangsmåde` tæt på bunden, så sticky CTA-clearance kan vurderes

## Product-data
- top af panelet
- donut/makro-delen
- bund med stregkode/produktsøgning
- både ved `375px` og `360px` hvis muligt

---

# Slutregel

Hvis Codex er i tvivl, skal den:
- bevare nuværende farver
- bevare nuværende komponentretning
- vælge strammere geometri frem for ny styling

Dette dokument er ikke åbent for kreativ fortolkning.
Det er en finish-spec.
