# CookMoxs — Facitliste v3  
## Current state, resterende arbejde, work order, og konkrete patch-retninger til Claude

**Formål**  
Dette dokument samler:

1. **current-state vurdering** af repoet
2. **det der fortsat mangler**
3. **prioriteret work order**
4. **konkrete patch-retninger og kodeplacering**
5. **acceptance criteria og regression checks**

Det er skrevet til **Claude som implementeringsbrief**.

---

## Vigtig læseregel

Dette dokument er **vejledende facit**, ikke ubestridelig sandhed.  
Claude skal stadig:

1. verificere current state mod repo
2. implementere den **mindst invasive løsning**
3. undgå bred refactor uden klar gevinst
4. teste mod acceptance criteria efter hvert trin

---

## Produktregel der styrer alt her

CookMoxs skal følge denne prioritet:

1. **korrekthed**
2. **tillid**
3. **læsevenlighed**
4. **stabilitet**
5. **komfort / QoL**
6. **ekstra features**

Hvis systemet er usikkert:
- skjul
- forenkle
- eller drop

**Aldrig bluffe med helper-info i cook mode.**

---

# DEL 1 — Current state (kort status)

## Det der ser ud til at være på plads
Følgende ser ud til at være implementeret i repo i en eller anden grad:

- scroll-/flow-baseret cook mode
- grouped prep logic i cook mode
- grouped ingredient overlay
- activation-line model med skip guard
- timer overflow + manuel timer
- AI activity overlay
- AI undo snapshot
- logout rydder session token
- dark-mode loading CSS er delvist forbedret
- content-too-short guard og retry-flow ved import
- nogle JS-recipe parsing helpers findes i serveren

## Det der fortsat mangler eller kun er delvist løst
Åbne hovedproblemer:

1. **globalt notice/error-system mangler**
2. **delete-flow er stadig bundet for tæt til edit mode**
3. **import-summary sanitation mangler**
4. **amount ranges som 175-200 g er stadig ikke understøttet**
5. **relevantIngredients vises stadig ved lav confidence**
6. **JS-rendered import fallback er ikke færdigkoblet**
7. **text-first step generation/import er ikke korrekt nok endnu**
8. **haptics mangler som samlet system**
9. **ratings 1–6 + fælles rating er ikke implementeret**
10. **cook mode scrolling/layout føles stadig ustabilt**
11. **dark-mode loading skal stadig verificeres i reel brug**
12. **spøgelsesfejl / screen-leaking errors er stadig sandsynlige**

---

# DEL 2 — Work order (anbefalet eksekveringsrækkefølge)

## Fase 1 — Tillid og korrekthed
1. Global notice/error system
2. Delete ud af edit-only flow
3. Relevant ingredient confidence guard
4. Summary sanitizer
5. JS-rendered import fallback

## Fase 2 — Datamodel og importkvalitet
6. Amount range support
7. Text-first step prompting med inline quantities
8. Formatter + scaling for ranges

## Fase 3 — Cook mode stabilitet
9. Timer-aware activation line
10. Baseline/min-height for stepkort
11. Reduceret layout shift i active cards

## Fase 4 — QoL og features
12. Haptics
13. Ratings 1–6 og fælles rating

## Fase 5 — Verifikation
14. Dark mode loading visual QA
15. Regressiontest af delete / import / cook mode / scaling

---

# DEL 3 — Konkrete patches

---

## 1. Global notice/error system

### Problem
Appen bruger stadig et delt `error`-flow, som kan blive vist på den forkerte skærm senere.  
Det giver “spøgelsesfejl”.

### Hvor det ses
- `src/App.tsx`
- `src/components/RecipeView.tsx`
- sandsynligvis også import-view relateret flow

### Mål
Errors skal vises som:
- global toast
- eller dismissible dialog
- knyttet til handlingen, ikke til en bestemt sidekomponent

### Løsning
Opret en global UI notice-model.

### I `src/App.tsx`
Tilføj fx:

```ts
type AppNotice = {
  id: string;
  kind: 'error' | 'success' | 'info';
  title?: string;
  message: string;
  source?: 'import' | 'ai' | 'save' | 'delete' | 'unknown';
};
```

State:
```ts
const [notice, setNotice] = useState<AppNotice | null>(null);
```

Helper:
```ts
function pushNotice(input: Omit<AppNotice, 'id'>) {
  setNotice({ id: crypto.randomUUID(), ...input });
}
```

### Ny komponent
Opret:
- `src/components/GlobalNoticeToast.tsx`

Props:
- `notice`
- `onDismiss`

### Erstat eksisterende fejlflow
I stedet for at sende `error` ned i `RecipeView` og andre views som generisk prop:

- kald `pushNotice({ kind: 'error', message: '...' })`
- ryd notice når bruger lukker den

