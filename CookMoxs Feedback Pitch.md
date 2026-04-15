# CookMoxs — Hyperdetaljeret Audit, QoL-Feedback, Cook Mode v2 og AI-Import Forbedringsguide

> **Status:** Vejledende, kritisk arbejdsdokument  
> **Formål:** At give en preskriptiv, trinvist eksekverbar guide til forbedring af CookMoxs  
> **Vigtig note:** Dette dokument er **ikke facit**. Det er en stærkt kvalificeret arbejdshypotese, baseret på gennemgang af appens nuværende struktur, observerede UX-problemer, sammenligning med andre opskriftsprodukter og tekniske mønstre i repoet.  
> **Rigtig brug:** Læs kritisk. Vær åben over for dokumentets pointer, men behandl dem som noget, der skal vurderes, testes og prioriteres — ikke blindt implementeres.

---

# Sådan skal dokumentet læses

Dette dokument må **ikke** læses eller implementeres vilkårligt. Hvis man hopper rundt i det, er der stor risiko for at bygge oven på en forkert model.

## Obligatorisk læserækkefølge

1. **Afsnit 1 — Executive summary**  
   Forstå hoveddiagnosen før der tages stilling til detaljer.

2. **Afsnit 2 — Benchmark og hvad der konkret skal lånes**  
   Forstå hvad der allerede virker i markedet, så CookMoxs ikke opfinder unødige mellemled.

3. **Afsnit 3 — Cook Mode v2: produktmodel**  
   Dette er kernen. Her defineres den nye arbejdsmæssige logik.

4. **Afsnit 4 — AI-import og robusthedsmodel**  
   Før der bygges mere AI ovenpå, skal importpipelinen gøres mere deterministisk og fejlrobust.

5. **Afsnit 5 — Kodeaudit og konkrete tekniske problemer**  
   Her står de vigtigste arkitektur- og kodeproblemer med anbefalede løsninger.

6. **Afsnit 6 — Eksekveringsrækkefølge i sprintform**  
   Her låses implementeringsordenen. Man bør ikke starte med senere sprints.

7. **Afsnit 7 — Acceptance criteria og testplan**  
   Før noget betragtes som “færdigt”, skal det holde mod disse kriterier.

---

# Hvordan dokumentet skal bruges af udviklere / AI-agenter

## Regler for eksekvering

- Implementér **ét større område ad gangen**
- Kombinér **ikke** Cook Mode v2, AI-import og arkitekturrens i ét hop
- Start med **produktmodellen**, ikke med CSS eller kosmetik
- Hver ændring skal vurderes mod:
  - læsbarhed
  - cook mode-flow
  - køkkenrealitet
  - mobil ergonomi
  - tillid
  - regressionsrisiko

## Forbudt arbejdsform

- Ingen brede “cleanups”, der flytter meget kode uden klart mål
- Ingen redesigns af UI uden at informationsarkitekturen først er besluttet
- Ingen ny AI-funktionalitet før import- og fallback-pipeline er afklaret
- Ingen “smarte” metadatafelter i cook mode, hvis de ikke kan forsvares operationelt

---

# 1. Executive summary

## Hoveddiagnose

CookMoxs er i sin nuværende form **tættere på at være en god opskriftsplatform end en god madlavningsassistent**.

Det er ikke en fornærmelse. Det er en præcis produktdiagnose.

### Hvad det betyder
Appen har allerede mange styrker:

- god ambition
- tydelig produktidentitet
- stærk visuel retning
- fornuftig teknisk base
- seriøs AI-integration
- reel tanke om cook mode

Men den største svaghed er, at cook mode flere steder prøver at være “smart” på en måde, som skaber friktion i stedet for at reducere den.

## Den korte sandhed

Det største problem er **ikke mangel på features**.  
Det største problem er **for meget systemlogik og for lidt køkkenlogik**.

### Symptomer
- for meget UI-konkurrence i cook mode
- for lineær step-navigation
- for stive step-bundne timere
- prep-logik, der føles teknisk i stedet for menneskelig
- ingredient-hjælp, som nogle gange er mere forstyrrende end hjælpsom
- AI-import, der stadig er for sårbar over for dårligt input, tomt input og uforudsigelig struktur

## Hovedretning herfra

### Produktmæssigt
- gør cook mode **text-first**
- gør guided cooking **mindre smart, mere korrekt**
- accepter, at madlavning er **parallel og ikke lineær**
- giv brugeren **valg mellem fokus og overblik**

### Teknisk
- gør importpipelinen mere deterministisk
- reducer reliance på AI i højrisko-led
- flyt cook mode-transformation ud af parse-laget
- ryd navigation/state-modellen op før yderligere kompleksitet lægges på

---

# 2. Benchmark — hvad der konkret skal lånes, og hvorfor

Dette afsnit er skrevet, som om læseren **intet ved** om de nævnte produkter.

Formålet er ikke at kopiere dem 1:1.  
Formålet er at forstå, **hvilke konkrete problemer de allerede har løst**, så CookMoxs kan låne det stærke og bygge noget bedre.

---

## 2.1 Paprika

## Hvad Paprika er
Paprika er en etableret opskriftshåndteringsapp, som fokuserer på:

- at gemme opskrifter fra nettet
- organisere dem i et personligt bibliotek
- skalere ingredienser
- planlægge måltider
- køre opskrifter i en praktisk cook-/reader-tilstand

## Hvor Paprika er stærk
Paprika gør ikke nødvendigvis alt visuelt overlegent.  
Men den gør flere **praktiske køkkenfunktioner** meget rigtigt.

### Centrale styrker
- opskrifter kan importeres fra web
- opskrifter kan skaleres
- timere kan bindes til instruktioner og startes hurtigt
- aktive opskrifter kan pin’es/holdes let tilgængelige
- appen er bygget omkring lav friktion under rigtig brug

