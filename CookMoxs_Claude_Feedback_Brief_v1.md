# CookMoxs — Claude Feedback Brief v1

> Dette dokument er **vejledende feedback**, ikke facit.  
> Læs kritisk, men vær åben.  
> Formålet er at give en AI/udvikler et mere præcist og eksekverbart billede af, **hvad der stadig er galt**, **hvor problemet sidder**, og **hvordan det bør løses**.

---

## Læserækkefølge

1. **Læs hele dokumentet først** — spring ikke direkte til kodeforslag.
2. Start med **A. Produktdiagnose**, så løsningen ikke degenererer til ren UI-patching.
3. Gå derefter til **B. Kritiske problemer**, i prioriteret rækkefølge.
4. Implementér derefter **C. Patch-plan** trin for trin.
5. Brug **D. Kodeforslag** som udgangspunkt, ikke som blind copy-paste uden review.
6. Afslut med **E. Acceptkriterier**, så regression og halv-løsninger opdages.

---

# A. Produktdiagnose

## Kerneproblem

CookMoxs er blevet bedre, men cook mode og opskriftsflow lider stadig af samme overordnede fejl:

**For meget systemlogik. For lidt køkkenlogik.**

Det ses især i:

- prep-strukturering
- timeradfærd
- step-flow
- AI-feedback under redigering
- slet/logik omkring editor state
- import-loading og temaadfærd

## Hovedprincip for videre arbejde

CookMoxs må ikke opføre sig som en generic content app, der viser opskriftstekst i komponenter.  
Den skal opføre sig som et **roligt, præcist køkkenværktøj**.

Det betyder:

- mindre UI-støj
- færre parallelle informationszoner
- mere text-first instruktion
- bedre grouping af ingredienser efter **madlavningsrolle**, ikke bare datatype
- timers som **værktøjer**, ikke som step-fængsler
- AI-status og AI-fortrydelse som førsteordensfunktioner, ikke eftertanke

---

# B. Kritiske problemer og konkrete løsningsretninger

## 1. Prep-logikken er stadig systemisk, ikke kulinarisk

### Problem

I `src/components/CookView.tsx` bruges stadig `categorizePrepIngredients()` til at gruppere prep i:

- `Vej af`
- `Mål op`
- `Klargør`
- `Find frem`

Det er stadig ikke rigtig køkkenlogik.

Denne model skaber for mange mentale skift og for mange skåle, fordi den organiserer efter:

- måleenhed
- ord i ingrediensnavn

... i stedet for efter **hvordan retten faktisk bygges**.

### Hvor det sidder

- Fil: `src/components/CookView.tsx`
- Funktion: `categorizePrepIngredients(...)`

### Hvorfor det er forkert

Ved fx chili sin carne, boller i karry, wokretter osv. tænker brugeren ikke:

- “først vej ting af”
- “så mål ting op”
- “så find frem”

Brugeren tænker nærmere:

- aromater sammen
- krydderiblanding klar
- sauce-base klar
- ting til sidst/servering særskilt

### Skal løses sådan

Erstat den nuværende prep-gruppering med en model i to lag:

#### Lag 1 — AI/import bør helst levere prep groups
Tilføj et nyt felt på ingrediensniveau eller recipe-niveau, fx:

```ts
prepGroup?: string;
```

eller mere eksplicit:

```ts
interface PrepGroup {
  label: string;
  items: string[]; // ingredient ids
  note?: string;
}
```

AI/import/enrichment bør forsøge at gruppere til fx:

- Til kødbollerne
- Til saucen
- Krydderiblanding
- Til servering
- Aromater

#### Lag 2 — heuristisk fallback
Hvis `prepGroup` mangler, brug fallback-regler som er **ret-baserede**, ikke unit-baserede.

Eksempel på fallback-ordlister:

- `Aromater`: løg, hvidløg, chili, ingefær, skalotteløg
- `Krydderiblanding`: paprika, spidskommen, koriander, karry, gurkemeje, kanel, peber, salt
- `Sovs / base`: bouillon, fløde, mælk, tomatpuré, hakkede tomater, kokosmælk
- `Til servering`: cremefraiche, koriander, persille, chips, citron, lime

### Minimumskrav

Prep må ikke længere grupperes primært ud fra `unit`.

