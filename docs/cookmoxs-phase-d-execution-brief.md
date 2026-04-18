# CookMoxs Phase D Execution Brief

## Rolle

Dette dokument er en pending brief for den rene tekniske effektivitet, der ligger tilbage efter Fase C.

Det maa ikke bruges foer Fase C er lukket eller eksplicit afgraenset.

## Formaal

Luk de tekniske effektivitetspunkter, som ikke boer blandes ind i UI-opgraderingen.

## In scope

1. Shared listener churn
2. Residual storage/state churn, som ikke naturligt blev lukket i Fase C
3. Residual observer/state/subscription-oprydning, hvis den stadig er aaben og ikke er UI-naer
4. Ingredient lexicon subset kun hvis et konkret teknisk fix kraever et minimalt udsnit

## Repo-state validation

Disse punkter kan stadig vaere relevante efter Fase C:

- shared recipes-listener restartes stadig aggressivt i `src/App.tsx`
- enkelte state- eller storage-punkter kan stadig omskrive mere end noedvendigt
- eventuelle observer/subscription-rester kan stadig ligge tilbage, selv hvis UI-flowet foeles godt

## Out of scope

1. Alt fra Fase A
2. Alt fra Fase B
3. UI-redesign, topbar, helper-lag eller loading-design
4. Lazy loading og motion-oprydning, medmindre C udtrykkeligt deferred dem hertil
5. Search, OCR eller authz
6. Bred platform- eller dataarkitektur-ombygning

## Arbejdsregel

- Loes kun de tekniske rester, som faktisk er tilbage efter Fase C.
- Broad ikke til nye foundation-spor.
- Hvis et punkt kraever stoerre omskrivning end rimeligt, saa rapporter det som `deferred`.

## Definition of done

Fase D er kun faerdig naar alle disse er sande:

1. Shared listener restartes ikke unoedigt ved uaendret shared folder-set.
2. Residual state/storage churn er reduceret paa de tilbagevaerende tekniske hotspots.
3. Eventuelle observer/subscription-rester er lukket eller eksplicit deferred med begrundelse.
4. Ingen af fixene broadener til nye platformspor.

## Regression checks

### Shared listener churn

- trig folder updates uden reel aendring i shared folder-ID-saettet
- verificer at shared listener ikke restartes unoedigt
- verificer at shared recipes stadig opdateres korrekt ved reel aendring

### Residual state/storage churn

- trig de tilbagevaerende metadata- og sync-naere flows
- verificer at writes ikke broadener til unoedige fulde omskrivninger
- verificer at local/cloud/cache stadig er konsistente

### Observer/subscription-oprydning

- verificer at eventuelle tilbagevaerende observers/listeners kun mountes det rigtige sted
- verificer at ingen tekniske cleanup-fixes aabner correctness-regressioner

## Leveranceformat

Stop efter Fase D og rapporter kun:

- `verified`
- `changed`
- `files`
- `checks`
- `deferred`

## Stop/Go gate

Beslutningen er `stop`, hvis Fase C ikke er lukket nok endnu, eller hvis arbejdet broadener til UI-redesign eller nye foundation-spor.

Beslutningen er `go`, naar C er afsluttet, og de tilbagevaerende tekniske effektivitetspunkter kan loeses som et smalt efterloeb.
