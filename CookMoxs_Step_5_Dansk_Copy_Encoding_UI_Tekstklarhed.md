# CookMoxs — Step 5: Dansk copy, encoding og UI-tekstklarhed

## Formål

Denne fil er en **klar og styrende implementeringsinstruks** til Codex for **Step 5**.

Dette step handler om at forbedre appens **danske UI-tekst**, så den bliver:
- korrekt
- naturlig
- konsekvent
- konkret
- produktklar

Dette er **ikke** en redesign-pass.  
Dette er **ikke** en feature-pass.  
Dette er **ikke** en bred refaktorering.

Det er en **kontrolleret copy-, encoding- og tekstklarheds-pass**.

---

## Kort intention

UI’et er blevet langt stærkere visuelt.  
Nu skal teksten følge med.

Brugeren skal kunne forstå:
- hvad en setting gør
- hvor den gælder
- hvad der ændrer sig, når den slås til eller fra

Og appen skal ikke længere fremstå med:
- `ae/oe/aa`-fejl i brugerfladen
- halvengelske labels
- maskinoversat tone
- vag og upræcis hjælpetekst

---

## Arbejdsmodel

Codex skal:
- holde sig stramt til scope
- prioritere brugerforståelse
- holde tekster korte nok til mobil-UI
- forbedre terminologi konsekvent
- rette synlige encoding-/lokaliseringsfejl i brugerrettet tekst
- stoppe efter implementering

Codex skal **ikke**:
- redesigne UI
- åbne produktdata/nutrition-layout igen
- opfinde nye features
- lave store refaktorer
- skrive lange forklaringer i UI
- ændre dynamisk opskriftsindhold

---

## Scope

### Tilladte filer
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
- `src/index.css` **kun hvis** der er behov for små tekstsikkerhedsjusteringer efter copy-oprydning

### Også tilladt
Hvis brugerrettede strenge tydeligt bor i shared helpers/config-filer, må Codex redigere dem.

### Ikke i scope
- redesign
- mørk mode-redesign
- nutrition/makrologik
- featurearbejde
- analytics
- backend-ændringer
- schema-ændringer
- brede strukturrefaktorer

---

## Overordnet mål

Forbedr appens danske UI-tekst, så den:
- læser som et rigtigt dansk produkt
- er forståelig for en almindelig bruger
- bruger ens termer på tværs af views
- forklarer settings konkret
- stadig er kort nok til mobil-layoutet

---

## Primære mål

1. Ret synlige danske encoding-/lokaliseringsfejl
2. Forbedr klarheden i UI-tekst
3. Standardisér terminologi på tværs af appen
4. Gør settings- og hjælpetekster mere konkrete
5. Bevar korte, mobilvenlige tekster

---

## Globale skriveregler

### 1. Skriv naturligt dansk
Teksten skal lyde som et rigtigt produkt på dansk.  
Ikke som maskinoversættelse.

### 2. Klarhed før stil
Brugeren skal hurtigt forstå, hvad en kontrol gør.

### 3. Kort er bedre
- korte labels
- korte hjælpetekster
- ingen oppustede forklaringer

### 4. Hjælpetekst skal være funktionel
Hjælpetekst skal forklare:
- hvad det gør
- hvor det gælder
- hvad der ændrer sig

### 5. Undgå vaghed
Undgå tekster som:
- “modul aktivt”
- “vises på opskriftssiden”
- “kan bruges til”
hvis brugeren stadig ikke forstår konsekvensen

### 6. Vælg én term og hold den
Samme ting skal omtales ens på tværs af views.

### 7. Bevar produkttonen
Tonen skal være:
- rolig
- klar
- hjælpsom
- præcis
- lidt premium
- ikke corporate
- ikke barnlig
- ikke tung

---

## Encoding / lokaliseringsregler

Ret synlige fejl i **brugerrettet tekst** som fx:
- `aa` -> `å`
- `ae` -> `æ`
- `oe` -> `ø`

### Vigtigt
Ret **kun** brugerrettede strenge.

### Do not
- ændre variabelnavne
- ændre keys
- ændre routes
- ændre interne identifikatorer
- lave blinde replace-kommandoer i kode

---

## Sprogblanding

Fjern akavet blanding af engelsk og dansk i brugerfladen, hvor en god dansk løsning findes.

Eksempler på ting der bør ensartes, hvis de findes brugerrettet:
- `active`
- `selected`
- `support info`
- `module active`

Men kun når det er brugerrettet tekst.

---

## Terminologi — beslutningsregel

Codex skal vælge én konsekvent term pr. område og bruge den konsekvent.

### Fokusområder
- opskrift / opskrifter
- cook mode / cookmode / madlavningstilstand
- import / linkimport / grundimport
- produktdata
- stregkode
- husstand
- feedback
- cloud / sky / synkronisering / backup

### Krav
Når Codex afslutter, skal det rapportere:
- hvilke terminologibeslutninger der er taget

---

## Settings er vigtigst i Step 5

