import { getActivityStore } from "./activity-store.server";
import type { GuardedSendInput } from "./activity-store";

export type { ActivityIndexStats, GuardedSendInput, GuardedSendRecord, GuardedSendStatus } from "./activity-store";

export async function upsertGuardedSends(rows: GuardedSendInput[], lastSyncedBlock?: bigint | undefined) {
  await getActivityStore().upsertGuardedSends(rows, lastSyncedBlock);
}

export async function readGuardedSendsForAddress(address: `0x${string}`, role: "sender" | "recipient", includeClosed: boolean) {
  return getActivityStore().readGuardedSendsForAddress(address, role, includeClosed);
}

export async function readActivityIndexStats() {
  return getActivityStore().readStats();
}