### Fjern / reducer inline error render i `RecipeView.tsx`
De her blokke bør fjernes eller kun bruges til **strengt lokal validation**, ikke globale procesfejl:

```tsx
{error && (
  <div className="...">
    {error}
  </div>
)}
```

### Acceptance criteria
- importfejl vises straks globalt
- AI-fejl vises straks globalt
- fejl kan lukkes
- fejl dukker ikke op igen senere i recipe view uden ny handling

---

## 2. Delete-flow ud af edit mode

### Problem
Delete føles stadig forkert, fordi slet stadig primært ligger i edit mode.

### Hvor det ses
- `src/components/RecipeView.tsx`
- `src/App.tsx`

### Current state
Der findes confirm dialog i normal view, men den er stadig for tæt koblet til nuværende visning/editor-flow og opleves forskudt.  
Delete skal tydeliggøres som **førsteklasses recipe action**.

### Mål
Bruger skal kunne:
- åbne opskrift
- trykke slet direkte
- få confirm straks
- få undo/feedback straks

### Løsning
### I `src/components/RecipeView.tsx`
Tilføj tydelig delete-knap i normal recipe view topbar når `canMutateRecipe`.

Hvis knappen allerede findes men ikke opleves rigtigt, så skal den:
- være synlig uden edit mode
- bruge samme dialog som edit-mode delete
- have tydeligere slet/kassér-semantik

### I `src/App.tsx`
Sørg for at `handleDeleteRecipe()` eksplicit skelner mellem:

#### Gemt opskrift
- optimistic remove
- set undo state
- show notice/toast med det samme
- navigate cleanly away

#### Kladde
- kassér direkte
- ingen saved-delete semantik
- label: `Kassér kladde`

### Acceptance criteria
- slet kræver ikke redigering
- feedback vises umiddelbart efter sletning
- draft og saved recipe behandles forskelligt og korrekt

---

## 3. Relevant ingredients confidence guard

### Problem
Cook mode kan stadig vise forkerte ingredienser til et step.  
Eksempel: “Bring vand i kog” + “1 stort løg”.

### Hvor det ses
- `src/components/CookView.tsx`
- server-prompting i `server.ts`

### Mål
“Ingredienser nu” må **kun vises ved høj nok confidence**.

### Løsning A — prompt
I step-prompting i `server.ts` tilføj:

```txt
RELEVANT INGREDIENT RULES:
- Only include ingredients directly used in the current step.
- Do not include future ingredients.
- Do not guess.
- Setup steps like boiling water, preheating oven, resting, waiting, and similar may return an empty relevantIngredients array.
- It is better to return an empty relevantIngredients array than a wrong one.
```

Dette skal ind mindst i:
- `/api/ai/polish-steps`
- `/api/ai/generate-steps`
- gerne også import flow hvor steps genereres

### Løsning B — client-side guard
I `src/components/CookView.tsx` lav helper:

```ts
function shouldShowRelevantIngredients(step: Step): boolean {
  if (!step.relevantIngredients?.length) return false;

  const stepText = step.text.toLowerCase();

  const setupSignals = [
    'bring',
    'kog',
    'forvarm',
    'lad hvile',
    'hvile',
    'sæt til side',
  ];

  const looksLikeSetupOnly = setupSignals.some((signal) => stepText.includes(signal));

  const strongMatches = step.relevantIngredients.filter((ingredient) => {
    const name = ingredient.name.toLowerCase().trim();
    return name && stepText.includes(name);
  });

  if (strongMatches.length > 0) return true;
  if (looksLikeSetupOnly) return false;

  return false;
}
```

Render kun boksen hvis `shouldShowRelevantIngredients(step)` returnerer true.

### Acceptance criteria
- setup steps kan vise ingen ingredient box
- onion/garlic vises ikke bare fordi de kommer senere
- systemet vælger hellere tomt end forkert

---

## 4. Import summary sanitizer

### Problem
Importerede summaries kan blive lange, repetitive og fyldt med spam-tekst.

### Hvor det ses
- `src/services/recipeImportService.ts`
- `server.ts`

### Current state
`buildRecipeFromImport()` gør stadig:

```ts
summary: parsedData.summary || '',
```

### Mål
Summary skal være:
- kort
- brugbar
- ikke repetitiv
- eller tom

### Løsning A — stram prompt i `server.ts`
Tilføj under import shared rules:

```txt
SUMMARY RULES:
- summary must be 1-2 short sentences only
- maximum 180 characters
- do not repeat phrases or sentences
- do not include filler like "Velbekomme", "nyd", "god fornøjelse", "denne ret er..."
- if no useful summary is available, return an empty string
```

### Løsning B — sanitizer i `src/services/recipeImportService.ts`
Tilføj helper:

