# Team Introduction

## Team

Suho is built by Vaibhav (`vaibhav0xq`), an India-based developer focused on practical web3 products, wallet UX, and EVM application flows. For this submission, the project is handled as a solo build covering product direction, frontend implementation, Solidity contracts, GIWA Sepolia integration, testing, deployment, and public documentation.

## Role

Vaibhav designed and built Suho as a recipient-check and guarded-send app for GIWA Sepolia. The work includes the overview page, wallet console, recipient reading flow, activity ledger, guarded-send contracts, deployment scripts, and public launch setup.

## Project

Suho helps users check a recipient before value moves. A sender can connect a wallet, sign a console session, measure a recipient against registry and oracle state, and submit a guarded send with a recall window. The recipient can claim after the release window, while the sender can cancel during the recall period.

Live app: https://thesuho.xyz

Console: https://thesuho.xyz/console

GitHub: https://github.com/vaibhav0xq/suho-on-giwa

## GIWA Alignment

Suho is built on GIWA Sepolia and uses GIWA RPC endpoints, EVM-compatible Solidity contracts, and on-chain event reads for the activity ledger. The project is intended to show how fast GIWA testnet transactions and reads can support a safer transaction workflow without requiring a hosted database for the current public build.

## Core Strengths

- Product thinking around wallet safety and recipient verification
- Full-stack web3 implementation with Next.js, TypeScript, Solidity, Hardhat, Viem, and Tailwind CSS
- Practical handling of on-chain reads, event syncing, wallet sessions, and guarded-send state
- Clear public documentation, deployment metadata, and reproducible local commands
- Security-first handling of testnet keys, environment variables, and public repo hygiene

## Experience

Vaibhav has experience building user-facing crypto applications, identity and wallet flows, testnet integrations, and public developer-facing repositories. Suho continues that work by focusing on a narrow transaction-safety problem: helping users avoid blind sends by adding a measurable recipient check before release.

## Current Status

The project is live on Vercel at `thesuho.xyz`, with the console available at `/console`. Contracts are deployed on GIWA Sepolia, and activity is read from `GuardedSend` events. The current build is testnet software and is not intended for mainnet funds without further audit, monitoring, and production key management.