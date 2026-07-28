import type { ReactNode } from "react";
import { ChevronRight, Search } from "lucide-react";
import type { RouteStation } from "../lib/suho-types";
import { RouteStrip } from "./RouteStrip";

export function Hero({ stations, children }: { stations: RouteStation[]; children: ReactNode }) {
  return (
    <section className="hero container" id="top">
      <div className="hero__grid">
        <div data-reveal="left">
          <span className="eyebrow">Value moves through a guarded route</span>
          <h1 className="hero__title">
            Watch the send <span className="hero__accent">clear every checkpoint.</span>
          </h1>
          <p className="hero__lede">
            Suho reads identity and registry state, holds value in an escrow you can recall, and shows it
            clear each checkpoint — checked, guarded, preconfirmed, included, final.
          </p>
          <div className="hero__cta">
            <a href="#check" className="btn btn--primary">
              <Search size={16} /> Check a recipient
            </a>
            <a href="#settlement" className="btn btn--ghost">
              See the route <ChevronRight size={15} />
            </a>
          </div>
          <RouteStrip stations={stations} />
        </div>
        <div data-reveal="scale">
          {children}
        </div>
      </div>
    </section>
  );
}
