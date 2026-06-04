# Agent and Lolo Notes

## Architecture

- `apps/web`: Next.js UI, server actions, and API routes.
- `packages/domain`: shared schemas, types, adapter interfaces, and future Drizzle DB models.
- `packages/extraction`: OpenAI extraction pipeline plus mock fallback for local development.
- `packages/export`: Excel generation from reviewed normalized rows.
- `apps/web/lib`: current local/dev adapters for auth, state, files, repositories, and workflow services.

## Flow

1. User opens a business workspace.
2. User creates or selects a shared preset.
3. User uploads PDF/image files into a processing job.
4. Extraction service reads files and asks OpenAI for strict JSON transaction rows.
5. Rows are normalized and stored for review.
6. User edits/approves rows in the review table.
7. App exports reviewed rows to Excel.
8. Source files are deleted after export.

## AI Processing Simple

the actual "promt builder" is in buildInstructions(...) in : `packages\extraction\src\index.ts`


1. The selected template gives the AI instructions, categories, and ignore rules.
2. The uploaded file is read from storage and converted to base64.
3. The app sends the file plus a strict JSON schema to OpenAI.
4. OpenAI returns transaction rows in JSON.
5. The app normalizes that JSON into the internal row format.
6. Those rows are saved, shown in review, and later exported to Excel.