## Hvad CookMoxs bør låne
### 1. Timere som funktion, ikke event
Timeren er et værktøj, der skal kunne startes let fra et step, uden at resten af UI’et kollapser omkring den.

### 2. Aktiv opskrift som stabil session
Når man er i gang med en opskrift, skal det føles som en **vedvarende tilstand**, ikke som et skift mellem tilfældige skærme.

### 3. Skalering uden dramatik
Skalering skal være rolig, hurtig og stabil — uden at gøre resten af cook mode rodet.

## Hvad CookMoxs ikke skal kopiere blindt
Paprika er stærk på nytte, men ikke nødvendigvis den mest moderne eller mest emotionelt præcise UI.  
CookMoxs skal derfor låne funktionel logik, ikke nødvendigvis den visuelle æstetik.

---

## 2.2 AnyList

## Hvad AnyList er
AnyList er i udgangspunktet en liste- og shoppingapp, men deres recipe/cooking-funktionalitet er stærk, fordi den er **meget pragmatisk**.

## Hvorfor AnyList er interessant
AnyList er god til at acceptere, at brugeren:

- handler
- planlægger
- springer rundt
- laver flere ting samtidig
- ikke altid følger et fuldstændig lineært opskriftsforløb

### Centrale styrker
- cooking view på telefon er delt i tabs
- scroll-position huskes
- på større skærme vises ingredienser og steps side om side
- man kan skifte mellem flere opskrifter under madlavning
- ingredienser kan markeres af
- nuværende step kan fremhæves

## Hvad CookMoxs bør låne
### 1. Respekt for kontekstskift
Brugeren må gerne hoppe mellem views eller sektioner uden at “miste stedet”.

### 2. Overblik som legitim brugstilstand
Ikke alle vil guides ét step ad gangen. Nogle vil se flere trin og selv styre rytmen.

### 3. Flere opskrifter / parallel madlavning som reel brugscase
Det er ikke edge case. Det er normalt.

## Hvad CookMoxs ikke skal kopiere blindt
Tabs på mobil er ikke nødvendigvis den rigtige model for CookMoxs.  
Men princippet bag dem er rigtigt: **differentier informationslag uden at overfylde samme skærm**.

---

## 2.3 Samsung Food

## Hvad Samsung Food er
Samsung Food er Samsungs fødevare-/opskriftsplatform. Den positionerer sig som en **personlig cooking assistant**, ikke bare en opskriftssamling.

### Funktionelt niveau
Samsung Food forsøger at samle:

- opskriftssamling
- AI-import af onlineopskrifter
- meal planning
- shopping
- guided cooking
- integration med udvalgte Samsung-ovne og SmartThings

## Hvorfor Samsung Food er vigtigt at forstå
Samsung Food repræsenterer den type produkt, CookMoxs i nogen grad konkurrerer med i ambition:  
en platform der vil være **mere end et opskriftarkiv**.

### Centrale styrker
- AI kan strukturere opskrifter i et standardformat
- guided cooking er en tydelig del af produktet
- step-for-step guidance kobles med settings/timere
- appen prøver at være en “fra planlægning til udførelse”-assistent
- den kan sende instruktioner videre til kompatible ovne i Samsungs eget økosystem

## Hvad CookMoxs bør låne
### 1. Guided cooking som first-class citizen
Cook mode må ikke føles som en eftertanke.

### 2. Opskrift som operationelt flow
Ikke bare “ingredienser + tekst”, men et forløb man faktisk kan udføre.

### 3. Forståelsen af AI-import som normalisering
AI’s rolle er ikke bare “skriv noget smart”. AI’s rolle er at hjælpe med at få ujævne kilder over i et konsistent format.

## Hvad CookMoxs bør gøre bedre end Samsung Food
Samsung Food har et bredt økosystemformål og bliver derfor også mere generalistisk.

CookMoxs kan vinde ved at være:

- mere fokuseret
- mere læsbar
- mere køkkenrealistisk
- mere disciplineret omkring misinformation
- bedre til low-friction cook mode på mobil

---

## 2.4 Mealime

## Hvad Mealime er
Mealime er meal planning + opskrift + cooking-mode orienteret, med stor vægt på at gøre aftenmad **nem og stressfri**.

## Hvorfor Mealime er relevant
Mealime forstår, at mange brugere ikke vil “studere” en opskrift. De vil have hjælp til at komme gennem den med så lidt rod som muligt.

### Centrale styrker
- cooking mode er læsbar
- stor typografi
- tydeligt fokus på nuværende handling
- hands-free-tænkning
- generel lav-friktionstilgang

## Hvad CookMoxs bør låne
### 1. Lav belastning
Cook mode skal reducere belastning, ikke flytte den rundt i UI’et.

### 2. Enkel step-progress
Brugeren skal ikke føle, at de betjener et dashboard.

### 3. Hands-free mentalitet
Selv hvis voice ikke kommer nu, bør UI’et bygges, som om brugeren helst vil røre skærmen mindst muligt.

---

## 2.5 Hvad benchmarkene samlet peger på

Hvis man destillerer det ned, peger de bedste produkter ikke på “mere UI”.  
De peger på:

- tydelig nuværende handling
- let adgang til timere
- mulighed for overblik
- robust session/state
- simple interaktioner
- lavere kognitiv belastning
- mindre visuel konkurrence

### Derfor
CookMoxs skal ikke opfinde “meta cards” og “intelligent next-step overlays” som standard.  
CookMoxs skal gøre tre ting bedre:

1. skrive og vise steps bedre
2. acceptere parallelitet bedre
3. tåle afbrydelser bedre

---

# 3. Cook Mode v2 — ny produktmodel

Dette er den vigtigste del af dokumentet.

---

## 3.1 Nuværende problem i én sætning

Cook mode er i dag for præget af **komponent-logik** og for lidt præget af **madlavningslogik**.

