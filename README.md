# Suho

Recipient checks and guarded sends on GIWA Sepolia.

![Next.js](https://img.shields.io/badge/Next.js-14-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Solidity](https://img.shields.io/badge/Solidity-0.8.24-363636)
![Network](https://img.shields.io/badge/GIWA-Sepolia-10b981)

Suho is a testnet app for checking a recipient before value is sent. It combines a web console, GIWA Sepolia reads, and a small contract set for registry checks and guarded sends.

The current build has two main screens:

- Overview: shows the assay route and how a recipient reading moves through the flow.
- Console: connects a wallet, checks a recipient, shows registry state, submits guarded sends, and tracks activity.

## Network

Suho targets GIWA Sepolia.

| Item | Value |
| --- | --- |
| Chain ID | `91342` |
| RPC | `https://sepolia-rpc.giwa.io` |
| Flashblocks RPC | `https://sepolia-rpc-flashblocks.giwa.io` |
| Explorer | `https://sepolia-explorer.giwa.io` |
| Docs | `https://docs.giwa.io` |

## What Is Included

- Next.js app router UI
- Wallet session and recipient check flow
- UP-style identifier and address input handling
- Guarded send contract integration
- Activity index for sent and incoming guarded sends
- Solidity contracts for registry, trust oracle, and guarded sends
- Deployment and verification scripts for GIWA Sepolia

## Contracts

Current GIWA Sepolia deployment metadata is stored in [`deployments.json`](./deployments.json).

| Contract | Address |
| --- | --- |
| SuhoRegistry | `0x8c76e459ff950d24fe8bf3ac8374049cf3b4a77d` |
| TrustOracle | `0x8a94bca28a5241c3aba272d5b6fbdf2c71e6603d` |
| GuardedSend | `0xfb19b30114fbc6b785aee4fd2f81cfd44e2ffa29` |

## Repository Layout

```txt
app/          Next.js routes and API handlers
components/   UI components
contracts/    Solidity contracts and tests
lib/          chain clients, activity storage, and sync helpers
docs/         project notes and implementation docs
scripts/      deployment and verification scripts
public/       static assets
```

## Setup

```bash
npm install
npm run dev
```

The app runs at `http://localhost:3000`.

Create a local `.env` file for keys and deployment-specific values. This repo intentionally does not include an env example file.

Common local values:

```txt
GIWA_RPC_URL=
GIWA_FLASHBLOCKS_RPC_URL=
DEPLOYER_PRIVATE_KEY=
GIWA_EXPLORER_API_KEY=
```

## Commands

```bash
npm run typecheck
npm run build
npm run contracts:compile
npm run contracts:test
```

GIWA checks and deployment helpers:

```bash
npm run phase0
npm run deploy:registry
npm run deploy:phase2
npm run verify:deployments
```

## Docs

- [Architecture](./docs/architecture.md)
- [Contracts](./docs/contracts.md)
- [Development](./docs/development.md)
- [GIWA Sepolia](./docs/giwa-sepolia.md)
- [Activity store](./docs/activity-store.md)

## Status

This is testnet software. Do not use it with mainnet funds without a contract audit, production monitoring, and proper key management.
