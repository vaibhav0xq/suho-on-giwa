import { BadgeCheck, ChevronRight, Database, Search, Shield } from "lucide-react";
import type { TrustReport, VerdictTone } from "../lib/suho-types";
import { registryStatuses, verdictCopy } from "../lib/suho-view";

type TrustConsoleProps = {
  recipientInput: string;
  onRecipientChange: (value: string) => void;
  onCheck: () => void;
  isChecking: boolean;
  trustReport: TrustReport | undefined;
  resolvedRecipient: `0x${string}` | undefined;
  resolvedLabel: string | undefined;
  riskReasons: string[];
  onOpenProfile: () => void;
};

function stepClass(lit: boolean, tone?: VerdictTone) {
  return ["vr-step", lit ? "is-lit" : "is-idle", tone ? `tone-${tone}` : ""].filter(Boolean).join(" ");
}

export function TrustConsole({
  recipientInput,
  onRecipientChange,
  onCheck,
  isChecking,
  trustReport,
  resolvedRecipient,
  resolvedLabel,
  riskReasons,
  onOpenProfile
}: TrustConsoleProps) {
  const verdict = trustReport ? verdictCopy[trustReport.verdict] : undefined;
  const VerdictIcon = verdict?.icon ?? Shield;
  const registryLabel = trustReport ? registryStatuses[trustReport.registryStatus] ?? "Unknown" : undefined;

  const identityTone: VerdictTone | undefined = trustReport ? (trustReport.dojangVerified ? "safe" : "caution") : undefined;
  const registryTone: VerdictTone | undefined = trustReport
    ? registryLabel === "Clean" ? "safe" : registryLabel === "Flagged" ? "danger" : "caution"
    : undefined;

  const pillClass = verdict && !isChecking
    ? `pill pill--${verdict.tone === "safe" ? "ok" : verdict.tone === "caution" ? "warn" : "danger"}`
    : "pill pill--neutral";

  return (
    <div className="panel panel--lift console" id="check">
      <div className="console__head">
        <span className="console__title">Recipient check</span>
        <span className={pillClass}>{isChecking ? "Checking" : verdict?.name ?? "Live read"}</span>
      </div>

      <div className="input-row">
        <label className="sr-only" htmlFor="recipient">Recipient address or up.id name</label>
        <input
          id="recipient"
          value={recipientInput}
          onChange={(event) => onRecipientChange(event.target.value)}
          onKeyDown={(event) => { if (event.key === "Enter") onCheck(); }}
          className={isChecking ? "input input--mono scanline" : "input input--mono"}
          placeholder="0x... or name.up.id"
          spellCheck={false}
          autoComplete="off"
        />
        <button onClick={onCheck} disabled={isChecking} className="btn btn--primary">
          <Search size={16} />
          {isChecking ? "Checking" : "Check"}
        </button>
      </div>

      <div className="verdict-route">
        <div className={stepClass(Boolean(trustReport), identityTone)}>
          <span className="vr-node"><BadgeCheck size={13} /></span>
          <span className="grow">
            <span className="vr-label">Identity - Dojang</span>
            <span className="vr-value">{trustReport ? (trustReport.dojangVerified ? "Verified" : "Unverified") : "Awaiting check"}</span>
          </span>
        </div>
        <div className={stepClass(Boolean(trustReport), registryTone)}>
          <span className="vr-node"><Database size={13} /></span>
          <span className="grow">
            <span className="vr-label">Registry</span>
            <span className="vr-value">{registryLabel ?? "--"}</span>
          </span>
        </div>
        <div className={stepClass(Boolean(verdict), verdict?.tone)}>
          <span className="vr-node"><VerdictIcon size={13} /></span>
          <span className="grow">
            <span className="vr-label">Verdict</span>
            <span className="vr-value">{verdict?.name ?? "--"}</span>
          </span>
        </div>
      </div>

      {trustReport ? (
        <div className="reasons mt-4">
          {riskReasons.map((reason) => <span key={reason} className="reason">{reason}</span>)}
        </div>
      ) : (
        <p className="muted text-sm mt-4">Enter a GIWA address or an active up.id name to read live identity and registry status.</p>
      )}

      <div className="between mt-4">
        <p className="muted text-sm">
          {resolvedRecipient ? (resolvedLabel ?? "Address resolved") : "No recipient resolved yet"}
        </p>
        <button onClick={onOpenProfile} disabled={!resolvedRecipient || !trustReport} className="btn btn--subtle btn--sm">
          Profile <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}
