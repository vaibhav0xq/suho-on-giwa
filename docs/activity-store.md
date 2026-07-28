# Suho Activity Store

Suho now reads and writes activity through `ActivityStore` instead of direct file access.

## Current Store

- Provider: `local`
- File: `data/suho-index.json`
- Git behavior: generated index data is ignored; only `data/.gitkeep` is tracked.
- Source: `lib/local-activity-store.ts`

This is suitable for local development and live GIWA testing. It is not the final production database.

## Production Store Target

Use Postgres through Supabase or Neon.

Required env when enabled later:

```env
ACTIVITY_STORE=postgres
DATABASE_URL=postgresql://...
```

The SQL schema is in `docs/activity-index-postgres.sql`.

## Store Contract

The app depends on `lib/activity-store.ts`:

- `upsertGuardedSends(rows, lastSyncedBlock)`
- `readGuardedSendsForAddress(address, role, includeClosed)`
- `readStats()`

The API and GIWA sync modules should only call the store contract/facade. Do not add raw storage writes inside route handlers.

## Sync Flow

1. `lib/guarded-send-sync.ts` reads live GIWA `GuardedSend.Sent` logs.
2. It reads `sendAt(id)` to get current `claimed/cancelled` state.
3. It writes normalized records through `ActivityStore`.
4. API routes return indexed rows.

Endpoints:

- `GET /api/pending-sends?address=...&role=sender|recipient&includeClosed=true`
- `GET /api/activity-index`
- `POST /api/activity-index/sync?blockSpan=1000`
