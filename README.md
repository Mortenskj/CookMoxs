# CookMoxs

CookMoxs is a recipe app with a React + TypeScript frontend, an Express server, and Firebase/Auth + Firestore as the only cloud backend.
All AI calls stay on the server through Google GenAI.

## Product flow

The main flow is:

`Import -> edit -> cook -> save`

Cook mode prefers omission over misinformation.
Induction guidance is normalized to one exact level on a 1-9 scale.

## Runtime architecture

- Frontend: React 19 + TypeScript + Vite
- Backend: `server.ts` with Express
- AI: server-side Google GenAI only
- Cloud data/auth: Firebase Auth + Firestore
- Offline/local: browser local storage plus the app recipe cache

## Firebase files in the repo

- `firebase-applet-config.json`
  Client Firebase bootstrap config imported by [src/firebase.ts](/C:/Users/morte/Documents/GitHub/codex%20run/Codex%20Alpha/src/firebase.ts)
- `firebase-blueprint.json`
  Removed in this repair pass because it was not part of the active runtime or documentation flow

## Local setup

Requirements:

- Node.js 20.x
- `GEMINI_API_KEY` for AI routes

Install and run:

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
NODE_ENV=production npm start
```

## Environment variables

| Variable | Purpose |
| --- | --- |
| `GEMINI_API_KEY` | Required for the server-side Gemini routes |

Firebase client configuration is read from `firebase-applet-config.json` in this repository.
No Supabase environment variables are used.

## Deploy

[render.yaml](https://render.com/) defines a single Node web service that:

- installs dependencies
- builds the frontend
- starts `server.ts`

Set `GEMINI_API_KEY` in Render before using AI features in production.

## Verification focus

This repair pass centers on:

- centralized AI model IDs
- categorized AI/server failures
- safer public URL fetching
- canonical cook-mode normalization for both new and existing recipes
- Firebase/Firestore-only repo and deploy truth
