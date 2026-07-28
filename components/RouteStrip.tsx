import type { RouteStation } from "../lib/suho-types";

// Horizontal checkpoint strip. Reflects the live position of the current send
// along the route (checked -> guarded -> preconfirmed -> included -> final).
// Doubles as the route language on mobile, where the vertical rail is hidden.
export function RouteStrip({ stations }: { stations: RouteStation[] }) {
  return (
    <div className="route-strip" aria-hidden="true">
      {stations.map((station, index) => {
        const dotCls = [
          "route-strip__dot",
          station.state === "done" ? "is-done" : station.state === "active" ? "is-active" : ""
        ].filter(Boolean).join(" ");
        const prev = stations[index - 1];
        const segState = prev && prev.state === "done" ? (station.state === "idle" ? "is-active" : "is-done") : "";
        return (
          <RouteStripCell key={station.label} first={index === 0} segState={segState} dotCls={dotCls} label={station.label} />
        );
      })}
    </div>
  );
}

function RouteStripCell({
  first,
  segState,
  dotCls,
  label
}: {
  first: boolean;
  segState: string;
  dotCls: string;
  label: string;
}) {
  return (
    <>
      {first ? null : <span className={`route-strip__seg ${segState}`} />}
      <div className="route-strip__node">
        <span className={dotCls} />
        <span className="route-strip__cap">{label}</span>
      </div>
    </>
  );
}
