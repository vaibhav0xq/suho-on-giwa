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

The default Next.js URL is `http://localhost:3000`. The overview is served at `/`; the console is served at `/console`. The public domain is `https://thesuho.xyz`.

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

Keep `DEPLOYER_PRIVATE_KEY` local. It is used only by contract deployment scripts and is not needed by the Vercel app.

## Checks

```bash
npm run lint
npm run typecheck
npm run build
npm run contracts:compile
npm run contracts:test
```

## Data

Local activity data is ignored by git. The committed `data/.gitkeep` only preserves the folder.

For a managed backend, see `docs/activity-index-postgres.sql`.
