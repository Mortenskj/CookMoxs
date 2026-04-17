# CookMoxs Reference Facitliste

## Rolle

Dette dokument er en passiv løsningsreference.

Det er ikke en arbejdsordre.
Det skal bruges til at undgå, at implementøren genudleder løsninger, vi allerede har lokaliseret.

Brug det sådan:

- brug phase brief som aktivt scope
- brug denne facitliste som kort løsningsreference
- gengiv ikke indholdet tilbage i svar
- implementer kun relevant delta

## Format

Per issue gives kun:

- hvor det ligger
- hvorfor det er et problem
- hvad jeg ville ændre
- hvilke filer jeg forventer at røre
- hvad der ikke bør broades ind samtidig

## Fase A: Trust & correctness

### A1. Logout/privacy cleanup

- Hvor:
  - `src/App.tsx:1455`
  - lokale hydrations- og cacheflows i `src/App.tsx`
  - `src/services/localDataService.ts`
  - `src/services/recipeCacheService.ts`
- Problem:
  Logout rydder kun React-state. Guest/offline flow kan derefter rehydrere tidligere brugers data.
- Hvad jeg ville ændre:
  Indføre én central cleanup for brugerbundet lokal state og kalde den i logout-flowet.
  Hvis nødvendigt: split guest storage og authenticated storage.
- Berørte filer:
  - `src/App.tsx`
  - `src/services/localDataService.ts`
  - `src/services/recipeCacheService.ts`
- Broad ikke samtidig:
  auth-omskrivning, ny household-logik eller større state-refactor.

### A2. Shared revoke cleanup

- Hvor:
  - `src/App.tsx:460`
  - `src/App.tsx:515`
- Problem:
  Shared recipes merges ind i samlet state og nulstilles ikke eksplicit, når sidste delte mappe forsvinder.
- Hvad jeg ville ændre:
  Holde owned og shared recipes adskilt i source-of-truth og nulstille shared state, når `sharedFolderIds` bliver tom.
- Berørte filer:
  - `src/App.tsx`
  - eventuelt `src/services/firestoreDataService.ts`
- Broad ikke samtidig:
  listener performance-optimering ud over det, der er nødvendigt for correctness.

### A3. Service worker asset fallback

- Hvor:
  - `public/sw.js:65`
- Problem:
  Ikke-navigation GET requests kan få `index.html` som fallback ved asset miss.
- Hvad jeg ville ændre:
  Lade kun navigation requests falde tilbage til app shell.
  Assets skal få cache-hit eller almindelig fejl.
- Berørte filer:
  - `public/sw.js`
- Broad ikke samtidig:
  cache-eviction eller større PWA-strategi medmindre nødvendigt for fixet.

### A4. SSRF hardening

- Hvor:
  - `src/server/utils/urlSafety.ts:53`
  - `server.ts:1469`
  - `server.ts:1496`
- Problem:
  Hostnavn valideres, men ikke resolved IP. Public-looking domainer kan pege på private/interne mål.
- Hvad jeg ville ændre:
  Resolve hostname server-side, afvis private/link-local/loopback ranges, og revalider efter redirects.
- Berørte filer:
  - `src/server/utils/urlSafety.ts`
  - `server.ts`
- Broad ikke samtidig:
  fuld networking-abstraction eller ny fetch-stack.

### A5. Restore ownership

- Hvor:
  - `src/App.tsx:735`
- Problem:
  Backup restore normaliserer recipes, men uploader folders uændret. Det kan give forkert `ownerUID`.
- Hvad jeg ville ændre:
  Normalisere både folders og recipes til current user før cloud-upload og reconcile default folder bagefter.
- Berørte filer:
  - `src/App.tsx`
  - `src/services/defaultFolderService.ts`
- Broad ikke samtidig:
  ændring af backupformat.

### A6. Save-resultat vs. cloud-truth

- Hvor:
  - `src/App.tsx:1242`
  - `src/App.tsx:1348`
  - `src/components/ActiveView.tsx:20`
- Problem:
  Auth-save sluger cloud-fejl, mens UI tolker “ingen exception” som succes.
