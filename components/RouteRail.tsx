import { Check } from "lucide-react";
import type { RouteStation } from "../lib/suho-types";

// Sticky vertical spine. The fill height + travelling packet are driven by the
// CSS custom property --flow (set on <html> from scroll position in page.tsx);
// station done/active state is passed in so the route reflects real progress.
export function RouteRail({ stations }: { stations: RouteStation[] }) {
  return (
    <div className="flow__rail-wrap" aria-hidden="true">
      <div className="flow__rail">
        <div className="route-rail">
          <p className="route-rail__head">Protected route</p>
          <div className="route-rail__body">
            <div className="route-rail__track" />
            <div className="route-rail__fill" />
            <div className="route-rail__packet" />
            {stations.map((station) => {
              const cls = [
                "route-station",
                station.state === "done" ? "is-done" : station.state === "active" ? "is-active" : "",
                station.tone ? `tone-${station.tone}` : ""
              ].filter(Boolean).join(" ");
              return (
                <div key={station.label} className={cls}>
                  <span className="route-station__dot"><Check /></span>
                  <span className="grow">
                    <span className="route-station__label">{station.label}</span>
                    <span className="route-station__meta">{station.meta}</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
