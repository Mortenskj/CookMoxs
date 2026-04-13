# CookMoxs — Step 6: Interaktionsstater, feedback og flow-robusthed

## Formål

Denne fil er en **klar og styrende implementeringsinstruks** til Codex for **Step 6**.

Dette step handler om at gøre appen mere **færdig i brug**, ikke bare pænere i screenshots.

Målet er at gøre flows mere robuste ved at ensarte:
- loading states
- disabled states
- success/info/error feedback
- tomme tilstande
- submit/adfærd i formularer og actions
- modal-/sheet- og action-robusthed

Dette er **ikke** en redesign-pass.  
Dette er **ikke** en feature-pass.  
Dette er **ikke** en ny visual-system-pass.

Det er en **kontrolleret runtime UX- og state-pass**.

---

## Kort intention

Efter UI-, layout- og copy-pass skal appen nu føles mere **pålidelig og konsekvent**, når man faktisk bruger den.

Brugeren skal kunne mærke:
- hvad der sker lige nu
- om noget arbejder
- om noget er gemt
- om noget fejlede
- hvad næste sikre handling er

Appen skal ikke længere fremstå med:
- uklare loading states
- klikbare knapper mens noget allerede kører
- dobbelt-submit
- tilfældige eller uens statusbeskeder
- tomme states uden tydelig vej videre
- modaler/sheets der føles skrøbelige eller ufærdige

---

## Arbejdsmodel

Codex skal:
- holde sig stramt til scope
- prioritere faktisk brugeradfærd frem for screenshot-polish
- gøre state-adfærd mere konsekvent
- genbruge eksisterende UI-retning
- forbedre robusthed uden at udvide produktets scope
- stoppe efter implementering

Codex skal **ikke**:
- redesigne UI
- opfinde nye features
- lave store refaktorer
- bygge ny designretning
- ændre nutrition-/layoutretningen igen
- skrive lange nye tekster overalt

---

## Scope

### Primært i scope
- runtime state-håndtering
- action-feedback
- disabled/loading logic
- empty states
- submit/adfærdsrobusthed
- statusbeskeder og containment
- små UX-klarhedsforbedringer som følger direkte af states

### Tilladte filer
Codex må arbejde i relevante brugerfladefiler, især:
- `src/components/SettingsView.tsx`
- `src/components/HouseholdSettingsCard.tsx`
- `src/components/LearningFeedbackCard.tsx`
- `src/components/LearningProfileTransparencyCard.tsx`
- `src/components/SupportInfoCard.tsx`
- `src/components/NutritionLookupCard.tsx`
- `src/components/RecipeView.tsx`
- `src/components/ActiveView.tsx`
- `src/components/ImportView.tsx`
- `src/components/LibraryView.tsx`
- `src/components/HomeView.tsx`
- `src/components/CookView.tsx`
- `src/App.tsx`
- `src/index.css` hvis der er behov for små, delte state-klasser eller spacing til feedback-containment

### Også tilladt
Shared helpers eller state-utils må justeres, hvis det er nødvendigt for at sikre:
- submit-lås
- loading states
- status-feedback
- state-consistency

### Ikke i scope
- ny featureudvikling
- analytics
- backend-arkitektur
- redesign
- bred visuel omkalibrering
- nutrition-layout-redesign
- copy-pass bredt
- ny informationsarkitektur

---

## Overordnet mål

Forbedr appens brugeroplevelse i faktisk brug ved at gøre flows mere konsistente og tydelige i deres stater.

Brugeren skal kunne se:
- at noget er i gang
- at noget lykkedes
- at noget fejlede
- at noget ikke kan udføres endnu
- hvad næste handling er

---

## Primære mål

1. Ensart loading states
2. Ensart disabled states
3. Beskyt mod dobbelt-submit og spam-kliks
4. Gør status-/fejl-/success-feedback klar og rolig
5. Gør empty states handlingsrettede
6. Sørg for at feedback bliver vist i den rigtige kontekst og ikke “svæver”
7. Undgå at states føles tilfældige fra view til view

---

## Globale regler

