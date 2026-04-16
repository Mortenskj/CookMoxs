# CookMoxs Health Check Priority Fix Plan

## Formål

Dette dokument samler alle fund fra den read-only health check og rangerer dem efter prioritet.

Det er et facitark til videre vurdering og implementering.

- Der er ikke implementeret fixes.
- Der er ikke ændret runtime-logik som del af analysen.
- Anbefalingerne nedenfor beskriver, hvad jeg ville ændre, og hvor jeg ville ændre det.

## Hurtig prioritering

### Bør tages nu

1. Logout efterlader tidligere brugers data tilgængelige offline.
2. Delte opskrifter bliver hængende efter adgang er fjernet.
3. Service worker returnerer `index.html` for asset-cache-miss.
4. URL-sikkerhed kan omgås via DNS-resolution og giver SSRF-risiko.

### Bør tages snart

5. Backup-restore kan oprette mapper med forkert `ownerUID`.
6. Save-UI kan vise succes, selv om cloud-write fejler.
7. AI-timeout/retry-budget mellem klient og server er skævt.
8. Direct parser taber ingredient range-metadata.
9. Range-baserede ingrediensmængder vises forkert i UI.
10. URL-import kan hente samme kilde to gange i samme flow.
11. Eksterne fetch-endpoints er ikke rate-limitet.
12. Undo for auto-saved AI-felter ruller ikke cloud tilbage.
13. Guest-variant-save bruger stale state.
14. Shared recipe-listener churner unødigt ved folder snapshots.
15. ImportView monterer en ekstra offline-queue watcher.

### Kan vente, men giver gevinst

16. Firebase analytics ligger i bootstrap-path.
17. App shell importerer alle top-level views eager.
18. Framer Motion betales for en lille affordance.
19. Service worker-cache kan vokse uden bounds.
20. Aktive timere rerender hele app-shell hvert sekund.
21. Åbning af opskrift omskriver hele local recipe-store for en metadata-opdatering.

## Detaljeret liste

## P0

### 1. Logout efterlader tidligere brugers data tilgængelige offline

- Prioritet: `P0`
- Lokation: `src/App.tsx`
- Problem:
  `handleLogout` nulstiller kun React-state. Efter sign-out hydreres guest-flowet igen fra local storage og recipe cache, som stadig kan indeholde tidligere brugers egne og delte data.
- Risiko:
  Reelt datalæk i samme browser/session. Det er både et privacy- og trust-problem.
- Hvad jeg ville gøre:
  Rydde alle brugerbundne lokale data ved logout, eller adskille guest storage fra authenticated storage.
- Hvordan jeg ville ændre koden:
  - Tilføje en central `clearLocalSessionData()`-hjælper.
  - Kalde den i `handleLogout`.
  - Rydde:
    `recipes`, `folders`, `activeRecipe`, recipe cache entries, eventuelle auth-relaterede session keys.
  - Overveje at navngive local storage/cache per bruger i stedet for globalt.
- Berørte filer:
  - `src/App.tsx`
  - `src/services/localDataService.ts`
  - `src/services/recipeCacheService.ts`

## P1

### 2. Delte opskrifter bliver hængende efter adgang er fjernet

- Prioritet: `P1`
- Lokation: `src/App.tsx`
- Problem:
  Shared recipes merges ind i eksisterende state, men bliver ikke aktivt fjernet, når sidste delte mappe forsvinder.
- Risiko:
  Stale eller uautoriserede data forbliver synlige og kan blive recachet.
- Hvad jeg ville gøre:
  Skille `ownedRecipes` og `sharedRecipes` tydeligt ad i state eller derive shared state ud fra aktive folder IDs.
- Hvordan jeg ville ændre koden:
  - Lade shared recipe-state være separat.
  - Nulstille shared recipe-state, når `sharedFolderIds` bliver tom.
  - Kun merge til view-laget, ikke som permanent blandet source-of-truth.
- Berørte filer:
  - `src/App.tsx`
  - eventuelt `src/services/firestoreDataService.ts`

