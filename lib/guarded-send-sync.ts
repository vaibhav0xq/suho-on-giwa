import { createPublicClient, http } from "viem";
import deployments from "../deployments.json";
import { contracts, guardedSendAbi } from "./app-contracts";
import { upsertGuardedSends } from "./activity-index";
import { GIWA_RPC_URL, GIWA_SEPOLIA } from "./giwa";

const client = createPublicClient({ chain: GIWA_SEPOLIA, transport: http(GIWA_RPC_URL) });
const guardedDeploymentBlock = BigInt(deployments.contracts.GuardedSend.blockNumber);
const DEFAULT_SYNC_BLOCK_SPAN = 4_000n;

type PendingTuple = readonly [`0x${string}`, `0x${string}`, bigint, bigint, boolean, boolean];

type PendingObject = {
  sender: `0x${string}`;
  recipient: `0x${string}`;
  amount: bigint;
  releaseAt: bigint;
  claimed: boolean;
  cancelled: boolean;
};

type SentEventRow = {
  id: bigint;
  sender: `0x${string}`;
  recipient: `0x${string}`;
  amount: bigint;
  releaseAt: bigint;
  transactionHash: `0x${string}`;
};

function isPendingTuple(value: PendingTuple | PendingObject): value is PendingTuple {
  return Array.isArray(value);
}

function normalizePending(raw: PendingTuple | PendingObject) {
  return isPendingTuple(raw)
    ? {
        sender: raw[0],
        recipient: raw[1],
        amount: raw[2],
        releaseAt: raw[3],
        claimed: raw[4],
        cancelled: raw[5]
      }
    : raw;
}

function serializePending(id: bigint, row: PendingObject, transactionHash?: `0x${string}`) {
  return {
    id: id.toString(),
    sender: row.sender,
    recipient: row.recipient,
    amount: row.amount.toString(),
    releaseAt: row.releaseAt.toString(),
    claimed: row.claimed,
    cancelled: row.cancelled,
    transactionHash,
    status: row.cancelled ? "cancelled" as const : row.claimed ? "claimed" as const : "active" as const
  };
}

async function readSend(id: bigint) {
  const row = (await client.readContract({
    address: contracts.guardedSend,
    abi: guardedSendAbi,
    functionName: "sendAt",
    args: [id]
  })) as PendingTuple | PendingObject;
  return normalizePending(row);
}

async function readFromSentEvent(eventRow: SentEventRow) {
  const liveRow = await readSend(eventRow.id);
  return serializePending(eventRow.id, {
    sender: liveRow.sender,
    recipient: liveRow.recipient,
    amount: liveRow.amount,
    releaseAt: liveRow.releaseAt,
    claimed: liveRow.claimed,
    cancelled: liveRow.cancelled
  }, eventRow.transactionHash);
}

async function syncLogs(args: {
  fromBlock: bigint;
  toBlock: bigint | "latest";
  sender?: `0x${string}` | undefined;
  recipient?: `0x${string}` | undefined;
}) {
  const logs = await client.getContractEvents({
    address: contracts.guardedSend,
    abi: guardedSendAbi,
    eventName: "Sent",
    args: { sender: args.sender, recipient: args.recipient },
    fromBlock: args.fromBlock,
    toBlock: args.toBlock
  });

  const eventRows = logs
    .map((log) => ({ ...log.args, transactionHash: log.transactionHash }))
    .filter((logArgs): logArgs is SentEventRow => typeof logArgs.id === "bigint" && Boolean(logArgs.sender && logArgs.recipient && logArgs.transactionHash) && typeof logArgs.amount === "bigint" && typeof logArgs.releaseAt === "bigint");

  const rows = await Promise.all(eventRows.map((row) => readFromSentEvent(row)));
  const lastEventBlock = logs.reduce<bigint | undefined>((latest, log) => {
    if (typeof log.blockNumber !== "bigint") return latest;
    return latest === undefined || log.blockNumber > latest ? log.blockNumber : latest;
  }, undefined);

  return { rows, eventCount: rows.length, lastEventBlock };
}

export async function syncGuardedSendsForAddress(address: `0x${string}`, role: "sender" | "recipient") {
  const result = await syncLogs({
    fromBlock: guardedDeploymentBlock,
    toBlock: "latest",
    sender: role === "sender" ? address : undefined,
    recipient: role === "recipient" ? address : undefined
  });

  try {
    await upsertGuardedSends(result.rows, result.lastEventBlock);
    return result;
  } catch (error) {
    return {
      ...result,
      cacheWarning: error instanceof Error ? error.message : "Activity cache write failed."
    };
  }
}

export async function syncGuardedSendsByBlockCursor(lastSyncedBlock?: string | undefined, blockSpan = DEFAULT_SYNC_BLOCK_SPAN) {
  const latestBlock = await client.getBlockNumber();
  const previousBlock = lastSyncedBlock ? BigInt(lastSyncedBlock) : guardedDeploymentBlock - 1n;
  const fromBlock = previousBlock + 1n;

  if (fromBlock > latestBlock) {
    return { fromBlock, toBlock: latestBlock, latestBlock, eventCount: 0, advanced: false };
  }

  const toBlock = fromBlock + blockSpan - 1n > latestBlock ? latestBlock : fromBlock + blockSpan - 1n;
  const result = await syncLogs({ fromBlock, toBlock });
  try {
    await upsertGuardedSends(result.rows, toBlock);
  } catch {
    // Hosted serverless runtimes may not provide writable project storage.
  }

  return { fromBlock, toBlock, latestBlock, eventCount: result.eventCount, advanced: true };
}
