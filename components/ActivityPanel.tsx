import { RotateCcw } from "lucide-react";
import { formatEther } from "viem";
import type { ActivityTab, PendingSend } from "../lib/suho-types";
import { releaseLabel, sendDirection, sendStatus, sendStatusPill, shortAddress } from "../lib/suho-view";

type ActivityRow = { send: PendingSend; bucket: "Sent" | "Incoming" };
type TabDef = { id: ActivityTab; label: string; count: number };

type ActivityPanelProps = {
  account: `0x${string}` | undefined;
  activityTabs: TabDef[];
  activityTab: ActivityTab;
  onTabChange: (tab: ActivityTab) => void;
  rows: ActivityRow[];
  now: number;
  isRefreshing: boolean;
  onRefresh: () => void;
  onCancel: (id: bigint) => void;
  onClaim: (id: bigint) => void;
  onSelect: (send: PendingSend) => void;
  emptyCopy: string;
};

export function ActivityPanel({
  account,
  activityTabs,
  activityTab,
  onTabChange,
  rows,
  now,
  isRefreshing,
  onRefresh,
  onCancel,
  onClaim,
  onSelect,
  emptyCopy
}: ActivityPanelProps) {
  return (
    <section className="panel panel--pad" id="activity" data-reveal data-station aria-labelledby="activity-title">
      <div className="card-head">
        <div>
          <p className="card-kicker">Recall ledger</p>
          <h2 id="activity-title" className="card-title mt-2">Value in flight</h2>
          <p className="section__lede text-sm mt-2">Guarded sends by status, counterparty, and settlement window.</p>
        </div>
        <button onClick={onRefresh} disabled={isRefreshing} className="btn btn--subtle btn--sm">
          <RotateCcw size={15} className={isRefreshing ? "spin" : undefined} />
          {isRefreshing ? "Refreshing" : "Refresh"}
        </button>
      </div>

      <div className="tabs" role="tablist" aria-label="Recall activity views">
        {activityTabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activityTab === tab.id}
            onClick={() => onTabChange(tab.id)}
            className={activityTab === tab.id ? "tab tab--active" : "tab"}
          >
            {tab.label} <b>{tab.count}</b>
          </button>
        ))}
      </div>

      <div className="table">
        <div className="table__head">
          <span>Route</span>
          <span>Amount</span>
          <span>Status</span>
          <span />
        </div>
        {rows.length === 0 ? (
          <div className="empty">{emptyCopy}</div>
        ) : rows.map(({ send, bucket }) => {
          const direction = sendDirection(send, account);
          const counterparty = direction === "Sent" ? send.recipient : send.sender;
          const remaining = Math.max(0, Number(send.releaseAt) - now);
          const canCancel = direction === "Sent" && !send.claimed && !send.cancelled && remaining > 0;
          const canClaim = direction === "Incoming" && !send.claimed && !send.cancelled && remaining === 0;
          return (
            <div
              key={`activity-${send.id.toString()}`}
              className="trow"
              onClick={() => onSelect(send)}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(send); } }}
            >
              <div className="trow__cell--route">
                <p className="trow__route">{bucket} - {shortAddress(counterparty)}</p>
                <p className="trow__sub">{direction === "Sent" ? "Recipient" : "Sender"}</p>
              </div>
              <div className="trow__cell--amount">
                <p className="trow__amount">{formatEther(send.amount)} ETH</p>
                <p className="trow__sub">{releaseLabel(send, now)}</p>
              </div>
              <div className="trow__cell--status">
                <span className={sendStatusPill(send)}>{sendStatus(send)}</span>
              </div>
              <div className="trow__cell--actions trow__actions">
                {canCancel ? (
                  <button onClick={(event) => { event.stopPropagation(); onCancel(send.id); }} className="row-btn row-btn--danger">Cancel</button>
                ) : null}
                {canClaim ? (
                  <button onClick={(event) => { event.stopPropagation(); onClaim(send.id); }} className="row-btn row-btn--safe">Claim</button>
                ) : null}
                <button onClick={(event) => { event.stopPropagation(); onSelect(send); }} className="row-btn">Details</button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