### 3. Service worker returnerer `index.html` for asset-cache-miss

- Prioritet: `P1`
- Lokation: `public/sw.js`
- Problem:
  Ikke-navigation GET requests falder også tilbage til `'/'`, så JS/CSS/assets kan få HTML som respons ved offline miss.
- Risiko:
  App boot kan bryde hårdt offline eller efter deploy.
- Hvad jeg ville gøre:
  Skelne strengt mellem navigation requests og asset requests.
- Hvordan jeg ville ændre koden:
  - Lade kun navigation requests falde tilbage til `'/'`.
  - Lade assets returnere cache-hit eller fejle normalt.
  - Eventuelt lave særskilt strategi for billeder/fonts, men ikke HTML fallback.
- Berørte filer:
  - `public/sw.js`

### 4. URL-sikkerhed kan omgås via DNS-resolution

- Prioritet: `P1`
- Lokation: `src/server/utils/urlSafety.ts`
- Problem:
  Kun hostnavnet valideres. Der kontrolleres ikke, om DNS peger på private/interne IP’er.
- Risiko:
  SSRF mod interne netværk eller metadata-endpoints.
- Hvad jeg ville gøre:
  Udvide URL-sikkerheden til at validere resolved IP-adresser og redirects efter resolution.
- Hvordan jeg ville ændre koden:
  - Resolve hostname server-side.
  - Afvise private, loopback, link-local og interne ranges på faktisk IP.
  - Revalidere efter hver redirect.
  - Overveje allowlist/denylist for ekstra hårdning.
- Berørte filer:
  - `src/server/utils/urlSafety.ts`
  - `server.ts`

## P2

### 5. Backup-restore kan oprette mapper med forkert `ownerUID`

- Prioritet: `P2`
- Lokation: `src/App.tsx`
- Problem:
  Ved restore omskrives recipes til current user, men folders uploades uændret.
- Risiko:
  Invisible/orphaned folders efter sync.
- Hvad jeg ville gøre:
  Normalisere både recipes og folders til current authenticated owner før cloud-upload.
- Hvordan jeg ville ændre koden:
  - Mappe alle backup-folders til `ownerUID: user.uid`.
  - Reconcile default folder efter restore.
  - Sikre at recipes peger på de nye/normaliserede folder IDs.
- Berørte filer:
  - `src/App.tsx`
  - eventuelt `src/services/defaultFolderService.ts`

### 6. Save-UI kan vise succes, selv om cloud-write fejler

- Prioritet: `P2`
- Lokation: `src/components/ActiveView.tsx`, `src/App.tsx`
- Problem:
  View’et tolker `onSave` som succes, selv når app-layer sluger cloud-fejl og returnerer resolved promise.
- Risiko:
  Falsk succesfeedback og mistet tillid til sync.
- Hvad jeg ville gøre:
  Lade `handleSaveRecipe` returnere eksplicit success/failure eller kaste fejl videre.
- Hvordan jeg ville ændre koden:
  - Standardisere `handleSaveRecipe` til at returnere `Promise<boolean>` eller throwe.
  - Lade `ActiveView` bruge resultatet i stedet for bare “no exception = success”.
- Berørte filer:
  - `src/App.tsx`
  - `src/components/ActiveView.tsx`

### 7. AI-timeout/retry-budget mellem klient og server er skævt

- Prioritet: `P2`
- Lokation: `src/services/aiService.ts`, `server.ts`
- Problem:
  Klienten giver op tidligere, mens serveren stadig kan retrye dyre AI-kald.
- Risiko:
  Spildt AI-forbrug, mærkelig UX og “fejlet men kører stadig”.
- Hvad jeg ville gøre:
  Justere timeout-budget samlet på tværs af browser, server og upstream-modelkald.
- Hvordan jeg ville ændre koden:
  - Definere ét samlet request budget.
  - Reducere server retry-count eller timeout per attempt.
  - Evt. differentiere lette og tunge AI-ruter.
