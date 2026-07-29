# Development

## Requirements

- Node.js
- npm
- GIWA Sepolia RPC access
- A testnet wallet for contract writes

## Install

```bash
npm install
```

## Run

```bash
npm run dev
```

The default Next.js URL is `http://localhost:3000`.

## Environment

Create a local `.env` file when you need chain writes, deployment, or verification. Environment values are not committed to this repo.

Common keys:

```txt
GIWA_RPC_URL=
GIWA_FLASHBLOCKS_RPC_URL=
ETHEREUM_RPC_URL=
DEPLOYER_PRIVATE_KEY=
GIWA_EXPLORER_API_KEY=
```

`GIWA_RPC_URL` falls back to `https://sepolia-rpc.giwa.io` when not set.

## Checks

```bash
npm run typecheck
npm run build
npm run contracts:compile
npm run contracts:test
```

## Data

Local activity data is ignored by git. The committed `data/.gitkeep` only preserves the folder.

For a managed backend, see `docs/activity-index-postgres.sql`.
