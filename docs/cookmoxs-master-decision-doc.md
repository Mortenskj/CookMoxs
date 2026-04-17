# CookMoxs Master Decision Doc

## Rolle

Dette dokument er det samlede beslutningsgrundlag.

Det er ikke en direkte arbejdsordre.
Hver fase skal skaeres ud i sin egen execution brief, og kun en fase maa vaere aktiv ad gangen.

Kilde for prioritering er current repo state, ikke aeldre docs alene.

## Hvorfor 3 faser

Den tidligere 6-fase model var for bred til eksekvering.
Den beskrev rigtigt, men inviterede stadig til backlog-taenkning.

Den her 3-fase model er bedre, fordi den foelger de reelle koblinger i koden:

- Fase A samler trust- og correctness-fejl, som paavirker privacy, auth, sync og cloud-truth i samme flows.
- Fase B samler produktkorrekthed og import-truth, som i praksis haenger taet sammen i `server.ts`, import-flowet og ingredient rendering.
- Fase C samler efficiency og laengere foundation-lag, som er vaerdifuldt, men ikke boer forstyrre correctness-arbejdet.

## Fase A: Trust & correctness

Scope:

- logout/privacy cleanup
- shared revoke cleanup
- service worker asset fallback
- SSRF hardening
- restore ownership
- save-resultat vs. cloud-truth
- undo/cloud symmetri
- stale guest save state

Repo-state note:

- Fase A maa ikke behandles som fuldt lukket, hvis current repo state stadig viser aabne correctness-rester.
- Service worker asset fallback er stadig et konkret gate-punkt, indtil det er verificeret lukket i kode og praksis.

## Fase B: Product correctness & import truth

Scope:

- grouping-regression for single-mass recipes
- heat-duplication i prose
- brand/logo loading + home presence
- range parsing
- range rendering
- dobbelt URL-fetch
- fetch/import rate limiting
- `recipe-scrapers` som deterministic import-lag

Repo-state note:

- Flere Fase B-punkter er delvist eller helt landet i kode.
- Gate B -> C er alligevel ikke bestaaet endnu.
- Current repo state viser stadig aabne produktkorrekthedsrester omkring heat-semantik og praktisk runtime-signoff.
- Fase B skal derfor behandles som aktiv gate-oprydning, ikke som afsluttet fase.

## Fase C: Efficiency & foundation

Scope:

- listener churn
- duplicate queue watchers
- analytics defer
- lazy loading
- timer rerender isolation
- storage churn
- framer-motion overhead
- ingredient lexicon subset kun hvis et konkret Fase C-fix kraever et minimalt subset
- search/OCR/authz fortsat deferred

Repo-state note:

- De primaere aabne Fase C-punkter er stadig listener churn, queue watchers, analytics defer, lazy loading, timer isolation, storage churn og motion-overhead.
- Observer/observability er ikke laengere et hovedspor i Fase C. Den del er allerede loeftet nok til, at resterende arbejde kun boer vaere smal tuning.
- Ingredient lexicon, search, OCR og authz er ikke en del af det aktive batch.
- Fase C er stadig pending. Den maa ikke aktiveres, foer de sidste A/B-gates faktisk er verificeret lukket.

## Prioriteringslogik

CookMoxs boer styres efter denne raekkefolge:

1. Luk det, der kan skade tillid, privacy eller goere UI/cloud uenig.
2. Luk derefter det, der goer appen kulinarisk forkert eller importmaessigt utrovaerdig.
3. Tag foerst derefter efficiency og stoerre foundation-lag.

Det betyder konkret:

- grouping og heat-prose er vigtige, men de ligger under logout leak, shared revoke, SSRF og cloud-truth
- lazy loading og analytics defer er nyttige, men de maa ikke blandes ind i correctness-gates
- ingredient lexicon er interessant, men det er senere end korrekt parsing og rendering

## Stop/Go gates

### Gate A -> B

Fase B maa ikke starte foer foelgende er verificeret:

- logout kan ikke laengere surface tidligere brugers data
- shared revoke rydder stale recipes
- asset-cache-miss returnerer ikke `index.html`
- server fetch kan ikke resolve eller redirecte til private/interne maal
- restore skaber ikke ownership-mismatch
- save-status afspejler faktisk cloud-resultat
- undo er symmetrisk mellem lokal state og cloud
- guest save skriver ikke stale state tilbage

### Gate B -> C

Fase C maa ikke starte foer foelgende er verificeret:

- single-mass recipes bliver ikke kunstigt type-opdelt
- heat-data dubleres ikke mekanisk i prose
- loading/home-branding er forbedret uden motion-stoej
- ranges bevares ende-til-ende fra parse til render
- URL-import dobbelthenter ikke samme kilde
- fetch/import-ruter er rate-limitet
- deterministic import er forbedret uden regression i eksisterende flows

Current status:

- Gate B -> C er ikke passeret endnu.
- Den operative antagelse skal vaere `stop`, indtil service worker fallback og de aabne produktkorrekthedsrester er verificeret lukket.

## Hvad dette dokument ikke er

- ikke en stor backlog
- ikke en implementeringsplan i detaljer
- ikke et sted hvor Claude skal genfortaelle repoet

## Autoritative dokumenter

Til implementering gaelder denne regel:

- dette dokument fastlaaser faseorden og stop/go-logik
- execution brief for den aktive fase fastlaaser scope og checks
- Claude skal ikke have yderligere baggrundsdokumenter aktivt, medmindre der opstaar et konkret hul

## Naeste aktive dokument

Der er ikke Fase C-go endnu.

Den aktuelle arbejdsretning er:

- luk de sidste aabne A/B-gate-rester i current repo state
- brug `docs/cookmoxs-phase-b-execution-brief.md` som correctness-brief for de resterende B-rester
- aktiver foerst `docs/cookmoxs-phase-c-execution-brief.md`, naar Gate B -> C er verificeret passeret
