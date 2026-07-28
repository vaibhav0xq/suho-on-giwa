import { getAddress, isAddress, zeroHash } from "viem";
import { dojangScrollAbi, easReadAbi } from "../../lib/abis";
import { GIWA_CONTRACTS, DOJANG_ATTESTER_IDS } from "../../lib/giwa";
import { optionalEnv } from "../../lib/env";
import { standardClient } from "./clients";

const target = optionalEnv("SUHO_VERIFIED_ADDRESS");

if (!target || !isAddress(target)) {
  console.log("Set SUHO_VERIFIED_ADDRESS to a GIWA Sepolia address with a real Dojang attestation.");
  console.log(`DojangScroll: ${GIWA_CONTRACTS.dojangScroll}`);
  process.exit(0);
}

const account = getAddress(target);

async function main() {
  const blockNumber = await standardClient.getBlockNumber();
  console.log(`GIWA Sepolia block: ${blockNumber}`);
  console.log(`Checking Dojang status for ${account}`);

  let anyVerified = false;

  for (const [label, attesterId] of Object.entries(DOJANG_ATTESTER_IDS)) {
    try {
      const verified = await standardClient.readContract({
        address: GIWA_CONTRACTS.dojangScroll,
        abi: dojangScrollAbi,
        functionName: "isVerified",
        args: [account, attesterId]
      });

      anyVerified = anyVerified || verified;
      console.log(`${label}: verified=${verified}`);

      try {
        const uid = await standardClient.readContract({
          address: GIWA_CONTRACTS.dojangScroll,
          abi: dojangScrollAbi,
          functionName: "getVerifiedAddressAttestationUid",
          args: [account, attesterId]
        });

        console.log(`${label}: uid=${uid}`);

        if (uid !== zeroHash) {
          const attestation = await standardClient.readContract({
            address: GIWA_CONTRACTS.eas,
            abi: easReadAbi,
            functionName: "getAttestation",
            args: [uid]
          });
          console.log(`${label} EAS attestation:`, attestation);
        }
      } catch (error) {
        console.log(`${label}: attestation uid unavailable (${error instanceof Error ? error.message.split("\n")[0] : "unknown error"})`);
      }
    } catch (error) {
      console.log(`${label}: verification read unavailable (${error instanceof Error ? error.message.split("\n")[0] : "unknown error"})`);
    }
  }

  if (!anyVerified) {
    throw new Error("No Dojang attester reports this address as verified.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});