- Berørte filer:
  - `src/services/aiService.ts`
  - `server.ts`

### 8. Direct parser taber ingredient range-metadata

- Prioritet: `P2`
- Lokation: `src/services/recipeDirectParser.ts`
- Problem:
  Parseren matcher ranges, men gemmer ikke `amountMin`, `amountMax` og `amountText` korrekt.
- Risiko:
  Mængder bliver semantisk forkerte efter direct import.
- Hvad jeg ville gøre:
  Lade direct parser bruge samme rige amount-model som resten af importsystemet.
- Hvordan jeg ville ændre koden:
  - Udvide `parseLeadingAmount` til at returnere range-data.
  - Lade object-branch også læse `amountMin`, `amountMax`, `amountText`.
  - Tilføje tests for ranges som `175-200 g`, `1-2 stk`, `ca. 1/2-1 dl`.
- Berørte filer:
  - `src/services/recipeDirectParser.ts`
  - `tests` eller parser-verifikation

### 9. Range-baserede ingrediensmængder vises forkert i UI

- Prioritet: `P2`
- Lokation: `src/components/RecipeView.tsx`, `src/components/CookView.tsx`
- Problem:
  UI bruger primært `ingredient.amount`, selv om projektet allerede understøtter ranges og `amountText`.
- Risiko:
  Gyldige importer ser ufuldstændige eller forkerte ud.
- Hvad jeg ville gøre:
  Bruge én formatter-funktion konsekvent alle steder.
- Hvordan jeg ville ændre koden:
  - Erstatte direkte `ing.amount * scale` med `formatIngredientAmount`.
  - Ensrette renderlogik i RecipeView og CookView.
  - Revidere “measured/unmeasured”-split så range-only ingredienser ikke havner forkert.
- Berørte filer:
  - `src/components/RecipeView.tsx`
  - `src/components/CookView.tsx`
  - `src/services/ingredientAmountFormatter.ts`

### 10. URL-import kan hente samme kilde to gange i samme flow

- Prioritet: `P2`
- Lokation: `src/App.tsx`
- Problem:
  Først prøves direct import mod `/api/parse-direct`, og ved fallback hentes samme URL igen via `/api/fetch-url`.
- Risiko:
  Unødigt netværk, parsing-arbejde og latenstid i slow path.
- Hvad jeg ville gøre:
  Genbruge første fetch-resultat eller samle flows på serveren.
- Hvordan jeg ville ændre koden:
  - Lade `/api/parse-direct` returnere nok metadata til fallback.
  - Eller lave én server-route som prøver structured parse først og returnerer fetch-resultat til fallback uden ny outbound request.
- Berørte filer:
  - `src/App.tsx`
  - `server.ts`

### 11. Eksterne fetch-endpoints er ikke rate-limitet

- Prioritet: `P2`
- Lokation: `server.ts`
- Problem:
  Kun `/api/ai` er rate-limitet. Fetch/parsing-ruter mod eksterne kilder er åbne.
- Risiko:
  Backend- og båndbreddeforbrug kan presses, selv uden AI-brug.
- Hvad jeg ville gøre:
  Indføre separat limiter for fetch/import-ruter.
- Hvordan jeg ville ændre koden:
  - Tilføje limiter for `/api/fetch-url` og `/api/parse-direct`.
  - Evt. strengere regler for IP-baseret eller session-baseret begrænsning.
- Berørte filer:
  - `server.ts`

### 12. Undo for auto-saved AI-felter ruller ikke cloud tilbage

- Prioritet: `P2`
- Lokation: `src/App.tsx`
- Problem:
  Tips og nutrition gemmes i cloud, men undo gendanner kun lokal/view-state.
- Risiko:
  Lokal UI og cloud-data divergerer.
- Hvad jeg ville gøre:
  Lade undo være symmetrisk med save-pathen.
- Hvordan jeg ville ændre koden:
  - Hvis bruger er logget ind og recipe findes i cloud, så gem `lastAiSnapshot.previous` tilbage via save-flow.
  - Skelne mellem rent lokale AI-handlinger og auto-saved AI-handlinger.