### Nuværende symptomer
- for mange visuelle lag på én skærm
- steptekst konkurrerer med metadata
- timer UI fylder for meget
- swipe-navigation skjuler opskriftens rytme
- ingredient-hjælp under teksten splitter fokus
- prep er tænkt som kategoriseret ingrediensliste, ikke som arbejdsforberedelse

---

## 3.2 Ny kerneidé

Cook mode skal deles i **to gyldige arbejdsformer**:

### 1. Fokusvisning
For brugeren der vil guides stramt, ét skridt ad gangen.

### 2. Flowvisning
For brugeren der vil scrolle og bevare overblik over flere sammenhængende trin.

Begge er legitime.  
Det er en styrke, ikke en svaghed, at brugeren kan vælge præference.

---

## 3.3 Fokusvisning — spec

## Formål
Maksimal læsbarhed og ro. Bruges når man vil have ét klart signal ad gangen.

## Må vise
- aktuel steptekst
- varmebadge
- reminder/husk-boks
- kompakt adgang til timer
- lille meta-linje nederst, kun når relevant
- forrige/næste eller markér-som-færdig navigation

## Må ikke vise som standard
- ingredientkort under step
- next-step card
- stor permanent next-step preview
- store step-bundne timerkort
- stor overlay-struktur for ting, der ikke er kritiske

## Hierarki
1. steptekst
2. varme
3. reminder
4. timer-adgang
5. meta-linje

---

## 3.4 Flowvisning — spec

## Formål
Overblik, rytmeforståelse og lettere parallelitet.

## Må vise
- 3–5 trin i en vertikal liste
- aktuelt trin tydeligt fremhævet
- øvrige trin dæmpet
- aktive timer-chips/dock
- reminder inline ved de trin hvor de er relevante
- varmevisning på relevante trin

## Må ikke blive
- en lang romanisk opskriftsartikel
- en kopi af standardopskriften uden prioritering
- en visning hvor alle trin er lige visuelt høje

## Scrolling
Flowvisning skal være scroll-baseret.  
Swipe bør være sekundær eller helt fraværende her.

---

## 3.5 Skal swipe fjernes?

## Dom
Ja, som **primær** navigation bør swipe nedtones eller fjernes.

### Hvorfor
Swipe er godt til:
- korte flows
- fokusmode
- meget simple opskrifter

Swipe er dårligt til:
- parallel handling
- overblik
- at læse 1–2 trin frem
- opskrifter med flere komponenter
- opskrifter hvor prep og tilberedning flettes

## Anbefaling
- Fokusvisning: swipe kan være valgfrit eller sekundært
- Flowvisning: scroll skal være primær

---

## 3.6 Hvad stepteksten skal gøre fremover

Stepteksten skal bære mere ansvar.

### Nuværende fejl
Appen har forsøgt at kompensere for svag steptekst med ekstra UI.

### Ny regel
**Stepteksten skal i sig selv være operationelt brugbar.**

## Formatregel
Mængder og råvarer skal indlejres direkte i stepteksten i stil med det, de bedste danske opskriftssider gør.

### Dårlig version
“Tilsæt løg og hvidløg.”

### God version
“Tilsæt **1 hakket løg** og **3 fed finthakket hvidløg** til gryden.”

### Hvorfor
Så kan ingredientkort under step fjernes helt uden tab af funktion.

---

## 3.7 Meta-linje — ny model

Meta-linjen skal være en **mikroforberedelse**, ikke et nyt kort.

## Må bruges til
- næste step kræver markant varmeskift
- noget skal gøres klar før næste step
- næste step kræver bestemt redskab
- der er risiko for friktion uden et heads-up

### Gode eksempler
- “Næste: hav bouillon klar”
- “Næste: skyl quinoa før du går videre”
- “Næste: sæt låg på”
- “Næste: brug krydderiblandingen”

## Må ikke bruges til
- trivielle overgange
- summarisk gengivelse af hele næste step
- fyldtekst
- pseudo-coaching

---

## 3.8 Reminder-/husk-bokse

Reminder-bokse skal blive.  
Men kun når de er operationelt vigtige.

## Gode reminders
- skyl quinoa grundigt
- lad ikke hvidløget tage farve
- brug låg
- rør jævnligt
- smag først til sidst

## Dårlige reminders
- selvfølgeligheder
- generisk madsnak
- noget stepteksten allerede siger klart
- AI-forklaringer der ikke hjælper handlingen

---

## 3.9 Timere — ny model

Dette skal ændres markant.

## Grundregel
Et step må **foreslå** en timer.  
Men når timeren startes, skal den blive til en **fri aktiv timer** i systemet.

Ikke en step-lås.

---

## 3.10 Timerklassifikation

Alle tidsreferencer er ikke timere.

## Ny klassifikation

### `exact`
Reel timer, som bør kunne startes direkte.
Eksempel:
- “lad simre i 20 minutter”
- “bag i 35 minutter”
- “kog i 8 minutter”

### `approximate`
Ca.-varighed, som evt. kan tilbydes diskret.
Eksempel:
- “steg i ca. 2–3 minutter”
- “lad det varme kort igennem”

### `state_based`
Tilstandsbaseret. Skal ikke være primær timer.
Eksempel:
- “svits til løgene er bløde”
- “kog til kartoflerne er møre”
- “lad det reducere lidt”

### `none`
Ingen timer.

## UI-regel
- kun `exact` får tydelig startbar timer-knap som primær handling
- `approximate` vises evt. diskret
- `state_based` bliver tekst eller reminder, ikke stor timer

---

## 3.11 Flere samtidige timere

Ja, der skal kunne køre flere timere.  
Ikke som gimmick, men fordi det er normal madlavning.

## Realistiske cases
- noget simrer
- noget er i ovnen
- noget skal hvile
- man laver topping eller side undervejs