---

## 2. Cook mode top-zone er stadig for pakket

### Problem

Cook mode er blevet bedre, men toppen er stadig for tæt pakket med:

- progress bar
- step counter
- stop
- ingredient toggle
- font toggle
- ingredient modal button
- exit
- timer-dock
- manual timer entry

### Hvor det sidder

- Fil: `src/components/CookView.tsx`
- Område: top-zone / topbar / hud strip

### Hvorfor det er et problem

Cook mode skal være den mest rolige og mest funktionelle flade i appen.  
Lige nu er toppen stadig tæt nok til, at den føles som et kontrolpanel mere end et arbejdsflow.

### Skal løses sådan

Opdel topzonen i tre prioriteringsniveauer:

#### Primært altid synligt
- step-progress
- stop/luk
- evt. én utility-menu-knap

#### Sekundært skjult i menu
- tekststørrelse
- vis/skjul ingredienshjælp
- fuld ingrediensoversigt

#### Timers i separat dock
- ikke blandet sammen med topbar-kontrolknapper

### Konkrete anbefalinger

- saml utility-funktioner i én knap/menu i stedet for tre runde ikoner i toppen
- lad timerdock leve som egen kompakt zone under topbar eller som flydende overlay
- manuel timer skal åbne et lille sheet/popover — ikke fylde fast topplads unødigt

---

## 3. Hard cap på 3 timere er forkert

### Problem

Der er stadig flere steder i `CookView.tsx`, hvor logikken siger “max 3 timere”.

### Hvor det sidder

- Fil: `src/components/CookView.tsx`
- Funktioner:
  - `startStepTimer`
  - `startManualTimer`
- UI-guard omkring timer-trigger

### Hvorfor det er forkert

Det er en UI-begrænsning forklædt som produktregel.

I reel madlavning kan brugeren godt have:

- en simretid
- en ovntid
- en hviletid
- en sideopgave

Problemet er ikke antal timere. Problemet er **plads og overblik**.

### Skal løses sådan

Fjern hard cap og erstat med en kompakt timer-arkitektur:

#### Forslag
- vis max 2–3 aktive timere i docken direkte
- resten bag “+2 flere”
- mulighed for at åbne fuld timerliste i sheet/modal
- mulighed for pause/slet/reorder

### Minimumskrav

Fjern denne type logik:

```ts
if (timers.length >= 3) {
  ...
}
```

og erstat med visuel overflow-logik.

---

## 4. Ingrediens-overlay er for groft og skal grupperes korrekt

### Problem

Den fulde ingrediensoversigt i cook mode er stadig bare en lang liste.

### Hvor det sidder

- Fil: `src/components/CookView.tsx`
- Overlay: `showIngredients`

### Hvorfor det er forkert

En lang, flad ingrediensliste er dårlig i retter med komponenter.

Eksempel: boller i karry bør ikke vises som én lineær masse.  
Den bør opdeles i:

- Til kødbollerne
- Kogevand
- Til karrysovsen
- Til servering

### Skal løses sådan

- brug ingredient groups / prep groups også i overlay
- vis dem i en pæn grouped modal/sheet
- fold hver gruppe som card/section

### UI-anbefaling

Ikke fullscreen “nødskærm”-feeling.  
Mere som rolig grouped overlay:

- titel
- evt. søjle med antal grupper
- hvert group card med label + items

---

## 5. Scroll-aktiv-step logikken kan blive ustabil

### Problem

Cook mode bruger nu scroll-baseret active step-detektion via center-distance.

### Hvor det sidder

- Fil: `src/components/CookView.tsx`
- Funktion: `updateActiveFromScroll()`

### Hvorfor det er risikabelt

Når stepkort har forskellig højde, eller når bruger scroller langsomt, kan “nearest center” give:

- step-jitter
- overraskende aktiv step-skift
- oplevelse af at systemet “skifter mening”

### Skal løses sådan

Brug en mere stabil threshold-model.

#### Bedre model
Aktivt step = første step hvis top er over en fast threshold, fx 20–30% fra toppen af scroll-container.

Pseudo:

```ts
const activationLine = containerRect.top + containerRect.height * 0.28;

// vælg det nederste/nyeste step, hvis top er over aktiveringslinjen
```