### 1. State før pynt
Hvis noget kører, skal UI’et vise det tydeligt.  
Ikke med store effekter, men med rolig, konsekvent feedback.

### 2. Én handling ad gangen
Hvis en primær handling er i gang:
- skal den relevante knap låses
- må brugeren ikke kunne spamme samme handling
- må der ikke kunne opstå dobbelt-submit

### 3. Feedback skal være lokal
Status/failure/success skal vises dér, hvor handlingen blev udløst.
Ikke et tilfældigt andet sted i viewet.

### 4. Empty states skal pege videre
En tom state skal ikke bare fortælle at noget mangler.  
Den skal hjælpe brugeren videre til næste naturlige handling.

### 5. Uens state-mønstre skal reduceres
Samme type handling skal opføre sig nogenlunde ens på tværs af appen.

### 6. Ingen redesign
Løs problemer gennem:
- state-binding
- disabled logic
- inline status
- containment
- små spacing- og strukturjusteringer

Ikke ved at opfinde nye visuelle komponentfamilier.

---

## Konkrete fokusområder

### A. Formular- og submit-robusthed

Gælder især:
- husstand / invitationer
- feedback-modul
- supportinfo-copy
- nutrition lookup / produktopslag
- importhandlinger
- eventuelle gem-/opret-/kopi-handlinger

#### Krav
- submit-knapper skal låses mens handling kører
- evt. label må skifte til rolig loading-tilstand hvis passende
- dobbeltklik må ikke skabe dobbelte handlinger
- fejl skal vises lokalt og klart
- success skal vises lokalt og kort
- status må ikke blive “hængende” i forkert kontekst efter ny handling

---

### B. Loading states

Codex skal gennemgå flows hvor data eller handlinger tager tid.

#### Krav
Når noget loader:
- må UI ikke se dødt ud
- må knapper ikke virke som om intet sker
- må brugeren ikke være i tvivl om at appen arbejder

#### Tilladt
- rolig tekstændring på knap
- disabled state
- lille eksisterende loading-indikator hvis den allerede findes
- enkel inline “arbejder…”-status hvis det er nødvendigt

#### Ikke tilladt
- ny flashy loader-retning
- store animationsfeatures
- redesign af surfaces

---

### C. Disabled states

Disabled states skal være funktionelle og troværdige.

#### Krav
Hvis en handling ikke kan udføres endnu:
- skal kontrollen se utilgængelig ud
- men stadig være læsbar
- og det skal helst være forståeligt hvorfor

Eksempler:
- manglende input i husstand/invite
- produktsøgning uden input
- handlinger der kræver aktiv data
- actions midt i loading

---

### D. Success / info / error containment

Feedbackbokse og statustekster skal vises i den rigtige sammenhæng.

#### Krav
- feedback skal vises tæt på den relevante handling
- success må være rolig og kort
- fejl må være klare uden at føles paniske
- info må ikke se ud som fejl
- gammel status må ikke blive stående og forvirre efter en ny succes eller ny handling

#### Do not
- sprede feedback ud flere steder for samme handling
- bruge for mange forskellige mønstre for samme slags status

---

### E. Empty states

Gennemgå empty states i views som fx:
- Home
- Active
- Library
- Household
- Feedback
- Nutrition/product lookup hvor relevant

#### Krav
Empty states skal:
- beskrive situationen kort
- have en tydelig næste handling hvis relevant
- ikke være unødigt dramatiske
- ikke være vage

---

### F. Modal / sheet / overlay-adfærd

Gælder hvor appen bruger modaler, sheets eller overlay-lignende paneler.

#### Krav
- åbning/lukning skal føles stabil
- handlinger inde i modaler må ikke overlappe med global sticky CTA
- primær action i modal skal være tydelig
- lukkekontrol må ikke konkurrere med anden primær handling
- indhold skal forblive læsbart i scrollede tilstande

#### Fokus
- Tips & Tricks
- nutrition/product-data-relaterede paneler hvis relevante
- andre overlay-lignende flows i scope

---

## View-forventninger

### SettingsView
Skal føles mere robust i:
- toggle interaction
- valgkort
- statusfeedback
- import-/AI-indstillinger
- support-/copy-handlinger

