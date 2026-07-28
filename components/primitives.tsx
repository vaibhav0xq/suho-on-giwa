import { Copy } from "lucide-react";

export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat">
      <p className="stat__label">{label}</p>
      <p className="stat__value">{value}</p>
    </div>
  );
}

export function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <p className="metric__label">{label}</p>
      <p className="metric__value">{value}</p>
    </div>
  );
}

export function InfoLine({ label, value, copy }: { label: string; value: string; copy?: string | undefined }) {
  return (
    <div className="info-line">
      <div className="grow">
        <p className="info-line__label">{label}</p>
        <p className="info-line__value">{value}</p>
      </div>
      {copy ? (
        <button aria-label={`Copy ${label}`} onClick={() => navigator.clipboard.writeText(copy)} className="copy-btn">
          <Copy size={15} />
        </button>
      ) : null}
    </div>
  );
}

export function KvLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="kv-line">
      <span className="kv-line__k">{label}</span>
      <span className="kv-line__v">{value}</span>
    </div>
  );
}
