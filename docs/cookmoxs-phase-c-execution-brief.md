# CookMoxs Phase C Execution Brief

## Rolle

Dette dokument er den aktive brief for UI upgrade + shell efficiency.

Det er ikke en correctness-fase.
Det er ikke en ren teknisk oprydningsfase.
Det er den smalle batch, hvor UI-opgradering og shell-naer performance skal loeses sammen.
Hvis en assistant-surface bygges, er det som recipe-scoped UI for eksisterende AI-handlinger, ikke som ny chatbot-platform.

## Formaal

Goer appen roligere, lettere og mere sammenhaengende i de top-level flows, brugeren faktisk ser:

- import
- recipe
- cook mode
- topbar / helper / loading surfaces
- AI-assistant-surface i stedet for skjult eller aggressiv "forbedr"-adfaerd

## In scope

1. View-level lazy loading
2. Analytics defer i bootstrap
3. Duplicate queue watchers hvor det paavirker importoplevelsen
4. Timer rerender isolation
5. Framer Motion / motion-overhead hvis det kan loeses smalt
6. Storage churn kun hvor det naturligt hoerer med til save/edit/app-shell flow
7. UI-upgrade i app-shell, loading, helper-lag og top-level surfaces
8. Recipe-scoped assistant-surface til `RecipeView` / recipe-edit flow, hvis den kan indfoeres smalt uden at broadene til nyt agent-system

## Repo-state validation

Disse punkter giver stadig mening i current repo state:

- store top-level views importeres stadig eager i `src/App.tsx`
- `firebase/analytics` betales stadig for tidligt i bootstrap
- `usePendingQueue()` mountes stadig mere end noedvendigt omkring import-flow
- timer tick lever stadig for hoejt i app-shell
- motion og helper/loading-lag er stadig ikke samlet under en helt rolig, konsekvent UI-retning
- metadata/save-relateret churn kan stadig vaere relevant, hvis save/edit/topbar flyttes rundt i samme batch
- de nuvaerende AI-knapper kan stadig foeles som tvungne "lav en aendring"-flows, selv naar importen allerede er god
- der mangler stadig et naturligt sted i UI, hvor AI kan sige "ingen aendring anbefales" i stedet for at opfinde en forbedring

## Out of scope

1. Alt fra Fase A
2. Alt fra den oprindelige Fase B correctness-bugjagt
3. Shared listener churn som aktivt spor
4. Ingredient lexicon som selvstaendigt spor
5. Search, OCR eller authz
6. Bred observability fase 2
7. Brede backend- eller parseromskrivninger

Shared listener churn er deferred til Fase D.
Eneste undtagelse er, hvis current repo state viser, at det er direkte noedvendigt for et konkret Fase C-flow, der allerede roeres.

## Arbejdsregel

- Loes UI og shell-naer performance sammen, kun hvor de faktisk hoerer til samme flows.
- Brug ikke Fase C som undskyldning for at broadene til platformoprydning.
- Hvis et punkt viser sig at vaere rent teknisk og ikke naturligt koblet til UI/shell-batchen, saa flyt det til `deferred` eller behold det til Fase D.
- Hvis assistant introduceres, saa skal den foerst og fremmest vaere en UI- og produktkorrekt overflade for de eksisterende AI-handlinger, ikke et nyt stort agent- eller orkestreringsprojekt.

Assistanten er kun ét workstream i Fase C.
Den erstatter ikke resten af Fase C-batchen, som stadig omfatter lazy loading, analytics defer, queue watcher cleanup, timer isolation og motion/helper/loading-oprydning.

## Assistant-beslutning

Byg den mindste recipe-scoped assistant-surface, der loeser UI-problemet.

Byg ikke:

- global fri chatbot
- nyt agent-system
- guardrails-platform
- bred backend-orkestrering
- cook-mode-redigering via assistant

Assistanten skal:

- aabnes fra `RecipeView`
- vaere section-scoped: ingredienser, fremgangsmaade, beskrivelse eller hele opskriften
- starte med faste action-startere foer fri tekst
- kunne returnere `no_change` som legitimt udfald
- vise `proposal` som tydelig delta eller before/after
- give brugeren `Behold` / `Fortryd`
- holde brugeren i recipe-flowet

V1 assistant-surface er kun for `RecipeView` / recipe-edit flow.
Ikke `CookView`.
Ikke cook-mode assistant-editing.
Ikke global app-assistant.

Fri tekst maa gerne findes, men skal vaere sekundaer i forhold til faste handlinger.

## Assistant minimumsmodel

Foretraek denne minimumsmodel, hvis current repo state tillader det:

- entrypoint i `RecipeView`
- samlet panel, sheet eller tilsvarende rolig overflade
- faste startpunkter:
  - `Tilpas ingredienser`
  - `Tilpas fremgangsmaade`
  - `Tilpas beskrivelse`
  - `Ret hele opskriften`
  - `Stil et spoergsmaal om denne opskrift`
- eksisterende AI-actions genbruges foerst
- backend udvides kun med sma response-shapes, hvis UI'et reelt kraever det

`assistant-ui` er ikke en forudvalgt beslutning.
Brug det kun hvis det reducerer kompleksitet i current repo state.
Hvis det broadener current repo state, foretraek en enklere repo-native loesning.

## Assistant output-kontrakt

Foretraek disse responstyper som primaer UI-kontrakt:

- `no_change`
- `proposal`
- `answer`
- `clarify`
- `error`

Minimum forventning:

- `no_change`: kort forklaring paa hvorfor ingen mutation anbefales
- `proposal`: sektion, kort summary, kort reason, delta/before-after, accept/undo muligt
- `answer`: ren forklaring uden mutation
- `clarify`: kun naar modellen mangler reel praecision
- `error`: tydelig, bruger-sikker fejltilstand

## Definition of done

Fase C er kun faerdig naar alle disse er sande:

1. Store top-level views er code-splittet paa fornuftige view-graenser.
2. Analytics betales ikke unoedigt i initial bootstrap.
3. Pending queue observeres kun det sted, hvor det giver mening i import/app-shell flow.
4. Aktiv timer tick rerender ikke hele app-shell hvert sekund.
5. Motion/loading/helper surfaces foeles rolige, bevidste og uden stoej.
6. Eventuel storage churn, som bliver roert i samme save/edit/app-shell arbejde, er reduceret uden regression.
7. AI-surface er flyttet til en mere naturlig assistant-overflade eller tilsvarende inline helper, hvor "ingen aendring anbefales" er en legitim no-op udgang.
8. Recipe/edit-flowet foeler ikke laengere, at AI skal tvinges til at omskrive noget for at vaere nyttig.
9. Loesningen foeles som UI/product work, ikke som en ny chatplatform.

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

### Assistant surface

- verificer at assistanten aabner fra standard recipe-mode uden at sende brugeren ind i et skjult eller tungt edit-mode flow
- verificer at section-naere handlinger som ingredienser, fremgangsmaade og beskrivelse kan igangsaettes fra den nye overflade
- verificer at faste action-startere er tydeligere end fri chat som primaer indgang
- verificer at AI eksplicit kan no-op'e, naar input allerede er godt, i stedet for at opfinde en aendring
- verificer at brugeren kan se, hvad AI foreslaar eller har aendret, og kan beholde eller fortryde uden at miste overblik
- verificer at assistanten ikke foeles som global chatbot eller generel madcoach

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