## UI-regel
- flere aktive timere må gerne eksistere
- de må ikke fylde meget
- de skal være kompakte som standard

## Anbefalet UI
### Timer dock
En kompakt, foldbar timerdock.

### Timer chips
Små chips, fx:
- `19:42 Simrer`
- `04:30 Kød`
- `08:00 Manuel`

## Vigtigt
Undgå fuld drag-and-drop som første version.  
Det er mere widget-logik end køkkenlogik og risikerer at gøre mobilen fiddly.

---

## 3.12 Manuel timer

Cook mode skal have manuel timer.  
Det er ikke nice-to-have. Det er nødvendigt.

## Hvorfor
Opskrifter er ikke perfekte. Brugeren gør sideopgaver. Ikke alt kommer fra den importerede opskrift.

## Krav
- fast adgang til “sæt timer”
- samme timercenter som anbefalede timers
- ingen separat konkurrerende timerverden

---

## 3.13 Prep — helt ny model

Prep må ikke være en “første skærm med alle ingredienser”.

Prep er et produktlag, der skal hjælpe brugeren med at reducere fysisk og mental rod.

## Ny præmis
Prep skal organiseres som **arbejdsenheder**.

### Ikke:
- vej af
- mål op
- find frem

### Men:
- aromater
- krydderiblanding
- grøntsager
- våd base
- senere tilsætning
- servering

---

## 3.14 Prep-grupper

## Målet
At reducere “10 skåle”-problemet.

## Regler
- helst maks 4 grupper
- i tunge opskrifter maks 5
- grupper skal navngives menneskeligt
- grupper skal afspejle hvornår og hvordan de bruges

## Visningsformer
### Inline gruppe
Til små grupper med få elementer.

Eksempel:
**Aromater**  
1 løg · 3 fed hvidløg · 1 chili

### Trykbar gruppe
Til større grupper.

Eksempel:
**Krydderiblanding** ▾  
tryk → åbner lille liste eller sheet

## Hvornår bruges hvad?
- 1–4 items: inline er fint
- 5+ items: expandable er bedre

---

## 3.15 Parallelitet som first-class behavior

Cook mode skal eksplicit kunne understøtte:
- “mens dette simrer”
- “gør dette klar imens”
- “kom tilbage når timeren ringer”

Det er langt mere realistisk end en ren trin 1 → 2 → 3-model.

## Ny metatype
`parallel_task`

Eksempler:
- “Mens saucen simrer, skyl quinoa.”
- “Mens ovnen varmer op, bland dressingen.”
- “Mens bønnerne koger, hak persille.”

---

## 3.16 Recovery / resume

Dette er en undervurderet QoL-funktion.

## Hvorfor
Brugeren bliver afbrudt af:
- børn
- dør
- telefon
- manglende ingrediens
- smagning
- oprydning

Når brugeren vender tilbage, skal appen hurtigt vise:

- hvor var jeg?
- hvad gør jeg nu?
- hvilke timere kører?
- hvad er varme nu?
- er der noget kritisk næste gang?

## Recovery panel
Et lille, kompakt resume-state:

- aktuelt trin
- varme
- aktive timere
- næste kritiske ting

Ikke mere.

---

# 4. AI-import og robusthedsmodel

Dette afsnit er nyt i forhold til tidligere feedback og skal læses som et separat forbedringsspor.

Målet er:
- færre fejl
- færre timeouts
- mere deterministisk fallback
- bedre brugeroplevelse ved dårlige kilder
- mindre AI-afhængighed hvor deterministik kan gøre arbejdet

---

## 4.1 Nuværende hovedproblem

AI-import og parse-flow er stadig for tæt koblet til:

- kildens kvalitet
- tekstens struktur
- AI-svarets kvalitet
- timing/latency
- implicitte heuristikker

Det giver:

- tomme svar
- parse-fejl
- timeout-følelse
- halv-gode opskrifter
- for meget “smartness” på forkert tidspunkt

---

## 4.2 Den rigtige pipeline

CookMoxs skal bruge denne rækkefølge:

### Trin 1 — URL fetch / raw content acquisition
Hent rå data:
- JSON-LD
- Microdata
- ren tekst
- titel
- source URL
- metadata

### Trin 2 — Structured direct parse
Hvis der findes brugbar struktureret data, parse direkte uden AI.

### Trin 3 — Plain text parse
Hvis structured parse ikke virker, forsøg deterministisk plain text parsing.

### Trin 4 — AI normalization fallback
Kun hvis de to første/tre første ikke er nok:
- AI må strukturere, omskrive og udfylde hullerne
- men AI bør ikke få lov at være førstevalg

### Trin 5 — Post-parse normalization
Efter parse:
- canonical ingredients
- servings
- step cleanup
- heat extraction
- timer classification
- prep-group preparation
- confidence labels

### Trin 6 — User-facing import result
Brugeren skal ikke bare få “noget gik galt”.  
Brugeren skal få en **meningsfuld status**.

---

## 4.3 Importstrategi efter inputtype

## A. Webopskrift med JSON-LD / schema.org
### Mål
Brug structured parse først.

### Regel
Hvis følgende findes:
- `recipeIngredient`
- `recipeInstructions`
- `name`

så skal AI springes over eller kun bruges som svag efterbehandling.

## B. Webtekst uden god struktur
### Mål
Brug plain text parser først, AI bagefter kun hvis nødvendigt.

## C. Ren tekst / copy-paste
### Mål
Brug plain text parser direkte.

### Hvis teksten er dårlig
- forsøg sektiondetektion
- split ingredienser/fremgangsmåde
- hvis det fejler, giv brugeren et struktureret problem

## D. Tekstfil
### Problem
Hvis AI/import ikke kan læse en tekstfil, må appen ikke bare “dø”.