```ts
function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function splitIntoSentences(value: string): string[] {
  return value
    .split(/(?<=[.!?])\s+/)
    .map((s) => normalizeWhitespace(s))
    .filter(Boolean);
}

function isLowValueSummarySentence(sentence: string): boolean {
  const lower = sentence.toLowerCase();
  const bannedFragments = [
    'velbekomme',
    'god fornøjelse',
    'nyd dit måltid',
    'nyd denne',
    'denne ret er',
    'her er opskriften',
    'god madlyst',
  ];
  return bannedFragments.some((fragment) => lower.includes(fragment));
}

function sanitizeImportedSummary(summary: unknown): string {
  if (typeof summary !== 'string') return '';

  const clean = normalizeWhitespace(summary);
  if (!clean) return '';

  const sentences = splitIntoSentences(clean);
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const sentence of sentences) {
    const normalized = sentence.toLowerCase();
    if (seen.has(normalized)) continue;
    if (isLowValueSummarySentence(sentence)) continue;
    seen.add(normalized);
    unique.push(sentence);
  }

  const result = unique.slice(0, 2).join(' ').trim();
  if (!result) return '';
  if (result.length > 180) return result.slice(0, 177).trimEnd() + '...';

  return result;
}
```

Brug den her:

```ts
summary: sanitizeImportedSummary(parsedData.summary),
```

### Acceptance criteria
- summary spam undertrykkes
- ingen summary er bedre end dårlig summary
- imported recipe view viser ikke væg af gentagelser

---

## 5. JS-rendered import fallback

### Problem
Sider som Spis Bedre kan stadig fejle, fordi content-too-short stopper flowet før embedded recipe-data udnyttes ordentligt.

### Hvor det ses
- `server.ts`
- funktionerne:
  - `extractEmbeddedRecipeDataFromScripts`
  - `fetchRecipeSource`
  - `/api/ai/import`

### Current state
Der findes helper til embedded script parsing, men current flow ser ikke ud til at bruge den som egentlig fallback, før content-too-short returneres.

### Mål
Hvis siden er JS-rendered, skal systemet forsøge:
1. JSON-LD / microdata
2. embedded SPA data
3. deterministisk parser
4. først derefter fejl

### Løsning
### I `fetchRecipeSource(url)`
Efter JSON-LD og microdata check, før ren tekstudtræk, tilføj:

```ts
const embeddedRecipe = extractEmbeddedRecipeDataFromScripts(response.data);
if (embeddedRecipe) {
  return { json: embeddedRecipe };
}
```

### I `/api/fetch-url` og import-flow
Sørg for at embedded recipe-data når helt frem som `isStructuredData = true`, så `/api/ai/import` får struktureret data i stedet for near-empty page text.

### Alternativt
Hvis `fetchRecipeSource()` returnerer `json`, brug det først og spring content-too-short tekstguard over.

### Acceptance criteria
- Spis Bedre-lignende sider forsøges via embedded data før fejl
- structured fallback prioriteres over tom tekst
- content-too-short bruges kun når strukturerede/embedded veje er prøvet

---

## 6. Amount ranges som 175-200 g

### Problem
Ingredient-modellen kan kun lagre ét tal, så ranges kollapser til midpoint eller én værdi.

### Hvor det ses
- `src/types.ts`
- `server.ts`
- `src/services/recipeImportService.ts`
- ingrediens-rendering i `RecipeView.tsx`
- skalering

### Current state
`Ingredient` har stadig kun:
```ts
amount: number | null;
```

### Mål
Systemet skal kunne lagre:
- exact amount
- interval
- original amount text

### Modelændring i `src/types.ts`
Ændr `Ingredient` til:

```ts
export interface Ingredient {
  id: string;
  name: string;
  amount: number | null;
  amountMin?: number | null;
  amountMax?: number | null;
  amountText?: string;
  unit: string;
  group?: string;
  locked?: boolean;
}
```

### Schema-ændring i `server.ts`
Udvid `RECIPE_SCHEMA.properties.ingredients.items.properties` med:

```ts
amountMin: { type: Type.NUMBER },
amountMax: { type: Type.NUMBER },
amountText: { type: Type.STRING },
```

Og gør `required` mindre rigid:
```ts
required: ['name', 'unit']
```

ikke `amount` som tvungen exact number.

### Promptregel i `server.ts`
Tilføj i shared import rules:

```txt
AMOUNT RANGE RULES:
- If an ingredient amount is a range like "175-200 g", never collapse it to a midpoint.
- Store ranges as amountMin and amountMax.
- Use amountText to preserve the original phrasing when useful.
- Only use amount as a single number when the source clearly gives one exact amount.
```

### Mapping i `src/services/recipeImportService.ts`
Map ranges:

```ts
amount: typeof ing.amount === 'number' ? ing.amount : null,
amountMin: typeof ing.amountMin === 'number' ? ing.amountMin : null,
amountMax: typeof ing.amountMax === 'number' ? ing.amountMax : null,
amountText: typeof ing.amountText === 'string' ? ing.amountText.trim() : '',
```

