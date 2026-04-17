# Dev Session Capture

Formålet er at samle en debug-session uden at ændre appens runtime-kode. Løsningen lever som ekstern sidecar og rører ikke `src/`, `public/` eller `server.ts`.

## Restore point

Før sidecaren blev lagt ind, blev der oprettet et git-tag:

- `restore/dev-session-capture-2026-04-17`

Det peger på commit:

- `f6433e8`

## Hvad den gemmer

Når du kører session capture, oprettes en mappe under:

- `.dev-observe/sessions/<timestamp>/`

Den indeholder:

- `server.log` hvis scriptet selv starter dev-serveren
- `events.ndjson` med console-, request-, response- og pageerror-events
- `screenshots/` med initial, final og auto-captures ved AI/import-fejl og før/efter interessante API-kald
- `video/` fra Playwright browser-context
- `trace.zip` med Playwright trace, snapshots og network activity
- `metadata.json` med session-info

## Installation

Første gang på din egen maskine:

```powershell
npm run dev:observe:install
```

Det installerer Chromium lokalt til projektet via Playwright.

## Kørsel

Hvis ingen lokal app allerede kører på `http://127.0.0.1:3000`, starter scriptet selv `npm run dev` og gemmer terminaloutput i sessionen:

```powershell
npm run dev:observe
```

Hvis appen allerede kører, og du kun vil attach'e browser-capture:

```powershell
npm run dev:observe:attach
```

Du kan også vælge desktop-profil:

```powershell
node scripts/dev-observe-session.mjs --desktop
```

Eller en anden URL:

```powershell
node scripts/dev-observe-session.mjs --attach --base-url http://127.0.0.1:4173
```

## Hvad der bliver captured automatisk

Sidecaren tager screenshots:

- ved opstart
- ved afslutning
- før og efter kald til `/api/ai/*`, `/api/parse-direct` og `/api/fetch-url`
- ved `console.error`, `console.warn`, `pageerror`, `requestfailed` og HTTP-svar `>= 400`

Det er bevidst smalt. Målet er fejlsporing, ikke generel session replay i produktion.

## Open-source valg

Denne løsning bruger Playwright som ekstern capture-motor. Det er det rigtige første lag, fordi det giver:

- traces
- screenshots
- video
- network og console correlation

uden at kræve hooks i appen.

Hvis I senere vil have mere permanent session replay i et miljø uden for lokal dev, er de mest relevante næste kandidater:

- OpenReplay: open-source, self-hosted session replay og devtools-kontekst
- rrweb: lavniveau replay-bibliotek, hvis I selv vil bygge noget meget skræddersyet

De er ikke koblet på nu, fordi de ville brede scope og i praksis kræve app-integrationsarbejde.
