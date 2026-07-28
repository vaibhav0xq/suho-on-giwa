import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { getAddress, isAddress } from "viem";
import { ACTIVITY_CHAIN_ID, ActivityStore, GuardedSendInput, GuardedSendRecord, guardedSendKey, sameAddress, stripStoreFields } from "./activity-store";

type LocalActivityIndex = {
  version: 1;
  guardedSends: Record<string, GuardedSendRecord>;
  sync: {
    guardedSendLastSyncedAt?: string | undefined;
    guardedSendLastSyncedBlock?: string | undefined;
  };
};

const INDEX_DIR = path.join(process.cwd(), "data");
const INDEX_PATH = path.join(INDEX_DIR, "suho-index.json");
let writeQueue = Promise.resolve();

function createEmptyIndex(): LocalActivityIndex {
  return { version: 1, guardedSends: {}, sync: {} };
}

function normalizeAddress(address: string): `0x${string}` | undefined {
  return isAddress(address) ? getAddress(address) : undefined;
}

async function readIndex(): Promise<LocalActivityIndex> {
  try {
    const raw = await readFile(INDEX_PATH, "utf8");
    const parsed = JSON.parse(raw) as LocalActivityIndex;
    if (parsed.version !== 1 || !parsed.guardedSends || !parsed.sync) return createEmptyIndex();
    return parsed;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return createEmptyIndex();
    throw error;
  }
}

async function writeIndex(index: LocalActivityIndex) {
  await mkdir(INDEX_DIR, { recursive: true });
  const tmpPath = `${INDEX_PATH}.${process.pid}.tmp`;
  await writeFile(tmpPath, `${JSON.stringify(index, null, 2)}\n`, "utf8");
  await rename(tmpPath, INDEX_PATH);
}

export class LocalActivityStore implements ActivityStore {
  readonly provider = "local" as const;

  async upsertGuardedSends(rows: GuardedSendInput[], lastSyncedBlock?: bigint | undefined) {
    const updatedAt = new Date().toISOString();
    writeQueue = writeQueue.then(async () => {
      const index = await readIndex();
      for (const row of rows) {
        const sender = normalizeAddress(row.sender);
        const recipient = normalizeAddress(row.recipient);
        if (!sender || !recipient) continue;
        index.guardedSends[guardedSendKey(ACTIVITY_CHAIN_ID, row.id)] = {
          ...row,
          sender,
          recipient,
          chainId: ACTIVITY_CHAIN_ID,
          updatedAt
        };
      }
      index.sync.guardedSendLastSyncedAt = updatedAt;
      if (lastSyncedBlock !== undefined) index.sync.guardedSendLastSyncedBlock = lastSyncedBlock.toString();
      await writeIndex(index);
    });
    await writeQueue;
  }

  async readGuardedSendsForAddress(address: `0x${string}`, role: "sender" | "recipient", includeClosed: boolean) {
    const index = await readIndex();
    const normalized = getAddress(address);
    return Object.values(index.guardedSends)
      .filter((row) => row.chainId === ACTIVITY_CHAIN_ID)
      .filter((row) => (role === "recipient" ? sameAddress(row.recipient, normalized) : sameAddress(row.sender, normalized)))
      .filter((row) => includeClosed || (!row.claimed && !row.cancelled))
      .sort((a, b) => Number(BigInt(b.id) - BigInt(a.id)))
      .map(stripStoreFields);
  }

  async readStats() {
    const index = await readIndex();
    return {
      provider: this.provider,
      guardedSendCount: Object.keys(index.guardedSends).length,
      guardedSendLastSyncedAt: index.sync.guardedSendLastSyncedAt,
      guardedSendLastSyncedBlock: index.sync.guardedSendLastSyncedBlock
    };
  }
}