### Formatter
Opret fx:
- `src/services/ingredientAmountFormatter.ts`

```ts
import { Ingredient } from '../types';

export function formatIngredientAmount(ingredient: Ingredient): string {
  if (
    typeof ingredient.amountMin === 'number' &&
    typeof ingredient.amountMax === 'number'
  ) {
    if (ingredient.amountText?.trim()) return ingredient.amountText.trim();
    return `${ingredient.amountMin}-${ingredient.amountMax}`;
  }

  if (typeof ingredient.amount === 'number') {
    return `${ingredient.amount}`;
  }

  return ingredient.amountText?.trim() || '';
}
```

### Scaling
Når scale ændres:
- scale `amount`
- scale både `amountMin` og `amountMax`
- aldrig midpoint

### Acceptance criteria
- 175-200 g overlever import
- ranges vises korrekt
- ranges skaleres som ranges

---

## 7. Text-first step generation med inline quantities

### Problem
Current prompting siger stadig i praksis, at ingredient amounts ikke skal gentages i step text, hvis de findes i structured fields.

Det går imod den mere Madens Verden-lignende, text-first retning.

### Hvor det ses
- `server.ts`
- shared import rules
- step polish / generate steps prompts

### Mål
Cook mode og recipe view skal kunne læses uden at være afhængig af særskilt ingredient overlay under hvert step.

### Løsning
### I `server.ts` import/shared rules
Fjern eller omskriv denne regel:

```txt
Do not repeat ingredient amounts or heat levels in step text if they already exist in structured fields.
```

Erstat med fx:

```txt
TEXT-FIRST STEP RULES:
- Step text must stand on its own.
- When an ingredient is used in a step, include the ingredient name and usually the relevant quantity in the step text.
- Prefer natural Danish cooking phrasing like "Tilsæt de 2 hakkede løg og 3 fed hvidløg".
- Do not rely on a separate ingredient box to make the step understandable.
- Avoid repeating heat values in prose if they already exist in structured heat fields, unless needed for clarity.
```

Tilføj også i polish/generate-steps:
```txt
- Each step should be understandable even if helper overlays are hidden.
```

### Acceptance criteria
- steptekst kan læses selvstændigt
- ingredients overlay bliver sekundært, ikke bærende
- cook mode er mindre afhængig af ekstra UI-kort

---

## 8. Haptics

### Problem
Der er ikke et samlet haptics-lag endnu.

### Hvor det ses
- `src/App.tsx`
- `src/components/CookView.tsx`

### Mål
Kun meningsfulde, diskrete haptics:
- step change
- timer start
- timer end

### Løsning
### Ny fil
`src/services/haptics.ts`

```ts
export const haptics = {
  light() {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(10);
    }
  },
  medium() {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(20);
    }
  },
  timerDone() {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([120, 60, 160]);
    }
  },
};
```

### I `src/components/CookView.tsx`
Når aktivt step faktisk ændrer sig:

```ts
const prevActiveStepRef = useRef<number | null>(null);

useEffect(() => {
  if (activeStepIndex !== prevActiveStepRef.current) {
    if (prevActiveStepRef.current !== null) {
      haptics.light();
    }
    prevActiveStepRef.current = activeStepIndex;
  }
}, [activeStepIndex]);
```

### Timer actions
- start manual timer → `haptics.light()`
- start step timer → `haptics.light()`
- finish timer → `haptics.timerDone()`

### Acceptance criteria
- ingen vibrate spam under scroll
- kun ved reelle transitions

---

## 9. Ratings 1–6 og fælles rating

### Problem
Ikke implementeret endnu.

### Hvor det skal ind
- `src/types.ts`
- `src/components/RecipeView.tsx`
- persistence/firestore layer

### Mål
Bruger kan rate 1–6.  
Delte opskrifter får fælles rating.

### Datamodel
### I `src/types.ts`
Tilføj i `Recipe`:

```ts
ratingAverage?: number;
ratingCount?: number;
```

### Firestore-model
Brug én rating pr. bruger:

`recipes/{recipeId}/ratings/{userId}`

```ts
{
  recipeId: string;
  userId: string;
  score: 1 | 2 | 3 | 4 | 5 | 6;
  updatedAt: string;
}
```

### UI i `RecipeView.tsx`
Vis:
- 6 tappable stjerner
- “Din rating: X”
- “Fælles rating: 4.7 (3)”

### Scope
Kun saved recipes.
Ikke draft-only.

### Acceptance criteria
- én bruger overskriver ikke andres rating
- shared average kan vises stabilt

---

## 10. Cook mode layout stability patch

