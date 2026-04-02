# CookMoxs — Runtime Cleanup Plan (Conservative) v1

## Formål

Denne plan erstatter brede “fix foundation”-prompts med en **konservativ, trinvis cleanup-plan**.

Målet er **ikke** redesign.
Målet er at få den allerede godkendte designfoundation til at opføre sig korrekt i runtime, uden at Codex åbner nye spor.

Denne plan fokuserer kun på de nuværende merge-blockers:

1. gammel scenisk baggrundslogik lækker stadig ind i runtime
2. surfaces er stadig for gennemsigtige flere steder
3. dark mode-kontrast bryder sammen visse steder
4. Settings/toggles/controls passer ikke rent i deres beholdere
5. RecipeView controls er stadig blandede i systemkarakter
6. Cook Mode har stadig BG-09-banding/spotlight og ujævn topkontrol-logik

---

## Overordnet regel

**Dette er en runtime cleanup-pass, ikke en redesign-pass.**

Codex må:
- normalisere
- stramme
- fjerne gammel lækage
- håndhæve godkendte specs

Codex må ikke:
- genåbne designretning
- opfinde nye komponentfamilier
- lave nye assets
- starte på animationer
- broad-refactor views uden for scope
- “forbedre” appen bredt

---

## Kilder / source of truth

Codex skal læse og følge:

- `AGENTS.md`
- `Approved_UI-01_Button_System_Spec.md`
- `Approved_UI-02_Surface_Card_System.md`
- `Approved_UI-03_Bottom_Navigation_System.md`
- `CookMoxs_Codex_Workflow_and_Agents_v1.md`

Visuel kalibrering:
- approved seasonal backgrounds
- BG-09 visual target
- de seneste runtime screenshots

Hvis runtime stadig ser forkert ud, skal Codex **følge de approved specs**, ikke gamle styles.

---

## Arbejdsprincip

### Konservativ sekvens
Denne cleanup skal køres i små, kontrollerede trin.

### Hård regel
**Ét trin ad gangen.**
Codex må ikke springe til næste trin før det aktuelle trin er implementeret og rapporteret.

### Rapportkrav efter hvert trin
Efter hvert trin skal Codex returnere:
1. completed scope
2. files changed
3. checks run
4. could-not-verify items
5. whether to proceed to next step

---

# STEP 1 — Fjern gammel scenic/runtime background leakage

## Mål
Fjerne rester af gammel scenisk baggrundslogik fra runtime på de views, hvor den stadig kæmper imod det nye system.

## In scope
- HomeView
- LibraryView
- RecipeView
- SettingsView
- FeedbackView

## Skal gøre
- fjerne rester af gammel scenic/legacy atmospheric runtime baggrundsbrug
- sikre at views bruger approved seasonal background logic eller dens nuværende runtime-equivalent
- fjerne synlige gamle scene-kurver / decorative landscape interference hvis de stadig kommer fra gammel baggrundslogik

## Må ikke gøre
- ingen nye billeder
- ingen ny assetproduktion
- ingen layoutredesign
- ingen ændring af view-struktur ud over det nødvendige for at få gammel baggrundslogik væk

## Acceptance criteria
- ingen tydelig gammel scenic/wallpaper-lækage i de nævnte views
- baggrunden arbejder som app-baggrund, ikke som motiv
- UI er lettere at læse ovenpå baggrunden efter ændringen

## Stop/go
Hvis dette trin kræver ny art direction, stop.
Det må kun være cleanup af runtime-brug.

---

# STEP 2 — Stabiliser surfaces på lyse views

## Mål
Stoppe at cards, search shells, topbars og secondary surfaces opløses i lyse backgrounds.

## In scope
- HomeView
- LibraryView
- RecipeView
- SettingsView
- FeedbackView

## Skal gøre
- øge surface-stabilitet hvor flader stadig er for gennemsigtige
- bruge UI-02 `Soft Tonal Veil`-logikken mere konsekvent
- sikre at search/topbars/secondary surfaces får nok masse og separation

## Må ikke gøre
- ingen tung glassmorphism
- ingen ekstra pynteniveauer
- ingen blur som erstatning for rigtig opacitet/border

## Acceptance criteria
- Spring/Winter-agtige lyse zoner må ikke få surfaces til at forsvinde
- cards føles tonale og rolige, ikke luftige/tågede
- search/topbars læser som rigtige surfaces, ikke som wash

## Stop/go
Hvis Codex begynder at hælde mere blur på som hovedløsning, stop.

---

# STEP 3 — Fix dark mode contrast failures

## Mål
Fjerne tilfælde hvor lys tekst havner på lys eller for lavkontrast surface i dark mode.

## In scope
- alle berørte views hvor dark mode er aktivt
- især surfaces, buttons, utility controls, labels, nav og settings controls

## Skal gøre
- gennemgå dark mode-kontrastlogik
- rette token-/klassearv hvor lys tekst ender på for lys surface
- sikre at primary/secondary/utility/control states holder kontrast i dark mode
- sikre at dark mode ikke bare er “lys mode med mørkere baggrund”

## Må ikke gøre
- ingen ny dark mode-designretning
- ingen stor farveomlægning ud over det nødvendige for korrekt kontrast

## Acceptance criteria
- ingen oplagt lys-på-lys fejl
- vigtig tekst og controls er læsbare i dark mode
- buttons og surfaces holder deres hierarki også i dark mode

