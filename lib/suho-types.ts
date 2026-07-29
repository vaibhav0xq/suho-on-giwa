// Shared Suho types used by page.tsx and the presentational components.
// Extracting these keeps the view layer strongly typed without duplicating shapes.

export type Theme = "dark" | "light";
export type VerdictName = "Safe" | "Caution" | "Danger";
export type VerdictTone = "safe" | "caution" | "danger";
export type TxStage = "idle" | "submitted" | "preconfirmed" | "included" | "final" | "error";
export type ActivityTab = "active" | "incoming" | "history" | "all";

export type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] | Record<string, unknown> }) => Promise<unknown>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
  isMetaMask?: boolean;
  isOkxWallet?: boolean;
  isRabby?: boolean;
};

export type WalletOption = {
  id: string;
  name: string;
  icon: string | undefined;
  rdns: string | undefined;
  provider: EthereumProvider;
};

export type Eip6963ProviderDetail = {
  info: { uuid: string; name: string; icon?: string; rdns?: string };
  provider: EthereumProvider;
};

export type Eip6963AnnounceEvent = Event & { detail: Eip6963ProviderDetail };

export type TrustReport = {
  verdict: number;
  dojangVerified: boolean;
  registryStatus: number;
  reportCount: number;
  totalStake: bigint;
};

export type PendingSend = {
  id: bigint;
  sender: `0x${string}`;
  recipient: `0x${string}`;
  amount: bigint;
  releaseAt: bigint;
  transactionHash?: `0x${string}` | undefined;
  claimed: boolean;
  cancelled: boolean;
};

export type RefreshPendingOptions = {
  silent?: boolean;
  minRows?: number;
  attempts?: number;
};

export type PendingSendResponse = {
  rows?: Array<{
    id: string;
    sender: `0x${string}`;
    recipient: `0x${string}`;
    amount: string;
    releaseAt: string;
    transactionHash?: `0x${string}`;
    claimed: boolean;
    cancelled: boolean;
    status?: "active" | "claimed" | "cancelled";
  }>;
  error?: string;
  syncWarning?: string;
};

export type SignedSession = {
  address: `0x${string}`;
  walletId?: string | undefined;
  rdns?: string | undefined;
  message: string;
  signature: `0x${string}`;
  issuedAt: string;
};

export type Tone = "ready" | "warn" | "idle" | "active";

// Route/checkpoint model -- the shared visual language for the protected route.
export type StationState = "idle" | "active" | "done";
export type RouteStation = {
  label: string;
  meta: string;
  state: StationState;
  tone?: VerdictTone | undefined;
};
