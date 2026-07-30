# Security

Suho is currently a GIWA Sepolia testnet project available at `https://thesuho.xyz`.

The contracts in this repo are useful for testing the guarded-send flow, but they should not be treated as production-ready mainnet contracts.

## Scope

Security reports should be about code in this repository:

- Solidity contracts in `contracts/src/`
- API routes in `app/api/`
- chain/client helpers in `lib/`
- wallet and transaction flows in the web app

Issues in GIWA, Dojang, EAS, wallet extensions, RPC providers, or Blockscout should be reported to those projects directly.

## Reporting

For reproducible issues, open a GitHub issue with:

- affected file or contract
- steps to reproduce
- expected result
- actual result
- transaction hash or test case, if available

Do not post private keys, seed phrases, wallet secrets, RPC credentials, or private user data.

## Local Secrets

Keep deployment keys and RPC credentials in a local `.env` file. The repo ignores env files and does not include an env example because values are deployment-specific.

## Before Production Use

Before adapting this flow for production, review the recall window, cancellation path, claim path, registry report rules, oracle assumptions, and deployment ownership model.