### Problem
Scrolling opleves stadig ustabil, især:
- når timerområdet vokser
- når korte steps får bokse
- når aktive kort skifter højde for voldsomt

### Diagnose
Det er ikke kun scroll.  
Det er **layout-stabilitet**:

1. activation-line er ikke reelt nok topzone-/timer-aware
2. kortene har for svingende højder
3. active state udvider sig for aggressivt
4. timer/HUD-zonen ændrer læsezonen

### Hvor det ses
- `src/components/CookView.tsx`
- `src/index.css`

### Mål
Cook mode skal føles rolig og forudsigelig.

### Løsning A — timer-aware activation line
I `CookView.tsx`:
- beregn activation-line ud fra reel visible reading zone
- topbar + timerdock/HUD skal medregnes
- ikke kun containerens rå højde

Hvis `topZoneRef` allerede findes, så skal den bruges mere aggressivt:
- mål faktisk topzonehøjde
- activation line = `topZoneHeight + remainingHeight * X`

Ikke bare generelt `containerHeight * 0.32`

### Løsning B — minimum frame size for step cards
I `src/index.css` tilføj en baseline min-height for flow cards.

Eksempelretning:

```css
.cm-cook-flow-step {
  min-height: 9.5rem;
}

.cm-cook-flow-step--active {
  min-height: 12.5rem;
}

.cm-cook-flow-step--prep {
  min-height: 11rem;
}
```

De præcise værdier skal justeres i praksis, men pointen er:

- korte kort må ikke blive mikrokort
- aktive kort må ikke sprænge rytmen

### Løsning C — reserveret plads til hjælpefelter
Reminder/timer/helper-rækker bør ikke få kortet til at hoppe dramatisk mellem stater.

Mulige løsninger:
- dedikeret helper-slot med min-height
- eller mere kompakt helper-zone
- eller kun én stabil hjælpeblok i aktivt kort

### Løsning D — reducer clamp/collapse voldsomhed
Hvis ikke-aktive kort clampes for hårdt, bliver springet op til aktivt kort for voldsomt.

Gør collapsed cards lidt mere generøse, fx:
- vis 2-3 linjer tekst konsekvent
- ikke kun 1 kort stump

### Acceptance criteria
- korte trin føles ikke som “mikrokort”
- timerdock ændrer ikke aktivt step på en uforudsigelig måde
- scroll opleves stabil selv med timers i gang
- active cards føles større, men ikke eksplosive

---

## 11. Dark mode loading — sidste QA-pass

### Problem
CSS viser, at dark-mode loading er blevet forbedret, men det er ikke sikkert at UX er godkendt endnu.

### Hvor det ses
- `src/index.css`
- `src/components/LoadingAnimation.tsx`

### Mål
Import-loading skal se korrekt ud i dark mode i reel brug.

### Handling
Ingen stor refactor endnu.  
Først reel QA:

- importer opskrift i dark mode
- verificér kontrast
- verificér stage-boxes
- verificér shimmer/hero
- verificér tekstlæsbarhed

### Kun hvis stadig forkert
Juster de CSS custom properties under `.cm-import-loading` og `.dark .cm-import-loading`.

### Acceptance criteria
- dark mode loading screen er visuelt korrekt og læsbar
- ingen lys tekst/lys shell mismatch

---

# DEL 4 — Filer der forventes ændret

## Sikkert
- `src/App.tsx`
- `src/components/RecipeView.tsx`
- `src/components/CookView.tsx`
- `src/services/recipeImportService.ts`
- `src/types.ts`
- `server.ts`
- `src/index.css`

## Nye filer
- `src/components/GlobalNoticeToast.tsx`
- `src/services/haptics.ts`
- `src/services/ingredientAmountFormatter.ts`

## Muligt senere
- firestore data service / rating service filer

---

# DEL 5 — Regression checklist

## Delete
- delete virker fra normal recipe view
- drafts kasseres korrekt
- saved recipes slettes med straks-feedback

## Errors
- fejl vises globalt
- fejl kan dismisses
- fejl lækker ikke til andre screens senere

## Import summary
- summary spam filtreres
- tom summary er tilladt

## JS-rendered import
- structured/embedded data prøves før content-too-short fejler

## Amount ranges
- 175-200 g forbliver et interval
- ranges skaleres korrekt

## Relevant ingredients
- “bring vand i kog” viser ikke løg
- setup steps kan have tom ingredient box

## Text-first steps
- steptekst kan læses uden helper-overlay

## Haptics
- tick ved step change
- ikke vibrate spam

## Ratings
- 1–6 rating virker per bruger
- delt opskrift kan aggregere korrekt

## Cook mode stability
- scroll føles roligt
- timerdock destabiliserer ikke active step
- korte trin får stabil masse

## Dark mode loading
- import loading er visuelt korrekt i dark mode

---

# DEL 6 — Anbefalet arbejdsrytme til Claude