Alternativt brug `IntersectionObserver` med vægtet synlighed.

### Minimumskrav

Erstat ren center-distance som eneste beslutningsgrundlag.

---

## 6. Step-tekst er stadig ikke text-first nok

### Problem

Cook mode er mindre fragmenteret end før, men stepteksten bærer stadig ikke nok af ansvaret.  
Derfor må brugeren stadig hente støtte fra side-information for tit.

### Hvor det sidder

- Dataflow mellem import/AI/normalisering og `CookView`
- `step.text`
- `relevantIngredients`
- `showInlineIngredients`

### Hvorfor det er et problem

Den bedste cook mode er den, hvor brugeren kan læse trinnet og udføre det uden at splitte opmærksomheden mere end nødvendigt.

### Skal løses sådan

Ved AI-polish/import skal trintekst omskrives til mere eksplicit, når det er relevant.

Eksempel:

I stedet for:

> Tilsæt løg og hvidløg.

brug:

> Tilsæt de 2 hakkede løg og 3 fed hvidløg, og svits dem ved middel varme.

### Bemærkning

Det betyder **ikke**, at ingredient-support skal fjernes helt.  
Det betyder, at ingredient-support bliver backup i stedet for primær bæreflade.

---

## 7. AI-handlinger mangler global, vedvarende loading feedback

### Problem

Når brugeren trykker rediger og sender en AI-handling afsted, mangler der efterfølgende en tydelig global feedback om, at AI arbejder.

Der er lokale spinners på enkelte knapper og i modaler, men når modal lukkes eller edit state skifter, forsvinder følelsen af aktivitet.

### Hvor det sidder

- Fil: `src/components/RecipeView.tsx`
- Flere knapper bruger `Loader2`
- Modaler lukker ofte umiddelbart efter AI-trigger
- App mangler global AI-working overlay

### Konsekvens

Brugeren oplever:

- “skete der noget?”
- usikkerhed om request blev sendt
- lavere tillid til AI-handlinger

### Skal løses sådan

Implementér en global, lille AI-arbejderindikator i `App.tsx`.

#### Krav
- synlig på tværs af views når `activeAiAction !== null` eller `loading === true`
- diskret, men tydelig
- ikke fullscreen blocker som standard
- fx flydende toast/overlay i top eller center
- skal have både animation og tekst

#### Forslag til komponent

```ts
interface GlobalAiActivityProps {
  visible: boolean;
  label: string;
}
```

Eksempel på labels:

- “AI justerer opskriften...”
- “AI forbedrer trinene...”
- “AI analyserer import...”

#### App.tsx integration

Brug samlet derived state:

```ts
const showGlobalAiActivity = loading || adjusting;
```

og map `activeAiAction` til brugerlabel.

### Minimumskrav

AI-arbejde må aldrig være usynligt, når brugeren har sendt en handling afsted.

---

## 8. AI-ændringer kan ikke fortrydes ordentligt

### Problem

Efter AI-ændringer kan brugeren ikke bare trykke “fortryd” på en reel, global måde.  
Nuværende fortrydelse er delvis, inkonsekvent eller bundet til enkelte flows.

### Hvor det sidder

- Fil: `src/components/RecipeView.tsx`
  - `history` / `historyIndex` gælder kun lokal redigering
  - `onUndoAI` findes primært omkring `originalRecipeId` / variant-flow
- Fil: `src/App.tsx`
  - AI-handlers overskriver `viewingRecipe`, men gemmer ikke et stabilt pre-AI snapshot til undo

### Hvorfor det er et problem

AI-ændringer er per definition højrisko ift. brugeroplevelse.  
Hvis de ikke kan fortrydes med ét tryk, falder tilliden markant.

### Skal løses sådan

Indfør et dedikeret AI-undo-lag.

#### Anbefalet model
I `App.tsx`:

```ts
const [lastAiSnapshot, setLastAiSnapshot] = useState<{
  previous: Recipe;
  nextId: string;
  action: AiActionKey;
} | null>(null);
```

Før hver AI-handling:

```ts
setLastAiSnapshot({
  previous: recipe,
  nextId: recipe.id,
  action: 'smart_adjust',
});
```

Efter AI-resultat:
- vis undo-toast eller inline action
- “Fortryd AI-ændring”

