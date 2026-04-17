# CookMoxs — Codex brief: Premium observer/logging system

## Formål

CookMoxs har allerede et rigtigt observer/logging-system.
Det skal **ikke** erstattes.
Det skal **modnes**.

Målet er at gå fra:

- logs og diagnostics
- enkeltstående session errors
- before/after AI captures
- request tracing

til et system, der giver:

- konkrete fejlbeviser
- sammenlignelige fejl på tværs af releases
- tydelig pipeline-sandhed
- bedre reproduktion
- mindre hypotese-arbejde
- mere nyttige debugging-artefakter

## Kritisk arbejdsregel

Du må **ikke** broadene til et nyt logging-univers uden grund.

Du må **ikke**:
- erstatte observer-systemet med et helt andet system
- indføre vendor lock-in som standardløsning
- bygge et stort enterprise-observability-projekt
- broadene ind i performanceoptimering eller unrelated cleanup

Du skal:

1. bruge det eksisterende observer-system som base
2. identificere den mindste serie ændringer, der løfter systemet markant
3. implementere kun det, der giver håndgribelig debug-værdi
4. være kritisk, hvis noget her er overengineered eller bør fases anderledes

Hvis noget i briefen ikke giver mening i current code state:
- sig det tydeligt
- justér ned
- vælg den smalleste korrekte løsning

---

# 1. Nuværende styrker i systemet

Det eksisterende observer-system har allerede reelle styrker:

- request/session-id på tværs af client/server
- server request lifecycle events
- AI body/response observation
- client diagnostics
- session errors
- before/after AI captures
- NDJSON persistence i dev-observe
- observer status/recent endpoints

Det er et godt fundament.

Arbejdet nu er at gøre det:

- mere struktureret
- mere sammenligneligt
- mere reproducerbart
- mere produktbevidst

---

# 2. Målbillede: hvad “premium logging” betyder i CookMoxs

“Premium logging” betyder **ikke** bare flere logs.

Det betyder:

## A. Release-aware debugging
Enhver vigtig fejl og hændelse skal kunne knyttes til:
- build ID
- git commit / release
- environment
- feature/version state

## B. Pipeline truth
Vigtige flows skal kunne læses som en kæde:
- hvad startede
- hvad lykkedes
- hvad fejlede
- hvilken fallback blev brugt
- hvor stoppede flowet

## C. Failure envelopes
Hver vigtig fejl skal have en standardiseret shape, så to fejl kan sammenlignes.

## D. Product assertions
Systemet skal ikke kun logge tekniske fejl.
Det skal også kunne logge produktmæssigt forkert adfærd:
- range tabt
- heat dobbelt i prose
- forkert grouping i single-mass recipe
- save/undo truth mismatch

## E. Repro bundles
Det skal være lettere at sige:
- “hvad så brugeren?”
- “hvad var input?”
- “hvad kom ud?”
- “hvilken release?”
- “kan vi eksportere en håndgribelig debug-pakke?”

---

# 3. Arbejdsscope

## In scope
1. release/build metadata
2. standard failure envelope
3. pipeline-stage logging for kritiske flows
4. product assertions
5. repro/debug bundle export
6. runtime validation ved vigtige grænser
7. lille TS-hardening backlog hvis det direkte styrker datakvalitet

## Out of scope
1. fuld udskiftning til ekstern logging-platform
2. bred performance-refactor
3. broad rewrite af observer-systemet
4. nye produktfeatures uden relation til debugging
5. search/OCR/authz
6. stor analytics-redesign

---

# 4. Konkrete opgaver

## Opgave 1 — Indfør release/build metadata i observer events

### Mål
Alle vigtige observer events skal kunne knyttes til:
- `release`
- `buildId`
- `env`

### Krav
Tilføj release metadata ét centralt sted, ikke manuelt i alle callsites.

### Foreslået retning
Lav en lille shared runtime meta helper, fx:

- `src/config/runtimeBuildInfo.ts`

som kan levere:
- `release`
- `buildId`
- `environment`
- `deployedAt` hvis tilgængeligt

Denne metadata skal automatisk knyttes på:
- server observer events
- client diagnostics
- session errors
- AI transformation captures metadata
- analytics events hvor relevant

