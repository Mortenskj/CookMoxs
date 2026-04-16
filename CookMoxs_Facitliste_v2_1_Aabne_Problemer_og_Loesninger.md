# CookMoxs — Facitliste v2.1: Åbne problemer, præcise løsningsforslag og kode-retning

> **Formål:** Dette dokument er en **preskriptiv implementeringsguide** til de åbne problemer i CookMoxs efter de seneste ændringer.  
> **Status:** Vejledende, men skrevet som en facitliste.  
> **Brug:** Tænk det som “opgaven er løst på papir, men implementeringen overlades til Claude med review”.  
> **Vigtigt:** Læs kritisk. Brug ikke kodeblokke blindt uden at tilpasse dem til den aktuelle kodebase.

---

# Læs dette først

## Dette dokument er skrevet i denne rækkefølge med vilje

1. **Behold / rør ikke endnu**  
   For at undgå at gode ændringer bliver forværret af overivrige refactors.

2. **P0 / P1 åbne problemer**  
   Disse er den reelle restliste nu.

3. **Konkrete løsninger pr. problem**  
   Hvert problem har:
   - diagnose
   - berørte filer/funktioner
   - hvorfor det sker
   - anbefalet løsning
   - kode-retning / patch-forslag
   - acceptance criteria
   - regression checks

4. **Anbefalet implementeringsrækkefølge**  
   Følg denne. Spring ikke rundt.

---

# 0. Hvad der er godt nok nu og ikke skal rodes med først

Følgende ting er i den rigtige retning og bør **beholdes som basis**, ikke rulles tilbage:

## Cook mode
- scroll-baseret flow-visning i stedet for swipe som primær model
- activation-line som grundidé (men den skal stabiliseres)
- timer overflow-model i stedet for hard cap på 3
- manuel timer i cook mode
- next-step preview fjernet
- inline ingredients som toggle, ikke permanent blok

## Data / typer
- `TimerKind = 'exact' | 'approximate' | 'state_based' | 'none'`
- `Ingredient.group` som datafelt
- `Step.timer.kind`
- `originalRecipeId` / `variantPrefix`
- AI snapshot/undo som princip

## AI / robusthed
- content-too-short guard er i princippet rigtig
- retry på AI-fejl er i princippet rigtig
- `EmptyRecipeError` / bedre fejlbeskeder er i princippet rigtige

## Produktdom
Retningen er nu ikke længere “forkert model”.  
Retningen er nu “den rigtige model, men stadig med nogle afgørende mangler”.

---

# 1. Prioriteret restliste

## P0 — skal løses nu
1. **Prep-gruppering er stadig systemisk, ikke køkkenlogisk**
2. **Ingredient overlay er stadig flad liste**
3. **Global `error`-state giver spøgelsesfejl på tværs af views**
4. **Active-step detection tager ikke højde for dynamisk timerdock/topzone**
5. **Desktop scroll kan hoppe fra fx step 5 til 7**
6. **Global loading-screen efter import er stadig ikke korrekt i dark mode**
7. **Import af JS-renderede sider som Spis Bedre fejler stadig for tidligt**

## P1 — lige bagefter
8. **Text-first steps via AI prompt / server prompt engineering**
9. **AI overlay / AI undo edge-case validering**
10. **Topbar cleanup kun hvis den stadig opleves for pakket efter P0**

## P2 — senere
11. **Større App.tsx-oprydning**
12. **Mere konsekvent navigation API (undgå direkte `setCurrentView`)**
13. **Strammere timeout-model mellem UI og server**
14. **Mere granulær import-/fallback-taxonomi**

---

# 2. Problem 1 — Prep-gruppering er stadig forkert

## Diagnose
Cook mode tænker stadig for meget i databaser og for lidt i faktisk madlavning.

### Nuværende kode
**Fil:** `src/components/CookView.tsx`  
**Funktion:** `categorizePrepIngredients(ingredients)`  

Den nuværende logik grupperer i:

- `Vej af`
- `Mål op`
- `Klargør`
- `Find frem`

baseret på:
- enhedstyper
- enkelte prep-ord i ingrediensnavnet

