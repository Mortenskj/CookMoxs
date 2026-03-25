# CookMoxs

*En AI-drevet opskriftsassistent og kogebogsapp.*

Dette projekt er en komplet re‑implementering af **CookMoxs** som en moderne
TypeScript/React frontend med en Express backend. Alle AI-funktioner køres
på serversiden via Google GenAI (Gemini) for at beskytte API‑nøgler og reducere
bundle‑størrelsen. Versionen her er den første rene **v1 showcase-build** og samler den tidligere splittede
kodebase og fokuserer på en strømlinet brugerrejse: **Importer → redigér → kog → gem**.

## Funktioner

- **Opskriftimport** fra URL, rå tekst, PDF/billede eller ved manuel indtastning.  AI‑modellen
  udtrækker titel, ingredienser, trin, portioner m.m. og normaliserer til
  danske måleenheder og begyndervenlig tekst.
- **Automatiske forbedringer**: tilpas eksisterende opskrifter efter brugerens
  instruktioner (fx dobbelt portion, vegetarisk, konverter til dl/gram), generér eller
  forbedr fremgangsmåden, udfyld manglende felter og lav små smagsforstærkere.
- **AI‑profiler**: omskriv opskrifter til forskellige profiler (f.eks. Gourmet,
  Autentisk, Den hurtige, Begynderen, Babyvenlig) med et enkelt klik.
- **Kogemodus**: navigér trin for trin med tilpassede timere, induktions‑varme
  angivet på 1‑9 skala og intelligent ovnforvarmning. Timere kan flyde som widgets
  og gendannes efter genindlæsning.
- **Bibliotek og mapper**: gem, organiser og del opskrifter.  Synkroniser dine
  opskrifter i skyen via Supabase, men appen fungerer fuldt offline med lokal
  cache hvis du ikke er logget ind.
- **Dark/light temaer** og sæsonbetonede farveskemaer.

## Kodedesign

- **Frontend** lever i `src/` og er skrevet i React med TypeScript.  Store
  komponenter som `App.tsx` er uddelegeret til views i `src/components/` og
  hjælpefunktioner i `src/services/`.
- **Backend** er `server.ts` som kører Express.  Den eksponerer REST‑endpoints
  under `/api/ai/*` der indkapsler alle kald til Google GenAI.  Ingen
  API‑nøgler sendes til browseren.  I udvikling bruger serveren Vite som
  middleware; i produktion serveres den kompilerede `dist/` mappe.
- **Supabase** SQL ligger i `supabase/` og beskriver strukturen for cloud‑sync
  (mapper, opskrifter mv.).  Du bestemmer selv om du vil aktivere cloud sync.
- Projektet er renset ned til de aktive runtime-filer. Historiske mapper og migrationstrin indgår ikke i showcase-pakken.

## Kom i gang lokalt

Appen kræver Node.js 20.x og en API‑nøgle til Google GenAI. Hvis du vil have
cloud‑synkronisering skal du også oprette et Supabase‑projekt.

1. **Klon repoet og installer afhængigheder**:

   ```bash
   npm install
   ```

2. **Kør udviklingsserver** (med hot reload og Vite middleware):

   ```bash
   npm run dev
   ```

   Appen er nu tilgængelig på `http://localhost:3000`.  I udvikling kan du
   undlade API‑nøgler — du vil blot ikke kunne bruge AI‑funktionerne.

3. **Byg og kør produktion**:

   ```bash
   npm run build
   NODE_ENV=production npm start
   ```

   Dette genererer `dist/` via Vite og serverer den med Express.  Sørg for at
   sætte `GEMINI_API_KEY` i dit miljø hvis du vil bruge AI i produktion.

## Miljøvariabler

| Variable             | Beskrivelse                                                  |
|----------------------|--------------------------------------------------------------|
| `GEMINI_API_KEY`     | Din Google GenAI‑nøgle (Gemini).  Kræves for AI‑funktioner. |
| `SUPABASE_URL`       | (Valgfri) Base URL til dit Supabase‑projekt.                |
| `SUPABASE_ANON_KEY`  | (Valgfri) Anon/public nøgle til dit Supabase‑projekt.        |

Disse variabler injiceres aldrig i klientkoden.  Definér dem i din lokale
terminal eller via Render/Netlify/Heroku–dashboardet afhængigt af din deploy.

## Deploy

Konfiguration til [Render.com](https://render.com) findes i `render.yaml`.  Den
kører `npm install && npm run build` under build‑fasen og `npm start` under
run‑fasen.  Husk at sætte miljøvariablerne nævnt ovenfor i Render.  Du kan
tilpasse `plan`, `name` mv. efter behov.

## Showcase-pakke

Den endelige showcase-zip indeholder kun de aktive filer til CookMoxs v1: `src/`, `server.ts`, konfigurationsfiler, `public/`, `supabase/`, `dist/` og projektmetadata.

## Bidrag og licens

Projektet er udviklet som et eksempel på en fuldstack app med AI‑genererede
opskrifter.  Koden er udgivet uden garanti; brug den som inspiration eller
grundlag for dit eget projekt.  Ændringer og forbedringer er velkomne via
pull requests.