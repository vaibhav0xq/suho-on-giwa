import "dotenv/config";

import fs from "node:fs";
import path from "node:path";
import { type Abi, createPublicClient, http, parseEther } from "viem";
import { optionalEnv } from "../lib/env";
import { GIWA_RPC_URL, GIWA_SEPOLIA } from "../lib/giwa";

function loadArtifact(contractName: string) {
  const artifactPath = path.join(process.cwd(), "artifacts", "contracts", "src", `${contractName}.sol`, `${contractName}.json`);
  return JSON.parse(fs.readFileSync(artifactPath, "utf8")) as { abi: Abi };
}

async function main() {
  const deployments = JSON.parse(fs.readFileSync(path.join(process.cwd(), "deployments.json"), "utf8"));
  const client = createPublicClient({ chain: GIWA_SEPOLIA, transport: http(GIWA_RPC_URL) });
  const oracle = deployments.contracts.TrustOracle.address as `0x${string}`;
  const guarded = deployments.contracts.GuardedSend.address as `0x${string}`;
  const registry = deployments.contracts.SuhoRegistry.address as `0x${string}`;
  const verifiedAddress = optionalEnv("SUHO_VERIFIED_ADDRESS") as `0x${string}` | undefined;
  if (!verifiedAddress) throw new Error("SUHO_VERIFIED_ADDRESS is required for live oracle check.");

  const oracleArtifact = loadArtifact("TrustOracle");
  const guardedArtifact = loadArtifact("GuardedSend");

  const trustReport = await client.readContract({
    address: oracle,
    abi: oracleArtifact.abi,
    functionName: "check",
    args: [verifiedAddress]
  });

  const recallWindow = await client.readContract({
    address: guarded,
    abi: guardedArtifact.abi,
    functionName: "recallWindow"
  });

  console.log("TrustOracle:", oracle);
  console.log("GuardedSend:", guarded);
  console.log("SuhoRegistry:", registry);
  console.log("Verified address report:", trustReport);
  console.log("GuardedSend recall window:", recallWindow?.toString?.() ?? recallWindow);
  console.log("Expected min guarded send amount for local testing:", parseEther("0.0001").toString());
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});