import { NextResponse } from "next/server";
import { getAddress, isAddress } from "viem";
import { readGuardedSendsForAddress } from "../../../lib/activity-index";
import type { GuardedSendInput } from "../../../lib/activity-index";
import { syncGuardedSendsForAddress } from "../../../lib/guarded-send-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function rowKey(row: GuardedSendInput) {
  return row.id;
}

function mergeRows(primary: GuardedSendInput[], fallback: GuardedSendInput[], includeClosed: boolean) {
  const rows = new Map<string, GuardedSendInput>();

  for (const row of fallback) rows.set(rowKey(row), row);
  for (const row of primary) rows.set(rowKey(row), row);

  return Array.from(rows.values())
    .filter((row) => includeClosed || (!row.claimed && !row.cancelled))
    .sort((a, b) => Number(BigInt(b.id) - BigInt(a.id)));
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const addressInput = url.searchParams.get("address") ?? url.searchParams.get("sender") ?? "";
  const role = url.searchParams.get("role") === "recipient" ? "recipient" : "sender";
  const includeClosed = url.searchParams.get("includeClosed") === "true";

  if (!isAddress(addressInput)) {
    return NextResponse.json({ error: "Invalid address." }, { status: 400 });
  }

  const address = getAddress(addressInput);
  let syncWarning: string | undefined;
  let syncedRows: GuardedSendInput[] = [];

  try {
    const syncResult = await syncGuardedSendsForAddress(address, role);
    syncedRows = syncResult.rows;
    syncWarning = "cacheWarning" in syncResult ? syncResult.cacheWarning : undefined;
  } catch (error) {
    syncWarning = error instanceof Error ? error.message : "Guarded send sync failed.";
  }

  let indexedRows: GuardedSendInput[] = [];
  try {
    indexedRows = await readGuardedSendsForAddress(address, role, includeClosed);
  } catch (error) {
    syncWarning = syncWarning ?? (error instanceof Error ? error.message : "Activity index read failed.");
  }

  const rows = mergeRows(syncedRows, indexedRows, includeClosed);

  return NextResponse.json(syncWarning ? { rows, syncWarning } : { rows });
}
