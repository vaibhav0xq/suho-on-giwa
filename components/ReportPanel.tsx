import { BellRing } from "lucide-react";

type ReportPanelProps = {
  evidence: string;
  onEvidenceChange: (value: string) => void;
  reportAcknowledged: boolean;
  onAcknowledge: (value: boolean) => void;
  reportCanAcknowledge: boolean;
  reportReady: boolean;
  onSubmit: () => void;
  reportBlockReason: string;
};

// Folded into the Guard station as a secondary action (no separate card).
export function ReportPanel({
  evidence,
  onEvidenceChange,
  reportAcknowledged,
  onAcknowledge,
  reportCanAcknowledge,
  reportReady,
  onSubmit,
  reportBlockReason
}: ReportPanelProps) {
  return (
    <div className="report-fold">
      <p className="report-fold__head"><BellRing size={15} /> Something wrong with this recipient?</p>

      <div className="input-row mt-2">
        <input
          value={evidence}
          onChange={(event) => onEvidenceChange(event.target.value)}
          className="input"
          placeholder="https://... public evidence link"
          autoComplete="off"
          aria-label="Evidence URI"
        />
        <button onClick={onSubmit} disabled={!reportReady} className="btn btn--danger">
          Report risk
        </button>
      </div>

      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={reportCanAcknowledge && reportAcknowledged}
          disabled={!reportCanAcknowledge}
          onChange={(event) => onAcknowledge(event.target.checked)}
        />
        I checked the recipient and the evidence I am submitting. Reporting stakes ETH into the registry.
      </label>

      <div className={`hint mt-3 ${reportReady ? "hint--ready" : "hint--warn"}`}>
        <span className="hint__dot" />
        <p>{reportBlockReason}</p>
      </div>
    </div>
  );
}
