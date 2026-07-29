# Security

Suho is testnet software.

Do not use this repository with mainnet funds unless the contracts, deployment flow, and operational setup have been reviewed for production use.

## Do Not Commit

- Private keys
- Seed phrases
- `.env` files
- RPC credentials
- Wallet secrets
- Local databases
- Build output
- Production logs

## Contract Safety

The current contracts are intended for GIWA Sepolia testing. Before using similar logic in production, review at minimum:

- recall window behavior
- sender cancellation path
- recipient claim path
- registry report economics
- oracle assumptions
- deployment ownership and upgrade policy

## Reporting

Open an issue for reproducible problems in the public testnet app or contracts. Do not include private keys, wallet secrets, or sensitive user data in reports.
