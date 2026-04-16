# CookMoxs Master Decision Doc

## Rolle

Dette dokument er det samlede beslutningsgrundlag.

Det er ikke en direkte arbejdsordre.
Hver fase skal skæres ud i sin egen execution brief, og kun én fase må være aktiv ad gangen.

Kilde for prioritering er current repo state, ikke ældre docs alene.

## Hvorfor 3 faser

Den tidligere 6-fase model var for bred til eksekvering. Den beskrev rigtigt, men den inviterede stadig til backlog-tænkning.

Den her 3-fase model er bedre, fordi den følger de reelle koblinger i koden:

- Fase A samler trust- og correctness-fejl, som påvirker privacy, auth, sync og cloud-truth i samme flows.
- Fase B samler produktkorrekthed og import-truth, som i praksis hænger tæt sammen i `server.ts`, import-flowet og ingredient rendering.
- Fase C samler efficiency og længere foundation-lag, som er værdifuldt, men ikke bør forstyrre correctness-arbejdet.

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

- Alle otte punkter er stadig reelle i current code.
- De er ikke løst i repoet pr. nu.

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

- Range rendering er stadig reelt i current code.
- Range parsing er stadig ufuldstændig i direct parser.
- Dobbelt URL-fetch og manglende fetch/import rate limiting er stadig reelle.
- Grouping/heat/logo er stadig produktmæssigt relevante, men må ikke overhale Fase A.

## Fase C: Efficiency & foundation

Scope:

- listener churn
- duplicate queue watchers
- analytics defer
- lazy loading
- timer rerender isolation
- storage churn
- ingredient lexicon subset
- analytics/observability
- senere search/OCR/authz

Repo-state note:

- Punkterne er stadig relevante, men de er ikke første implementeringsbatch.
- De fleste er gevinst- og strukturarbejde, ikke trust-blockers.

## Prioriteringslogik

CookMoxs bør styres efter denne rækkefølge:

1. Luk det, der kan skade tillid, privacy eller gøre UI/cloud uenig.
2. Luk derefter det, der gør appen kulinarisk forkert eller importmæssigt utroværdig.
3. Tag først derefter efficiency og større foundation-lag.

Det betyder konkret:

- grouping og heat-prose er vigtige, men de ligger under logout leak, shared revoke, SSRF og cloud-truth
- lazy loading og analytics defer er nyttige, men de må ikke blandes ind i Fase A
- ingredient lexicon er interessant, men det er senere end korrekt parsing og rendering

## Stop/Go gates

### Gate A -> B

Fase B må ikke starte før følgende er verificeret:

- logout kan ikke længere surface tidligere brugers data
- shared revoke rydder stale recipes
- asset-cache-miss returnerer ikke `index.html`
- server fetch kan ikke resolve eller redirecte til private/interne mål
- restore skaber ikke ownership-mismatch
- save-status afspejler faktisk cloud-resultat
- undo er symmetrisk mellem lokal state og cloud
- guest save skriver ikke stale state tilbage

### Gate B -> C

Fase C må ikke starte før følgende er verificeret:

- single-mass recipes bliver ikke kunstigt type-opdelt
- heat-data dubleres ikke mekanisk i prose
- loading/home-branding er forbedret uden motion-støj
- ranges bevares ende-til-ende fra parse til render
- URL-import dobbelthenter ikke samme kilde
- fetch/import-ruter er rate-limitet
- deterministic import er forbedret uden regression i eksisterende flows

## Hvad dette dokument ikke er

- ikke en stor backlog
- ikke en implementeringsplan i detaljer
- ikke et sted hvor Claude skal genfortælle repoet

## Autoritative dokumenter

Til implementering gælder denne regel:

- dette dokument fastlåser faseorden og stop/go-logik
- execution brief for den aktive fase fastlåser scope og checks
- Claude skal ikke have yderligere baggrundsdokumenter aktivt, medmindre der opstår et konkret hul

## Næste aktive dokument

Den aktuelle arbejdsordre er:

- `docs/cookmoxs-phase-a-execution-brief.md`
