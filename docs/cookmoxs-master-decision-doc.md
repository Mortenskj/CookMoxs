# CookMoxs Master Decision Doc

## Rolle

Dette dokument er det samlede beslutningsgrundlag.

Det er ikke en direkte arbejdsordre.
Hver fase skal skaeres ud i sin egen execution brief, og kun en fase maa vaere aktiv ad gangen.

Current repo state er source of truth.

## Hvorfor 4 faser nu

Den tidligere 3-fase model var rigtig nok, men den gamle Fase C blandede to ting, som ikke boer loeses i samme batch:

- UI/app-shell arbejde, hvor performance og oplevet ro skal forbedre samme flows
- ren teknisk effektivitet, som ikke giver mening at blande ind i et visuelt eller produktnaert redesign

Derfor er den rigtige model nu:

1. Fase A: Trust & correctness
2. Fase B: Product correctness & import truth
3. Fase C: UI upgrade & shell efficiency
4. Fase D: Technical efficiency & residual foundation

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

Status:

- Fase A behandles som lukket nok til, at den ikke er aktiv arbejdsordre nu.
- Genaabn kun A, hvis current repo state viser en reel regression.

## Fase B: Product correctness & import truth

Scope:

- grouping-regression
- heat/prose correctness
- range parse/render
- import-fidelity
- loading/import truth
- rate limiting og fetch-honesty
- smalle deterministic import-forbedringer

Status:

- Fase B er i praksis lukket nok til, at den ikke laengere er aktiv hovedbrief.
- Der kan stadig vaere smalle efterloeb som import-latens eller anti-degradation paa AI-justeringer, men de skal ikke forveksles med de oprindelige correctness-gates.

## Fase C: UI upgrade & shell efficiency

Scope:

- app-shell og top-level view-flow
- loading/hjaelper/AI-surface i rigtig UI
- recipe-scoped assistant-surface som primaer UI for AI-handlinger i recipe-flow, hvis det kan loeses smalt
- view-level lazy loading
- analytics defer i bootstrap
- duplicate queue watchers hvor det paavirker importoplevelsen
- timer rerender isolation i cook/app-shell
- motion-overhead, hvis det kan loeses smalt sammen med UI-oprydning
- storage churn kun hvis det naturligt hoerer med til save/edit/app-shell-flow

Status:

- Fase C er nu den rigtige naeste arbejdsretning.
- Det er her UI-opgraderingen boer kobles med de shell-naere performanceforbedringer.
- Det er ogsaa her en eventuel assistant-overflade hoerer hjemme, fordi den er et UI- og produktflow-spoergsmaal, ikke en ren backend- eller foundation-opgave.
- Fase C skal fortolkes som "byg den mindste recipe-scoped assistant-surface", ikke "start et nyt chat- eller agentspor".
- Shared listener churn er ikke et aktivt Fase C-spor og hoerer som udgangspunkt til Fase D, medmindre current repo state viser at det er direkte noedvendigt for et konkret C-flow, der allerede roeres.

## Fase D: Technical efficiency & residual foundation

Scope:

- shared listener churn
- residual storage/state churn, som ikke naturligt blev lukket i Fase C
- eventuelle resterende observer/state/subscription-oprydninger, der ikke giver mening at blande ind i UI-batchen
- ingredient lexicon subset kun hvis et konkret teknisk fix kraever et minimalt udsnit

Status:

- Fase D er pending.
- Den maa ikke broadene til nye platformspor.

## Prioriteringslogik

CookMoxs boer stadig styres efter denne raekkefolge:

1. Luk det, der kan skade tillid, privacy eller goere UI/cloud uenig.
2. Luk derefter det, der goer appen kulinarisk forkert eller importmaessigt utrovaerdig.
3. Tag saa UI-opgradering og shell-naer performance i samme batch, hvor det giver reel brugeroplevelsesvaerdi.
4. Tag derefter de rene tekniske effektivitetspunkter, som ikke behoever at ride med i UI-arbejdet.

## Stop/Go gates

### Gate A -> B

Fase B maa ikke starte foer de oprindelige trust/correctness-punkter er lukkede eller verificeret lukkede.

### Gate B -> C

Fase C maa ikke starte foer de store correctness-gates er passeret i praksis:

- import-output er shape-clean
- summary/import-truth er under kontrol
- fallback-honesty er korrekt
- de tidligere heat/grouping/range-problemer er ikke laengere aktive blockers

Current status:

- Gate B -> C behandles nu som passeret nok til at gaa videre.
- Eventuelle rester omkring import-latens eller for aggressive AI-justeringer skal haandteres som smalle efterloeb, ikke som en fuld genaabning af Fase B.

### Gate C -> D

Fase D maa ikke starte foer Fase C har lukket eller eksplicit deferred:

- app-shell/UI-retningen
- lazy loading paa fornuftige view-graenser
- shell-naer motion/performance-oprydning
- timer isolation
- queue watcher-oprydning i de flows, der blev roert

## Hvad dette dokument ikke er

- ikke en backlog
- ikke et detaljeret implementeringsark
- ikke et sted hvor Claude skal genfortaelle repoet

## Autoritative dokumenter

Til implementering gaelder denne regel:

- dette dokument fastlaaser faseorden og gates
- execution brief for den aktive fase fastlaaser scope og checks
- reference-facit maa kun bruges som loesningsreference, ikke som selvstaendig arbejdsordre

## Naeste aktive dokument

Den aktuelle arbejdsretning er:

- `docs/cookmoxs-phase-c-execution-brief.md` er naeste aktive brief
- `docs/cookmoxs-phase-d-execution-brief.md` er pending og maa foerst aktiveres efter C
