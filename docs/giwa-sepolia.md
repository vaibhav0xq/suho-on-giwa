# GIWA Sepolia

Suho targets GIWA Sepolia, the GIWA testnet used for app and contract development.

## Network Values

| Item | Value |
| --- | --- |
| Chain ID | `91342` |
| Native token | `ETH` |
| RPC | `https://sepolia-rpc.giwa.io` |
| Flashblocks RPC | `https://sepolia-rpc-flashblocks.giwa.io` |
| Explorer | `https://sepolia-explorer.giwa.io` |
| Docs | `https://docs.giwa.io` |

## GIWA Contracts Used By Suho

The app keeps GIWA ecosystem addresses in `lib/giwa.ts`.

| Contract | Address |
| --- | --- |
| EAS | `0x4200000000000000000000000000000000000021` |
| Schema Registry | `0x4200000000000000000000000000000000000020` |
| Dojang Scroll | `0xd5077b67dcb56caC8b270C7788FC3E6ee03F17B9` |
| UP ID Registry | `0x091D00004f21eb2Fc30964A8a4995692d9b49628` |

## Verification Scripts

The `phase0` scripts are small network checks for GIWA reads, schema setup, UP ID resolution, and Flashblocks status.

```bash
npm run phase0
```

Run individual checks from `package.json` when debugging a specific integration.
