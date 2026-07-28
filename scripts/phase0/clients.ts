import "dotenv/config";

import { createPublicClient, http } from "viem";
import { mainnet } from "viem/chains";
import { ETHEREUM_RPC_URL, GIWA_FLASHBLOCKS_RPC_URL, GIWA_RPC_URL, GIWA_SEPOLIA } from "../../lib/giwa";

export const standardClient = createPublicClient({
  chain: GIWA_SEPOLIA,
  transport: http(GIWA_RPC_URL)
});

export const flashblocksClient = createPublicClient({
  chain: GIWA_SEPOLIA,
  transport: http(GIWA_FLASHBLOCKS_RPC_URL)
});

export const ethereumEnsClient = createPublicClient({
  chain: mainnet,
  transport: http(ETHEREUM_RPC_URL)
});