### Bør gøre
1. forsøg at læse filindhold deterministisk
2. hvis encoding er mærkelig, prøv normalisering
3. hvis tom eller meningsløs tekst:
   - giv fejltype: `text_file_unreadable`
   - vis hvorfor:
     - tom fil
     - encodingproblem
     - ingen ingrediens-/stepstruktur fundet
   - giv næste handlemulighed:
     - indsæt som tekst
     - prøv en anden fil
     - redigér manuelt

---

## 4.4 Timeout-strategi

## Problem
Meget lange AI-kald føles dårlige, selv når de “virker”.

## Anbefaling
### UI-timeout
45–60 sekunder max for brugerblokerende flows.

### Server-timeout
Kan være lidt højere, men UI må ikke bare hænge i stilhed.

### Visning
Efter fx 8–12 sekunder:
- “Vi forsøger stadig at læse opskriften…”

Efter fx 20–25 sekunder:
- “Kilden er tung eller svær at læse. Du kan vente lidt endnu eller prøve igen.”

Efter timeout:
- “Vi kunne ikke læse opskriften sikkert nok.”
- vis fallbackvalg

---

## 4.5 Retry-model

## Ikke nok
Bare “prøv igen”.

## Bør være
### Retry 1
Samme pipeline, kort forsøg.

### Retry 2
Skift strategi:
- structured only
- plain text only
- AI fallback only

### Logik
Hvis JSON-LD findes men AI fejler, bør brugeren stadig kunne få en “rå men brugbar” opskrift.

---

## 4.6 Fejlkategorier — brugerflade

Brugeren skal have meningsfulde kategorier, ikke bare generisk error.

## Foreslåede kategorier

### `import_source_unreachable`
Kilden kunne ikke hentes.

### `import_source_blocked`
Kilden tillod ikke læsning / redirect / access problem.

### `structured_recipe_missing`
Ingen brugbar struktureret opskrift fundet.

### `plain_text_unreadable`
Teksten kunne ikke sikkert opdeles i ingredienser og trin.

### `text_file_unreadable`
Tekstfilen kunne ikke læses eller gav ingen brugbar opskriftsstruktur.

### `ai_model_error`
AI endpoint/model fejl.

### `ai_timeout`
AI brugte for lang tid.

### `ai_empty_response`
AI returnerede tomt eller ubrugeligt.

### `ai_parse_error`
AI returnerede noget, der ikke kunne parses sikkert.

---

## 4.7 Brugeroplevelse ved dårlig import

Brugeren bør altid få **en vej videre**.

## Eksempel på god fallback
“Vi fandt titel og ingredienser, men ikke en pålidelig fremgangsmåde. Du kan:
1. importere den rå version
2. indsætte en bedre tekst manuelt
3. prøve AI-oprydning”

## Eksempel på dårlig fallback
“Kunne ikke læse opskriften.”

---

## 4.8 AI’s rolle i import

AI skal bruges til:
- normalisering
- sproglig omskrivning
- udfyldning af små huller
- grupperingsforslag
- step-forbedring

AI skal **ikke** bruges som førstevalg til:
- basal sektiondetektion hvis plain text parser kan klare det
- udledning af “smarte” ingredient hints til cook mode
- aggressiv step-omskrivning før deterministisk parse er forsøgt

---

## 4.9 Foreslået import-pipeline i pseudokode

```ts
async function importRecipe(input: ImportInput): Promise<ImportResult> {
  const source = await fetchSource(input);

  if (!source.ok) {
    return fail('import_source_unreachable', source.reason);
  }

  const structured = tryStructuredParse(source);
  if (structured.ok) {
    return success(normalizeRecipe(structured.recipe, { confidence: 'high' }));
  }

  const plain = tryPlainTextParse(source.text);
  if (plain.ok) {
    return success(normalizeRecipe(plain.recipe, { confidence: 'medium' }));
  }

  const ai = await tryAiNormalization(source);
  if (ai.ok) {
    return success(normalizeRecipe(ai.recipe, { confidence: 'low' }));
  }

  return fail('plain_text_unreadable', {
    title: source.title,
    hasStructuredData: source.hasStructuredData,
    contentLength: source.text?.length ?? 0,
    nextActions: [
      'Prøv manuel indsætning',
      'Importér rå version',
      'Prøv anden kilde',
    ],
  });
}
```

---

## 4.10 Hvad appen skal gøre, når en tekstfil ikke kan læses

Dette skal være eksplicit og konkret.

## Hvis tekstfil er tom
Vis:
- “Filen indeholder ingen læsbar tekst.”

## Hvis encoding er mærkelig
Vis:
- “Filen kunne ikke læses sikkert pga. tekstkodning.”

## Hvis der er tekst, men ingen struktur
Vis:
- “Vi fandt tekst, men ikke en tydelig opskriftsstruktur med ingredienser og trin.”

## Handlinger
- “Åbn rå tekst”
- “Indsæt som manuel opskrift”
- “Prøv AI-oprydning”
- “Vælg en anden fil”

---

## 4.11 Import og confidence

Importerede opskrifter bør bære en intern confidence.

### `high`
Structured parse med stærk struktur.

### `medium`
Plain text parse lykkedes.

### `low`
AI måtte rekonstruere mere aktivt.

## Brug
Low-confidence opskrifter bør ikke automatisk få aggressiv cook mode-enrichment.

---

# 5. Kodeaudit og konkrete tekniske problemer

Dette afsnit er vejledende, men preskriptivt formuleret.

Vigtigt:
- Fil- og funktionshenvisninger er baseret på den nuværende `main`-struktur ved gennemgangen.
- Verificér altid mod seneste snapshot før patching.
- Brug disse forslag som styret arbejdsmateriale, ikke som ubetinget facit.

---

## 5.1 Problem: navigation history kan desynce

## Fil
`src/hooks/useAppNavigation.ts`

