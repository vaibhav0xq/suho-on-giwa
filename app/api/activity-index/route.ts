import { NextResponse } from "next/server";
import { readActivityIndexStats } from "../../../lib/activity-index";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const stats = await readActivityIndexStats();
  return NextResponse.json({ stats });
}