Ved undo:

```ts
setViewingRecipe(lastAiSnapshot.previous);
if (activeRecipe?.id === lastAiSnapshot.previous.id) {
  saveActiveRecipe(lastAiSnapshot.previous);
}
setLastAiSnapshot(null);
```

#### Vigtigt
Dette skal være separat fra editor-history.  
AI-undo er en egen produktfunktion.

---

## 9. Sletning i editor er inkonsistent / tavs i nogle tilfælde

### Problem

Brugeren oplever, at tryk på slet i editor ikke gør noget synligt, og først ved lukning/redigeringsafslutning viser noget sig.

### Mest sandsynlige konkrete fejl

#### Fejl A — usynlig sletning af usaved draft
I `App.tsx` i `handleDeleteRecipe(recipeId)`:

```ts
const idx = savedRecipes.findIndex(r => r.id === recipeId);
if (idx < 0) return;
```

Det betyder:
- hvis opskriften ikke er gemt endnu
- eller ikke findes i `savedRecipes`

... så sker der **ingenting**. Tavst.

Det matcher brugerens oplevelse meget præcist.

#### Fejl B — editor og delete flow er blandet sammen
I `RecipeView.tsx` findes delete-knappen i edit branch.  
Men delete-oplevelsen er ikke tydeligt adskilt mellem:

- slet gemt opskrift
- kassér usaved draft

### Skal løses sådan

#### Løsning 1 — split delete semantics
Hvis `recipe.isSaved !== true`, så må knappen ikke hedde “Slet opskrift”.  
Den skal være:

- “Kassér kladde”
- eller “Luk uden at gemme”

#### Løsning 2 — håndter begge flows i App.tsx
Pseudo:

```ts
const handleDeleteRecipe = (recipeId: string) => {
  const recipe = viewingRecipe?.id === recipeId
    ? viewingRecipe
    : savedRecipes.find(r => r.id === recipeId);

  if (!recipe) return;

  if (!recipe.isSaved) {
    setViewingRecipe(null);
    setActiveRecipe(prev => prev?.id === recipeId ? null : prev);
    navigateTo('home');
    return;
  }

  // eksisterende delete/undo-flow for gemt opskrift
};
```

#### Løsning 3 — tydelig UI-tekst
Edit-dialogen skal skelne mellem:

- **Kassér kladde**
- **Slet gemt opskrift**

### Minimumskrav

Delete må aldrig være tavs.  
Hvis intet sker, er det en produktfejl.

---

## 10. Import loading screen bryder visuelt i dark mode

### Problem

I dark mode fungerer import loading screen ikke visuelt korrekt.  
Der er stadig lys tekst/lys logik som ikke matcher baggrund og tema.

### Hvor det sidder

- Fil: `src/components/ImportView.tsx`
  - `if (loading) return <LoadingAnimation />`
- Fil: `src/components/LoadingAnimation.tsx`
- Sandsynligvis også relateret CSS i `src/index.css`

### Hvorfor det sker

Loading-komponenten er designet som særflade, men ser ikke ud til at være fuldt bundet til dark-mode tokens/surface tokens.

### Skal løses sådan

#### Krav
- loading-surface skal bruge samme design tokens som øvrige surfaces
- ikke egne “lyse” defaults som bryder temaet
- tekst, meter, stage cards og meta skal have eksplicit dark-mode styles

#### Konkret forslag
I stedet for at `LoadingAnimation` ejer sin egen look-and-feel isoleret, så lad den bruge eksisterende utility/surface classes eller dedikerede `cm-import-loading--dark` token styles.

Eksempel:

```css
.dark .cm-import-loading {
  color: #F6F2EA;
}

.dark .cm-import-loading__title,
.dark .cm-import-loading__description,
.dark .cm-import-loading__meta,
.dark .cm-import-loading__stage-title,
.dark .cm-import-loading__stage-detail {
  color: ...;
}
```

### Minimumskrav

Dark mode må ikke have en loading state, der visuelt føles som en anden app.

---

# C. Patch-plan i prioriteret rækkefølge

## Fase 1 — Kritiske produktfejl

1. Fix delete semantics for saved vs unsaved recipe
2. Implementér global AI activity indicator
3. Implementér AI undo snapshot / undo action
4. Fix dark-mode import loading screen

