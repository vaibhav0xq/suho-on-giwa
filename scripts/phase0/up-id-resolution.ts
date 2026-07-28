import { getAddress, isAddress, pad, numberToHex } from "viem";
import { upIdRegistryAbi } from "../../lib/abis";
import { optionalEnv } from "../../lib/env";
import { GIWA_CONTRACTS } from "../../lib/giwa";
import { standardClient } from "./clients";

const configuredName = optionalEnv("SUHO_UP_ID_NAME");
const configuredAddress = optionalEnv("SUHO_VERIFIED_ADDRESS");

if (!configuredName) {
  console.log("Set SUHO_UP_ID_NAME to a real name like username.up.id after issuing one in GIWA Playground.");
  process.exit(0);
}

if (!configuredAddress || !isAddress(configuredAddress)) {
  console.log("Set SUHO_VERIFIED_ADDRESS to the wallet that owns the issued up.id name.");
  process.exit(0);
}

const expectedFullName = configuredName;
const expectedLabel = configuredName.endsWith(".up.id") ? configuredName.slice(0, -6) : configuredName;
const owner = getAddress(configuredAddress);

async function main() {
  const hasActiveName = await standardClient.readContract({
    address: GIWA_CONTRACTS.upIdRegistry,
    abi: upIdRegistryAbi,
    functionName: "hasActiveName",
    args: [owner]
  });

  console.log(`${owner} has active up.id: ${hasActiveName}`);

  if (!hasActiveName) {
    throw new Error("The configured address does not have an active up.id in the GIWA UPIdRegistry.");
  }

  const tokenId = await standardClient.readContract({
    address: GIWA_CONTRACTS.upIdRegistry,
    abi: upIdRegistryAbi,
    functionName: "ownedTokenId",
    args: [owner]
  });

  const tokenKey = pad(numberToHex(tokenId), { size: 32 });
  const label = await standardClient.readContract({
    address: GIWA_CONTRACTS.upIdRegistry,
    abi: upIdRegistryAbi,
    functionName: "getLabel",
    args: [tokenKey]
  });

  const tokenOwner = await standardClient.readContract({
    address: GIWA_CONTRACTS.upIdRegistry,
    abi: upIdRegistryAbi,
    functionName: "ownerOf",
    args: [tokenId]
  });

  const actualFullName = `${label}.up.id`;
  console.log(`UPIdRegistry tokenId: ${tokenId}`);
  console.log(`UPIdRegistry label: ${label}`);
  console.log(`UPIdRegistry full name: ${actualFullName}`);
  console.log(`UPIdRegistry owner: ${tokenOwner}`);

  if (actualFullName !== expectedFullName || label !== expectedLabel) {
    throw new Error(`Configured SUHO_UP_ID_NAME=${expectedFullName} does not match registry name ${actualFullName}.`);
  }

  if (getAddress(tokenOwner) !== owner) {
    throw new Error("UP ID owner does not match SUHO_VERIFIED_ADDRESS.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});