Dette er det vigtigste område.

For hver setting eller option skal brugeren kunne forstå:
1. hvad det gør
2. hvor det gælder
3. hvad forskellen er på til/fra eller mellem valgmuligheder

### Do not
Lad hjælpetekst stå som:
- “Gælder kun i denne browser”
uden at sige hvad der faktisk ændrer sig
- “Styrer produktdata”
uden at sige hvad brugeren vil se

---

## Settings-grupper der skal gennemgås

Codex skal aktivt reviewe og forbedre tekst i disse grupper:

1. Konto
2. Data og backup
3. Dit niveau i køkkenet
4. Tema og årstid
5. Præferencer
6. Import med eller uden AI
7. AI efter linkimport
8. Ernæring og stregkode
9. Forberedelses-trin i cook mode
10. Tekst i cook mode
11. Support og version
12. Husstand
13. Frivillig feedback / gennemsigtighed

---

## Teksttype-regler

### 1. Section headings
Skal være:
- korte
- klare
- stabile
- danske

### 2. Toggle-titel
Skal beskrive hvad der ændrer sig.

### 3. Toggle-hjælpetekst
Brug gerne dette mønster når relevant:
- “Når den er slået til …”
- “Når den er slået fra …”
- og nævn hvor i appen det gælder

### 4. Option cards
Option cards skal forklare den brugeroplevede forskel.  
Ikke intern logik.  
Ikke teknisk implementering.

### 5. Status/info-tekst
Skal lyde menneskelig og præcis.  
Ikke robotisk.

---

## Views uden for Settings der også skal gennemgås

Codex skal reviewe brugerrettet tekst i:
- `RecipeView`
- `LibraryView`
- `ImportView`
- `ActiveView`
- `CookView`
- `HomeView`

### Fokus her
- labels
- knaptekst
- helper text
- empty states
- privacy/status-rækker
- info-/fejlstatus
- modal-overskrifter
- sektionsoverskrifter

### Ikke i scope her
- opskriftstekst indhold
- brugerimporteret opskriftsindhold
- lange dynamiske madtekster

Kun interface-/produkttekst.

---

## Konkrete kvalitetstargets

Codex skal aktivt gøre følgende typer tekst bedre:

- privacy-/statuslinjer som lyder akavet
- support-/hjælpetekster som er vage
- uklare nutrition-/stregkode-beskrivelser
- uklare forklaringer af forberedelses-trin
- feedback-modul-tekst der er for indforstået
- husstands-/invite-tekster der er flade eller mærkelige
- placeholders der føles generiske eller halvoversatte

---

## Vigtige do-nots

Do not:
- redesigne layout
- flytte komponenter rundt
- ændre logik bredt
- røre nutrition chart logic
- genåbne product-data layout arbejde
- omskrive lange opskrifter
- gøre UI-tekster for lange
- skrive stift, bureaukratisk dansk
- bruge engelsk hvor dansk er bedre
- bruge unaturlige direkte oversættelser

---

## Tekstlængde og UI-sikkerhed

Meget vigtigt:
Teksterne skal fortsat passe i mobil-UI’et.

### Regler
- vælg 1 kort præcis sætning frem for 2 vage
- hold labels korte
- undgå lange forklaringer i cards
- undgå tydeligt overflow-skabende tekst

### Tilladt hvis nødvendigt
Små tekstsikkerhedsjusteringer i `index.css`, fx:
- line clamp
- wrap
- min-height
- spacing

Men det må **ikke** udvikle sig til en ny layout-pass.

---

## Acceptance criteria

Step 5 er kun godkendt hvis:

1. synlige danske encodingfejl i scope er rettet
2. settings-tekst er konkret forståelig
3. terminologien er mere konsekvent
4. tydeligt robotisk eller maskinagtig tekst er fjernet
5. der ikke introduceres tydelige layout-regressioner pga. ny tekst

---

## Outputformat fra Codex

Efter implementering skal Codex stoppe og kun returnere:

1. completed scope
2. files changed
3. terminology decisions made
4. checks run
5. could-not-verify items
6. exact screenshots required for review

---

## Krævede screenshots til review bagefter

Codex skal bede om screenshots af:

### Settings
- `Præferencer`
- `Import med eller uden AI`
- `AI efter linkimport`
- `Ernæring og stregkode`
- `Forberedelses-trin i cook mode`
- `Tekst i cook mode`
- `Husstand`
- `Frivillig feedback`

### Andre views
- én `RecipeView` med privacy/status-række
- én `LibraryView`
- én `ActiveView`
- gerne én `CookView` hvis den indeholder synlige hjælpetekster eller labels som er blevet ændret

---

## Slutregel

Hvis Codex er i tvivl, skal det:
- vælge klarhed frem for smart wording
- vælge kort tekst frem for bred forklaring
- bevare nuværende UI-retning
- forbedre forståelse uden at udvide scope

Dette dokument er en **klar Step 5-instruks**.
Det er ikke en åben brainstorming.
