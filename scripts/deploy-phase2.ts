import "dotenv/config";

import fs from "node:fs";
import path from "node:path";
import { type Abi, createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { requiredEnv } from "../lib/env";
import { DOJANG_ATTESTER_IDS, GIWA_CONTRACTS, GIWA_RPC_URL, GIWA_SEPOLIA } from "../lib/giwa";

const RECALL_WINDOW = 10 * 60;

function loadArtifact(contractName: string) {
  const artifactPath = path.join(process.cwd(), "artifacts", "contracts", "src", `${contractName}.sol`, `${contractName}.json`);
  return JSON.parse(fs.readFileSync(artifactPath, "utf8")) as { abi: Abi; bytecode: `0x${string}` };
}

async function main() {
  const account = privateKeyToAccount(requiredEnv("DEPLOYER_PRIVATE_KEY") as `0x${string}`);
  const publicClient = createPublicClient({ chain: GIWA_SEPOLIA, transport: http(GIWA_RPC_URL) });
  const walletClient = createWalletClient({ account, chain: GIWA_SEPOLIA, transport: http(GIWA_RPC_URL) });
  const deploymentPath = path.join(process.cwd(), "deployments.json");
  const deployments = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  const registryAddress = deployments.contracts.SuhoRegistry.address as `0x${string}`;

  const oracleArtifact = loadArtifact("TrustOracle");
  const guardedArtifact = loadArtifact("GuardedSend");

  let nonce = await publicClient.getTransactionCount({ address: account.address, blockTag: "pending" });

  const oracleHash = await walletClient.deployContract({
    abi: oracleArtifact.abi,
    bytecode: oracleArtifact.bytecode,
    args: [GIWA_CONTRACTS.dojangScroll, DOJANG_ATTESTER_IDS.testnetFaucet, registryAddress],
    nonce
  });
  console.log(`TrustOracle deployment submitted: ${oracleHash}`);
  const oracleReceipt = await publicClient.waitForTransactionReceipt({ hash: oracleHash });
  if (!oracleReceipt.contractAddress) throw new Error("TrustOracle deployment did not return a contract address.");
  console.log(`TrustOracle deployed: ${oracleReceipt.contractAddress}`);

  nonce += 1;
  const guardedHash = await walletClient.deployContract({
    abi: guardedArtifact.abi,
    bytecode: guardedArtifact.bytecode,
    args: [registryAddress, RECALL_WINDOW],
    nonce
  });
  console.log(`GuardedSend deployment submitted: ${guardedHash}`);
  const guardedReceipt = await publicClient.waitForTransactionReceipt({ hash: guardedHash });
  if (!guardedReceipt.contractAddress) throw new Error("GuardedSend deployment did not return a contract address.");
  console.log(`GuardedSend deployed: ${guardedReceipt.contractAddress}`);

  deployments.deployedAt = new Date().toISOString();
  deployments.contracts.TrustOracle = {
    address: oracleReceipt.contractAddress,
    txHash: oracleHash,
    blockNumber: oracleReceipt.blockNumber.toString(),
    dojangScroll: GIWA_CONTRACTS.dojangScroll,
    dojangAttesterId: DOJANG_ATTESTER_IDS.testnetFaucet,
    registry: registryAddress,
    verified: false
  };
  deployments.contracts.GuardedSend = {
    address: guardedReceipt.contractAddress,
    txHash: guardedHash,
    blockNumber: guardedReceipt.blockNumber.toString(),
    registry: registryAddress,
    recallWindow: RECALL_WINDOW,
    verified: false
  };

  fs.writeFileSync(deploymentPath, `${JSON.stringify(deployments, null, 2)}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});