- Hvad jeg ville ændre:
  Gøre save-resultatet eksplicit som `Promise<boolean>` eller kaste fejl videre, så view-laget kan vise reel status.
- Berørte filer:
  - `src/App.tsx`
  - `src/components/ActiveView.tsx`
- Broad ikke samtidig:
  fuld omskrivning af alle save flows.

### A7. Undo/cloud symmetri

- Hvor:
  - `src/App.tsx:1634`
  - `src/App.tsx:1659`
  - `src/App.tsx:1670`
- Problem:
  Tips og nutrition auto-saves til cloud, men undo gendanner kun lokal state.
- Hvad jeg ville ændre:
  Lade undo bruge samme save-path tilbage til cloud for authenticated users.
  Skelne tydeligt mellem lokale og auto-saved AI-actions.
- Berørte filer:
  - `src/App.tsx`
- Broad ikke samtidig:
  generel AI-state-arkitektur.

### A8. Stale guest save state

- Hvor:
  - `src/App.tsx:1687`
  - `src/App.tsx:1711`
- Problem:
  Guest variant-save opdaterer React-state med functional updater, men skriver lokal storage med lukket `savedRecipes`.
- Hvad jeg ville ændre:
  Bygge lokal persistence på samme `prev -> next` transition som state-update.
- Berørte filer:
  - `src/App.tsx`
- Broad ikke samtidig:
  generel persistence-refactor.

## Fase B: Product correctness & import truth

### B1. Grouping-regression for single-mass recipes

- Hvor:
  - `src/components/RecipeView.tsx:274`
  - `src/components/RecipeView.tsx:1289`
  - `src/components/CookView.tsx:220`
  - prompt/polish flows i `server.ts:1107`
- Problem:
  UI viser `group` direkte, selv når typegrupper giver falsk struktur for fars, dej, dressing og lignende.
- Hvad jeg ville ændre:
  Indføre et lille grouping-lag, der kan vælge flad liste eller én logisk blok i single-mass cases.
- Berørte filer:
  - `src/components/RecipeView.tsx`
  - `src/components/CookView.tsx`
  - eventuelt ny `src/services/ingredientGrouping.ts`
  - relevante promptsektioner i `server.ts`
- Broad ikke samtidig:
  stor ingredient ontology.

### B2. Heat-duplication i prose

- Hvor:
  - heat-normalisering i `src/services/recipeStepNormalization.ts`
  - heat-display i `src/services/cookModeHeuristics.ts:342`
  - step/prompt flows i `server.ts:1134`
- Problem:
  Heat findes allerede struktureret, men prose kan stadig gentage det tungt og mekanisk.
- Hvad jeg ville ændre:
  Løse det primært i prompt/server-side polish.
  Eventuel client cleanup skal være meget smal fallback.
- Berørte filer:
  - `server.ts`
  - eventuelt `src/services/recipeStepNormalization.ts`
- Broad ikke samtidig:
  smart client-side rewriting.

### B3. Brand/logo loading + home presence

- Hvor:
  - `src/components/BrandMark.tsx`
  - `src/components/HomeView.tsx:20`
  - `src/components/GlobalAiActivity.tsx:8`
  - `src/components/LoadingAnimation.tsx:37`
- Problem:
  Branding findes, men er ikke samlet i en tydelig og rolig loading/home-standard.
- Hvad jeg ville ændre:
  Styrke branded loading og AI-activity med rolig, reduced-motion venlig brug af `BrandMark`.
- Berørte filer:
  - `src/components/HomeView.tsx`
  - `src/components/GlobalAiActivity.tsx`
  - eventuelt `src/components/LoadingAnimation.tsx`
- Broad ikke samtidig:
  stor visuel redesign eller motion-system.

### B4. Range parsing

- Hvor:
  - `src/services/recipeDirectParser.ts:31`
  - `src/services/recipeDirectParser.ts:94`
- Problem:
  Direct parser matcher ranges, men returnerer kun én `amount` og mister `amountMin` / `amountMax` / `amountText`.
