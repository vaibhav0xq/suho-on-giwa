import { GIWA_SEPOLIA } from "./giwa";

export type GuardedSendStatus = "active" | "claimed" | "cancelled";

export type GuardedSendRecord = {
  id: string;
  chainId: number;
  sender: `0x${string}`;
  recipient: `0x${string}`;
  amount: string;
  releaseAt: string;
  claimed: boolean;
  cancelled: boolean;
  transactionHash?: `0x${string}` | undefined;
  status: GuardedSendStatus;
  updatedAt: string;
};

export type GuardedSendInput = Omit<GuardedSendRecord, "chainId" | "updatedAt">;

export type ActivityIndexStats = {
  provider: "local" | "postgres";
  guardedSendCount: number;
  guardedSendLastSyncedAt?: string | undefined;
  guardedSendLastSyncedBlock?: string | undefined;
};

export type ActivityStore = {
  readonly provider: ActivityIndexStats["provider"];
  upsertGuardedSends(rows: GuardedSendInput[], lastSyncedBlock?: bigint | undefined): Promise<void>;
  readGuardedSendsForAddress(address: `0x${string}`, role: "sender" | "recipient", includeClosed: boolean): Promise<GuardedSendInput[]>;
  readStats(): Promise<ActivityIndexStats>;
};

export function guardedSendKey(chainId: number, id: string) {
  return `${chainId}:${id}`;
}

export function stripStoreFields(row: GuardedSendRecord): GuardedSendInput {
  const { chainId: _chainId, updatedAt: _updatedAt, ...publicRow } = row;
  return publicRow;
}

export function sameAddress(a: string, b: string) {
  return a.toLowerCase() === b.toLowerCase();
}

export const ACTIVITY_CHAIN_ID = GIWA_SEPOLIA.id;