## Implementér i små batcher
### Batch 1
- notice system
- delete-flow
- relevant ingredient guard

### Batch 2
- summary sanitizer
- JS-rendered import fallback

### Batch 3
- amount ranges
- formatter
- scaling

### Batch 4
- text-first prompt changes
- cook mode layout stability patch

### Batch 5
- haptics
- ratings

## For hver batch
1. implementér
2. compile
3. test acceptance criteria
4. skriv kort status
5. stop før næste batch, hvis regression opdages

---

# DEL 7 — Slutdom

Det her er ikke længere en “alt er galt”-situation.

Kernebilledet nu er:

- **cook mode-grundmodellen er forbedret**
- men produktet mangler stadig de vigtigste tillidslag:
  - korrekt fejlfeedback
  - robust importkvalitet
  - range-understøttelse
  - troværdige helper-data
  - stabil scroll/layout
  - rating/haptics som sekundære forbedringer

Den vigtigste regel i implementeringen herfra er:

> **hellere udelade end vise forkert**


---

# DEL 8 — Præciseringer der skal med, så implementeringen ikke bliver skæv

## 8.1 Backward compatibility for amount ranges

### Problem
Når `Ingredient` udvides med:
- `amountMin`
- `amountMax`
- `amountText`

må eksisterende opskrifter ikke knække.

### Gælder for
- gamle lokale opskrifter i localStorage
- eksisterende cloud-opskrifter i Firestore
- eksisterende komponenter der stadig kun forventer `amount`

### Implementeringsregel
Alle formattere, views og parsere skal kunne håndtere **begge modeller**:

#### Gammel model
```ts
{
  amount: 200,
  unit: 'g'
}
```

#### Ny model
```ts
{
  amount: null,
  amountMin: 175,
  amountMax: 200,
  amountText: '175-200',
  unit: 'g'
}
```

### Konkret krav
- ingen migration må være “alt eller intet”
- views skal være defensive
- formattere skal falde tilbage til gammel model uden fejl
- save/edit-flow må ikke slette gamle values ved et uheld

### Anbefalet helper
Opret en normalizer, fx:

**Ny fil**  
`src/services/ingredientAmountNormalizer.ts`

```ts
import { Ingredient } from '../types';

export function normalizeIngredientAmountShape(ingredient: Ingredient): Ingredient {
  return {
    ...ingredient,
    amount: typeof ingredient.amount === 'number' ? ingredient.amount : null,
    amountMin: typeof ingredient.amountMin === 'number' ? ingredient.amountMin : null,
    amountMax: typeof ingredient.amountMax === 'number' ? ingredient.amountMax : null,
    amountText: typeof ingredient.amountText === 'string' ? ingredient.amountText : '',
  };
}
```

Brug den:
- når opskrifter læses ind
- før render
- før scale-logik
- før save hvis nødvendigt

### Acceptance criteria
- gamle opskrifter virker stadig uden migration-step
- ingen eksisterende recipe views crasher på manglende range-felter
- range-understøttelse kan rulles ud gradvist

---

## 8.2 Rating persistence og aggregation rule

### Problem
Rating-sektionen er korrekt i retning, men aggregationen må ikke blive upræcis eller race-condition-præget.

### Regel
Der må kun findes **én rating pr. bruger pr. opskrift**.

### Anbefalet persistence-model
Firestore:

`recipes/{recipeId}/ratings/{userId}`

```ts
{
  recipeId: string;
  userId: string;
  score: 1 | 2 | 3 | 4 | 5 | 6;
  updatedAt: string;
}
```

### Aggregation-regel
Der skal findes ét tydeligt ansvar for at opdatere:
- `ratingAverage`
- `ratingCount`

#### Foretrukken model
Brug transaction eller atomisk server-opdatering, hvis det er muligt i den nuværende stack.

#### Acceptabel midlertidig model
Ved første rollout:
- læs alle ratings for opskriften
- beregn average på ny
- skriv summaryfelter tilbage

Det er ikke den mest elegante løsning, men korrekthed er vigtigere end mikro-optimering her.

### Vigtig regel
UI må aldrig antage, at `ratingAverage` er sand uden at `ratingCount` også findes og giver mening.

### Acceptance criteria
- samme bruger opdaterer sin egen rating, ikke andres
- average matcher underliggende ratings
- count matcher antal unikke brugere
- shared recipes kan vise fælles rating uden dobbeltstemmer

---

## 8.3 Notice-system: single notice vs queue

### Problem
Hvis dette ikke defineres, kan Claude ende med et mudret notice-system.

### Regel
Start **enkelt**:

## V1-regel
CookMoxs skal bruge:
- **én aktiv global notice ad gangen**
- ny notice erstatter gammel notice
- notices bruges til fejl og vigtig feedback
- ikke til konstant succes-støj

