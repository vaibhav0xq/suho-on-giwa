// Pure, side-effect-free display + normalization helpers shared by page.tsx and
// the presentational components. No React state here -- just formatting and shaping.

import { formatEther, parseEther } from "viem";
import { AlertTriangle, BadgeCheck, Shield, XCircle } from "lucide-react";
import type { PendingSend, PendingSendResponse, SignedSession, TrustReport, VerdictName, VerdictTone } from "./suho-types";

// Matches the icon-typing pattern already used in the original page.tsx (typeof <icon>),
// which avoids depending on a named type export from the pinned lucide-react build.
export type IconType = typeof Shield;

export const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

export const registryStatuses = ["Clean", "Reported", "Flagged", "Cleared"] as const;

export type VerdictMeta = { name: VerdictName; tone: VerdictTone; text: string; icon: IconType };

export const verdictCopy: Record<number, VerdictMeta> = {
  0: { name: "Safe", tone: "safe", text: "Dojang verified. Registry clean.", icon: BadgeCheck },
  1: { name: "Caution", tone: "caution", text: "Identity or registry status is incomplete.", icon: AlertTriangle },
  2: { name: "Danger", tone: "danger", text: "Recipient is flagged or mismatched.", icon: XCircle }
};

export const NEUTRAL_ICON: IconType = Shield;

export function shortAddress(address?: string) {
  if (!address) return "Not connected";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function explorerTxUrl(hash: `0x${string}`) {
  return `https://sepolia-explorer.giwa.io/tx/${hash}`;
}

export function explorerAddressUrl(address: `0x${string}`) {
  return `https://sepolia-explorer.giwa.io/address/${address}`;
}

export function isSessionFresh(session: SignedSession | undefined, nowMs = Date.now()) {
  if (!session) return false;
  const issuedAt = Date.parse(session.issuedAt);
  return Number.isFinite(issuedAt) && nowMs >= issuedAt && nowMs - issuedAt < SESSION_TTL_MS;
}

export function sessionAgeLabel(session: SignedSession | undefined, nowSeconds: number) {
  if (!session) return "Signature needed";
  const issuedAt = Date.parse(session.issuedAt);
  if (!Number.isFinite(issuedAt)) return "Signature needed";
  const ageSeconds = Math.max(0, nowSeconds - Math.floor(issuedAt / 1000));
  if (ageSeconds < 60) return "Signed now";
  if (ageSeconds < 3600) return `Signed ${Math.floor(ageSeconds / 60)}m ago`;
  return `Signed ${Math.floor(ageSeconds / 3600)}h ago`;
}

export function sendDirection(send: PendingSend, activeAccount?: string) {
  return activeAccount && send.sender.toLowerCase() === activeAccount.toLowerCase() ? "Sent" : "Incoming";
}

export function sendStatus(send: PendingSend) {
  if (send.claimed) return "Claimed";
  if (send.cancelled) return "Cancelled";
  return "Active";
}

export function sendStatusPill(send: PendingSend) {
  if (send.claimed) return "pill pill--ok";
  if (send.cancelled) return "pill pill--danger";
  return "pill pill--warn";
}

export function releaseLabel(send: PendingSend, now: number) {
  if (send.claimed) return "Claimed";
  if (send.cancelled) return "Cancelled";
  const remaining = Math.max(0, Number(send.releaseAt) - now);
  if (remaining > 0) return `${remaining}s recallable`;
  return "Claimable";
}

export function parseAmountWei(value: string) {
  const clean = value.trim();
  if (!clean) return undefined;
  try {
    return parseEther(clean);
  } catch {
    return undefined;
  }
}

export function balanceLabel(value: bigint | undefined) {
  if (value === undefined) return "--";
  const eth = Number(formatEther(value));
  if (!Number.isFinite(eth)) return "--";
  if (eth === 0) return "0 ETH";
  return `${eth.toLocaleString(undefined, { maximumFractionDigits: 6 })} ETH`;
}

export function sendDetailLabel(send: PendingSend, activeAccount: `0x${string}` | undefined) {
  const direction = sendDirection(send, activeAccount);
  const counterparty = direction === "Sent" ? send.recipient : send.sender;
  return `${direction} ${shortAddress(counterparty)}`;
}

export function normalizeTrustReport(raw: unknown): TrustReport {
  const value = raw as TrustReport | readonly [number, boolean, number, number, bigint];
  if (Array.isArray(value)) {
    return {
      verdict: Number(value[0]),
      dojangVerified: Boolean(value[1]),
      registryStatus: Number(value[2]),
      reportCount: Number(value[3]),
      totalStake: BigInt(value[4])
    };
  }
  const objectValue = value as TrustReport;
  return {
    verdict: Number(objectValue.verdict),
    dojangVerified: Boolean(objectValue.dojangVerified),
    registryStatus: Number(objectValue.registryStatus),
    reportCount: Number(objectValue.reportCount),
    totalStake: BigInt(objectValue.totalStake)
  };
}

export function normalizePendingJson(row: NonNullable<PendingSendResponse["rows"]>[number]): PendingSend {
  return {
    id: BigInt(row.id),
    sender: row.sender,
    recipient: row.recipient,
    amount: BigInt(row.amount),
    releaseAt: BigInt(row.releaseAt),
    transactionHash: row.transactionHash,
    claimed: row.claimed,
    cancelled: row.cancelled
  };
}

export function mergeSends(rows: PendingSend[]) {
  return [...new Map(rows.map((row) => [row.id.toString(), row])).values()].sort((a, b) => Number(b.id - a.id));
}

export function normalizePending(id: bigint, raw: unknown): PendingSend {
  const value = raw as PendingSend | readonly [`0x${string}`, `0x${string}`, bigint, bigint, boolean, boolean];
  if (Array.isArray(value)) {
    return {
      id,
      sender: value[0],
      recipient: value[1],
      amount: BigInt(value[2]),
      releaseAt: BigInt(value[3]),
      transactionHash: undefined,
      claimed: Boolean(value[4]),
      cancelled: Boolean(value[5])
    };
  }
  const objectValue = value as PendingSend;
  return {
    id,
    sender: objectValue.sender,
    recipient: objectValue.recipient,
    amount: BigInt(objectValue.amount),
    releaseAt: BigInt(objectValue.releaseAt),
    transactionHash: objectValue.transactionHash,
    claimed: Boolean(objectValue.claimed),
    cancelled: Boolean(objectValue.cancelled)
  };
}
