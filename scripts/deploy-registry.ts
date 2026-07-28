import "dotenv/config";

import fs from "node:fs";
import path from "node:path";
import { type Abi, createPublicClient, createWalletClient, http, parseEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { requiredEnv } from "../lib/env";
import { GIWA_CONTRACTS, GIWA_RPC_URL, GIWA_SEPOLIA } from "../lib/giwa";

const SUHO_SCHEMA_UID = "0x5512e735739f9bb56213d5bd69e04bdff780cb8c9e22e7195ace20112f145584" as const;
const MIN_STAKE = parseEther("0.0001");
const FLAG_THRESHOLD = 3;
const UNCHALLENGED_FLAG_DELAY = 24 * 60 * 60;

async function main() {
  const account = privateKeyToAccount(requiredEnv("DEPLOYER_PRIVATE_KEY") as `0x${string}`);
  const publicClient = createPublicClient({ chain: GIWA_SEPOLIA, transport: http(GIWA_RPC_URL) });
  const walletClient = createWalletClient({ account, chain: GIWA_SEPOLIA, transport: http(GIWA_RPC_URL) });
  const artifactPath = path.join(process.cwd(), "artifacts", "contracts", "src", "SuhoRegistry.sol", "SuhoRegistry.json");
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8")) as { abi: Abi; bytecode: `0x${string}` };

  const hash = await walletClient.deployContract({
    abi: artifact.abi,
    bytecode: artifact.bytecode,
    args: [
      GIWA_CONTRACTS.eas,
      SUHO_SCHEMA_UID,
      MIN_STAKE,
      FLAG_THRESHOLD,
      UNCHALLENGED_FLAG_DELAY,
      account.address
    ]
  });

  console.log(`SuhoRegistry deployment submitted: ${hash}`);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (!receipt.contractAddress) throw new Error("Deployment receipt did not include a contract address.");

  const deployment = {
    chainId: GIWA_SEPOLIA.id,
    network: GIWA_SEPOLIA.name,
    deployedAt: new Date().toISOString(),
    deployer: account.address,
    contracts: {
      SuhoRegistry: {
        address: receipt.contractAddress,
        txHash: hash,
        blockNumber: receipt.blockNumber.toString(),
        eas: GIWA_CONTRACTS.eas,
        schemaUID: SUHO_SCHEMA_UID,
        minStake: MIN_STAKE.toString(),
        flagThreshold: FLAG_THRESHOLD,
        unchallengedFlagDelay: UNCHALLENGED_FLAG_DELAY,
        verified: false
      }
    }
  };

  fs.writeFileSync(path.join(process.cwd(), "deployments.json"), `${JSON.stringify(deployment, null, 2)}\n`);
  console.log(`SuhoRegistry deployed: ${receipt.contractAddress}`);
  console.log(`Block: ${receipt.blockNumber}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});