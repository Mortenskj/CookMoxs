# CookMoxs Phase B Execution Brief

## Rolle

Dette dokument er en klar, men inaktiv execution brief.

Det må først aktiveres, når Gate A -> B i `docs/cookmoxs-master-decision-doc.md` er passeret.

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

Punkterne ovenfor er stadig relevante i current repo state:

- ingredient grouping bruger stadig eksisterende `group`-labels direkte i UI
- heat-data findes struktureret i modellen, men prompt- og prose-flow kan stadig skabe duplikation
- `BrandMark` findes, men loading/AI-activity er stadig ikke bundet tydeligt op på en branded, rolig standard
- `formatIngredientAmount` findes, men RecipeView og CookView renderer stadig primært via `ingredient.amount`
- direct parser bevarer stadig ikke ranges som first-class felter
- URL import rammer stadig både `/api/parse-direct` og `/api/fetch-url` i fallback-flow
- kun `/api/ai` er rate-limitet
- `recipe-scrapers` er ikke endnu i import-pipelinen

## Out of scope

1. Alt fra Fase A
2. Listener churn og duplicate queue watchers
3. Analytics defer og lazy loading
4. Timer isolation og storage churn
5. Ingredient lexicon og øvrige foundation-lag
6. Brede designændringer uden direkte relation til loading/home-brand presence

## Definition of done

Fase B er kun færdig når alle disse er sande:

1. Single-mass recipes bliver ikke automatisk vist som falske type-grupper.
2. Heat-data dubleres ikke mekanisk i step-prose, når struktureret heat allerede findes.
3. Brand/logo er styrket i loading/home uden at skabe motion-støj eller cook-mode-distraktion.
4. Ranges bevares i direct import som `amountMin` / `amountMax` / `amountText`, når kilden giver det.
5. Range-only ingredienser renderes korrekt i recipe- og cook-views.
6. URL import dobbelthenter ikke samme kilde i fallback-flowet.
7. Fetch/import-ruter er rate-limitet separat fra AI-ruter.
8. Deterministic import er forbedret med et tydeligt pre-AI lag, uden regression i eksisterende flows.

## Regression checks

### Grouping

- importer eller opret single-mass recipe som fars, dej, dressing eller rørt fyld
- verificer at ingredienser enten vises som én logisk blok eller som flad liste
- verificer at labels som `Groentsager`, `Krydderier`, `Smagsgivere`, `Andre` ikke bliver default-struktur i de cases

### Heat prose

- kør import eller AI-polish på recipe med tydelige heat steps
- verificer at UI ikke både viser struktureret heat og tung gentagelse i prose
- verificer at cook mode stadig viser exact induction values korrekt

### Brand/loading

- verificer loading/home i normal mode og reduced-motion kontekst
- verificer at branding er tydeligere, men stadig rolig og ikke dekorativ

### Range parse + render

- importer ranges som `175-200 g`, `1-2 stk`, `ca. 1/2-1 dl`
- verificer at parser bevarer range-felter
- verificer at RecipeView og CookView viser mængderne korrekt
- verificer at scaling ikke kollapser range til enkeltværdi

### URL import

- brug URL der først forsøger direct parse og derefter fallback
- verificer at kilden ikke fetches to gange server-side

### Rate limiting

- spam `/api/fetch-url` og `/api/parse-direct`
- verificer at begrænsning rammer de ruter uden at påvirke normale flows urimeligt

### Deterministic import

- test kendte structured recipe-sider
- verificer at deterministic import tager over før AI-fallback
- verificer at eksisterende AI-fallback stadig virker når deterministic parse ikke kan

## Leveranceformat

Implementøren skal stoppe efter Fase B og rapportere:

- `verified`
- `changed`
- `files`
- `checks`
- `deferred`

## Stop/Go gate

Beslutningen er `stop`, hvis bare ét af de otte punkter ikke er verificeret lukket.

Beslutningen er først `go`, når hele Fase B er lukket og rapporteret.