## Stop/go
Hvis Codex vil løse det med vilkårlige lokale hotfixes overalt, stop og saml det i tokens/shared classes i stedet.

---

# STEP 4 — Normaliser SettingsView containment og toggles

## Mål
Få settings cards, option rows, toggles og tilhørende controls til at passe rent i deres egne rammer og følge samme systemsprog.

## In scope
- SettingsView
- evt. fælles toggle/option-komponenter hvis de deles

## Skal gøre
- rette containment-problemer
- sikre at toggles passer optisk og fysisk i deres surfaces
- sikre spacing, højde, alignment og paddings
- sikre at settings cards føles som UI-02 surfaces og ikke tilfældige beholdere
- sikre at controls følger UI-01/UI-02 og ikke gamle utility-vaner

## Må ikke gøre
- ingen redesign af settings-flow
- ingen nye komponentfamilier
- ingen ændring af indhold/struktur ud over det der kræves for visuel og systemisk normalisering

## Acceptance criteria
- toggles passer rent i deres cards/rows
- intet ser presset, skævt eller uforeneligt ud
- settings føles som del af samme produktfamilie som resten

## Stop/go
Hvis Codex vil opfinde et særskilt settings-UI-system, stop.

---

# STEP 5 — Normaliser RecipeView controls

## Mål
Få RecipeView til at læse som ét samlet systemsprog.

## In scope
- RecipeView top actions
- chips/tags
- start-cooking action
- secondary controls i recipe header og omkring ingredient/metadata-zoner

## Skal gøre
- sikre at top actions bruger samme systemfamilie
- sikre at chips/tags ikke lever som separat stilart
- sikre at hovedhandlingen “Start madlavning” føles som del af UI-01 og ikke som et fremmed element
- sikre at surface-lag og knapper arbejder sammen

## Må ikke gøre
- ingen layoutredesign af hele RecipeView
- ingen nye informationsblokke
- ingen ændring af recipe-flowlogik

## Acceptance criteria
- RecipeView føles mindre blandet og mere samlet
- top actions, chips og CTA læser som samme produkt
- ingen åbenlyse gamle utility-/glass-rester

## Stop/go
Hvis Codex vil redesigne hele RecipeView, stop.

---

# STEP 6 — Rens Cook Mode topområde + BG-09

## Mål
Få Cook Mode tættere på et rent, disciplineret subset.

## In scope
- BG-09 runtime implementation
- Cook Mode top controls
- timer/actions
- lower strips hvis de stadig konflikter med systemet

## Skal gøre
- reducere synlig vertikal banding i BG-09
- reducere residual spotlight-følelse
- normalisere top utility controls så de føles som én sammenhængende Cook Mode-subset
- sikre at Cook Mode surfaces er mørke, funktionelle og rolige
- sikre at vigtig information stadig dominerer

## Må ikke gøre
- ingen ny baggrundsretning
- ingen ny Cook Mode-layoutretning
- ingen animationer
- ingen scenic løsning

## Acceptance criteria
- BG-09 føles mere neutral og mindre tekstur-banding-præget
- top controls føles som ét samlet subset
- steptekst, timer og centrale infofelter dominerer klart
- Cook Mode føles mindre som en hybrid og mere som én mode

## Stop/go
Hvis Codex vil genindføre scenisk eller dekorativ logik, stop.

---

# STEP 7 — Kun hvis nødvendigt: minor bottom-nav refinement

## Mål
Kun lave mindre kontrast-/robusthedsjustering, hvis bundnavigation stadig falder igennem efter de andre trin.

## In scope
- bottom nav contrast/state refinement only

## Skal gøre
- kun små justeringer
- kun hvis screenshots stadig viser problemer

## Må ikke gøre
- ingen ny nav-retning
- ingen ny geometri
- ingen ny aktiv-state logik

## Acceptance criteria
- active/inactive læser stabilt på tværs af lyse og mørke kontekster
- docken føles stadig rolig og ligevægtig

---

# Anbefalet Codex-proces

## Kør sådan
- Step 1
- review output
- Step 2
- review output
- Step 3
- review output
- Step 4
- review output
- Step 5
- review output
- Step 6
- review output
- Step 7 kun hvis nødvendigt

## Ikke sådan
- “fix everything above in one pass”

---

# Endelig screenshot review

Når alle nødvendige trin er gennemført, skal der tages nye screenshots af:

- HomeView
- LibraryView
- RecipeView
- Cook Mode
- SettingsView
- FeedbackView
- bundnavigation på lys baggrund
- bundnavigation på mørkere baggrund
- dark mode hvor problemer tidligere fandtes

Først derefter må merge readiness vurderes.

---

# Merge gate

Branch er først merge-klar når:

1. gammel scenic leakage er væk
2. surfaces ikke længere drukner i lyse temaer
3. dark mode-kontrast holder
4. settings/toggles passer rent i deres containere
5. RecipeView læser som ét system
6. Cook Mode er renset nok til at føles som en reel subset
7. screenshots bekræfter forbedringen

---

# Kort opsummering til Codex

Dette er en **konservativ cleanup-plan**.

- Ingen redesign
- Ingen nye assets
- Ingen animationer
- Ingen brede refactors

Kun:
- cleanup
- systemhåndhævelse
- kontrast
- containment
- runtime-normalisering

Målet er at gøre den godkendte foundation **rigtig i runtime**.
