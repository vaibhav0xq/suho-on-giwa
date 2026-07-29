import { Copy, ExternalLink, X } from "lucide-react";
import { formatEther } from "viem";
import type { PendingSend, TrustReport } from "../lib/suho-types";
import {
  NEUTRAL_ICON,
  explorerAddressUrl,
  registryStatuses,
  releaseLabel,
  sendStatus,
  sendStatusPill,
  shortAddress,
  verdictCopy
} from "../lib/suho-view";
import { Metric, InfoLine } from "./primitives";

type RecipientDrawerProps = {
  resolvedRecipient: `0x${string}`;
  resolvedLabel: string | undefined;
  trustReport: TrustReport;
  riskReasons: string[];
  recipientActivity: PendingSend[];
  isProfileActivityLoading: boolean;
  now: number;
  onClose: () => void;
  onSelectSend: (send: PendingSend) => void;
};

export function RecipientDrawer({
  resolvedRecipient,
  resolvedLabel,
  trustReport,
  riskReasons,
  recipientActivity,
  isProfileActivityLoading,
  now,
  onClose,
  onSelectSend
}: RecipientDrawerProps) {
  const verdict = verdictCopy[trustReport.verdict];
  const VerdictIcon = verdict?.icon ?? NEUTRAL_ICON;
  const registryLabel = registryStatuses[trustReport.registryStatus] ?? "Unknown";

  return (
    <div
      className="scrim open"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <aside className="drawer open" onMouseDown={(event) => event.stopPropagation()}>
        <div className="drawer__head">
          <div className="grow">
            <p className="drawer__kicker">Recipient profile</p>
            <h2 className="drawer__title mono">{shortAddress(resolvedRecipient)}</h2>
            <p className="drawer__sub">{resolvedLabel ?? "Address input"}</p>
          </div>
          <button type="button" onClick={onClose} className="drawer__close" aria-label="Close recipient profile"><X size={16} /></button>
        </div>

        <div className="drawer__body">
          <div className={verdict ? `verdict verdict--${verdict.tone}` : "verdict verdict--idle"}>
            <div className="verdict__top">
              <span className="verdict__badge"><VerdictIcon size={20} /></span>
              <div className="grow">
                <p className="verdict__label">Verdict</p>
                <p className="verdict__name">{verdict?.name ?? "Ready"}</p>
              </div>
              <span className={verdict?.tone === "safe" ? "pill pill--ok" : verdict?.tone === "danger" ? "pill pill--danger" : "pill pill--warn"}>{registryLabel}</span>
            </div>
            <div className="reasons">
              {riskReasons.map((reason) => <span key={`profile-${reason}`} className="reason">{reason}</span>)}
            </div>
          </div>

          <div className="grid-4">
            <Metric label="Identity" value={trustReport.dojangVerified ? "Verified" : "Unverified"} />
            <Metric label="Registry" value={registryLabel} />
            <Metric label="Reports" value={String(trustReport.reportCount)} />
            <Metric label="Activity" value={`${recipientActivity.length} related`} />
          </div>

          <div className="drawer__section">
            <p className="drawer__section-title">Read path</p>
            <div className="route">
              <span>Dojang</span><i /><span>Registry</span><i /><span>Activity</span>
            </div>
          </div>

          <div className="drawer__section">
            <div className="between">
              <p className="drawer__section-title">Related activity</p>
              <span className="pill pill--neutral">{isProfileActivityLoading ? "Loading" : `${recipientActivity.length} shown`}</span>
            </div>
            {isProfileActivityLoading ? (
              <div className="empty">Loading guarded-send activity...</div>
            ) : recipientActivity.length === 0 ? (
              <div className="empty">No guarded-send activity for this recipient.</div>
            ) : (
              <div className="stack gap-2">
                {recipientActivity.map((send) => {
                  const direction = send.sender.toLowerCase() === resolvedRecipient.toLowerCase() ? "Sent" : "Incoming";
                  return (
                    <button key={`profile-activity-${send.id.toString()}`} onClick={() => onSelectSend(send)} className="info-line">
                      <span className="grow stack gap-2">
                        <b className="ladder__label">{direction}</b>
                        <small className="trow__sub">{formatEther(send.amount)} ETH - {releaseLabel(send, now)}</small>
                      </span>
                      <span className={sendStatusPill(send)}>{sendStatus(send)}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="drawer__section">
            <p className="drawer__section-title">Address</p>
            <InfoLine label="Recipient" value={resolvedRecipient} copy={resolvedRecipient} />
          </div>

          <div className="grid-2">
            <a href={explorerAddressUrl(resolvedRecipient)} target="_blank" rel="noreferrer" className="btn btn--ghost">
              Open address <ExternalLink size={15} />
            </a>
            <button onClick={() => navigator.clipboard.writeText(resolvedRecipient)} className="btn btn--ghost">
              Copy address <Copy size={15} />
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
