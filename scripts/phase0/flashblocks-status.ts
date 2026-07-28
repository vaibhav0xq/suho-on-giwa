import { createWalletClient, http, parseEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { requiredEnv } from "../../lib/env";
import { GIWA_RPC_URL, GIWA_SEPOLIA } from "../../lib/giwa";
import { flashblocksClient, standardClient } from "./clients";

async function main() {
  const account = privateKeyToAccount(requiredEnv("DEPLOYER_PRIVATE_KEY") as `0x${string}`);
  const walletClient = createWalletClient({
    account,
    chain: GIWA_SEPOLIA,
    transport: http(GIWA_RPC_URL)
  });

  const nonce = await standardClient.getTransactionCount({
    address: account.address,
    blockTag: "pending"
  });

  const startedAt = performance.now();
  const hash = await walletClient.sendTransaction({
    account,
    to: account.address,
    value: parseEther("0"),
    nonce
  });

  console.log(`Submitted self-transfer: ${hash}`);
  console.log(`Nonce: ${nonce}`);

  const preconfirmStartedAt = performance.now();
  let observedPreconfirmation = false;

  for (let i = 0; i < 30; i += 1) {
    const receipt = await flashblocksClient.getTransactionReceipt({ hash }).catch(() => null);

    if (receipt) {
      observedPreconfirmation = true;
      console.log(`Flashblocks receipt observed in ${Math.round(performance.now() - preconfirmStartedAt)}ms`);
      break;
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  if (!observedPreconfirmation) {
    console.log("Flashblocks receipt was not observed within 3000ms; falling back to standard receipt.");
  }

  const receipt = await standardClient.waitForTransactionReceipt({ hash });
  console.log(`Included in block ${receipt.blockNumber} after ${Math.round(performance.now() - startedAt)}ms`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});