Det er stadig ikke en god køkkenmodel.

## Hvorfor det er et problem
Brugeren tænker ikke:
- “vej af”
- “mål op”

Brugeren tænker:
- til kødbollerne
- til saucen
- krydderiblanding
- til servering
- senere tilsætning

### Produktkonsekvens
Det får prep til at føles “teknisk hjælpelag” i stedet for faktisk mise en place.

---

## Løsningsprincip
Prep skal grupperes efter **rolle i retten**, ikke efter måleenhedstype.

### Førsteprioritet
Brug `ingredient.group` hvis det findes og er meningsfuldt.

Det er allerede i datamodellen. Det er godt. Brug det.

### Fallback
Hvis `ingredient.group` ikke findes eller kun er flade labels som “Ingredienser”, så brug en forsigtig fallback.

### Vigtigt
Fallback må ikke være alt for aggressiv eller låse sig til kun dansk hverdagsmad. Derfor:

- `ingredient.group` først
- forsigtig fallback bagefter
- maks 4–5 grupper i UI

---

## Anbefalet implementering

### Trin A
Erstat `categorizePrepIngredients()` med en ny funktion, fx:
- `buildPrepGroups(ingredients, steps)`

### Trin B
Brug denne prioritering:
1. `ingredient.group`
2. fallback heuristik
3. “Ingredienser” / “Senere tilsætning” som sidste udvej

### Trin C
Hvis samme gruppe findes flere gange, merge den.

### Trin D
Maks 5 grupper. Resten samles under “Senere tilsætning”.

---

## Kode-retning

```ts
// src/components/CookView.tsx
interface PrepGroup {
  label: string;
  items: { ingredient: Ingredient; index: number }[];
  mode?: 'inline' | 'expandable';
}

const DEFAULT_GENERIC_GROUPS = new Set([
  '',
  'ingredienser',
  'andre',
  'øvrigt',
  'diverse',
]);

function normalizeGroupLabel(value?: string) {
  return (value || '').trim().toLowerCase();
}

function titleCaseGroup(value: string) {
  if (!value) return 'Ingredienser';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function fallbackGroupForIngredient(ing: Ingredient): string {
  const name = ing.name.toLowerCase();

  if (/(løg|hvidløg|chili|skalotteløg)/.test(name)) return 'Aromater';
  if (/(paprika|spidskommen|koriander|kanel|karry|gurkemeje|salt|peber)/.test(name)) return 'Krydderiblanding';
  if (/(tomat|bouillon|mælk|fløde|eddike|soja|fond)/.test(name)) return 'Våd base';
  if (/(persille|koriander|citron|chips|cremefraiche|topping)/.test(name)) return 'Til servering';

  return 'Senere tilsætning';
}

function buildPrepGroups(ingredients: Ingredient[]): PrepGroup[] {
  const groups = new Map<string, PrepGroup>();

  ingredients.forEach((ingredient, index) => {
    const rawGroup = normalizeGroupLabel(ingredient.group);
    const label =
      !DEFAULT_GENERIC_GROUPS.has(rawGroup)
        ? titleCaseGroup(ingredient.group!.trim())
        : fallbackGroupForIngredient(ingredient);

    if (!groups.has(label)) {
      groups.set(label, { label, items: [] });
    }

    groups.get(label)!.items.push({ ingredient, index });
  });

  const ordered = Array.from(groups.values());

  // Soft cap to avoid too many prep boxes
  if (ordered.length <= 5) {
    return ordered.map(group => ({
      ...group,
      mode: group.items.length >= 5 ? 'expandable' : 'inline',
    }));
  }

  const primary = ordered.slice(0, 4);
  const overflowItems = ordered.slice(4).flatMap(group => group.items);

  primary.push({
    label: 'Senere tilsætning',
    items: overflowItems,
    mode: overflowItems.length >= 5 ? 'expandable' : 'inline',
  });

  return primary;
}
```

---

## Acceptance criteria
- prep viser 2–5 meningsfulde grupper
- grupper lyder som noget man kan bruge i et køkken
- grupper som “Til saucen”, “Til kødbollerne”, “Til servering” respekteres hvis de findes i data
- der vises ikke tekniske labels som primær slut-UI

