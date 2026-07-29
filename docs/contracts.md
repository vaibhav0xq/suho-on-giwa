# Contracts

The contract layer is intentionally small. It handles recipient registry state, trust checks, and guarded sends.

## Network

Current deployments target GIWA Sepolia.

| Item | Value |
| --- | --- |
| Chain ID | `91342` |
| Explorer | `https://sepolia-explorer.giwa.io` |
| RPC | `https://sepolia-rpc.giwa.io` |

## Deployed Contracts

Deployment metadata is stored in `deployments.json`.

| Contract | Address | Purpose |
| --- | --- | --- |
| SuhoRegistry | `0x8c76e459ff950d24fe8bf3ac8374049cf3b4a77d` | Recipient reports and registry status |
| TrustOracle | `0x8a94bca28a5241c3aba272d5b6fbdf2c71e6603d` | Recipient verdict reads |
| GuardedSend | `0xfb19b30114fbc6b785aee4fd2f81cfd44e2ffa29` | Recallable guarded send route |

## Guarded Send Flow

1. The sender checks a recipient in the console.
2. The app reads the trust oracle and registry state.
3. If the recipient is acceptable, the sender calls `sendGuarded(recipient)` with ETH.
4. The send remains recallable during the configured recall window.
5. The sender can cancel during the recall window, or the recipient can claim after release.

The current `GuardedSend` deployment uses a 600 second recall window.

## Development Commands

```bash
npm run contracts:compile
npm run contracts:test
```

Deployment and verification helpers:

```bash
npm run deploy:registry
npm run deploy:phase2
npm run verify:deployments
```

A local `.env` file is required for deployment keys. Do not commit private keys or generated artifacts.