Det er mere stabilt og lettere at styre end en fuld queue i den nuværende fase.

### Hvorfor
Produktet har brug for:
- klarhed
- lav kognitiv støj
- ingen notification-stack der konkurrerer med cook mode

### Implementeringsregel
I `src/App.tsx`:
- `notice: AppNotice | null`
- `pushNotice()` erstatter eksisterende notice
- `dismissNotice()` rydder den

### Senere
Queue kan overvejes senere, men **ikke nu**.

### Acceptance criteria
- højst én notice ad gangen
- notice kan erstattes deterministisk
- bruger drukner ikke i lag af feedback

---

## 8.4 Cook mode stability — testmatrix

### Problem
Cook mode stability er et højrisikoområde.  
Hvis det ikke testes eksplicit, er det let at tro noget virker, selv om det stadig føles ustabilt.

### Krævet testmatrix
Efter layout-stability patch skal Claude teste mindst disse scenarier:

#### A. Uden timere
- korte steps
- lange steps
- blandet opskrift
- smooth scroll

#### B. Med én aktiv timer
- aktiv timer i topzone
- scroll gennem korte og lange kort
- check active-step stability

#### C. Med flere timere
- 2-4 aktive timere
- overflow/expanded timerdock
- check om activation-line stadig føles korrekt

#### D. Med korte teksttrin + bokse
- steps med meget kort tekst
- steps med reminder
- steps med helper/ingredient content
- check om kortene får for lille eller for svingende masse

#### E. Desktop
- mouse wheel scroll
- trackpad scroll
- “hopper fra 5 til 7”-problemet

#### F. Mobil
- touch scroll
- timerdock åben/lukket
- små skærme

### Acceptance criteria
- scroll føles rolig i alle seks scenarier
- active step hopper ikke urimeligt
- timerdock ændrer ikke læsezonen på uforudsigelig måde
- korte steps bliver ikke visuelle fejlkilder

---

# DEL 9 — Nyt logo som source of truth + implementeringsspor

## 9.1 Source-of-truth asset

### Primær kilde i Mortens lokale repo
Brug denne fil som **master logo asset**:

```txt
C:\Users\morte\Documents\GitHub\codex run\Codex Alpha\Visuals\Logo\cookmoxs_master_exact_v2.svg
```

### Backup/reference i denne chat-kontekst
Hvis Claude arbejder i en miljøkopi hvor ovenstående path ikke er tilgængelig, findes samme asset også her:

```txt
/mnt/data/cookmoxs_master_exact_v2.svg
```

### Regel
- denne SVG er source of truth
- logoet må ikke redesignes
- kun afledes til nødvendige platform-assets

---

## 9.2 Overordnet logo-mål

Logoet skal:
- bruges konsekvent i appen
- fungere som header/logo i UI
- fungere som favicon / app icon / touch icon / PWA icon
- altid have nok kontrast til baggrunden
- aldrig blive “usynligt” mod den aktuelle surface

### CookMoxs-regel
**Kontrast og produktkorrekthed vinder over dekorativ purisme.**

---

## 9.3 Hvor logoet skal indføres/opdateres

### A. In-app logo / header logo
Særligt relevant:
- `src/components/HomeView.tsx`
- andre steder hvor nuværende `logo-header.png` eller ældre logo-asset bruges

### B. HTML/browser-level branding
- `index.html`
- favicon reference
- apple touch icon reference

### C. PWA/app branding
- `public/manifest.webmanifest`
- `public/icons/icon-192.png`
- `public/icons/icon-512.png`
- `public/icons/apple-touch-icon.png`
- `public/favicon.ico`

### D. Eventuelle øvrige brand-refs
Claude skal søge efter:
- `logo-header`
- `favicon`
- `apple-touch-icon`
- `icon-192`
- `icon-512`
- gamle CookMoxs-logoer i `public/icons/`

---

## 9.4 Kontrastregel for SVG i appen

### Problem
Master-SVG’en bruger `currentColor`.  
Det er godt — men kun hvis den får den rigtige farve på den rigtige baggrund.

### Regel
Brug ikke hardcoded én og samme logo-farve overalt.

Logoet skal arve en konteksttilpasset farve.

### Lys / tonale surfaces
Brug fx:
- `var(--season-light-surface-ink)`
- eller `var(--season-text-primary)`

### Mørke surfaces / cook mode
Brug fx:
- `#F3EEE5`
- eller anden lys foreground med sikker kontrast

### Konkret anbefaling
Lav en genbrugelig klasse, fx i `src/index.css`:

```css
.cm-brand-mark {
  color: var(--season-text-primary);
}

.dark .cm-brand-mark {
  color: var(--season-light-surface-ink);
}

.cm-cook-shell .cm-brand-mark,
.cm-cook-topbar .cm-brand-mark {
  color: #F3EEE5;
}
```

