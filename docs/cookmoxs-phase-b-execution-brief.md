# CookMoxs Phase B Execution Brief

## Rolle

Dette dokument er den aktuelle correctness-brief for de resterende Fase B-punkter.

Det er ikke en invitation til at genaabne hele Fase B.
Det skal bruges smalt mod de aabne B-rester, som stadig blokerer Gate B -> C.

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

Current repo state er blandet:

- grouping, range parsing, range rendering, dobbelt URL-fetch og fetch/import rate limiting ser ud til at vaere landet i kode
- heat-prose og brand/loading er delvist landet, men mangler stadig reel runtime-signoff der, hvor output stadig ser forkert ud
- heat-semantikken er ikke stabil nok ende-til-ende, fordi prompt-laget stadig baerer global induktionsbias
- `recipe-scrapers` er fortsat ikke en aktiv del af den nuvaerende pipeline og er stadig et bevidst deferred punkt

Operativ konsekvens:

- behandl kun de resterende B-rester som aktivt scope
- lad allerede-landede B-fixes vaere i fred, medmindre current code viser en reel regression

## Out of scope

1. Listener churn og duplicate queue watchers
2. Analytics defer og lazy loading
3. Timer isolation og storage churn
4. Ingredient lexicon og oevrige foundation-lag
5. Brede designaendringer uden direkte relation til loading/home-brand presence
6. Bred observability-udbygning

## Definition of done

De resterende Fase B-rester er kun lukkede naar alle disse er sande:

1. Single-mass recipes bliver ikke automatisk vist som falske type-grupper.
2. Heat-data dubleres ikke mekanisk i step-prose, naar struktureret heat allerede findes.
3. Brand/logo er styrket i loading/home uden at skabe motion-stoej eller cook-mode-distraktion.
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

- koer import eller AI-polish paa recipe med tydelige heat steps
- verificer at UI ikke baade viser struktureret heat og tung gentagelse i prose
- verificer at grill, ovn, induktion og kernetemperatur ikke blandes sammen

### Brand/loading

- verificer loading/home i normal mode og reduced-motion kontekst
- verificer at branding er tydeligere, men stadig rolig og ikke dekorativ
- verificer at loading-laget er faktisk synligt og laeseligt i praksis

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
- eller andet B-punkt, som stadig fejler i praksis

Beslutningen er foerst `go`, naar de resterende B-rester er lukket eller eksplicit deferred med teknisk begrundelse.
