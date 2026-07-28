import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

type Deployments = {
  deployer: string;
  contracts: {
    SuhoRegistry: {
      address: string;
      eas: string;
      schemaUID: string;
      minStake: string;
      flagThreshold: number;
      unchallengedFlagDelay: number;
    };
    TrustOracle: {
      address: string;
      dojangScroll: string;
      dojangAttesterId: string;
      registry: string;
    };
    GuardedSend: {
      address: string;
      registry: string;
      recallWindow: number;
    };
  };
};

const root = process.cwd();
const deploymentsPath = path.join(root, "deployments.json");
const deployments = JSON.parse(fs.readFileSync(deploymentsPath, "utf8")) as Deployments;
const hardhatBin = path.join(root, "node_modules", ".bin", process.platform === "win32" ? "hardhat.cmd" : "hardhat");
const runner = process.platform === "win32" ? "cmd.exe" : hardhatBin;
const prefixArgs = process.platform === "win32" ? ["/c", hardhatBin] : [];

const jobs: Array<{ name: string; args: string[] }> = [
  {
    name: "SuhoRegistry",
    args: [
      "verify",
      "--network",
      "giwaSepolia",
      deployments.contracts.SuhoRegistry.address,
      deployments.contracts.SuhoRegistry.eas,
      deployments.contracts.SuhoRegistry.schemaUID,
      deployments.contracts.SuhoRegistry.minStake,
      String(deployments.contracts.SuhoRegistry.flagThreshold),
      String(deployments.contracts.SuhoRegistry.unchallengedFlagDelay),
      deployments.deployer
    ]
  },
  {
    name: "TrustOracle",
    args: [
      "verify",
      "--network",
      "giwaSepolia",
      deployments.contracts.TrustOracle.address,
      deployments.contracts.TrustOracle.dojangScroll,
      deployments.contracts.TrustOracle.dojangAttesterId,
      deployments.contracts.TrustOracle.registry
    ]
  },
  {
    name: "GuardedSend",
    args: [
      "verify",
      "--network",
      "giwaSepolia",
      deployments.contracts.GuardedSend.address,
      deployments.contracts.GuardedSend.registry,
      String(deployments.contracts.GuardedSend.recallWindow)
    ]
  }
];

for (const job of jobs) {
  console.log(`\n== Verifying ${job.name} ==`);
  const result = spawnSync(runner, [...prefixArgs, ...job.args], { stdio: "inherit", shell: false });
  if (result.error) console.error(result.error);
  if (result.status !== 0) {
    console.error(`\n${job.name} verification failed with exit code ${result.status ?? "unknown"}.`);
    process.exit(result.status ?? 1);
  }
}

console.log("\nAll deployed Suho contracts submitted for verification.");
