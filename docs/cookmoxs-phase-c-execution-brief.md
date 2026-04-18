# CookMoxs Phase C Execution Brief

## Rolle

Dette dokument er den aktive brief for UI upgrade + shell efficiency.

Det er ikke en correctness-fase.
Det er ikke en ren teknisk oprydningsfase.
Det er den smalle batch, hvor UI-opgradering og shell-naer performance skal loeses sammen.

## Formaal

Goer appen roligere, lettere og mere sammenhaengende i de top-level flows, brugeren faktisk ser:

- import
- recipe
- cook mode
- topbar / helper / loading surfaces

## In scope

1. View-level lazy loading
2. Analytics defer i bootstrap
3. Duplicate queue watchers hvor det paavirker importoplevelsen
4. Timer rerender isolation
5. Framer Motion / motion-overhead hvis det kan loeses smalt
6. Storage churn kun hvor det naturligt hoerer med til save/edit/app-shell flow
7. UI-upgrade i app-shell, loading, helper-lag og top-level surfaces

## Repo-state validation

Disse punkter giver stadig mening i current repo state:

- store top-level views importeres stadig eager i `src/App.tsx`
- `firebase/analytics` betales stadig for tidligt i bootstrap
- `usePendingQueue()` mountes stadig mere end noedvendigt omkring import-flow
- timer tick lever stadig for hoejt i app-shell
- motion og helper/loading-lag er stadig ikke samlet under en helt rolig, konsekvent UI-retning
- metadata/save-relateret churn kan stadig vaere relevant, hvis save/edit/topbar flyttes rundt i samme batch

## Out of scope

1. Alt fra Fase A
2. Alt fra den oprindelige Fase B correctness-bugjagt
3. Shared listener churn
4. Ingredient lexicon som selvstaendigt spor
5. Search, OCR eller authz
6. Bred observability fase 2
7. Brede backend- eller parseromskrivninger

## Arbejdsregel

- Loes UI og shell-naer performance sammen, kun hvor de faktisk hoerer til samme flows.
- Brug ikke Fase C som undskyldning for at broadene til platformoprydning.
- Hvis et punkt viser sig at vaere rent teknisk og ikke naturligt koblet til UI/shell-batchen, saa flyt det til `deferred` eller behold det til Fase D.

## Definition of done

Fase C er kun faerdig naar alle disse er sande:

1. Store top-level views er code-splittet paa fornuftige view-graenser.
2. Analytics betales ikke unoedigt i initial bootstrap.
3. Pending queue observeres kun det sted, hvor det giver mening i import/app-shell flow.
4. Aktiv timer tick rerender ikke hele app-shell hvert sekund.
5. Motion/loading/helper surfaces foeles rolige, bevidste og uden stoej.
6. Eventuel storage churn, som bliver roert i samme save/edit/app-shell arbejde, er reduceret uden regression.

## Regression checks

### Lazy loading

- aabn Home og verificer at initial load er stabil
- verificer at recipe/import/cook views foerst traekkes ind ved behov
- verificer at loading fallback er rolig og ikke visuelt larmende

### Analytics defer

- verificer at analytics ikke ligger i kritisk initial path uden behov
- verificer at measurement stadig virker, naar analytics faktisk bruges

### Queue watchers

- aabn ImportView
- verificer at listeners ikke dubleres unoedigt
- verificer at pending state stadig opdateres korrekt

### Timer isolation

- start aktive timere
- verificer at timer-UI stadig opdateres korrekt
- verificer at resten af shell ikke tvinges til brede rerenders

### Motion / helper / loading

- verificer normal mode og reduced-motion
- verificer at helper/loading/UI-lag er laeselige, rolige og ikke kolliderer med topbar/cook flow
- verificer at AI/loading affordances foeles som en del af samme designretning

### Storage churn

- aabn og gem recipes i de flows, der er roert
- verificer at metadata-only writes ikke broadener til unoedige fulde omskrivninger
- verificer at local/cloud/cache stadig er konsistente

## Leveranceformat

Stop efter Fase C og rapporter kun:

- `verified`
- `changed`
- `files`
- `checks`
- `deferred`

## Stop/Go gate

Beslutningen er `stop`, hvis arbejdet broadener til correctness-genaabning eller ren teknisk foundation.

Beslutningen er `go`, naar UI-opgradering og shell-naer efficiency kan loeses i samme afgraensede batch uden at broadene scope.
