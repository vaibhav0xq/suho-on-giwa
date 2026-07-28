import { NextResponse } from "next/server";
import { readActivityIndexStats } from "../../../../lib/activity-index";
import { syncGuardedSendsByBlockCursor } from "../../../../lib/guarded-send-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseBlockSpan(value: string | null) {
  if (!value) return undefined;
  const parsed = BigInt(value);
  if (parsed <= 0n || parsed > 20_000n) throw new Error("Block span must be between 1 and 20000.");
  return parsed;
}

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const before = await readActivityIndexStats();
    const result = await syncGuardedSendsByBlockCursor(before.guardedSendLastSyncedBlock, parseBlockSpan(url.searchParams.get("blockSpan")));
    const after = await readActivityIndexStats();

    return NextResponse.json({
      sync: {
        fromBlock: result.fromBlock.toString(),
        toBlock: result.toBlock.toString(),
        latestBlock: result.latestBlock.toString(),
        eventCount: result.eventCount,
        advanced: result.advanced
      },
      stats: after
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Sync failed." }, { status: 400 });
  }
}