## Problem
Hooken holder tre stykker state:

- `currentView`
- `viewHistory`
- `historyIndex`

Samtidig eksponeres `setCurrentView`, hvilket gør det muligt at ændre view uden at opdatere historikken.

### Risiko
- back/forward kan ende i forkert tilstand
- UI kan se “rigtigt” ud, mens historikken er forkert
- flere viewskift i kompleks App-logik bliver sværere at stole på

## Løsning
Eksponér ikke `setCurrentView` direkte.  
Brug i stedet:

- `navigateTo(view)` → push historik
- `replaceView(view)` → skift uden push

## Copy-paste patch

```ts
import { useCallback, useState } from 'react';
import type { ViewState } from '../types';

export function useAppNavigation() {
  const [currentView, setCurrentView] = useState<ViewState>('home');
  const [viewHistory, setViewHistory] = useState<ViewState[]>(['home']);
  const [historyIndex, setHistoryIndex] = useState(0);

  const navigateTo = useCallback((view: ViewState) => {
    setViewHistory(prev => {
      const next = prev.slice(0, historyIndex + 1);
      next.push(view);
      return next;
    });
    setHistoryIndex(prev => prev + 1);
    setCurrentView(view);
  }, [historyIndex]);

  const replaceView = useCallback((view: ViewState) => {
    setCurrentView(view);
    setViewHistory(prev => {
      const next = [...prev];
      next[historyIndex] = view;
      return next;
    });
  }, [historyIndex]);

  const goBack = useCallback(() => {
    setHistoryIndex(prev => {
      if (prev <= 0) {
        setCurrentView('home');
        return 0;
      }
      const nextIndex = prev - 1;
      setCurrentView(viewHistory[nextIndex]);
      return nextIndex;
    });
  }, [viewHistory]);

  const goForward = useCallback(() => {
    setHistoryIndex(prev => {
      if (prev >= viewHistory.length - 1) return prev;
      const nextIndex = prev + 1;
      setCurrentView(viewHistory[nextIndex]);
      return nextIndex;
    });
  }, [viewHistory]);

  return {
    currentView,
    navigateTo,
    replaceView,
    goBack,
    goForward,
    hasForward: historyIndex < viewHistory.length - 1,
  };
}
```

## Hvorfor denne løsning er bedre
- én tydelig navigation model
- færre skjulte state-fejl
- mere robust ved videre opdeling af `App.tsx`

---

## 5.2 Problem: CookView er stadig bygget oven på den forkerte model

## Fil
`src/components/CookView.tsx`

## Problem
CookView håndterer i én komponent:

- swipe-navigation
- prep-logik
- timerstart
- timerliste
- ingredient-overlay
- ingredient-hints
- next-step preview
- steptekst
- reminder
- HUD
- afslutningsflow

Det er for meget ansvar.

## Produktproblem
Det betyder, at du ender med at tune et UI, som allerede er bygget på en for svag informationsmodel.

## Løsning
Split CookView i mindst:

- `CookFocusView`
- `CookFlowView`
- `CookTimerDock`
- `CookPrepView`
- `CookStepMeta`

## Hvorfor
- reduceret blast radius
- lettere testbarhed
- lettere at fjerne/flyde features ud uden at knække hele cook mode

---

## 5.3 Problem: prep-kategorier er tekniske, ikke menneskelige

## Fil
`src/components/CookView.tsx`
## Funktion
`categorizePrepIngredients()`

## Problem
Funktionen opdeler efter units og enkelte prep-ord. Det skaber kategorier som:
- Vej af
- Mål op
- Klargør
- Find frem

Det lyder som et system. Ikke som et køkken.

## Løsning
Erstat med egentlig prep group service.

## Copy-paste patchforslag

```ts
import type { Ingredient, Step } from '../types';

export interface PrepGroup {
  id: string;
  label: string;
  mode: 'inline' | 'expandable';
  items: Ingredient[];
}

export function buildPrepGroups(ingredients: Ingredient[], steps: Step[]): PrepGroup[] {
  const groups: PrepGroup[] = [];

  const byTerms = (label: string, terms: string[]) => {
    const items = ingredients.filter(ing =>
      terms.some(term => ing.name.toLowerCase().includes(term))
    );
    if (items.length) {
      groups.push({
        id: label.toLowerCase().replace(/\s+/g, '-'),
        label,
        mode: items.length >= 5 ? 'expandable' : 'inline',
        items,
      });
    }
  };

  byTerms('Aromater', ['løg', 'hvidløg', 'chili', 'skalotteløg']);
  byTerms('Krydderiblanding', ['paprika', 'spidskommen', 'koriander', 'kanel', 'karry', 'gurkemeje', 'salt', 'peber']);
  byTerms('Grøntsager', ['gulerod', 'peberfrugt', 'spidskål', 'porre', 'selleri']);
  byTerms('Våd base', ['tomat', 'bouillon', 'mælk', 'fløde', 'eddike', 'soja']);
  byTerms('Servering', ['cremefraiche', 'koriander', 'chips', 'persille', 'citron']);

  const groupedIds = new Set(groups.flatMap(g => g.items.map(i => i.id)));
  const remaining = ingredients.filter(i => !groupedIds.has(i.id));

  if (remaining.length) {
    groups.push({
      id: 'senere-tilsaetning',
      label: 'Senere tilsætning',
      mode: remaining.length >= 5 ? 'expandable' : 'inline',
      items: remaining,
    });
  }

  return groups.slice(0, 5);
}
```

---

## 5.4 Problem: timere er stadig for aggressivt udledt

## Fil
`src/services/cookModeHeuristics.ts`

## Problem
Timer-udledning forsøger at fange tidsreferencer direkte fra steptekst. Det er fint som første pass, men ikke nok.

