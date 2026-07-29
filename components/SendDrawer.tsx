import { ExternalLink, X } from "lucide-react";
import { formatEther } from "viem";
import type { PendingSend } from "../lib/suho-types";
import {
  explorerAddressUrl,
  explorerTxUrl,
  releaseLabel,
  sendDetailLabel,
  sendDirection,
  sendStatus,
  sendStatusPill,
  shortAddress
} from "../lib/suho-view";
import { Metric, InfoLine } from "./primitives";

type SendDrawerProps = {
  send: PendingSend;
  account: `0x${string}` | undefined;
  now: number;
  onClose: () => void;
  onCancel: (id: bigint) => void;
  onClaim: (id: bigint) => void;
};

type LifecycleState = "complete" | "active" | "blocked" | "idle";

export function SendDrawer({ send, account, now, onClose, onCancel, onClaim }: SendDrawerProps) {
  const direction = sendDirection(send, account);
  const counterparty = direction === "Sent" ? send.recipient : send.sender;
  const remaining = Math.max(0, Number(send.releaseAt) - now);
  const canCancel = direction === "Sent" && !send.claimed && !send.cancelled && remaining > 0;
  const canClaim = direction === "Incoming" && !send.claimed && !send.cancelled && remaining === 0;

  const lifecycle: Array<{ label: string; detail: string; state: LifecycleState }> = [
    { label: "Created", detail: "Recorded on GuardedSend", state: "complete" },
    {
      label: "Recall",
      detail: send.cancelled ? "Cancelled by sender" : remaining > 0 ? `${remaining}s remaining` : "Window closed",
      state: send.cancelled ? "blocked" : remaining > 0 ? "active" : "complete"
    },
    {
      label: "Release",
      detail: send.claimed ? "Claimed by recipient" : send.cancelled ? "Stopped" : remaining === 0 ? "Claimable" : "Waiting",
      state: send.claimed ? "complete" : send.cancelled ? "blocked" : remaining === 0 ? "active" : "idle"
    },
    { label: "Final", detail: sendStatus(send), state: send.claimed ? "complete" : send.cancelled ? "blocked" : "idle" }
  ];

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
            <p className="drawer__kicker">Transaction detail</p>
            <h2 className="drawer__title mono">{sendDetailLabel(send, account)}</h2>
            <p className="drawer__sub">Guarded send {send.id.toString()} - {sendStatus(send)}</p>
          </div>
          <button type="button" onClick={onClose} className="drawer__close" aria-label="Close transaction detail"><X size={16} /></button>
        </div>

        <div className="drawer__body">
          <div className="drawer__section">
            <div className="between">
              <div>
                <p className="verdict__label">Settlement status</p>
                <p className="verdict__name">{sendStatus(send)}</p>
                <p className="drawer__sub">{direction} guarded send with {counterparty ? shortAddress(counterparty) : "counterparty"}.</p>
              </div>
              <span className={sendStatusPill(send)}>{sendStatus(send)}</span>
            </div>
            <div className="grid-4">
              <Metric label="Amount" value={`${formatEther(send.amount)} ETH`} />
              <Metric label="Release" value={releaseLabel(send, now)} />
              <Metric label="Direction" value={direction} />
              <Metric label="Counterparty" value={counterparty ? shortAddress(counterparty) : "--"} />
            </div>
          </div>

          <div className="drawer__section">
            <p className="drawer__section-title">Lifecycle</p>
            <div className="lifecycle">
              {lifecycle.map((step) => (
                <div key={`tx-life-${step.label}`} className={`lifecycle__step lifecycle__step--${step.state}`}>
                  <i />
                  <span>
                    <b>{step.label}</b>
                    <small>{step.detail}</small>
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="drawer__section">
            <p className="drawer__section-title">Addresses</p>
            <InfoLine label="Sender" value={send.sender} copy={send.sender} />
            <InfoLine label="Recipient" value={send.recipient} copy={send.recipient} />
          </div>

          <div className="drawer__section">
            <p className="drawer__section-title">Network record</p>
            <InfoLine label="Guarded send" value={send.id.toString()} />
            <InfoLine label="Transaction" value={send.transactionHash ? send.transactionHash : "Not indexed"} copy={send.transactionHash} />
          </div>

          <div className="tx-actions">
            {canCancel ? (
              <button onClick={() => { onCancel(send.id); onClose(); }} className="btn btn--danger">Cancel send</button>
            ) : null}
            {canClaim ? (
              <button onClick={() => { onClaim(send.id); onClose(); }} className="btn btn--safe">Claim funds</button>
            ) : null}
            {send.transactionHash ? (
              <a href={explorerTxUrl(send.transactionHash)} target="_blank" rel="noreferrer" className="btn btn--ghost">
                Open transaction <ExternalLink size={15} />
              </a>
            ) : null}
            <a href={explorerAddressUrl(send.recipient)} target="_blank" rel="noreferrer" className="btn btn--ghost">
              Open recipient <ExternalLink size={15} />
            </a>
          </div>
        </div>
      </aside>
    </div>
  );
}