## Fase 2 — Cook mode kerneforbedringer

5. Erstat prep grouping med kulinarisk grouping
6. Gruppér ingredient overlay efter komponent/rolle
7. Fjern 3-timer cap og indfør overflow-model
8. Gør active-step detection mere stabil

## Fase 3 — Kvalitetsforbedringer

9. Gør steptekst mere text-first via AI/import polish
10. Flyt utility controls ud af cook mode topbar til menu/sheet

---

# D. Konkrete kodeforslag / implementeringsretning

## D1. Global AI activity overlay

### Ny komponent
Opret fx `src/components/GlobalAiActivity.tsx`

```tsx
import { Loader2, Wand2 } from 'lucide-react';

interface GlobalAiActivityProps {
  visible: boolean;
  label: string;
}

export function GlobalAiActivity({ visible, label }: GlobalAiActivityProps) {
  if (!visible) return null;

  return (
    <div className="fixed left-1/2 top-6 z-[120] -translate-x-1/2 pointer-events-none">
      <div className="glass-brushed rounded-2xl px-4 py-3 border border-black/5 dark:border-white/10 shadow-xl flex items-center gap-3 bg-[#FDFBF7]/90 dark:bg-[#1A221E]/92">
        <div className="w-9 h-9 rounded-full bg-heath-mid/15 flex items-center justify-center">
          <Loader2 size={18} className="animate-spin text-heath-mid" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-widest font-bold text-forest-mid/70 dark:text-white/55">AI arbejder</p>
          <p className="text-sm font-serif italic text-forest-dark dark:text-[#F6F2EA]">{label}</p>
        </div>
      </div>
    </div>
  );
}
```

### Integration i `App.tsx`

Tilføj helper:

```ts
const getAiActivityLabel = (action: AiActionKey | null, loading: boolean) => {
  if (loading) return 'Analyserer og klargør import...';
  switch (action) {
    case 'smart_adjust': return 'AI justerer opskriften...';
    case 'generate_steps': return 'AI forbedrer cookmode-trin...';
    case 'fill_rest': return 'AI udfylder resten af opskriften...';
    case 'polish_ingredients': return 'AI strammer ingredienserne op...';
    case 'polish_steps': return 'AI forbedrer fremgangsmåden...';
    case 'suggest_tags': return 'AI foreslår tags...';
    case 'generate_tips': return 'AI genererer tips...';
    case 'estimate_nutrition': return 'AI estimerer ernæring...';
    case 'apply_prefix': return 'AI laver variant...';
    default: return 'AI arbejder...';
  }
};
```

Og render:

```tsx
<GlobalAiActivity
  visible={loading || adjusting}
  label={getAiActivityLabel(activeAiAction, loading)}
/>
```

---

## D2. AI undo snapshot

### I `App.tsx`

Tilføj state:

```ts
const [lastAiSnapshot, setLastAiSnapshot] = useState<{
  previous: Recipe;
  action: AiActionKey;
} | null>(null);
```

### Før AI-handler kører
I alle AI-handlers, fx `handleSmartAdjust`, `handleGenerateSteps`, osv.:

```ts
setLastAiSnapshot({
  previous: recipe,
  action: 'smart_adjust',
});
```

### Efter AI-resultat
Vis en undo-toast eller inline action.

Eksempel på handler:

```ts
const handleUndoLastAiChange = () => {
  if (!lastAiSnapshot) return;
  setViewingRecipe(lastAiSnapshot.previous);

  if (activeRecipe?.id === lastAiSnapshot.previous.id) {
    saveActiveRecipe(lastAiSnapshot.previous);
  }

  setLastAiSnapshot(null);
};
```

### UI
Render fx en `UndoToast` når `lastAiSnapshot` findes og seneste ændring endnu ikke er committet af bruger.

---

## D3. Delete fix for unsaved draft

### I `App.tsx`

Omskriv `handleDeleteRecipe` til at håndtere både draft og saved recipe.