### Fejlen
“3 minutter” er ikke altid en god startbar timer.  
Nogle tidsangivelser er:
- eksakte
- ca.-tider
- tilstandsbaserede
- bare orienterende

## Løsning
Indfør timerklassifikation.

## Copy-paste patch

```ts
export type TimerKind = 'exact' | 'approximate' | 'state_based' | 'none';

export interface ClassifiedStepTimer {
  kind: TimerKind;
  duration?: number;
  description?: string;
}

export function classifyTimerFromStepText(text: string): ClassifiedStepTimer {
  const normalized = normalizeForMatch(text);

  if (
    normalized.includes('til loegene er bloede') ||
    normalized.includes('til det dufter') ||
    normalized.includes('til det er gyldent') ||
    normalized.includes('til det er moert')
  ) {
    return { kind: 'state_based' };
  }

  const exactMatch = normalized.match(/(\d+)\s*(min(?:ut(?:ter)?)?|sek(?:under)?|time(?:r)?)/);
  if (!exactMatch) {
    return { kind: 'none' };
  }

  const duration = convertDurationToMinutes(Number(exactMatch[1]), exactMatch[2]);
  const approximate = /\bca\b|\bcirka\b|\bet par minutter\b/.test(normalized);

  return {
    kind: approximate ? 'approximate' : 'exact',
    duration,
    description: detectTimerLabel(normalized),
  };
}
```

## Produktgevinst
- færre pseudo-timere
- mindre cook mode-støj
- mere tillid

---

## 5.5 Problem: relevantIngredients bør ikke være primær UI-sandhed

## Filer
- `src/services/cookModeHeuristics.ts`
- `src/services/recipeStepNormalization.ts`

## Problem
Selv med validering er ingredient-relevance stadig token-/tekstmatch tung. Det er sårbart over for:
- servering vs tilberedning
- tidligere vs aktuelle ingredienser
- semantiske grupper
- delkomponenter

## Løsning
Gør `relevantIngredients` til:
- intern støtte
- fallback
- evt. data til prep-grupper

Men **ikke** til primær cook mode-flade.

## Primær flade bør være
- steptekst med indlejrede mængder

---

## 5.6 Problem: parserlag og cook mode-lag er stadig for tæt koblet

## Fil
`src/services/recipeDirectParser.ts`

## Problem
Parseren genererer allerede:
- heat
- timer
- relevantIngredients

Det betyder, at parse-laget tager ansvar for noget, som burde ligge senere i pipeline’en.

## Bedre opdeling

### Lag 1 — Parse
Udtræk data fra kilde.

### Lag 2 — Normalize
Rens ingredienser, servings, steps, grupper.

### Lag 3 — Cook mode transform
Omskriv steptekst, tilføj meta, klassificér timer, byg prep groups, lav flow/fokus output.

## Gevinst
- mindre skjult kompleksitet
- bedre testbarhed
- mere stabil cook mode

---

## 5.7 Problem: logout bør rydde session token

## Fil
`src/App.tsx`

## Problem
Hvis der gemmes Google access token i `sessionStorage`, bør logout eksplicit rydde det.

## Patchforslag

```ts
const handleLogout = async () => {
  if (authAction) return;

  try {
    setAuthAction('logout');
    sessionStorage.removeItem('google_access_token');
    await signOut(auth);
    setAuthErrorMessage(null);
    setSavedRecipes([]);
    setFolders([]);
    setActiveRecipe(null);
    setViewingRecipe(null);
    navigateTo('home');
  } catch (error) {
    console.error('Logout failed', error);
  } finally {
    setAuthAction(null);
  }
};
```

---

## 5.8 Problem: timer-systemet er halvglobalt, halv cook-lokalt

## Filer
- `src/App.tsx`
- `src/components/CookView.tsx`

## Problem
Timerlogikken lever både globalt og i cook-HUD-strukturen. Det skaber uklar mental model og UI-duplikation.

## Løsning
Én samlet timer-arkitektur:

- timer-data i app-level state
- præsentation via `TimerDock`
- cook mode bruger samme timerdata, men tættere UI
- uden for cook mode vises mere diskret globalt

---

## 5.9 Problem: CookView bør ikke have hård cap på 3 timere

## Fil
`src/components/CookView.tsx`

## Problem
“Du kan højst have 3 timere i gang ad gangen.”

Det er UI-baseret begrænsning, ikke køkkenbaseret.

## Løsning
Skift til:
- kompakt dock
- overflow handling
- evt. foldet/minimeret visning

Ikke hård cap, medmindre der er teknisk meget stærk grund.

---

## 5.10 Problem: `App.tsx` er stadig for stor

## Fil
`src/App.tsx`

## Problem
App.tsx samler for meget:
- auth
- import
- folders
- saved recipes
- viewing recipe
- cook state
- timers
- toasts
- backup
- AI actions
- modals
- navigation
- render routing

## Løsning
Ekstrahér kontrolleret til hooks/services:

- `useRecipeImportFlow`
- `useRecipeCrud`
- `useCookSession`
- `useCloudSync`
- `useBackupActions`

Ingen stor rewrite.  
Små, kontrollerede extraction steps.

---

# 6. Preskriptiv eksekveringsrækkefølge

Dette er den anbefalede rækkefølge.  
Afvigelser er mulige, men bør begrundes.

---

## Fase 1 — Beslut og lås Cook Mode v2

### Mål
Ingen yderligere UI-lapning før modelbeslutningen er låst.

## Output
- fokusvisning spec
- flowvisning spec
- timer model spec
- meta-linje regler
- reminder regler
- prep group model
- recovery/resume model

## Må ikke ske endnu
- ingen større komponentimplementering
- ingen CSS-polish
- ingen ny AI-guidance i cook mode

---

## Fase 2 — Timerarkitektur

### Mål
Én samlet timer-model.

## Output
- timer classification
- recommended timer
- manual timer
- multiple active timers
- timer dock/chips
- ingen hard cap på 3

