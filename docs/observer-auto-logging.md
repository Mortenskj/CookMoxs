# Hidden Observer Logging

Formålet er automatisk baggrundslogging uden synlig UI-påvirkning for normale brugere.

Det her er ikke session replay. Det er en skjult observer-kæde, som samler:

- klientdiagnostics som `window error`, `unhandledrejection`, `session_error` og `console.warn/error`
- analytics/events med `sessionId`
- API request start/slut med `requestId`, status og varighed
- server warnings/errors via console bridge
- hele AI request/response-bodyen for `/api/ai/*`
- før/efter tekst-captures for AI-transformationer af ingredienser og trin
- før/efter sektions-screenshots for de relevante recipe-sektioner, når capture lykkes

## Hvad brugeren mærker

Intet i UI.

Der er ingen nye synlige knapper, overlays eller flows. Den eneste runtime-effekt er små baggrundsevents og ekstra headers på samme-origin requests:

- `x-cookmoxs-session-id`
- `x-request-id` i serverrespons

## Lokal PowerShell

Når appen kører lokalt, skrives observer-events også til:

- `.dev-observe/live/observer-<startup>.ndjson`

Hvis UI-capture er aktivt og lykkes, gemmes screenshots under:

- `.dev-observe/captures/<sessionId>/`

## Render / hosted

For hosted miljøer kan skjult observer-logning holdes tændt ved at sætte:

- `OBSERVER_ENABLED=true`

Hvis du også vil kunne hente logs sikkert via hidden endpoint, sæt:

- `OBSERVER_EXPORT_TOKEN=<secret>`

## Hidden endpoints

Status:

- `GET /api/__observer/status`

Recent events:

- `GET /api/__observer/recent`
- `GET /api/__observer/recent?sessionId=<id>&limit=200`

Her vil AI-kald typisk dukke op som:

- `ai_request_body`
- `ai_response_body`
- `ai_transformation_capture`

Hvis `OBSERVER_EXPORT_TOKEN` er sat, skal requesten have header:

- `x-observer-token: <secret>`

## Praktisk brug

Når du senere beder mig lave sanity checks, kan jeg enten:

- læse `.dev-observe/live/*.ndjson` lokalt
- eller hente `__observer`-endpointet, hvis miljøet er hostet og eksponeret med token

Det er bevidst holdt smallere end OpenReplay/rrweb for at minimere risiko og undgå brugerrettede ændringer.