```ts
const handleDeleteRecipe = (recipeId: string) => {
  const currentRecipe = viewingRecipe?.id === recipeId
    ? viewingRecipe
    : savedRecipes.find(r => r.id === recipeId) || null;

  if (!currentRecipe) return;

  if (!currentRecipe.isSaved) {
    if (activeRecipe?.id === recipeId) {
      saveActiveRecipe(null);
    }
    setViewingRecipe(null);
    navigateTo('home');
    return;
  }

  if (user && !isOnline) {
    setError('Du er offline. Sletning i cloud kræver internetforbindelse.');
    return;
  }

  const idx = savedRecipes.findIndex(r => r.id === recipeId);
  if (idx < 0) return;

  // eksisterende delete/undo-flow herfra
};
```

### I `RecipeView.tsx`
Når `!recipe.isSaved`, ændr label/tekst fra “Slet opskrift” til “Kassér kladde”.

---

## D4. Cook mode grouped ingredient overlay

### Mål
Overlay skal vise grupper, ikke lang liste.

### Datastruktur
Hvis grupper allerede findes på ingredienser:

```ts
const groupedIngredients = (recipe.ingredients || []).reduce((acc, ing) => {
  const key = ing.group || 'Ingredienser';
  if (!acc[key]) acc[key] = [];
  acc[key].push(ing);
  return acc;
}, {} as Record<string, Ingredient[]>);
```

### Overlay UI
I `CookView.tsx`, erstat flad `<ul>` med grouped cards:

```tsx
{Object.entries(groupedIngredients).map(([group, items]) => (
  <section key={group} className="cm-cook-surface rounded-2xl p-4">
    <h3 className="text-xs font-bold uppercase tracking-widest text-heath-mid/70 mb-3">{group}</h3>
    <ul className="space-y-2">
      {items.map((ing, i) => (
        <li key={`${group}-${i}`} className="text-base font-serif text-[#F9F9F7]">
          <strong>{ing.amount ?? ''} {ing.unit}</strong> {ing.name}
        </li>
      ))}
    </ul>
  </section>
))}
```

---

## D5. Stabil active-step detection

### Eksisterende problem
`updateActiveFromScroll()` bruger nærmeste center.

### Bedre retning
Brug activation line + senest passerede kort.

Pseudo:

```ts
const activationLine = containerRect.top + containerRect.height * 0.28;
let nextActive = 0;

stepRefs.current.forEach((el, i) => {
  if (!el) return;
  const rect = el.getBoundingClientRect();
  if (rect.top <= activationLine) {
    nextActive = i;
  }
});

if (nextActive !== activeStepIndex) {
  setActiveStepIndex(nextActive);
}
```

Det bliver roligere og mere forudsigeligt.

---

# E. Acceptkriterier

## AI-oplevelse
- Når en AI-handling startes, vises en vedvarende global aktivitetstilstand.
- Brugeren er aldrig i tvivl om, at AI arbejder.
- Brugeren kan fortryde den seneste AI-ændring uden at lukke opskriften.

## Delete
- Slet/kassér gør aldrig “ingenting”.
- Unsaved recipe håndteres som kladde, ikke som tavs no-op.
- Saved recipe følger undo-delete flow.

## Cook mode
- Prep grupperes efter madlavningsrolle, ikke primært efter måleenhed.
- Overlay viser ingredienser i logiske grupper.
- Aktivt step hopper ikke nervøst ved normal scroll.
- Timere er ikke begrænset til 3 af tekniske/UI-grunde.

## Visual consistency
- Import loading screen fungerer korrekt i dark mode.
- Cook mode top-zone føles roligere og mindre paneltung.

---

# F. Endelig anbefaling til Claude

Det vigtigste her er **ikke** at lave en stor bred refactor først.  
Det vigtigste er at tage de konkrete produktfejl i rigtig rækkefølge.

## Start her
1. fix delete semantics
2. global AI activity overlay
3. AI undo snapshot
4. dark mode import loading

## Tag derefter cook mode
5. prep grouping
6. grouped ingredient overlay
7. timer overflow i stedet for timer cap
8. stabil active-step detection

## Først derefter
9. text-first step rewriting
10. mere elegant utility/menu-struktur i cook mode

---

# G. Kort opsummering i én sætning

CookMoxs er blevet bedre, men næste skridt er ikke mere pynt — det er at gøre AI-feedback, delete-logik, prep-flow, ingredient grouping og timerarkitektur mere køkkennaturlig, mere forudsigelig og mindre systemisk.
