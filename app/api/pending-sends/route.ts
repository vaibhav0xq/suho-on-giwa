import { NextResponse } from "next/server";
import { getAddress, isAddress } from "viem";
import { readGuardedSendsForAddress } from "../../../lib/activity-index";
import { syncGuardedSendsForAddress } from "../../../lib/guarded-send-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

  try {
    await syncGuardedSendsForAddress(address, role);
  } catch (error) {
    syncWarning = error instanceof Error ? error.message : "Guarded send sync failed.";
  }

  const rows = await readGuardedSendsForAddress(address, role, includeClosed);

  return NextResponse.json(syncWarning ? { rows, syncWarning } : { rows });
}