### Accept
Når en fejl eller diagnostic logges, kan man se hvilken build/release den tilhører.

---

## Opgave 2 — Standardisér failure envelope

### Mål
Gør fejl sammenlignelige og søgbare.

### Ny standard shape
For alle centrale failures bør en standard envelope bruges, fx:

```ts
type FailureEnvelope = {
  feature: string;
  stage: string;
  errorCode: string | null;
  errorCategory: string;
  userState: 'guest' | 'authenticated';
  requestId?: string | null;
  sessionId?: string | null;
  durationMs?: number | null;
  retryCount?: number | null;
  fallbackUsed?: string | null;
  release?: string | null;
  buildId?: string | null;
  inputSignature?: string | null;
  outputSignature?: string | null;
};
```

### Hvor det skal bruges først
- URL import
- file import
- smart adjust
- polish ingredients
- polish steps
- save recipe
- undo AI
- restore / backup flows

### Regel
Eksisterende logs må gerne bevares, men failures skal standardiseres.

### Accept
To failures i samme feature kan sammenlignes uden fri tekstfortolkning.

---

## Opgave 3 — Pipeline-stage logging for kritiske flows

### Mål
Gør vigtige flows læsbare som kæder.

### Start med disse flows
1. URL import
2. file import
3. smart adjust
4. polish ingredients
5. polish steps
6. save recipe

### Krav
For hvert flow skal der være stage-level events som minimum:

#### URL import eksempel
- `import_started`
- `import_fetch_started`
- `import_fetch_succeeded`
- `import_structured_data_found`
- `import_direct_parse_failed`
- `import_text_fallback_started`
- `import_ai_import_failed`
- `import_deterministic_parser_succeeded`
- `import_completed`

### Regel
Ikke alle mulige stages.
Kun de stages der faktisk skaber debug-værdi.

### Accept
Et fejlet importflow kan læses som en pipeline, ikke bare som en løs fejl.

---

## Opgave 4 — Product assertions

### Mål
Log produktmæssigt forkert output, ikke kun exceptions.

### Første assertions der giver mening
1. `duplicate_heat_signal`
   - når structured heat findes og prose stadig matcher tydelig tal/niveau-heat-duplication

2. `single_mass_invalid_grouping`
   - når single-mass recipe ender i type-lignende grupper som `Krydderier`, `Grøntsager`, `Smagsgivere`, `Andet`

3. `range_lost`
   - når range-data ser ud til at blive reduceret forkert i parse/normalize/render-kæden

4. `save_truth_mismatch`
   - hvis UI success state ikke matcher faktisk save outcome

5. `undo_truth_mismatch`
   - hvis undo signalerer success men cloud/local state ikke er synkron

### Regel
Assertions må ikke spamme.
Dedup vindue og bounded volume skal respekteres.

### Accept
Systemet kan fortælle ikke bare “der var en fejl”, men også “produktet opførte sig forkert”.

---

## Opgave 5 — Repro/debug bundle export

### Mål
Kunne eksportere en håndgribelig debug-pakke pr. session.

### Minimumsindhold
- session id
- release/build metadata
- observer recent events for session
- session errors
- relevante analytics events
- AI transformation capture metadata
- feature flags / app state metadata hvis tilgængeligt
- browser/user agent
- evt. active recipe id/title hvis sikkert

### Format
Et letvægts JSON- eller JSONL-bundle er fint.
Ingen tung backend-infrastruktur kræves i første omgang.

### Vigtigt
Bundle skal være:
- begrænset
- sanitiseret
- eksportérbar
- læsbar

### Accept
Ved en fejl kan man eksportere en debug-pakke, som gør reproduktion langt lettere.

---

## Opgave 6 — Runtime validation ved grænserne

### Mål
TypeScript alene er ikke nok. Runtime-data skal valideres.

### Foreslået retning
Brug et lille valideringslag, fx Zod, kun ved de vigtigste grænser.

### Start her
- AI responses
- observer export payloads
- backup restore payloads
- import payload normalisering
- local storage / cache restore data hvis relevant

### Regel
Ikke valider alt i hele appen.
Kun de steder hvor dårlig data koster reelt.