- Hvad jeg ville ændre:
  Udvide `parseLeadingAmount` og object-branch til first-class range-felter.
- Berørte filer:
  - `src/services/recipeDirectParser.ts`
- Broad ikke samtidig:
  omskrivning af hele importmodellen.

### B5. Range rendering

- Hvor:
  - `src/services/ingredientAmountFormatter.ts:7`
  - `src/components/RecipeView.tsx:1289`
  - `src/components/CookView.tsx:696`
  - `src/components/CookView.tsx:812`
  - `src/components/CookView.tsx:877`
- Problem:
  Formatter findes allerede, men views renderer stadig hovedsageligt via `ingredient.amount`.
- Hvad jeg ville ændre:
  Ensrette rendering gennem formatteren alle steder, også ved scaling og measured/unmeasured split.
- Berørte filer:
  - `src/components/RecipeView.tsx`
  - `src/components/CookView.tsx`
  - eventuelt `src/services/ingredientAmountFormatter.ts`
- Broad ikke samtidig:
  komplet redesign af ingredient UI.

### B6. Dobbelt URL-fetch

- Hvor:
  - `src/App.tsx:945`
  - `src/App.tsx:999`
  - `src/App.tsx:1047`
  - `server.ts:1469`
  - `server.ts:1496`
- Problem:
  Samme URL kan hentes to gange i direct-parse -> fallback flowet.
- Hvad jeg ville ændre:
  Samle flowet i ét serverforløb eller returnere nok metadata til at genbruge første fetch.
- Berørte filer:
  - `src/App.tsx`
  - `server.ts`
- Broad ikke samtidig:
  ny importarkitektur fra bunden.

### B7. Fetch/import rate limiting

- Hvor:
  - `server.ts:904`
  - `server.ts:911`
  - `server.ts:1469`
  - `server.ts:1496`
- Problem:
  Kun AI-ruter er rate-limitet. Import/fetch-ruter er åbne.
- Hvad jeg ville ændre:
  Tilføje separat limiter for `/api/parse-direct` og `/api/fetch-url`.
- Berørte filer:
  - `server.ts`
- Broad ikke samtidig:
  generel API gateway-omlægning.

### B8. `recipe-scrapers` som deterministic import-lag

- Hvor:
  - importflows i `server.ts`
- Problem:
  Deterministic pre-AI lag er stadig tyndt i forhold til potentialet.
- Hvad jeg ville ændre:
  Indsætte `recipe-scrapers` som server-side deterministic parse før AI-fallback.
- Berørte filer:
  - `server.ts`
  - eventuelt ny `src/server/import/recipeScrapersBridge.ts`
- Broad ikke samtidig:
  stor open-source integrationspakke ud over denne ene bro.

## Fase C: Efficiency & foundation

### Fase C note

- Aktivt Fase C-batch bør holdes til C1-C7 nedenfor.
- Observability er allerede løftet nok til, at det ikke bør være et hovedspor i denne fase.
- Ingredient lexicon er kun relevant, hvis et konkret C-fix kræver et meget lille subset.
- Search/OCR/authz er fortsat deferred og bør ikke broades ind.

### C1. Listener churn

- Hvor:
  - `src/App.tsx:460`
  - `src/App.tsx:509`
  - `src/App.tsx:515`
- Problem:
  Shared listener teardown/restart sker ved hvert folder snapshot, også når shared ID-sættet reelt er uændret.
- Hvad jeg ville ændre:
  Sammenligne signaturen af shared folder IDs før reinit af listener.
- Berørte filer:
  - `src/App.tsx`
- Broad ikke samtidig:
  hele sync-laget.

### C2. Duplicate queue watchers

- Hvor:
  - `src/App.tsx:209`
  - `src/components/ImportView.tsx:32`
- Problem:
  `usePendingQueue()` mountes to steder og kan duble lyttere og scans.
- Hvad jeg ville ændre:
  Løfte queue-state til topniveau og sende props ned til ImportView.
- Berørte filer:
  - `src/App.tsx`
  - `src/components/ImportView.tsx`
