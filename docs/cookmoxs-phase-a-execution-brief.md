# CookMoxs Phase A Execution Brief

## Rolle

Dette dokument er den aktive arbejdsordre.

Scope er låst til Fase A.
Ingen sidequests.

## In scope

1. Logout/privacy cleanup
2. Shared revoke cleanup
3. Service worker asset fallback
4. SSRF hardening
5. Restore ownership
6. Save-resultat vs. cloud-truth
7. Undo/cloud symmetri
8. Stale guest save state

## Repo-state validation

Alle punkter ovenfor er stadig reelle i current repo state:

- `handleLogout` rydder kun React-state
- shared recipes merges stadig ind og bliver ikke eksplicit nulstillet ved sidste revoke
- `public/sw.js` falder stadig tilbage til `/` for ikke-navigation asset misses
- `src/server/utils/urlSafety.ts` validerer hostname, men ikke resolved IP
- backup restore uploader stadig folders uændret
- `handleSaveRecipe` sluger stadig cloud-fejl i auth-flow
- undo gendanner stadig kun lokal state
- guest variant-save skriver stadig med stale lukket `savedRecipes`

Derfor er scope ikke reduceret yderligere.

## Out of scope

1. Grouping
2. Heat-prose cleanup
3. Brand/logo polish
4. Range parsing/rendering
5. URL import dedupe
6. Fetch/import rate limiting
7. `recipe-scrapers`
8. Lazy loading, analytics defer og øvrig performanceoptimering
9. Ingredient lexicon og senere foundation-lag

## Definition of done

Fase A er kun færdig når alle disse er sande:

1. Logout efterlader ikke tidligere brugers recipes, active recipe eller shared data i guest/offline flow.
2. Shared recipes forsvinder når sidste relevante adgang fjernes.
3. Asset-cache-miss offline returnerer ikke app-shell HTML.
4. URL fetch-endpoints afviser private/interne destinations-IP'er, også efter redirects.
5. Backup restore skaber ikke folders med forkert `ownerUID`.
6. Save-UI kan ikke melde succes, hvis cloud-save fejler.
7. Undo genskaber cloud state for auto-saved AI-ændringer.
8. Guest variant-save skriver ikke stale liste tilbage til lokal storage.

## Regression checks

### Logout/privacy

- log ind som bruger A
- opret eller sync mindst én recipe
- log ud
- verificer at guest-flow ikke rehydrater recipes eller active recipe fra bruger A
- genindlæs offline og verificer igen

### Shared revoke

- giv adgang til delt mappe
- verificer at shared recipes vises
- fjern sidste relevante adgang
- verificer at shared recipes forsvinder uden reload
- verificer at de ikke recaches ind igen

### Service worker

- cache appen
- simuler offline
- fremprovoker miss på JS/CSS/image
- verificer at asset request ikke modtager `index.html`
- verificer at navigation fallback stadig virker

### SSRF

- prøv public-looking hostname som resolver til privat mål
- prøv redirect-kæde til privat mål
- verificer at begge afvises
- verificer at normale offentlige recipe-kilder stadig virker

### Restore ownership

- gendan backup med folders fra anden owner eller guest backup
- verificer at folders efter restore ejes af current user
- verificer at recipes stadig peger på synlige folders

### Save truth

- fremprovoker cloud-save fejl i auth-flow
- verificer at UI ikke viser success state

### Undo/cloud

- kør auto-saved AI-handling som tips eller nutrition
- tryk undo
- verificer at både UI og cloud er rullet tilbage

### Guest stale save

- opret race mellem variant-save og anden lokal ændring
- verificer at lokal recipe-liste ikke mister nyere state

## Leveranceformat

Implementøren skal stoppe efter Fase A og rapportere i dette format:

- `verified`: hvad der er bevist lukket
- `changed`: hvilke flows der er ændret
- `files`: hvilke filer der er rørt
- `checks`: hvilke regression checks der blev kørt
- `deferred`: hvad der bevidst ikke blev taget med

## Stop/Go gate

Beslutningen er `stop`, hvis bare ét af de otte punkter ikke er verificeret lukket.

Beslutningen er først `go`, når hele Fase A er lukket og rapporteret.
