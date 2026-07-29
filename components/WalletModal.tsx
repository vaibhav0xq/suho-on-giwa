import { ChevronRight, Wallet, X } from "lucide-react";
import type { WalletOption } from "../lib/suho-types";
import { shortAddress } from "../lib/suho-view";

function providerCaption(wallet: WalletOption) {
  if (!wallet.rdns) return "Injected provider";

  const known: Record<string, string> = {
    "io.rabby": "Rabby detected",
    "app.phantom": "Phantom detected",
    "com.okex.wallet": "OKX detected",
    "io.metamask": "MetaMask detected"
  };

  return known[wallet.rdns] ?? "Browser provider";
}
type WalletModalProps = {
  account: `0x${string}` | undefined;
  selectedWallet: WalletOption | undefined;
  sessionLabel: string;
  sessionReady: boolean;
  isSigningSession: boolean;
  isConnectingWallet: boolean;
  walletMessage: string;
  wallets: WalletOption[];
  onClose: () => void;
  onConnectWallet: (wallet: WalletOption) => void;
  onReSign: () => void;
  onSwitchAccount: () => void;
  onDisconnect: () => void;
};

export function WalletModal({
  account,
  selectedWallet,
  sessionLabel,
  sessionReady,
  isSigningSession,
  isConnectingWallet,
  walletMessage,
  wallets,
  onClose,
  onConnectWallet,
  onReSign,
  onSwitchAccount,
  onDisconnect
}: WalletModalProps) {
  return (
    <div className="scrim scrim--center" onClick={onClose}>
      <section className="modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal__head">
          <div>
            <p className="modal__kicker">Wallet</p>
            <h2 className="modal__title">Choose provider</h2>
          </div>
          <button onClick={onClose} className="modal__close" aria-label="Close wallet selector"><X size={16} /></button>
        </div>

        <div className="modal__body">
          <p className="modal__hint">{isConnectingWallet ? "Waiting for wallet confirmation. Check the wallet extension popup." : walletMessage}</p>
          {account ? (
            <div className="active-wallet">
              <div className="between">
                <div>
                  <p className="card-kicker">Active wallet</p>
                  <p className="mono mt-2">{shortAddress(account)}</p>
                  <p className="muted text-sm mt-2">{selectedWallet?.name ?? "Wallet"} - {sessionLabel}</p>
                </div>
                <span className={sessionReady ? "pill pill--ok" : "pill pill--warn"}>{sessionReady ? "Signed" : "Unsigned"}</span>
              </div>
              <div className="cluster mt-4">
                <button onClick={onReSign} disabled={!selectedWallet || isSigningSession || isConnectingWallet} className="btn btn--subtle btn--sm">
                  {isSigningSession ? "Signing" : "Select + sign"}
                </button>
                <button onClick={onSwitchAccount} disabled={isConnectingWallet} className="btn btn--subtle btn--sm">Switch</button>
                <button onClick={onDisconnect} className="btn btn--danger btn--sm">Disconnect</button>
              </div>
            </div>
          ) : null}

          {wallets.length === 0 ? (
            <div className="empty">No injected wallet detected in this browser.</div>
          ) : wallets.map((wallet) => (
            <button key={wallet.id} onClick={() => onConnectWallet(wallet)} disabled={isConnectingWallet} className="wallet-option">
              <span className="wallet-option__icon">
                {wallet.icon ? <img src={wallet.icon} alt="" width={38} height={38} /> : <Wallet size={20} />}
              </span>
              <span className="grow stack">
                <span className="wallet-option__name">{wallet.name}</span>
                <span className="wallet-option__rdns">{providerCaption(wallet)}</span>
              </span>
              <ChevronRight size={16} className="muted" />
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