---

## Fase 3 — Prep intelligence

### Mål
Erstat tekniske prep-kategorier med arbejdsenheder.

## Output
- `prepGroupingService`
- inline vs expandable grupper
- maks 4–5 grupper
- sen-/startlogik

---

## Fase 4 — Flowvisning

### Mål
Giv overblikstilstand som reel alternativ cook mode.

## Output
- scroll-baseret flow view
- aktuelt trin highlight
- aktive timer-chips
- minimal visuel støj

---

## Fase 5 — Text-first cook mode transform

### Mål
Steptekster skal kunne bære mere ansvar.

## Output
- indlejrede mængder i steptekst
- færre behov for ingredient underlays
- bedre dansk handlingsprosa

---

## Fase 6 — AI-import robustness

### Mål
Mindre AI-fragilitet, bedre fallback.

## Output
- deterministisk pipeline
- klar error taxonomy
- timeout strategi
- tekstfil-fallback
- confidence model

---

## Fase 7 — Arkitektur og state-oprydning

### Mål
Reducer risiko ved videre produktudvikling.

## Output
- navigation cleanup
- App.tsx extraction
- timer system cleanup
- logout/session hygiene
- parse vs transform separation

---

# 7. Acceptance criteria og testplan

Et område er ikke “færdigt”, bare fordi det ser bedre ud.

---

## 7.1 Cook mode acceptance

### Fokusvisning
- steptekst er tydeligt primær
- varme fylder ikke unødigt
- ingredientkort under step er væk
- next-step card er væk
- reminders vises kun når de hjælper
- timerstart føles let og ikke påtrængende

### Flowvisning
- man kan læse 2–4 trin frem uden at miste overblik
- aktuelt trin er visuelt tydeligt
- scroll føles naturligt
- parallel timerbrug er mulig

### Timer
- flere timere kan køre
- man kan starte manuel timer
- man kan starte anbefalet timer
- timeren lever videre ved step-skift
- timer UI fylder lidt

### Prep
- grupper føles menneskelige
- max 4–5 grupper
- grupper reducerer fysisk rod
- krydderiblanding / aromater / servering er mulige mønstre
- ingen database-agtige labels i final UI

---

## 7.2 Import acceptance

### Structured source
- structured parse bruges før AI
- import lykkes uden AI når muligt

### Plain text
- brugbar tekst kan blive til en opskrift uden AI
- dårlig tekst giver meningsfuld fejl

### Text file
- tom fil gives tydelig fejl
- encodingfejl gives tydelig fejl
- ingen struktur gives tydelig fejl + næste handling

### AI fallback
- timeout håndteres roligt
- tomt AI-svar giver klar kategori
- parse-fejl giver klar kategori
- low-confidence opskrifter markeres internt

---

## 7.3 Kvalitativ bruger-test

Lav mindst disse tests med rigtige brugere eller realistisk intern simulering:

### Test A — Ny bruger, simpel ret
Kan vedkommende komme gennem en let ret uden spørgsmål?

### Test B — Parallelt trin
Kan vedkommende holde styr på simring + topping?

### Test C — Afbrydelse
Lad brugeren blive afbrudt midt i flow. Kan de vende tilbage uden stress?

### Test D — Dårlig import
Importér en dårlig tekstkilde. Får brugeren en meningsfuld vej videre?

### Test E — Krydderitung opskrift
Virker prep-grupper stadig logiske?

### Test F — Heidi-testen
Tag den præcise type brugeroplevelse, som floppede, og kør den igen efter ændringerne.  
Ingen teoretisk sejr tæller, hvis den reelle oplevelse stadig halter.

---

# 8. Endelig anbefaling

## Det vigtigste strategiske valg
CookMoxs må beslutte sig for, om cook mode er:

### A. en udvidet opskriftsside
eller
### B. en reel madlavningsassistent

Den rigtige retning er B.  
Men B kræver disciplin.

## Det betyder konkret
- mindre UI
- mere korrekt tekst
- færre smarte kort
- flere reelle arbejdsmodeller
- bedre parallelitet
- bedre import-robusthed
- mere tillidsdisciplin

## Den hårde formulering
CookMoxs skal stoppe med at prøve at imponere brugeren med metadata og begynde at hjælpe brugeren mere konkret med at lave maden.

Det er der, produktet kan blive markant stærkere.

---

# 9. Kort opsummering til AI-agenter / udviklere

Hvis du kun må huske 10 ting fra dette dokument, så husk disse:

1. Cook mode skal være **text-first**
2. Fjern ingredientkort under step
3. Fjern next-step card
4. Indfør Fokusvisning + Flowvisning
5. Scroll er bedre end swipe som primær overbliksmodel
6. Timere skal være frie værktøjer, ikke step-lænker
7. Prep skal grupperes som arbejdsenheder
8. AI-import skal være deterministisk først, AI bagefter
9. Error states skal være konkrete og meningsfulde
10. Tillid vinder over smartness

---

# 10. Supplerende referencesektion

Denne sektion er ikke til blind kopiering, men til forståelse.

## Paprika
- kendt for praktisk recipe management, ingredient scaling, timer integration og lav friktion

## AnyList
- stærk på scroll/tab-overblik, recipe switching, check-offs og robust hverdagsbrug

## Samsung Food
- stærk på guided cooking, AI-standardisering af onlineopskrifter, connected cooking og platformstænkning

## Mealime
- stærk på stor læsbarhed, enkel guided cooking og “stress-free dinner”-tænkning

---

# Slutnote

Dette dokument bør bruges som en **arbejdsramme**, ikke som en religion.

Den rigtige måde at bruge det på er:

- læs kritisk
- vælg retning bevidst
- implementér i små kontrollerede skridt
- test mod reel brug
- justér ud fra praksis, ikke kun teori