Hvis logo bruges på lyse glaspaneler i dark theme, brug `--season-light-surface-ink`, ikke hvid.

### Acceptance criteria
- logo forsvinder ikke på seasonal backgrounds
- logo forsvinder ikke i dark mode
- logo forsvinder ikke i cook mode

---

## 9.5 Header/logo implementation i appen

### Current state
`HomeView.tsx` bruger aktuelt:

```tsx
<img src="/icons/logo-header.png" alt="CookMoxs" width={32} height={32} className="drop-shadow-sm" />
```

### Anbefalet retning
Brug den nye master-SVG direkte i appen, hvis pipeline tillader det.

#### Option A — simplest safe path
Læg SVG’en i public, fx:
- `public/branding/cookmoxs-master.svg`

Og brug:

```tsx
<img
  src="/branding/cookmoxs-master.svg"
  alt="CookMoxs"
  width={32}
  height={32}
  className="cm-brand-mark drop-shadow-sm"
/>
```

#### Option B — React import
Hvis Vite-setup og asset-flow er stabilt, kan SVG importeres som asset.  
Men Option A er mere robust til denne fase.

### Vigtig regel
Behold ikke både gammelt og nyt header-logo sideløbende.  
Én source of truth.

---

## 9.6 App icons / favicon / touch icons

### Problem
En transparent eller forkert farvet SVG er ikke nok som app launcher icon.  
PWA-ikoner kræver **afledte PNG/ICO-assets** med sikker kontrast.

### Regel
Master-SVG er source of truth, men app icons skal eksporteres som afledte assets.

### Der skal laves/opdateres mindst:
- `public/favicon.ico`
- `public/icons/apple-touch-icon.png`
- `public/icons/icon-192.png`
- `public/icons/icon-512.png`

### Designregel for app-ikoner
Ikonet må ikke bare være sort logo på transparent flade, hvis det kan blive usynligt.  
Brug en kontrolleret ikonflade med tydelig kontrast.

### Anbefalet app-icon model
- baggrund: mørk, rolig CookMoxs-flade eller lys tonet flade
- foreground: logo i høj kontrast
- hold god safe margin
- sørg for maskable comfort zone

### Praktisk krav
Hvis `manifest.webmanifest` allerede peger på:
- `/icons/icon-192.png`
- `/icons/icon-512.png`

så skal de filer faktisk genexporteres fra den nye logo-master.

### Acceptance criteria
- favicon matcher nyt logo
- PWA icon matcher nyt logo
- apple touch icon matcher nyt logo
- launcher icon er tydeligt og ikke usynligt

---

## 9.7 HTML / manifest opdatering

### `index.html`
Verificér og opdater ved behov:
- `rel="icon"`
- `rel="apple-touch-icon"`

Hvis filnavne ændres, skal referencerne ændres med det samme.

### `public/manifest.webmanifest`
Verificér:
- `icons` peger på de nye eksporterede filer
- `theme_color` og `background_color` stadig giver mening med ikonet
- `purpose: "any maskable"` stadig er korrekt for eksporten

---

## 9.8 Logo rollout-regel

Claude skal gøre dette i rækkefølge:

1. indfør master SVG som source-of-truth asset i public/branding eller tilsvarende
2. opdater in-app header/logo references
3. eksporter nye favicon/PWA/touch assets fra masteren
4. opdater `index.html`
5. opdater `manifest.webmanifest`
6. test lys baggrund / mørk baggrund / cook mode

### Søg aktivt efter gamle referencer
Claude skal lave en repo-søgning efter gamle logo-assets og rydde gamle references ud, så der ikke ligger en blanding af brand generationer.

---

## 9.9 Logo acceptance criteria

Efter implementering skal følgende være sandt:

### In-app
- header/logo bruger nyt master-logo
- logo er synligt på lyse surfaces
- logo er synligt i dark mode
- logo er synligt i cook mode, hvis det bruges der

### Browser/PWA
- favicon er opdateret
- apple touch icon er opdateret
- manifest icons er opdateret
- installeret app viser korrekt nyt ikon

### Konsistens
- ingen gamle logo-refs hænger tilbage
- logoets form er uændret fra master SVG
- kun afledte exports er nye

---

# DEL 10 — Opdateret arbejdsrækkefølge

## Batch 1
- global notice system
- delete-flow
- relevant ingredient guard

## Batch 2
- summary sanitizer
- JS-rendered import fallback

## Batch 3
- amount ranges
- formatter
- scaling
- backward compatibility normalizer

## Batch 4
- text-first prompt changes
- cook mode layout stability patch
- cook mode stability testmatrix

## Batch 5
- haptics
- ratings
- rating aggregation rule

## Batch 6
- logo rollout
- icon exports
- HTML/manifest verification
- dark mode loading visual QA