- Berørte filer:
  - `src/App.tsx`

### 13. Guest-variant-save bruger stale state

- Prioritet: `P2`
- Lokation: `src/App.tsx`
- Problem:
  `setSavedRecipes(prev => ...)` bruges korrekt, men local persistence bruger lukket `savedRecipes`.
- Risiko:
  Local store kan mangle nyere ændringer efter async AI-flow.
- Hvad jeg ville gøre:
  Lade persistence bygge på samme `prev` som React-update.
- Hvordan jeg ville ændre koden:
  - Flytte `saveLocalRecipes` ind i functional updater.
  - Eller genbruge en central helper som tager `prev` og returnerer `next`.
- Berørte filer:
  - `src/App.tsx`

### 14. Shared recipe-listener churner ved hver folder snapshot

- Prioritet: `P2`
- Lokation: `src/App.tsx`
- Problem:
  Listeneren stoppes og startes igen ved hvert folder snapshot, også når shared folder IDs reelt er uændrede.
- Risiko:
  Unødigt Firestore-abonnementschurn og ekstra reads.
- Hvad jeg ville gøre:
  Sammenligne de nye shared folder IDs med de gamle, før listeneren reinitialiseres.
- Hvordan jeg ville ændre koden:
  - Gemme aktiv shared-folder-signatur i `useRef`.
  - Kun genstarte listener ved reel ændring i ID-sættet.
- Berørte filer:
  - `src/App.tsx`

### 15. ImportView monterer en ekstra offline-queue watcher

- Prioritet: `P2`
- Lokation: `src/components/ImportView.tsx`
- Problem:
  ImportView opretter egen `usePendingQueue`, selv om topniveauet allerede gør det.
- Risiko:
  Dobbelt listeners og dobbelt IndexedDB scans.
- Hvad jeg ville gøre:
  Løfte queue-state til `App` og sende nødvendige tal/refresh-funktion ned som props.
- Hvordan jeg ville ændre koden:
  - Bruge ét centralt hook i `App`.
  - Lade `ImportView` være dumb view med `pendingCount`, `isQueueSupported`, `refreshPendingCount` som props.
- Berørte filer:
  - `src/App.tsx`
  - `src/components/ImportView.tsx`

### 16. Firebase analytics ligger i bootstrap-path

- Prioritet: `P2`
- Lokation: `src/firebase.ts`
- Problem:
  Analytics importeres eager i klientens boot path.
- Risiko:
  Tungere initial bundle end nødvendigt.
- Hvad jeg ville gøre:
  Defer analytics til efter hydration eller kun når det faktisk er aktiveret.
- Hvordan jeg ville ændre koden:
  - Flytte analytics-init bag dynamic import.
  - Lade auth/firestore bootstrap være separat fra analytics bootstrap.
- Berørte filer:
  - `src/firebase.ts`
  - eventuelt `src/main.tsx`

### 17. App shell importerer alle top-level views eager

- Prioritet: `P2`
- Lokation: `src/App.tsx`, `src/main.tsx`
- Problem:
  Hele view-laget lander i initial graph.
- Risiko:
  Høj initial JS-payload og dårligere mobil/PWA-start.
- Hvad jeg ville gøre:
  Indføre code-splitting på view-grænser.
- Hvordan jeg ville ændre koden:
  - Bruge `React.lazy` for store views som Library, Recipe, Cook, Settings, Import.
  - Lade Home/Active være eager, hvis de er mest kritiske.
  - Bruge små suspense boundaries.
- Berørte filer:
  - `src/App.tsx`
  - `src/main.tsx`

## P3

### 18. Framer Motion betales for en lille affordance

- Prioritet: `P3`
- Lokation: `src/components/RecipeView.tsx`
- Problem:
  En relativt tung animation dependency bruges synligt til en lille draggable tips-knap.
- Risiko:
  Bundle overhead uden tilsvarende kritisk værdi.
