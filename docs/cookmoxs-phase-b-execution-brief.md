# CookMoxs Phase B Execution Brief

## Rolle

Dette dokument er den aktuelle correctness-brief for de sidste rester, der stadig blokerer Gate B -> C.

Det er ikke en invitation til at genaabne hele Fase B.
Det skal bruges smalt mod live signoff og de faa correctness-rester, som current repo state stadig ikke har lukket endeligt.

## In scope

1. Grouping-regression for single-mass recipes
2. Heat-duplication i prose
3. Brand/logo loading + home presence
4. Range parsing
5. Range rendering
6. Dobbelt URL-fetch
7. Fetch/import rate limiting
8. `recipe-scrapers` som deterministic import-lag

## Repo-state validation

Current repo state er nu mere snævert:

- grouping, range parsing, range rendering, dobbelt URL-fetch og fetch/import rate limiting ser ud til at vaere landet i kode
- heat-semantikken har nu et konkret kodefix plus harness-validering, men mangler stadig live runtime-signoff paa rigtig import/log-evidens
- brand/loading mangler stadig runtime-signoff i rigtig UI
- service worker asset fallback er stadig et separat correctness-gate, hvis det endnu ikke er verificeret lukket
- `recipe-scrapers` er fortsat ikke en aktiv del af den nuvaerende pipeline og er stadig et bevidst deferred punkt
- JS-rendered SPA-imports som SpisBedre er fortsat et separat import-follow-up og maa ikke skjules som "automatisk Phase C"

Operativ konsekvens:

- behandl kun de sidste runtime-signoff- og gate-rester som aktivt scope
- lad allerede-landede B-fixes vaere i fred, medmindre current code viser en reel regression

## Out of scope

1. Listener churn og duplicate queue watchers
2. Analytics defer og lazy loading
3. Timer isolation og storage churn
4. Ingredient lexicon og oevrige foundation-lag
5. Brede designaendringer uden direkte relation til loading/home-brand presence
6. Bred observability-udbygning

## Definition of done

De resterende B-rester er kun lukkede naar alle disse er sande:

1. Single-mass recipes bliver ikke automatisk vist som falske type-grupper.
2. Heat-data dubleres ikke mekanisk i step-prose, naar struktureret heat allerede findes, og observer-loggen viser ikke laengere de tidligere falske positive paa den konkrete recipe-flow.
3. Brand/logo er styrket i loading/home uden at skabe motion-stoej eller cook-mode-distraktion, og det er verificeret i rigtig UI.
4. Ranges bevares i direct import som `amountMin` / `amountMax` / `amountText`, naar kilden giver det.
5. Range-only ingredienser renderes korrekt i recipe- og cook-views.
6. URL import dobbelthenter ikke samme kilde i fallback-flowet.
7. Fetch/import-ruter er rate-limitet separat fra AI-ruter.
8. `recipe-scrapers` er enten eksplicit deferred med teknisk begrundelse eller implementeret som et smalt deterministic lag uden regression.

## Regression checks

### Grouping

- importer eller opret single-mass recipe som fars, dej, dressing eller roert fyld
- verificer at ingredienser enten vises som en logisk blok eller som flad liste
- verificer at labels som `Groentsager`, `Krydderier`, `Smagsgivere`, `Andre` ikke bliver default-struktur i de cases

### Heat prose og semantics

- re-importer den konkrete Beef Wellington eller tilsvarende recipe, som tidligere gav observer warnings
- verificer at UI ikke baade viser struktureret heat og tung gentagelse i prose
- verificer at grill, ovn, induktion og kernetemperatur ikke blandes sammen
- verificer i observer-loggen, at `duplicate_heat_signal` og `core_temp_not_working_heat` ikke længere fyrer på den recipeId

### Brand/loading

- verificer loading/home i normal mode og reduced-motion kontekst
- verificer at branding er tydeligere, men stadig rolig og ikke dekorativ
- verificer at loading-laget er faktisk synligt og laeseligt i praksis

### Service worker fallback

- simulér eller fremprovokér asset miss/offline-path
- verificer at ikke-navigation assets ikke faar `index.html` som fallback
- hvis punktet ikke er lukket i kode endnu, behold det som aktiv blocker og broad ikke videre

### Range parse + render

- importer ranges som `175-200 g`, `1-2 stk`, `ca. 1/2-1 dl`
- verificer at parser bevarer range-felter
- verificer at RecipeView og CookView viser maengderne korrekt
- verificer at scaling ikke kollapser range til enkeltvaerdi

### URL import

- brug URL der foerst forsoeger direct parse og derefter fallback
- verificer at kilden ikke fetches to gange server-side

### Rate limiting

- spam `/api/fetch-url` og `/api/parse-direct`
- verificer at begraensning rammer de ruter uden at paavirke normale flows urimeligt

### Deterministic import

- test kendte structured recipe-sider
- verificer at deterministic import tager over foer AI-fallback
- verificer at eksisterende AI-fallback stadig virker naar deterministic parse ikke kan
- hold JS-rendered SPA-imports som separat follow-up, ikke som skjult Fase C-arbejde

## Leveranceformat

Implementoeren skal stoppe efter de aabne B-rester og rapportere:

- `verified`
- `changed`
- `files`
- `checks`
- `deferred`

## Stop/Go gate

Beslutningen er `stop`, hvis current repo state stadig viser:

- aaben heat-semantik-fejl
- manglende runtime-signoff paa heat-prose eller loading/branding
- aaben service worker fallback-fejl
- eller andet B-punkt, som stadig fejler i praksis

Beslutningen er foerst `go`, naar de resterende B-rester er lukket eller eksplicit deferred med teknisk begrundelse.
