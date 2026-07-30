# Architecture

Suho is split into a web app, contract layer, and activity index.

## Web App

The Next.js app lives in `app/` and uses client-side wallet interaction for the main console. The overview is available at `/`, and the console is available at `/console`. API routes are used for activity indexing and sync endpoints.

Key files:

- `app/page.tsx` - shared overview and console experience
- `app/console/page.tsx` - console route entry
- `app/api/activity-index/route.ts` - activity index reads
- `app/api/activity-index/sync/route.ts` - activity sync endpoint
- `app/api/pending-sends/route.ts` - pending guarded send reads

## UI Components

Reusable product UI is kept in `components/`. The console is composed from panels for wallet state, recipient checks, reporting, guarded send controls, settlement steps, and activity history.

## Chain Layer

Chain constants and ABI bindings live in `lib/`.

- `lib/giwa.ts` defines GIWA Sepolia, public RPC URLs, and GIWA ecosystem contract addresses used by the app.
- `lib/app-contracts.ts` reads deployed Suho contract addresses from `deployments.json` and exports the ABI fragments used by the UI.
- `lib/guarded-send-sync.ts` syncs `GuardedSend` events into the activity store.

## Activity Index

The activity index tracks guarded sends by sender and recipient. The hosted app can rebuild wallet-specific activity from `GuardedSend` events, so a database is not required for the current public testnet build.

The local JSON-backed index is a development cache. A Postgres schema is included in `docs/activity-index-postgres.sql` for a managed backend later.

The shared activity model is in `lib/activity-store.ts`.

## Contracts

The Solidity sources are in `contracts/src/` and tests are in `contracts/test/`.

- `SuhoRegistry` records reports and registry state.
- `TrustOracle` reads Dojang/registry status and returns a compact recipient verdict.
- `GuardedSend` holds ETH in a recallable route before claim.