## Regression checks
- chili sin carne
- boller i karry
- bagværk
- salat
- en ret uden tydelige delkomponenter

---

# 3. Problem 2 — Ingredient overlay er stadig for flad

## Diagnose
CookView’s full-screen ingredient overlay viser stadig bare hele ingredienslisten som én lang liste.

### Nuværende kode
**Fil:** `src/components/CookView.tsx`  
**Sektion:** `showIngredients` overlay nederst i komponenten

Den renderer aktuelt:
```tsx
(recipe.ingredients || []).map(...)
```

uden gruppering.

## Hvorfor det er et problem
I retter som:
- boller i karry
- lasagne
- burger
- lagkage
- pasta med flere dele

…er én lang ingrediensliste en dårlig køkkenoplevelse.

Brugeren har brug for:
- Til kødbollerne
- Til saucen
- Til servering

ikke bare en lang lineær liste.

---

## Løsningsprincip
Overlay skal bygges på `Ingredient.group`.

### Hvis `group` findes
Gruppér og vis dem med overskrifter.

### Hvis `group` mangler
Brug samme `buildPrepGroups()` eller en enklere grouping helper.

### UI-model
- det må gerne være en pæn modal/overlay
- det må gerne være en boks/sheet-lignende flade
- men vigtigst: **semantisk gruppering først**

---

## Kode-retning

```ts
function groupIngredientsForOverlay(ingredients: Ingredient[]) {
  const map = new Map<string, Ingredient[]>();

  ingredients.forEach((ingredient) => {
    const rawGroup = normalizeGroupLabel(ingredient.group);
    const label =
      !DEFAULT_GENERIC_GROUPS.has(rawGroup)
        ? titleCaseGroup(ingredient.group!.trim())
        : 'Ingredienser';

    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(ingredient);
  });

  return Array.from(map.entries()).map(([label, items]) => ({ label, items }));
}
```

```tsx
// inside CookView
const groupedIngredientsForOverlay = useMemo(
  () => groupIngredientsForOverlay(recipe.ingredients || []),
  [recipe.ingredients]
);
```

```tsx
<div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-4 sm:px-6">
  <div className="space-y-6">
    {groupedIngredientsForOverlay.map((group) => (
      <section key={group.label} className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-widest text-white/50">
          {group.label}
        </h3>
        <ul className="divide-y divide-white/8">
          {group.items.map((ing, i) => {
            const amountStr = ing.amount
              ? (typeof ing.amount === 'number' ? ing.amount * scale : ing.amount)
              : '';
            const fullStr = `${amountStr} ${ing.unit} ${ing.name}`.trim();

            return (
              <li key={`${group.label}-${i}`} className="py-3 text-lg font-serif text-[#F9F9F7]">
                {fullStr}
              </li>
            );
          })}
        </ul>
      </section>
    ))}
  </div>
</div>
```

---

## Acceptance criteria
- overlay viser grupper hvis data findes
- boller i karry kan fx vise “Til kødbollerne” og “Til saucen”
- hvis alle grupper mangler, vises fallback “Ingredienser”
- overlay er stadig hurtigt at scrolle i på mobil

## Regression checks
- ret med 1 gruppe
- ret med 3 grupper
- ret med manglende groups
- ret med mange ingredienser

---

# 4. Problem 3 — Global `error` giver spøgelsesfejl på tværs af views

## Diagnose
Appen holder stadig en langlevende global fejlstreng:

```ts
const [error, setError] = useState<string | null>(null);
```

**Fil:** `src/App.tsx`

Den sendes derefter ned i views som:
- `ImportView`
- `RecipeView`

Det betyder, at en fejl fra import kan blive rendret senere i recipe view eller et andet view.

---

## Hvorfor det er et problem
Det giver “spøgelsesfejl”:
- fejl opstår ét sted
- vises et andet sted
- bliver hængende for længe
- eller ses slet ikke, hvis man allerede er navigeret videre