### HouseholdSettingsCard
Skal føles robust i:
- invite flow
- create household flow
- fejl/success-feedback
- disabled submit
- status efter handling

### RecipeView
Skal føles robust i:
- actionbar-handlinger
- AI-varianter / tips / relaterede utility actions
- inline fejl-/statusfeedback
- sticky CTA-klarhed

### ActiveView
Skal føles robust i:
- fortsæt/stop/gem-lignende handlinger
- tom state
- status efter handling

### ImportView
Skal føles robust i:
- import handlinger
- AI/grundimport valg
- loading / disabled / retry-lignende stater

### LibraryView / HomeView
Skal føles robust i:
- tom state
- adgang til næste naturlige handling
- evt. status når noget netop er oprettet/gemt/importeret

### CookView
Kun i scope hvis der findes tydelige state-robusthedsproblemer i:
- navigation mellem trin
- timerrelaterede handlinger
- stop/exit flow
- tom eller manglende data-state

Men dette er **ikke** en cookmode-redesign-pass.

---

## State-skriveregler

Hvis Codex justerer små brugerrettede state-tekster i denne pass, skal de være:

- korte
- konkrete
- lokale for handlingen
- rolige i tonen

Eksempler på god retning:
- “Gemmer …”
- “Inviterer …”
- “Kunne ikke gemme. Prøv igen.”
- “Invitér sendt.”
- “Intet produkt fundet.”
- “Kopieret.”

Ikke lange forklaringer.

---

## Tekniske robusthedsregler

### Submit-beskyttelse
Hvis en action er async:
- beskyt mod gentagen submit
- nulstil state korrekt bagefter
- undgå race-condition-lignende dobbeltfeedback i UI

### State-reset
Når en handling lykkes eller startes på ny:
- gammel fejl/success må ryddes eller opdateres relevant
- status må ikke blive stale

### Fokus og kontekst
Hvis en fejl gælder et specifikt inputfelt eller en specifik kontrol:
- vis den tæt på konteksten
- ikke langt væk i kortet uden relation

---

## Do-nots

Do not:
- redesigne layout
- genåbne nutrition-layout-polish bredt
- omskrive hele copy-systemet igen
- indføre nye store loader-komponenter
- tilføje animation for animationens skyld
- ændre farvesystemet bredt
- sprede scope til nye features
- opfinde nye settings-kategorier
- ændre dynamisk opskriftsindhold

---

## Acceptance criteria

Step 6 er kun godkendt hvis:

1. vigtige brugerhandlinger har troværdige loading/disabled states
2. submit-flow er mere robust mod dobbeltklik
3. fejl/success/info vises mere lokalt og konsistent
4. empty states er tydeligere og mere handlingsrettede
5. der ikke introduceres tydelige layout-regressioner
6. appen føles mere færdig i brug — ikke bare i statiske screenshots

---

## Outputformat fra Codex

Efter implementering skal Codex stoppe og kun returnere:

1. completed scope
2. files changed
3. runtime/state decisions made
4. checks run
5. could-not-verify items
6. exact screenshots required for review

---

## Krævede screenshots til review bagefter

Codex skal bede om screenshots af:

### Formular- og submit-flows
- husstand: tom, valid, loading, success/error state
- feedback: før submit, evt. loading, efter submit
- supportinfo-copy eller lignende action med lokal succesfeedback

### Import / AI-relaterede flows
- mindst én import-state hvor loading eller disabled kan ses
- mindst én error-/retry-/info-state hvis relevant

### Recipe / Active
- RecipeView med lokal statusfeedback
- ActiveView med tom state eller action-state
- evt. Tips & Tricks eller anden overlay hvis state er justeret

### Empty states
- Home
- Active
- Library
hvis de er rørt

---

## Slutregel

Hvis Codex er i tvivl, skal det:
- vælge robusthed frem for ekstra pynt
- vælge lokal feedback frem for globale “løse” beskeder
- vælge enkel state-logik frem for nye mønstre
- holde sig snævert til de flows, der faktisk forbedrer oplevelsen i brug

Dette dokument er en **klar Step 6-instruks**.
Det er ikke en åben redesign-pass.
