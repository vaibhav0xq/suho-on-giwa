import { NextResponse } from "next/server";
import { getAddress, isAddress } from "viem";
import { readGuardedSendsForAddress } from "../../../lib/activity-index";
import type { GuardedSendInput } from "../../../lib/activity-index";
import { syncGuardedSendsForAddress } from "../../../lib/guarded-send-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function mergeRows(indexRows: GuardedSendInput[], chainRows: GuardedSendInput[], includeClosed: boolean) {
  const merged = new Map<string, GuardedSendInput>();
  for (const row of indexRows) merged.set(row.id, row);
  for (const row of chainRows) merged.set(row.id, row);

  return Array.from(merged.values())
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
  let chainRows: GuardedSendInput[] = [];

  try {
    const sync = await syncGuardedSendsForAddress(address, role);
    chainRows = sync.rows;
    syncWarning = "storeWarning" in sync ? sync.storeWarning : undefined;
  } catch (error) {
    syncWarning = error instanceof Error ? error.message : "Guarded send sync failed.";
  }

  const indexRows = await readGuardedSendsForAddress(address, role, includeClosed);
  const rows = mergeRows(indexRows, chainRows, includeClosed);

  return NextResponse.json(syncWarning ? { rows, syncWarning } : { rows });
}