### Produktkonsekvens
Fejl bliver:
- uklar i kontekst
- mindre synlig
- mindre troværdig

---

## Løsningsprincip
Del fejl i tre kategorier:

### A. Global operationel feedback
Til:
- importfejl
- AI-fejl
- sync-fejl
- auth-fejl
- timeout

Disse skal vises som **global, dismissible toast/popup**.

### B. Inline validation
Til:
- formularfelter
- mappebekræftelse
- manglende input

Disse må blive inline.

### C. Confirmations/blocking dialogs
Til:
- slet
- kritiske destructive actions

Ikke almindelige driftsfejl.

---

## Anbefalet implementering

### Trin A
Indfør et notice-system i `App.tsx`.

```ts
type AppNotice = {
  id: string;
  type: 'error' | 'warning' | 'success' | 'info';
  message: string;
  dismissible?: boolean;
  autoHideMs?: number;
};
```

### Trin B
Erstat de fleste `setError(...)` med `pushNotice(...)`.

### Trin C
Behold kun inline fejl til lokal validering.

---

## Kode-retning

```ts
// src/App.tsx
type AppNotice = {
  id: string;
  type: 'error' | 'warning' | 'success' | 'info';
  message: string;
  dismissible?: boolean;
  autoHideMs?: number;
};

const [notices, setNotices] = useState<AppNotice[]>([]);

const pushNotice = useCallback((notice: Omit<AppNotice, 'id'>) => {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const next = { id, dismissible: true, ...notice };
  setNotices((prev) => [...prev, next]);

  if (next.autoHideMs && next.autoHideMs > 0) {
    window.setTimeout(() => {
      setNotices((prev) => prev.filter((item) => item.id !== id));
    }, next.autoHideMs);
  }
}, []);

const dismissNotice = useCallback((id: string) => {
  setNotices((prev) => prev.filter((item) => item.id !== id));
}, []);
```

```tsx
// render once near end of App.tsx
<div className="fixed inset-x-0 top-4 z-[120] pointer-events-none flex flex-col items-center gap-3 px-4">
  {notices.map((notice) => (
    <div
      key={notice.id}
      className="pointer-events-auto max-w-md w-full rounded-2xl border px-4 py-3 shadow-xl glass-brushed"
      data-type={notice.type}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1 text-sm">{notice.message}</div>
        {notice.dismissible && (
          <button onClick={() => dismissNotice(notice.id)} className="cm-icon-button !w-8 !h-8">
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  ))}
</div>
```

### Erstat f.eks.
```ts
setError(message);
```

med:
```ts
pushNotice({
  type: 'error',
  message,
  dismissible: true,
});
```

---

## Konsekvens i views
### Fjern som primær model
- `error` prop til `ImportView`
- `error` prop til `RecipeView`

eller nedton dem kraftigt.

### Behold inline lokalt
fx:
- folder confirmation error
- edit validation
- field-specific issues

---

## Acceptance criteria
- importfejl ses globalt med det samme
- AI-fejl ses globalt uanset view
- fejl hænger ikke ved og dukker op i recipe view senere
- brugeren kan lukke dem

## Regression checks
- importfejl → gå til recipe view
- AI-fejl fra recipe view → navigér væk
- loginfejl
- sync-fejl

---

# 5. Problem 4 — Active-step detection tager ikke højde for dynamisk topzone / timerdock

## Diagnose
CookView bruger nu activation-line. Det er godt.

### Nuværende kode
**Fil:** `src/components/CookView.tsx`  
**Funktion:** `updateActiveFromScroll`

Den beregner:

```ts
const containerRect = container.getBoundingClientRect();
const activationLine = containerRect.top + containerRect.height * 0.28;
```

Problemet er, at den bruger **containerens rå geometri**.

Når timerdock vokser og topzonen bliver højere, ændres den reelle læsezone, men activation-line flytter sig ikke tilsvarende.

---

## Hvad brugeren oplever
- aktivt step føles lidt forkert
- især når der er mange timere
- den kan hoppe hurtigere
- den kan markere et step som aktivt før det føles “inde i læsefeltet”

---

