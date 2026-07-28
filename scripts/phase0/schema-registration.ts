import { createWalletClient, http, zeroAddress } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { schemaRegistryAbi } from "../../lib/abis";
import { requiredEnv } from "../../lib/env";
import { GIWA_CONTRACTS, GIWA_RPC_URL, GIWA_SEPOLIA } from "../../lib/giwa";
import { standardClient } from "./clients";

const SUHO_SCAM_REPORT_SCHEMA = "address suspect,uint8 category,string evidenceURI,uint256 stake";
async function main() {
  const account = privateKeyToAccount(requiredEnv("DEPLOYER_PRIVATE_KEY") as `0x${string}`);
  const walletClient = createWalletClient({
    account,
    chain: GIWA_SEPOLIA,
    transport: http(GIWA_RPC_URL)
  });

  console.log(`Registering Suho schema from ${account.address}`);
  console.log(`SchemaRegistry: ${GIWA_CONTRACTS.schemaRegistry}`);
  console.log(`Schema: ${SUHO_SCAM_REPORT_SCHEMA}`);

  const { request } = await standardClient.simulateContract({
    account,
    address: GIWA_CONTRACTS.schemaRegistry,
    abi: schemaRegistryAbi,
    functionName: "register",
    args: [SUHO_SCAM_REPORT_SCHEMA, zeroAddress, true]
  });

  const hash = await walletClient.writeContract(request);
  console.log(`Schema registration submitted: ${hash}`);

  const receipt = await standardClient.waitForTransactionReceipt({ hash });
  console.log(`Schema registration included in block ${receipt.blockNumber}`);

  const registryLog = receipt.logs.find(
    (log) => log.address.toLowerCase() === GIWA_CONTRACTS.schemaRegistry.toLowerCase()
  );
  const schemaUid = registryLog?.topics[1];

  if (schemaUid) {
    console.log(`Suho schema UID: ${schemaUid}`);
    return;
  }

  console.log("Schema UID was not found in SchemaRegistry logs; inspect the transaction on Blockscout.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});