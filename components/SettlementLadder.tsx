import { Check, ExternalLink } from "lucide-react";
import type { TxStage } from "../lib/suho-types";
import { explorerTxUrl, shortAddress } from "../lib/suho-view";

type TimelineStep = { key: TxStage; label: string; detail: string };

type SettlementLadderProps = {
  timelineSteps: TimelineStep[];
  activeStage: number;
  txStage: TxStage;
  currentStageLabel: string;
  message: string;
  txHash: `0x${string}` | undefined;
};

// Permanent centerpiece: the route's destination. Idle shows the path waiting;
// a live send animates the value moving Submitted to Preconfirmed to Included to Final.
export function SettlementLadder({ timelineSteps, activeStage, txStage, currentStageLabel, message, txHash }: SettlementLadderProps) {
  const idle = txStage === "idle";
  return (
    <section className="panel panel--pad panel--feature" id="settlement" data-reveal="scale" data-station aria-live="polite">
      <div className="card-head">
        <div>
          <p className="card-kicker">Settlement stations 4-6</p>
          <h2 className="card-title mt-2 settlement-headline">{idle ? "Settlement route" : currentStageLabel}</h2>
        </div>
        <span className={txStage === "error" ? "pill pill--danger" : activeStage > 0 ? "pill pill--ok" : "pill pill--neutral"}>
          {idle ? "Idle" : txStage === "error" ? "Error" : "Live"}
        </span>
      </div>

      <div className="ladder ladder--route mt-2">
        {timelineSteps.map((step, index) => {
          const done = activeStage > index + 1 || (activeStage === index + 1 && txStage === "final");
          const current = activeStage === index + 1 && txStage !== "final";
          const cls = `ladder__step${done ? " ladder__step--done" : ""}${current ? " ladder__step--current" : ""}`;
          return (
            <div key={step.key} className={cls}>
              <span className="ladder__node">{done ? <Check size={15} /> : index + 1}</span>
              <div>
                <p className="ladder__label">{step.label}</p>
                <p className="ladder__detail">{step.detail}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className={`ladder__msg${txStage === "error" ? " ladder__msg--error" : activeStage > 0 ? " ladder__msg--success" : ""}`}>
        <p>{idle ? "Confirm a guarded send to watch value move through the route. Preconfirmed is an early Flashblocks signal, never final." : message}</p>
        {txHash ? (
          <a href={explorerTxUrl(txHash)} target="_blank" rel="noreferrer" className="foot-link mono">
            {shortAddress(txHash)} <ExternalLink size={13} />
          </a>
        ) : null}
      </div>
    </section>
  );
}