## Løsningsprincip
Activation-line skal beregnes mod **den reelle step-zone**.

### Dvs.
Tag højde for:
- topbar højde
- timerdock højde
- evt. manual timer form

### Ikke
bare containerens totale højde.

---

## Anbefalet implementering

### Trin A
Giv topzonen en ref.

```ts
const topZoneRef = useRef<HTMLDivElement>(null);
```

```tsx
<div ref={topZoneRef} className="cm-cook-top-zone z-30 shrink-0">
```

### Trin B
Beregn en effektiv læsezone.

```ts
const updateActiveFromScroll = useCallback(() => {
  const container = scrollContainerRef.current;
  const topZone = topZoneRef.current;
  if (!container || steps.length === 0) return;

  const containerRect = container.getBoundingClientRect();
  const topOffset = topZone ? topZone.getBoundingClientRect().height : 0;

  // Effective visible area starts below the fixed top zone
  const visibleTop = containerRect.top + 8;
  const visibleBottom = containerRect.bottom - 8;

  const effectiveHeight = Math.max(visibleBottom - visibleTop, 1);
  const activationLine = visibleTop + effectiveHeight * 0.32;

  let nextActive = 0;

  stepRefs.current.forEach((el, i) => {
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.top <= activationLine) {
      nextActive = i;
    }
  });

  setActiveStepIndex((prev) => (prev === nextActive ? prev : nextActive));
}, [steps.length]);
```

> **Bemærk:** Justér procentsatsen efter test. 0.28–0.35 er typisk det relevante interval.

---

## Acceptance criteria
- aktivt step flytter sig naturligt selv når timerdocken vokser
- midt/fokus føles ikke “for højt” når flere timere er åbne
- step highlight følger det område brugeren faktisk læser i

## Regression checks
- ingen timere
- 1 timer
- 4+ timere
- manuel timer åben
- scroll op/ned hurtigt

---

# 6. Problem 5 — Desktop scroll kan hoppe fra fx 5 til 7

## Diagnose
Selv med activation-line kan desktop wheel/trackpad springe over mere end ét step mellem to scroll-events.

### Nuværende problem
Hvis to step-toppe passeres mellem to events, kan aktivt step hoppe direkte.

---

## Løsningsprincip
Behold activation-line, men tilføj **stabiliseringsregel / hysterese**.

### Regel
Ved almindelig scroll må aktivt step ikke springe mere end 1 ad gangen.

### Undtagelse
Direkte klik på et step må gerne hoppe.

---

## Kode-retning

```ts
const skipClampRef = useRef(false);

const scrollToStep = useCallback((index: number, smooth = true) => {
  const el = stepRefs.current[index];
  if (!el || !scrollContainerRef.current) return;

  skipClampRef.current = true;
  isUserScrolling.current = false;

  el.scrollIntoView({
    behavior: smooth ? 'smooth' : 'instant',
    block: 'center',
  });

  if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
  scrollTimeoutRef.current = setTimeout(() => {
    isUserScrolling.current = true;
    skipClampRef.current = false;
  }, smooth ? 600 : 100);
}, []);
```

```ts
if (nextActive !== activeStepIndex) {
  if (!skipClampRef.current && Math.abs(nextActive - activeStepIndex) > 1) {
    setActiveStepIndex(nextActive > activeStepIndex ? activeStepIndex + 1 : activeStepIndex - 1);
  } else {
    setActiveStepIndex(nextActive);
  }
}
```

---

## Acceptance criteria
- desktop-scroll kan ikke hoppe 5 → 7 ved normal brug
- klik på stepkort må stadig hoppe direkte
- mobilscroll føles ikke trægere

## Regression checks
- mus med grov wheel
- trackpad
- hurtig scroll op/ned
- lange/korte stepkort

---

# 7. Problem 6 — Dark mode loading-screen efter “Importer opskrift” er stadig ikke korrekt

## Diagnose
Det vigtige er at skelne mellem to ting:

1. inline/submitting states i `ImportView`
2. den fulde loading-screen efter submit (`LoadingAnimation`)

### Problemet
Det er **nr. 2**, der stadig er forkert i praksis.

