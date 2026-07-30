# Suho

![Next.js](https://img.shields.io/badge/Next.js-16-black)
![React](https://img.shields.io/badge/React-18-149eca)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Solidity](https://img.shields.io/badge/Solidity-0.8.24-363636)
![Hardhat](https://img.shields.io/badge/Hardhat-2-f5c542)
![Viem](https://img.shields.io/badge/Viem-2-646cff)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-38bdf8)
![Network](https://img.shields.io/badge/GIWA-Sepolia-10b981)

Recipient checks and guarded sends on GIWA Sepolia.

Suho is a testnet app for checking a recipient before value is sent. It combines a web console, GIWA Sepolia reads, and a small contract set for registry checks and guarded sends.

Live app: [thesuho.xyz](https://thesuho.xyz)
Console: [thesuho.xyz/console](https://thesuho.xyz/console)

## Overview

Most wallet send flows treat the recipient address as a final input. Suho adds a check step before the send is signed. The app resolves the recipient, reads registry and trust state, and lets the sender submit a guarded send when the reading is acceptable.

The current build has two main screens:

- Overview: explains the assay route, checkpoints, recipient reading, and settlement path.
- Console: connects a wallet, signs a session, checks a recipient, submits guarded sends, and tracks activity.

## Network

Suho targets GIWA Sepolia.

| Item | Value |
| --- | --- |
| Chain ID | `91342` |
| RPC | `https://sepolia-rpc.giwa.io` |
| Flashblocks RPC | `https://sepolia-rpc-flashblocks.giwa.io` |
| Explorer | `https://sepolia-explorer.giwa.io` |
| Docs | `https://docs.giwa.io` |

GIWA is EVM-compatible, so the contracts use a standard Solidity, Hardhat, and Viem workflow.

## Features

- Wallet connection and signed console session
- Address and UP-style recipient input handling
- Recipient status reads from GIWA Sepolia contracts
- Registry verdict display before guarded release
- Guarded send submission with a 600 second recall window
- Sender cancel flow before release
- Recipient claim flow after release
- All, Sent, Incoming, and Closed activity tabs
- On-chain activity sync from `GuardedSend` events
- Local activity index for development caching
- Optional Postgres schema for managed activity storage later
- GIWA deployment and verification scripts

## Contracts

Current GIWA Sepolia deployment metadata is stored in [`deployments.json`](./deployments.json).

| Contract | Address | Purpose |
| --- | --- | --- |
| SuhoRegistry | `0x8c76e459ff950d24fe8bf3ac8374049cf3b4a77d` | Recipient reports and registry state |
| TrustOracle | `0x8a94bca28a5241c3aba272d5b6fbdf2c71e6603d` | Recipient verdict reads |
| GuardedSend | `0xfb19b30114fbc6b785aee4fd2f81cfd44e2ffa29` | Recallable guarded send route |

The current `GuardedSend` deployment uses a 600 second recall window.

## Flow

```txt
recipient input
  -> resolve address / identifier
  -> read trust oracle and registry state
  -> show verdict in console
  -> submit guarded send
  -> cancel during recall window or claim after release
```

The UI keeps route state visible so a user can tell whether a send is waiting, recallable, cancelled, claimed, or ready to claim.

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

## Activity Data

Suho does not require a hosted database for the current public testnet build. The activity API syncs `GuardedSend` events from GIWA Sepolia for the connected wallet and returns those rows directly. The local activity index is a development cache; a managed database can be added later if the project needs faster global history, analytics, or longer retention.

## App Routes

| Path | Purpose |
| --- | --- |
| `/` | Overview |
| `/console` | Wallet console and guarded send workflow |
| `/api/activity-index` | Reads indexed guarded send activity |
| `/api/activity-index/sync` | Syncs guarded send events |
| `/api/pending-sends` | Reads wallet activity from GIWA events and the local index |

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
ETHEREUM_RPC_URL=
DEPLOYER_PRIVATE_KEY=
GIWA_EXPLORER_API_KEY=
```

`GIWA_RPC_URL` falls back to `https://sepolia-rpc.giwa.io` when it is not set.

## Commands

```bash
npm run lint
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

## Documentation

- [Architecture](./docs/architecture.md)
- [Contracts](./docs/contracts.md)
- [Development](./docs/development.md)
- [GIWA Sepolia](./docs/giwa-sepolia.md)
- [Activity store](./docs/activity-store.md)

## Security

Suho is testnet software. Do not use it with mainnet funds without a contract audit, production monitoring, and proper key management.

Do not commit `.env` files, private keys, wallet secrets, local databases, build output, or production logs.
