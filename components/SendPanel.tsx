import type { ReactNode } from "react";
import { Clock3, Send } from "lucide-react";
import type { Tone } from "../lib/suho-types";

type ReadinessItem = { label: string; value: string; tone: Tone };

type SendPanelProps = {
  amount: string;
  onAmountChange: (value: string) => void;
  onSend: () => void;
  sendInFlight: boolean;
  sendBlocked: boolean;
  amountExceedsBalance: boolean;
  balanceText: string;
  isBalanceLoading: boolean;
  balanceDisabled: boolean;
  onRefreshBalance: () => void;
  sendReadiness: ReadinessItem[];
  sendBlockReason: string;
  children?: ReactNode;
};

function readinessClass(tone: Tone) {
  if (tone === "ready") return "readiness__item readiness__item--ready";
  if (tone === "warn") return "readiness__item readiness__item--warn";
  return "readiness__item";
}

export function SendPanel({
  amount,
  onAmountChange,
  onSend,
  sendInFlight,
  sendBlocked,
  amountExceedsBalance,
  balanceText,
  isBalanceLoading,
  balanceDisabled,
  onRefreshBalance,
  sendReadiness,
  sendBlockReason,
  children
}: SendPanelProps) {
  return (
    <section className="panel panel--pad" id="guard" data-reveal data-station aria-labelledby="send-title">
      <div className="card-head">
        <div>
          <p className="card-kicker">Guard - station 3</p>
          <h2 id="send-title" className="card-title mt-2">Route the send through escrow</h2>
        </div>
        <Clock3 className="card-icon" size={20} />
      </div>

      <div className="between mt-2">
        <label className="field__label" htmlFor="amount">Amount (ETH)</label>
        <button type="button" onClick={onRefreshBalance} className="balance-chip" disabled={balanceDisabled}>
          Balance - {isBalanceLoading ? "reading" : balanceText}
        </button>
      </div>

      <div className="input-row mt-2">
        <input
          id="amount"
          value={amount}
          onChange={(event) => onAmountChange(event.target.value)}
          className={amountExceedsBalance ? "input input--warn" : "input"}
          placeholder="0.0000"
          inputMode="decimal"
          autoComplete="off"
        />
        <button onClick={onSend} disabled={sendBlocked} className="btn btn--primary">
          {sendInFlight ? "Sending" : "Send guarded"}
          <Send size={15} />
        </button>
      </div>

      <div className="readiness">
        {sendReadiness.map((item) => (
          <div key={`send-ready-${item.label}`} className={readinessClass(item.tone)}>
            <span>{item.label}</span>
            <b>{item.value}</b>
          </div>
        ))}
      </div>

      <div className={`hint mt-4 ${sendBlocked ? "hint--warn" : "hint--ready"}`}>
        <span className="hint__dot" />
        <p>{sendBlockReason} Funds stay recallable for 10 minutes.</p>
      </div>

      {children}
    </section>
  );
}