### Berørte filer
- `src/components/LoadingAnimation.tsx`
- `src/index.css`
- indirekte `ImportView` via `loading` prop

---

## Hvorfor det stadig kan være forkert
Der er allerede dark overrides i CSS, men hvis den brugeroplevelse du faktisk ser stadig er forkert, er der typisk tre muligheder:

1. forkert state er rettet
2. loading-shell arver ikke rigtige dark tokens i den globale tilstand
3. enkelte hero/meter/stage surfaces er stadig for lyse i dark mode i praksis

---

## Hvad der skal gøres
### Trin A
Verificér at det er **den globale** loading-state, der bruger `LoadingAnimation`.

### Trin B
Gør loading-komponenten eksplicit dark-safe via tokens, ikke kun via generelle `.dark` justeringer.

### Trin C
Undgå hårdkodede lyse værdier i hero/meter/stages.

---

## Kode-retning
Lav explicite komponentnære tokens:

```css
.cm-import-loading {
  --cm-import-hero-overlay: rgba(255, 255, 255, 0.2);
  --cm-import-hero-overlay-end: rgba(255, 255, 255, 0.02);
  --cm-import-hero-shimmer: rgba(255, 255, 255, 0.22);
  --cm-import-meter-track: rgba(255, 255, 255, 0.28);
  --cm-import-meter-border: rgba(39, 42, 38, 0.08);
  --cm-import-stage-active-ring: rgba(255, 255, 255, 0.14);
}

.dark .cm-import-loading {
  --cm-import-hero-overlay: rgba(255, 255, 255, 0.06);
  --cm-import-hero-overlay-end: rgba(255, 255, 255, 0.01);
  --cm-import-hero-shimmer: rgba(255, 255, 255, 0.08);
  --cm-import-meter-track: rgba(255, 255, 255, 0.10);
  --cm-import-meter-border: rgba(255, 255, 255, 0.08);
  --cm-import-stage-active-ring: rgba(255, 255, 255, 0.06);
}
```

Brug dem derefter i stedet for hårde `rgba(...)` direkte:

```css
.cm-import-loading__hero {
  background:
    linear-gradient(180deg, var(--cm-import-hero-overlay), var(--cm-import-hero-overlay-end)),
    var(--season-atmosphere-halo),
    color-mix(in srgb, var(--theme-panel-strong) 98%, transparent);
}

.cm-import-loading__hero::after {
  background: linear-gradient(90deg, transparent 0%, var(--cm-import-hero-shimmer) 50%, transparent 100%);
}

.cm-import-loading__meter {
  background: var(--cm-import-meter-track);
  border: 1px solid var(--cm-import-meter-border);
}

.cm-import-loading__stage[data-state="active"] {
  box-shadow:
    inset 0 0 0 1px var(--cm-import-stage-active-ring),
    0 12px 24px color-mix(in srgb, var(--season-shadow-color) 62%, transparent);
}
```

---

## Acceptance criteria
- loading-screen efter submit er visuelt korrekt i dark mode
- den ser ikke “hvid” eller forkert tonet ud
- både hero, meter og stage-kort matcher resten af dark theme

## Regression checks
- link import
- text import
- file import
- image import
- skift mellem light/dark og prøv igen

---

# 8. Problem 7 — Import af JS-renderede sider som Spis Bedre fejler stadig for tidligt

## Diagnose
Test med:

`https://spisbedre.dk/opskrifter/chili-sin-carne-den-bedste-opskrift`

viser:
- fetch giver ikke brugbar tekst
- content-too-short guard rammer
- flowet stopper med `unsupported_source`

### Nuværende kode
**Fil:** `server.ts`

Centrale steder:
- `fetchRecipeSource(url)`
- `/api/ai/import`
- content-too-short guard
- `/api/fetch-url`

---

## Hvorfor det sker
Siden ser ud til at være JS-renderet eller i hvert fald ikke levere nok brugbar tekst i den første HTML-fase.

Nuværende flow er:

1. fetch source
2. ikke nok tekst
3. stop

