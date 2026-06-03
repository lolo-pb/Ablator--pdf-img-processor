# Bank Reconciliation Extraction Platform

Web-first, desktop-portable document extraction platform for bank summaries, reconciliations, and spending classification.

## Workspace layout

- `apps/web`: Next.js web app and server actions
- `packages/domain`: shared domain model, validation, adapters, and Drizzle schema
- `packages/extraction`: OpenAI extraction pipeline and mock fallback
- `packages/export`: Excel export helpers

## Local development

1. Install dependencies: `npm install`
2. Start the app: `npm run dev`
3. Open `http://localhost:3000`

If `OPENAI_API_KEY` is not set, extraction falls back to a deterministic mock provider so the review/export flow still works.