### Accept
Ugyldige payloads bliver afvist eller downgradet kontrolleret, og fejl logges struktureret.

---

## Opgave 7 — TS-hardening backlog (kun hvis det giver mening)

Dette er en backlog-del, ikke nødvendigvis implementering nu.

Vurder om disse flags realistisk kan indføres uden at broadene for meget:

1. `exactOptionalPropertyTypes`
2. `noUncheckedIndexedAccess`

### Formål
- mindre skjult `undefined`-slip
- mere ærlig håndtering af optionals
- bedre datakvalitet i flows med maps/index lookups og delvise objekter

### Leverance
Hvis du ikke vil aktivere dem nu, så lav en kort backlog-note med:
- forventet gevinst
- forventet blast radius
- om det bør tages nu, senere eller slet ikke

---

# 5. Konkrete filer / områder du sandsynligvis skal røre

Dette er vejledende, ikke tvang.

## Eksisterende base
- `src/server/services/observerService.ts`
- `src/services/observerClient.ts`
- `src/hooks/useSessionErrorLog.ts`
- `server.ts`

## Mulige nye helpers
- `src/config/runtimeBuildInfo.ts`
- `src/services/observer/failureEnvelope.ts`
- `src/services/observer/pipelineEvents.ts`
- `src/services/observer/productAssertions.ts`
- `src/services/observer/debugBundle.ts`

## Mulige valideringssteder
- AI response parsing
- observer export/import payloads
- restore/import normalization layers

---

# 6. Implementeringsprincipper

## Gør dette
- byg ovenpå det eksisterende observer-system
- vælg små, kontrollerede ændringer
- centralisér hvor muligt
- hold navngivning konsekvent
- hold payloads bounded og sanitiserede
- gør logging nyttigere, ikke bare mere omfattende

## Gør ikke dette
- broad rewrite af hele observer-laget
- indfør tung vendor-platform som primær løsning
- log rå sensitiv data ukritisk
- lav en stor “monitoring platform” i stedet for praktiske forbedringer
- spam logs med højfrekvente events uden dedup/bounds

---

# 7. Privacy og datadisciplin

Premium logging må ikke blive sloppy logging.

## Krav
- sanitiser tekstfelter
- bound arrays og objektstørrelser
- undgå rå tokens, credentials, fulde cookies, auth headers
- undgå hele request/response bodies som default
- log signaturer, metadata og udvalgte summaries hvor muligt

## Regel
Hellere lidt mindre data end dårligt håndteret data.

---

# 8. Prioriteret rækkefølge

## Batch 1 — højeste værdi
1. release/build metadata
2. failure envelope
3. pipeline-stage logging for URL import + smart adjust + save

## Batch 2 — næste lag
4. product assertions
5. repro/debug bundle export

## Batch 3 — foundation
6. runtime validation
7. TS-hardening vurdering / backlog

---

# 9. Leveranceformat

Når du er færdig, skal du returnere:

## verified
- hvilke dele af den nuværende observer-stack der allerede er stærke nok
- hvilke dele der reelt mangler struktur

## changed
- hvad du faktisk ændrede
- hvorfor det giver mere håndgribelig debug-værdi

## files
- berørte filer

## checks
- hvilke checks du kørte
- hvad du konkret verificerede

## deferred
- hvad du bevidst udskød
- hvorfor
- hvad der ville være næste naturlige batch

---

# 10. Definition of done

Dette er først “godt nok”, når:

1. en fejl kan knyttes til release/build
2. centrale failures har en standardiseret envelope
3. mindst URL import, smart adjust og save kan læses som pipeline-flows
4. mindst 2-3 produktassertions findes og virker
5. en debug bundle kan eksporteres for en session
6. runtime validation er indført mindst dér, hvor datarisikoen er størst
7. løsningen stadig føles som CookMoxs:
   - kontrolleret
   - lille nok
   - præcis
   - ikke broad eller overengineered

---

# 11. Hård anbefaling

Byg **ikke** et nyt observability-produkt.
Byg et skarpere CookMoxs observer-system.

Det rigtige mål er:
- mindre gætteri
- flere beviser
- hurtigere reproduktion
- mindre “jeg tror”
- mere “her er præcis hvad der skete”