Det er bedre end hallucination, men stadig ikke godt nok for vigtige opskriftssider.

---

## Løsningsprincip
Når “content too short” rammer, bør serveren forsøge **et ekstra fallback-lag** før den giver op.

### Ikke browser-rendering først
Ingen tung headless-browser som første løsning.

### Men
undersøg server-side HTML for embedded data, fx:
- `__NEXT_DATA__`
- `window.__INITIAL_STATE__`
- JSON blobs i script-tags
- article/recipe payloads i inline scripts

---

## Anbefalet implementering

### Trin A
Indfør en helper:
- `extractEmbeddedRecipeDataFromScripts(html)`

### Trin B
Kør den i `fetchRecipeSource()` **før** der returneres tom/for kort HTML.

### Trin C
Hvis der findes plausibelt embedded data:
- returnér det som `json`
- eller konverter det til brugbar tekst før AI import

### Trin D
Kun hvis alt fejler:
- returnér den præcise dynamisk-renderet fejl

---

## Kode-retning

```ts
function extractEmbeddedRecipeDataFromScripts(html: string) {
  const $ = cheerio.load(html);

  const scriptContents = $('script')
    .map((_, el) => $(el).html() || '')
    .get()
    .filter(Boolean);

  for (const content of scriptContents) {
    // Common SPA patterns
    if (content.includes('__NEXT_DATA__') || content.includes('recipe') || content.includes('ingredients')) {
      // try to pull JSON object(s) out carefully
      const jsonMatches = content.match(/\{[\s\S]{200,}\}/g) || [];

      for (const match of jsonMatches) {
        try {
          const parsed = JSON.parse(match);
          const found = findRecipeInStructuredData(parsed);
          if (found) return found;
        } catch {
          // ignore non-JSON blocks
        }
      }
    }
  }

  return null;
}
```

### Brug i `fetchRecipeSource(url)`
Lige efter almindelig JSON-LD / microdata forsøg:

```ts
const embeddedRecipe = extractEmbeddedRecipeDataFromScripts(response.data);
if (embeddedRecipe) {
  return { json: embeddedRecipe };
}
```

---

## Forbedr beskeden
I stedet for bare:
> Siden indeholder ikke nok opskriftstekst...

brug noget mere præcist, fx:
> Siden ser ud til at være dynamisk renderet og leverede ikke brugbar opskriftstekst direkte. Vi prøvede grundimport og ekstra fallback uden held. Prøv at kopiere selve opskriftsteksten ind manuelt.

---

## Acceptance criteria
- Spis Bedre testes eksplicit
- hvis den kan læses via embedded data, virker import
- hvis den ikke kan, er beskeden mere præcis og ærlig

## Regression checks
- struktureret side
- JS-renderet side
- side uden opskrift
- meget kort side

---

# 9. Problem 8 — Text-first steps er stadig ikke stærke nok

## Diagnose
Step-teksterne er stadig for afhængige af hjælpelag.

Målet bør være, at selve stepteksten oftere kan stå alene, fx:
- “Tilsæt 2 dl fløde”
- “Rør 1 spsk karry ud i smørret”

ikke kun:
- “Tilsæt fløde”
- “Rør karry ud”

---

## Hvor i koden det skal løses
Primært i `server.ts`, i promptreglerne for:
- `/api/ai/import`
- `/api/ai/generate-steps`
- `/api/ai/polish-steps`

---

## Løsningsprincip
Ikke kræv at **alle** steps skal gentage alle mængder.  
Men kræv at steps i cook mode som udgangspunkt skal være mere operationelle.

### Regel
Når et trin bruger en central ingrediens, og mængden er kendt og vigtig for udførelsen, må den gerne skrives direkte i stepteksten.

---

## Kode-retning — sharedRules
Udvid `sharedRules` i `/api/ai/import` med fx:

```txt
STEP TEXT: Write steps so they are operationally useful in cook mode.
When a step uses a key ingredient and the amount is known and important for execution, include the amount inline in the text.
Prefer:
- "Tilsæt 2 dl fløde"
- "Rør 1 spsk karry ud i smørret"
instead of:
- "Tilsæt fløde"
- "Tilsæt karry"
Do not overload every sentence with all quantities, but do include the most relevant ones.
```