- Broad ikke samtidig:
  nyt globalt state library.

### C3. Analytics defer

- Hvor:
  - `src/firebase.ts:2`
  - `src/firebase.ts:29`
- Problem:
  Analytics ligger stadig i bootstrap path.
- Hvad jeg ville ændre:
  Flytte analytics-init bag dynamic import eller post-hydration init.
- Berørte filer:
  - `src/firebase.ts`
  - eventuelt `src/main.tsx`
- Broad ikke samtidig:
  stor analytics-ombygning.

### C4. Lazy loading

- Hvor:
  - top-level imports i `src/App.tsx`
- Problem:
  Store views importeres eager i app shell.
- Hvad jeg ville ændre:
  Code-splitte på view-grænser med små suspense boundaries.
- Berørte filer:
  - `src/App.tsx`
  - eventuelt `src/main.tsx`
- Broad ikke samtidig:
  større routing-omlægning.

### C5. Timer rerender isolation

- Hvor:
  - `src/App.tsx:605`
- Problem:
  Aktiv timer tick opdaterer topniveauet og kan rerendere hele app-shell hvert sekund.
- Hvad jeg ville ændre:
  Isolere timer-state til mindre subsystem eller dedikeret UI-del.
- Berørte filer:
  - `src/App.tsx`
  - `src/components/CookView.tsx`
- Broad ikke samtidig:
  nyt store-pattern til hele appen.

### C6. Storage churn

- Hvor:
  - `src/App.tsx:1231`
  - `src/App.tsx:1238`
  - `src/App.tsx:1387`
  - `src/App.tsx:1416`
  - `src/App.tsx:1751`
- Problem:
  Lette metadataændringer og read-flows skriver hele local recipe-store tilbage og spejles videre til cache.
- Hvad jeg ville ændre:
  Skille metadata-only writes fra fulde recipe writes eller debounce/batch dem.
- Berørte filer:
  - `src/App.tsx`
  - `src/services/localDataService.ts`
  - `src/services/recipeCacheService.ts`
- Broad ikke samtidig:
  ny lokal database eller større persistence-system.

### C7. Framer Motion overhead

- Hvor:
  - `src/components/RecipeView.tsx:4`
  - også importeret i `src/App.tsx:82`
- Problem:
  Relativt tung dependency ligger i initial graph for begrænset affordance-værdi.
- Hvad jeg ville ændre:
  Defere motion-brugen eller erstatte den med billigere interaktion, hvis den ikke er central for cook flow.
- Berørte filer:
  - `src/components/RecipeView.tsx`
  - eventuelt `src/App.tsx`
- Broad ikke samtidig:
  animationsrydning på tværs af hele appen.

### C8. Ingredient lexicon subset

- Hvor:
  - nyt data/service-lag, findes ikke endnu
- Problem:
  Potentialet er der, men uden stram scope kan det blive et for stort platformsspor.
- Hvad jeg ville ændre:
  Starte med lille curated subset kun hvis det løser konkrete problemer i grouping, nutrition eller substitutions.
- Berørte filer:
  - eventuelt ny `src/data/ingredients/ingredientLexicon.json`
  - eventuelt ny service-lag under `src/services/ingredients/`
- Broad ikke samtidig:
  fuld ontology eller stor ekstern dataintegration.

### C9. Observer follow-up og senere foundation-lag

- Hvor:
  - observer follow-up kun hvis et konkret C-fix kræver det
  - senere foundation-lag er ellers ikke aktivt scoped
- Problem:
  Relevante spor kan let broadene scope for tidligt.
- Hvad jeg ville ændre:
  Holde observer-opfølgning til smal tuning, fx assertion-støj eller capture-stabilitet, hvis det direkte understøtter et C-fix.
  Holde search/OCR/authz som separat arbejde senere og kun med tydelig produktbegrundelse.
- Berørte filer:
  - ikke fastlagt endnu, medmindre et konkret C-fix kræver smal observer-tuning
- Broad ikke samtidig:
  platformprojekt uden gate-beslutning.
