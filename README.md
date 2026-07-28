# Suho

Suho is a GIWA Sepolia testnet app for checking a recipient before sending value.

The app has two main views:

- an overview page for the assay flow
- a console for wallet connection, recipient checks, guarded sends, and activity history

The contracts and UI are built around a simple flow: resolve a recipient, read the registry state, submit a guarded send, and keep settlement status visible.

## GIWA Sepolia

This repo targets GIWA Sepolia.

- RPC: `https://sepolia-rpc.giwa.io`
- Explorer: `https://sepolia-explorer.giwa.io`
- Docs: `https://docs.giwa.io`

GIWA is EVM-compatible, so the contracts are written and tested with the usual Solidity/Hardhat toolchain.

## Stack

- Next.js
- React
- TypeScript
- Solidity
- Hardhat
- Viem
- Tailwind CSS

## Project Structure

```txt
app/          Next.js routes and API handlers
components/   UI components
contracts/    Solidity contracts and tests
lib/          chain clients, activity storage, and sync helpers
docs/         notes for storage/indexing
scripts/      deployment and verification scripts
public/       static assets
```

## Run Locally

```bash
npm install
npm run dev
```

The app runs at `http://localhost:3000` by default.

For chain calls or deployments, create a local `.env` file with your own RPC/private-key settings. This repo does not include an example env file because environment values are deployment-specific.

## Useful Commands

```bash
npm run typecheck
npm run build
npm run contracts:compile
npm run contracts:test
```

GIWA checks and deployment helpers are available in `package.json`:

```bash
npm run phase0
npm run deploy:registry
npm run deploy:phase2
npm run verify:deployments
```

## Notes

This is testnet software. Do not use it for mainnet funds without a proper audit, production monitoring, and key-management setup.

Do not commit `.env` files, private keys, wallet secrets, logs, local databases, or build output.
