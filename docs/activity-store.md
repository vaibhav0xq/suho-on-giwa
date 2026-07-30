# Suho Activity Store

Suho now reads and writes activity through `ActivityStore` instead of direct file access.

## Current Store

- Provider: `local`
- File: `data/suho-index.json`
- Git behavior: generated index data is ignored; only `data/.gitkeep` is tracked.
- Source: `lib/local-activity-store.ts`

The hosted testnet build can read wallet-specific activity directly from GIWA events, so a managed database is optional for the current scope.

## Optional Managed Store

Use Postgres through Supabase, Neon, or another managed Postgres service if the project needs faster global history or analytics later.

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
4. API routes merge chain-synced rows with indexed rows and return current activity.

Endpoints:

- `GET /api/pending-sends?address=...&role=sender|recipient&includeClosed=true`
- `GET /api/activity-index`
- `POST /api/activity-index/sync?blockSpan=1000`
