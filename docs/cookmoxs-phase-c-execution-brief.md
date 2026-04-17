# CookMoxs Phase C Execution Brief

## Rolle

Dette dokument er den aktive arbejdsordre for Fase C.

Det forudsætter, at Gate B -> C er passeret.
Current repo state er source of truth.

## Formål

Fase C er nu et smalt efficiency-batch.

Det er ikke et foundation-projekt.
Det er ikke observability fase 2.
Det er ikke et nyt search/OCR/authz-spor.

## In scope

1. Shared listener churn
2. Duplicate queue watchers
3. Analytics defer
4. View-level lazy loading
5. Timer rerender isolation
6. Storage churn ved metadata-only writes
7. Framer Motion overhead hvis det kan løses smalt

## Repo-state validation

Disse punkter er stadig reelle i current code:

- shared recipes-listener restartes stadig aggressivt i `src/App.tsx`
- `usePendingQueue()` mountes stadig i både `src/App.tsx` og `src/components/ImportView.tsx`
- `firebase/analytics` importeres stadig eager i `src/firebase.ts`
- store top-level views importeres stadig eager i `src/App.tsx`
- timer tick lever stadig i topniveau i `src/App.tsx`
- `lastUsed`-opdateringer skriver stadig hele local recipe-store tilbage
- `framer-motion` ligger stadig i initial client graph for begrænset affordance-værdi

## Out of scope

1. Alt fra Fase A
2. Alt fra Fase B
3. Ingredient lexicon medmindre et konkret Fase C-fix kræver et minimalt subset
4. Bred observability-udbygning
5. Search, OCR eller authz
6. Brede routing- eller state-omskrivninger

## Arbejdsregel

- Løs kun de konkrete Fase C-punkter.
- Genåbn ikke A/B-problemer medmindre current repo state viser en direkte regression.
- Hvis et punkt kræver større omskrivning end rimeligt, så stop og rapportér det som `deferred`.

## Definition of done

Fase C er kun færdig når alle disse er sande:

1. Shared listener restartes ikke unødigt ved uændret shared folder-set.
2. Pending queue observeres ét sted i appen.
3. Analytics betales ikke unødigt i initial bootstrap.
4. Store views er code-splittet på fornuftige view-grænser.
5. Aktiv timer tick rerender ikke hele app-shell hvert sekund.
6. Metadata-only writes omskriver ikke hele local store unødigt.
7. Eventuel motion-optimering er løst uden at broadene til stor animationsrydning.

## Regression checks

### Listener churn

- trig folder updates uden reel ændring i shared folder-ID-sættet
- verificer at shared listener ikke restartes unødigt
- verificer at shared recipes stadig opdateres korrekt ved reel ændring

### Queue watchers

- åbn ImportView
- verificer at globale listeners ikke dubleres
- verificer at pending count stadig opdateres korrekt

### Analytics defer

- verificer at analytics ikke ligger i kritisk initial path uden behov
- verificer at measurement stadig virker, når analytics faktisk bruges

### Lazy loading

- verificer at Home loader stabilt
- verificer at sekundære views først trækkes ind ved behov
- verificer at loading fallback er acceptabel og rolig

### Timer isolation

- start aktive timere
- verificer at timer-UI stadig opdateres korrekt
- verificer at resten af app-shell ikke tvinges til brede rerenders hvert sekund

### Storage churn

- åbn samme recipe flere gange
- verificer at metadata-opdateringer ikke skriver hele lokale store tilbage hver gang
- verificer at cache og local state stadig er konsistente

### Motion overhead

- verificer at eventuel Framer Motion-optimering ikke ændrer UX i cook flow
- verificer at affordancen stadig fungerer, hvis dependency defers eller reduceres

## Leveranceformat

Stop efter Fase C og rapportér kun:

- `verified`
- `changed`
- `files`
- `checks`
- `deferred`

## Stop/Go gate

Beslutningen er `stop`, hvis arbejdet broadener til platformspor eller ældre correctness-faser.

Beslutningen er `go`, når de konkrete Fase C-punkter er lukket, eller når resterende punkter er eksplicit deferred med teknisk begrundelse.