### Tilsvarende til `generate-steps` / `polish-steps`
Tilføj:
```txt
Write steps in a text-first cook mode style.
Inline the most important ingredient amounts directly into the step text when it improves execution clarity.
```

---

## Acceptance criteria
- steptekster er mere selvbærende
- mindre behov for at åbne ingredient overlay midt i madlavning
- stadig ikke tunge eller overfyldte sætninger

## Regression checks
- korte opskrifter
- lange opskrifter
- trin med mange ingredienser
- trin hvor mængder ikke bør gentages

---

# 10. Problem 9 — AI overlay / AI undo skal valideres, ikke bare compile

## Diagnose
Implementeringen ser fornuftig ud i princippet, men den skal stresstestes.

### Berørte steder
- `App.tsx`
- `GlobalAiActivity`
- `lastAiSnapshot`
- `UndoToast`

---

## Hvad der skal testes
### AI overlay
- success
- failure
- timeout
- navigation midt i AI-kald
- flere AI-kald hurtigt efter hinanden

### AI undo
- undo efter smart adjust
- undo efter polish steps
- undo efter generate tips
- undo efter estimate nutrition
- savedRecipe / viewingRecipe / activeRecipe konsistens bagefter

---

## Acceptance criteria
- AI overlay hænger ikke fast
- undo gendanner faktisk sidste AI-før-state
- auto-saved AI-handlinger kan også rulles korrekt tilbage

---

# 11. Problem 10 — Topbar utility menu bør stadig vente

## Diagnose
Topbar er lidt pakket, men ikke det vigtigste problem nu.

## Dom
Vent med utility-menu.  
Den risikerer bare at flytte ting bag et ekstra klik uden at løse de vigtigste problemer først.

---

# 12. Konkrete filer der bør røres nu

## Nu
- `src/components/CookView.tsx`
- `src/App.tsx`
- `src/index.css`
- `server.ts`

## Eventuelt nye filer
- `src/components/AppNoticeToast.tsx`
- `src/hooks/useAppNotices.ts` (kun hvis det gør App.tsx mere læsbar)

## Senere
- større App.tsx extraction
- navigation cleanup
- mere granular import services

---

# 13. Anbefalet implementeringsrækkefølge

## Fase A — Cook mode correctness
1. prep-gruppering
2. grouped ingredient overlay
3. dynamic activation-line der tager højde for topzone/timerdock
4. desktop skip guard

## Fase B — Feedback correctness
5. global notice/error system
6. verificér AI overlay / undo edge cases

## Fase C — Import correctness
7. dark mode loading-screen fix på den rigtige globale loading-state
8. JS-rendered import fallback (Spis Bedre m.fl.)
9. mere præcis brugerbesked ved dynamisk renderede kilder

## Fase D — Text-first improvement
10. server-side prompt engineering for mere selvbærende steps

---

# 14. Kort “gør / gør ikke”

## Gør
- brug `Ingredient.group` aktivt
- gør fejl globale og dismissible
- behold activation-line, men gør den dynamisk
- vær eksplicit om JS-renderede importsider
- skriv trin mere operationelt

## Gør ikke
- rul scroll-flow tilbage til swipe
- gå tilbage til hard cap på 3 timere
- behold én lang global `error`-streng som vises inline i views
- antag at dark mode er løst, bare fordi enkelte CSS overrides findes
- byg utility-menu før de reelle cook mode-problemer er løst

---

# 15. Slutdom

CookMoxs er ikke længere i den fase, hvor hele modellen er forkert.

Det betyder:
- retningen er god
- datamodellen er i det store hele sund
- de åbne problemer er nu mere konkrete og løselige

Men de er stadig vigtige.

## De fire vigtigste åbne huller
1. prep er ikke køkkenlogisk nok
2. ingredient overlay er ikke semantisk nok
3. fejlfeedback er arkitektonisk forkert
4. scroll/active-step logik er ikke helt robust nok endnu

Løs dem først.

Alt andet bagefter.
