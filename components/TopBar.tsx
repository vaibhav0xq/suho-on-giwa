import { Moon, Shield, Sun, Wallet } from "lucide-react";
import type { Theme } from "../lib/suho-types";
import { shortAddress } from "../lib/suho-view";

type TopBarProps = {
  theme: Theme;
  onToggleTheme: () => void;
  chainOk: boolean;
  account: `0x${string}` | undefined;
  sessionReady: boolean;
  onConnect: () => void;
};

export function TopBar({ theme, onToggleTheme, chainOk, account, sessionReady, onConnect }: TopBarProps) {
  return (
    <header className="topbar">
      <div className="container topbar__inner">
        <a href="#top" className="brand" aria-label="Suho home">
          <span className="brand__mark"><Shield size={18} /></span>
          <span className="stack">
            <span className="brand__name">Suho</span>
            <span className="brand__sub">Protected settlement · GIWA Sepolia</span>
          </span>
        </a>
        <div className="topbar__actions">
          <span className={chainOk ? "chip chip--ok" : "chip"} title={chainOk ? "Connected to GIWA Sepolia" : "GIWA Sepolia not selected"}>
            <span className="chip__dot" />
            {chainOk ? "GIWA Sepolia" : "Network"}
          </span>
          <button onClick={onToggleTheme} className="icon-btn" aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}>
            {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
          </button>
          <button onClick={onConnect} className="btn btn--primary">
            <Wallet size={16} />
            {account ? (
              <span><span className="hide-sm">{sessionReady ? "Signed" : "Unsigned"} · </span>{shortAddress(account)}</span>
            ) : "Connect wallet"}
          </button>
        </div>
      </div>
    </header>
  );
}