- Hvad jeg ville gøre:
  Enten defer motion-brugen eller erstatte den med enklere interaktion.
- Hvordan jeg ville ændre koden:
  - Flytte motion-afhængigheden bag lazy loading.
  - Eller fjerne drag-feature og bruge statisk/fixed CTA.
- Berørte filer:
  - `src/components/RecipeView.tsx`
  - evt. `vite.config.ts`

### 19. Service worker-cache kan vokse uden bounds

- Prioritet: `P3`
- Lokation: `public/sw.js`
- Problem:
  Alle same-origin GET responses caches uden filtrering eller eviction.
- Risiko:
  Øget storage-forbrug og mindre forudsigelig cache-adfærd.
- Hvad jeg ville gøre:
  Begrænse, hvad der caches, og indføre en enkel eviction-strategi.
- Hvordan jeg ville ændre koden:
  - Cache kun app shell og udvalgte statiske assets.
  - Udelade volatile dokumenter/HTML-responses fra generel asset-cache.
  - Eventuelt trimme cache efter antal entries eller whitelist paths.
- Berørte filer:
  - `public/sw.js`

### 20. Aktive timere rerender hele app-shell hvert sekund

- Prioritet: `P3`
- Lokation: `src/App.tsx`
- Problem:
  Timer-state bor i topniveauet, så hver countdown tick rerender hele app-shell.
- Risiko:
  Unødigt arbejde især på mobil eller når andre views er åbne.
- Hvad jeg ville gøre:
  Isolere timer-state i mindre komponent eller dedikeret context/store.
- Hvordan jeg ville ændre koden:
  - Flytte timer-reducer/state ned i timer-widget/cook-subsystem.
  - Lade resten af appen kun reagere på coarse-grained changes, ikke hvert sekund.
- Berørte filer:
  - `src/App.tsx`
  - `src/components/CookView.tsx`
  - evt. ny timer-hook/store

### 21. Åbning af opskrift omskriver hele local recipe-store for metadata-only update

- Prioritet: `P3`
- Lokation: `src/App.tsx`
- Problem:
  `lastUsed` opdateres ved åbning, men hele recipe-listen skrives tilbage til local storage og recipe cache.
- Risiko:
  Unødigt main-thread storage-arbejde ved lette læsehandlinger.
- Hvad jeg ville gøre:
  Skille “recent/open history” fra hele recipe-payloaden eller debounce metadata-opdateringer.
- Hvordan jeg ville ændre koden:
  - Holde `lastUsed` i separat lille struktur, hvis muligt.
  - Eller batch/debounce writeback for metadata-only updates.
- Berørte filer:
  - `src/App.tsx`
  - `src/services/localDataService.ts`
  - evt. `src/services/recipeCacheService.ts`

## Anbefalet arbejdsgang

Hvis en samarbejdspartner skal implementere dette gradvist, ville jeg tage det i denne rækkefølge:

1. Sikkerhed og datalæk:
   logout cleanup, shared access cleanup, SSRF hardening, service worker offline fallback.
2. Datakonsistens:
   backup restore ownership, save-resultat, AI undo/cloud, stale guest variant save.
3. Import-kvalitet:
   range parsing, range rendering, dobbelt URL-fetch, fetch-rate-limits.
4. Drift og performance:
   shared listener churn, duplicate queue watchers, bootstrap defers, lazy loading, timer isolation, storage churn.

## Kort implementeringsprincip

Hvis teamet vil holde risikoen nede, vil jeg anbefale:

- Først skrive regression-tests eller manuelle checklister for de kritiske flows.
- Derefter tage ét problemfelt ad gangen:
  - auth/logout
  - shared access/sync
  - import/parser/rendering
  - performance/code splitting
- Undgå at kombinere sikkerhedsfixes og performance-refactors i samme ændringssæt.

## Verifikation jeg allerede har kørt

- `npm run build:strict`
- `npm run verify:parser`

Begge kørte uden build- eller typefejl på den nuværende kodebase.
