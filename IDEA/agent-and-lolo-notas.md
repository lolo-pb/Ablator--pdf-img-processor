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
