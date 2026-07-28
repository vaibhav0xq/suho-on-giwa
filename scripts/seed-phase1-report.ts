import "dotenv/config";

import fs from "node:fs";
import path from "node:path";
import { type Abi, createPublicClient, createWalletClient, decodeEventLog, http, parseEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { requiredEnv } from "../lib/env";
import { GIWA_RPC_URL, GIWA_SEPOLIA } from "../lib/giwa";

const REPORT_EVENT_ABI = {
  type: "event",
  name: "Reported",
  inputs: [
    { name: "reportId", type: "uint256", indexed: true },
    { name: "suspect", type: "address", indexed: true },
    { name: "reporter", type: "address", indexed: true },
    { name: "attestationUID", type: "bytes32", indexed: false },
    { name: "category", type: "uint8", indexed: false },
    { name: "stake", type: "uint256", indexed: false },
    { name: "evidenceURI", type: "string", indexed: false }
  ]
} as const;

async function main() {
  const account = privateKeyToAccount(requiredEnv("DEPLOYER_PRIVATE_KEY") as `0x${string}`);
  const publicClient = createPublicClient({ chain: GIWA_SEPOLIA, transport: http(GIWA_RPC_URL) });
  const walletClient = createWalletClient({ account, chain: GIWA_SEPOLIA, transport: http(GIWA_RPC_URL) });
  const deploymentPath = path.join(process.cwd(), "deployments.json");
  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  const registryAddress = deployment.contracts.SuhoRegistry.address as `0x${string}`;
  const artifactPath = path.join(process.cwd(), "artifacts", "contracts", "src", "SuhoRegistry.sol", "SuhoRegistry.json");
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8")) as { abi: Abi };

  const suspect = "0x1111111111111111111111111111111111111111" as const;
  const evidenceURI = `https://sepolia-explorer.giwa.io/address/${suspect}`;
  const nonce = await publicClient.getTransactionCount({ address: account.address, blockTag: "pending" });
  const hash = await walletClient.writeContract({
    address: registryAddress,
    abi: artifact.abi,
    functionName: "report",
    args: [suspect, 4, evidenceURI],
    value: parseEther("0.0001"),
    nonce
  });

  console.log(`Report transaction submitted: ${hash}`);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log(`Report included in block ${receipt.blockNumber}`);

  let attestationUID: string | undefined;
  for (const log of receipt.logs) {
    try {
      const decoded = decodeEventLog({ abi: [REPORT_EVENT_ABI], data: log.data, topics: log.topics });
      if (decoded.eventName === "Reported") {
        attestationUID = decoded.args.attestationUID;
      }
    } catch {
      // Ignore unrelated logs.
    }
  }

  const result = {
    createdAt: new Date().toISOString(),
    chainId: GIWA_SEPOLIA.id,
    registry: registryAddress,
    txHash: hash,
    blockNumber: receipt.blockNumber.toString(),
    reporter: account.address,
    suspect,
    evidenceURI,
    attestationUID
  };

  fs.writeFileSync(path.join(process.cwd(), "phase1-report.json"), `${JSON.stringify(result, null, 2)}\n`);
  console.log(`Report attestation UID: ${attestationUID ?? "not decoded"}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});