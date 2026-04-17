# CookMoxs Phase C Execution Brief

## Rolle

Dette dokument er en klar, men inaktiv execution brief.

Det må først aktiveres, når Gate B -> C i `docs/cookmoxs-master-decision-doc.md` er passeret.

## In scope

1. Listener churn
2. Duplicate queue watchers
3. Analytics defer
4. Lazy loading
5. Timer rerender isolation
6. Storage churn
7. Ingredient lexicon subset
8. Analytics/observability
9. Senere search/OCR/authz

## Repo-state validation

Punkterne ovenfor er stadig relevante i current repo state:

- shared recipe-listener restartes stadig aggressivt ved folder snapshots
- `usePendingQueue()` mountes både i `App` og `ImportView`
- analytics ligger stadig i bootstrap path via `src/firebase.ts`
- app shell importerer stadig store view-dele eager
- timer tick lever stadig i topniveau og kan trigge brede rerenders
- `lastUsed`-opdateringer skriver stadig hele recipe-store tilbage
- ingredient lexicon findes ikke endnu som lille first-party subset
- analytics findes, men observability og senere foundation-lag er stadig ikke formaliseret

## Out of scope

1. Alt fra Fase A
2. Alt fra Fase B
3. Brede platformspring uden klart produktbehov her og nu
4. Store omskrivninger alene for “pæn arkitektur”

## Definition of done

Fase C er kun færdig når alle disse er sande:

1. Shared listener churn er reduceret uden sync-regression.
2. Pending queue observeres ét sted i appen.
3. Analytics trækkes ikke unødigt ind i initial bootstrap.
4. Store views er code-splittet på fornuftige grænser.
5. Timer ticks rerender ikke hele app-shell unødigt.
6. Metadata-only writes omskriver ikke hele lokal store unødigt.
7. Et lille ingredient lexicon subset findes kun hvis det løser konkrete produktbehov.
8. Analytics/observability er strammet uden at broadene scope til platformprojekt.
9. Search/OCR/authz er enten fortsat deferred eller scoped meget snævert og begrundet.

## Regression checks

### Listener churn

- trig folder updates uden reel ændring i shared folder-set
- verificer at shared listener ikke restartes unødigt
- verificer at sync stadig fungerer korrekt

### Queue watchers

- åbn ImportView
- verificer at globale listeners ikke dubleres
- verificer at pending count stadig opdateres korrekt

### Analytics defer

- mål bootstrap/import-path
- verificer at analytics ikke ligger i kritisk initial path uden behov

### Lazy loading

- verificer at Home og kritiske entry views stadig loader stabilt
- verificer at sekundære views er code-splittet
- verificer at suspense/loading state er acceptabel

### Timer isolation

- start aktive timere
- verificer at kun relevant timer-UI rerender hyppigt

### Storage churn

- åbn recipes gentagne gange
- verificer at metadata-opdateringer ikke skriver hele lokale store tilbage unødigt

### Foundation lag

- verificer at eventuelt ingredient lexicon er lille og konkret
- verificer at observability-arbejde ikke er blevet til stort sideprojekt
- verificer at search/OCR/authz ikke er broadet ind uden klar gate-beslutning

## Leveranceformat

Implementøren skal stoppe efter Fase C og rapportere:

- `verified`
- `changed`
- `files`
- `checks`
- `deferred`

## Stop/Go gate

Beslutningen er `stop`, hvis scope broadener ud over de konkrete Fase C-punkter.

Beslutningen er `go`, når Fase C er lukket eller når resterende foundation-punkter er eksplicit deferred med begrundelse.
