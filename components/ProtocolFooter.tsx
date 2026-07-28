import { Clock3, Database, ExternalLink, Shield } from "lucide-react";
import { contracts } from "../lib/app-contracts";
import { shortAddress } from "../lib/suho-view";
import { KvLine } from "./primitives";

export function ProtocolFooter() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer__grid">
          <div className="footer__col">
            <h4>Suho</h4>
            <p className="section__lede text-sm mt-3">
              A protection layer for high-friction sends: recipient context, a recall window, and a
              visible trail of settlement activity on GIWA Sepolia.
            </p>
            <a href="https://sepolia-explorer.giwa.io" target="_blank" rel="noreferrer" className="foot-link mt-4">
              Open GIWA explorer <ExternalLink size={14} />
            </a>
          </div>

          <div className="footer__col">
            <h4>Contracts</h4>
            <div className="stack">
              <KvLine label="Chain" value="91342" />
              <KvLine label="Trust oracle" value={shortAddress(contracts.trustOracle)} />
              <KvLine label="Guarded send" value={shortAddress(contracts.guardedSend)} />
              <KvLine label="Registry" value={shortAddress(contracts.suhoRegistry)} />
            </div>
          </div>

          <div className="footer__col">
            <h4>Checks used</h4>
            <div className="stack">
              <div className="foot-link"><Shield size={15} /> Dojang identity read</div>
              <div className="foot-link"><Database size={15} /> SuhoRegistry status</div>
              <div className="foot-link"><Clock3 size={15} /> GuardedSend recall window</div>
            </div>
          </div>
        </div>
        <p className="footer__note">Testnet only. “Preconfirmed” is an early Flashblocks signal, never a settled state.</p>
      </div>
    </footer>
  );
}
