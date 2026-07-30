"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import {
  createPublicClient,
  createWalletClient,
  custom,
  getAddress,
  http,
  isAddress,
  labelhash,
  verifyMessage,
  zeroAddress,
  formatEther
} from "viem";
import { GIWA_FLASHBLOCKS_RPC_URL, GIWA_RPC_URL, GIWA_SEPOLIA } from "../lib/giwa";
import { contracts, guardedSendAbi, registryAbi, trustOracleAbi, upIdRegistryAbi } from "../lib/app-contracts";
import type {
  ActivityTab,
  Eip6963AnnounceEvent,
  EthereumProvider,
  PendingSend,
  PendingSendResponse,
  RefreshPendingOptions,
  RouteStation,
  SignedSession,
  StationState,
  Theme,
  Tone,
  TrustReport,
  TxStage,
  VerdictTone,
  WalletOption
} from "../lib/suho-types";
import {
  balanceLabel,
  isSessionFresh,
  mergeSends,
  normalizePending,
  normalizePendingJson,
  normalizeTrustReport,
  parseAmountWei,
  registryStatuses,
  releaseLabel,
  sendDirection,
  sessionAgeLabel,
  shortAddress,
  verdictCopy
} from "../lib/suho-view";
import { TopBar } from "../components/TopBar";
import { Hero } from "../components/Hero";
import { TrustConsole } from "../components/TrustConsole";
import { RouteRail } from "../components/RouteRail";
import { SendPanel } from "../components/SendPanel";
import { ReportPanel } from "../components/ReportPanel";
import { SettlementLadder } from "../components/SettlementLadder";
import { ActivityPanel } from "../components/ActivityPanel";
import { ProtocolFooter } from "../components/ProtocolFooter";
import { RecipientDrawer } from "../components/RecipientDrawer";
import { SendDrawer } from "../components/SendDrawer";
import { WalletModal } from "../components/WalletModal";

const THEME_STORAGE_KEY = "suho-theme";
const WALLET_STORAGE_KEY = "suho-wallet";
const SESSION_STORAGE_KEY = "suho-session";

// The protected route - the shared checkpoint language for the whole page.
const ROUTE_STATIONS = [
  { label: "Check", meta: "Recipient read" },
  { label: "Registry", meta: "Dojang - scam intel" },
  { label: "Guard", meta: "Escrow + recall" },
  { label: "Preconfirmed", meta: "Flashblocks" },
  { label: "Included", meta: "On GIWA" },
  { label: "Final", meta: "Settled" }
] as const;
const ROUTE_COUNT = ROUTE_STATIONS.length;
const TX_RANK: Record<TxStage, number> = { idle: 0, error: 0, submitted: 1, preconfirmed: 2, included: 3, final: 4 };
type Rgb = [number, number, number];
type FieldPoint = [number, number];

function parseCssColor(value: string, fallback: Rgb): Rgb {
  const raw = value.trim();
  if (!raw) return fallback;
  if (raw.startsWith("#")) {
    const hex = raw.slice(1);
    const full = hex.length === 3 ? hex.split("").map((part) => part + part).join("") : hex;
    const numeric = Number.parseInt(full.slice(0, 6), 16);
    if (Number.isFinite(numeric)) return [(numeric >> 16) & 255, (numeric >> 8) & 255, numeric & 255];
  }
  const numericParts = raw.match(/\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  if (numericParts.length >= 3) return [numericParts[0] ?? fallback[0], numericParts[1] ?? fallback[1], numericParts[2] ?? fallback[2]];
  return fallback;
}

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  return stored === "light" ? "light" : "dark";
}

const PRIMARY_HOST = "thesuho.in";
const CONSOLE_HOST = "console.thesuho.in";

function isConsoleHost(hostname: string) {
  return hostname.toLowerCase().startsWith("console.");
}


function overviewUrl() {
  if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") return "/";
  return `${window.location.protocol}//${PRIMARY_HOST}`;
}

function consoleUrl() {
  if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") return undefined;
  return `${window.location.protocol}//${CONSOLE_HOST}`;
}

function getInitialView() {
  if (typeof window === "undefined") return "intro" as const;
  return isConsoleHost(window.location.hostname) ? "console" as const : "intro" as const;
}

function createNonce() {
  const bytes = new Uint8Array(16);
  window.crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function createSessionMessage(address: `0x${string}`) {
  const issuedAt = new Date().toISOString();
  const nonce = createNonce();
  return {
    issuedAt,
    message: [
      "Suho session",
      `Address: ${address}`,
      `Chain ID: ${GIWA_SEPOLIA.id}`,
      `Issued At: ${issuedAt}`,
      `Nonce: ${nonce}`,
      "",
      "Sign to authenticate this browser session. This does not move funds."
    ].join("\n")
  };
}

const publicClient = createPublicClient({ chain: GIWA_SEPOLIA, transport: http(GIWA_RPC_URL) });
const flashClient = createPublicClient({ chain: GIWA_SEPOLIA, transport: http(GIWA_FLASHBLOCKS_RPC_URL) });

function walletLabel(provider: EthereumProvider) {
  if (provider.isMetaMask) return "MetaMask";
  if (provider.isOkxWallet) return "OKX Wallet";
  if (provider.isRabby) return "Rabby Wallet";
  return "Injected Wallet";
}

function getInjectedWallets(): WalletOption[] {
  if (typeof window === "undefined") return [];
  const ethereum = (window as unknown as { ethereum?: EthereumProvider & { providers?: EthereumProvider[] } }).ethereum;
  if (!ethereum) return [];
  const providers = ethereum.providers && ethereum.providers.length > 0 ? ethereum.providers : [ethereum];
  return providers.map((provider, index) => ({
    id: `injected-${walletLabel(provider).toLowerCase().replace(/\s+/g, "-")}-${index}`,
    name: walletLabel(provider),
    icon: undefined,
    rdns: undefined,
    provider
  }));
}

function uniqueWallets(wallets: WalletOption[]) {
  const seen = new Set<EthereumProvider>();
  return wallets.filter((wallet) => {
    if (seen.has(wallet.provider)) return false;
    seen.add(wallet.provider);
    return true;
  });
}

export default function Home() {
  const [theme, setTheme] = useState<Theme>(() => getInitialTheme());
  const [wallets, setWallets] = useState<WalletOption[]>([]);
  const [selectedWallet, setSelectedWallet] = useState<WalletOption | undefined>();
  const [walletPanelOpen, setWalletPanelOpen] = useState(false);
  const [hasRestoredWallet, setHasRestoredWallet] = useState(false);
  const [account, setAccount] = useState<`0x${string}` | undefined>();
  const [signedSession, setSignedSession] = useState<SignedSession | undefined>();
  const [isSigningSession, setIsSigningSession] = useState(false);
  const [isConnectingWallet, setIsConnectingWallet] = useState(false);
  const [chainOk, setChainOk] = useState(false);
  const [recipientInput, setRecipientInput] = useState("");
  const [resolvedRecipient, setResolvedRecipient] = useState<`0x${string}` | undefined>();
  const [resolvedLabel, setResolvedLabel] = useState<string | undefined>();
  const [trustReport, setTrustReport] = useState<TrustReport | undefined>();
  const [profileOpen, setProfileOpen] = useState(false);
  const [selectedSend, setSelectedSend] = useState<PendingSend | undefined>();
  const [activityTab, setActivityTab] = useState<ActivityTab>("all");
  const [isChecking, setIsChecking] = useState(false);
  const [amount, setAmount] = useState("");
  const [nativeBalance, setNativeBalance] = useState<bigint | undefined>();
  const [isBalanceLoading, setIsBalanceLoading] = useState(false);
  const [evidence, setEvidence] = useState("");
  const [reportAcknowledged, setReportAcknowledged] = useState(false);
  const [pendingSends, setPendingSends] = useState<PendingSend[]>([]);
  const [incomingSends, setIncomingSends] = useState<PendingSend[]>([]);
  const [sendHistory, setSendHistory] = useState<PendingSend[]>([]);
  const [profileActivity, setProfileActivity] = useState<PendingSend[]>([]);
  const [isProfileActivityLoading, setIsProfileActivityLoading] = useState(false);
  const [isRefreshingPending, setIsRefreshingPending] = useState(false);
  const [txStage, setTxStage] = useState<TxStage>("idle");
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const [message, setMessage] = useState("Ready");
  const [recipientError, setRecipientError] = useState<string | undefined>();
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  const [activeStation, setActiveStation] = useState(0);
  const [routeStation, setRouteStation] = useState(0);
  const [view, setView] = useState<"intro" | "console">(() => getInitialView());
  const [isLaunchingConsole, setIsLaunchingConsole] = useState(false);
  const fieldStateRef = useRef({ activeStation: 0, view: "intro" as "intro" | "console" });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    const syncViewFromUrl = () => setView(getInitialView());
    syncViewFromUrl();
    window.addEventListener("popstate", syncViewFromUrl);
    return () => window.removeEventListener("popstate", syncViewFromUrl);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.view = view;
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [view]);

  const routeToView = useCallback((nextView: "intro" | "console") => {
    if (nextView === "console") {
      const target = consoleUrl();
      if (target) {
        window.location.assign(target);
        return;
      }
      setView("console");
      return;
    }

    if (isConsoleHost(window.location.hostname)) {
      window.location.assign(overviewUrl());
      return;
    }

    if (window.location.pathname !== "/") window.history.pushState({}, "", "/");
    setView("intro");
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => window.clearInterval(id);
  }, []);
  const launchConsole = useCallback(() => {
    if (view === "console" || isLaunchingConsole) return;
    setIsLaunchingConsole(true);
    window.setTimeout(() => {
      routeToView("console");
      window.setTimeout(() => setIsLaunchingConsole(false), 180);
    }, 520);
  }, [isLaunchingConsole, routeToView, view]);

  const backToIntro = useCallback(() => {
    routeToView("intro");
  }, [routeToView]);

  // Scroll reveal: fade+rise each section once as it enters the viewport.
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-rise]"));
    if (els.length === 0) return;
    if (typeof IntersectionObserver === "undefined") {
      els.forEach((el) => el.classList.add("vis"));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("vis");
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.08 }
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  // Route sync mirrors the prototype: the top rail rides full-page scroll,
  // while the right register latches to the section crossing viewport center.
  useEffect(() => {
    const root = document.documentElement;
    const registerTargets = Array.from({ length: ROUTE_COUNT }, (_, index) => ({
      id: `s${String(index + 1).padStart(2, "0")}`,
      index
    })).concat({ id: "s07", index: ROUTE_COUNT - 1 });
    let frame = 0;
    const getSectionTops = () => registerTargets.map(({ id, index }) => {
      const section = document.getElementById(id);
      return {
        index,
        top: section ? section.getBoundingClientRect().top + root.scrollTop : 0
      };
    });
    const getPageFlow = () => {
      const max = root.scrollHeight - root.clientHeight;
      return max > 0 ? Math.min(1, Math.max(0, root.scrollTop / max)) : 0;
    };
    const getActiveIndex = (tops: ReturnType<typeof getSectionTops>) => {
      const scrollAnchor = root.scrollTop + window.innerHeight * 0.5;
      let nextIndex = 0;
      tops.forEach(({ index, top }) => {
        if (scrollAnchor >= top) nextIndex = index;
      });
      return nextIndex;
    };
    const update = () => {
      frame = 0;
      const flow = getPageFlow();
      root.style.setProperty("--sy", String(root.scrollTop));
      root.style.setProperty("--flow", flow.toFixed(4));
      const railIndex = Math.round(flow * (ROUTE_COUNT - 1));
      setRouteStation((previous) => (previous === railIndex ? previous : railIndex));
      const index = getActiveIndex(getSectionTops());
      setActiveStation((previous) => (previous === index ? previous : index));
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      root.style.removeProperty("--sy");
      root.style.removeProperty("--flow");
    };
  }, []);

  useEffect(() => {
    fieldStateRef.current = { activeStation, view };
  }, [activeStation, view]);

  useEffect(() => {
    const canvas = document.getElementById("field") as HTMLCanvasElement | null;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const ctx = context;
    const root = document.documentElement;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let width = 0;
    let height = 0;
    let dpr = 1;
    let phase = 0;
    let frameId = 0;

    const resize = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      width = canvas.width = Math.floor(window.innerWidth * dpr);
      height = canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
    };

    const colors = () => {
      const style = getComputedStyle(root);
      const ink = parseCssColor(style.getPropertyValue("--ink"), [240, 244, 248]);
      const safe = parseCssColor(style.getPropertyValue("--safe"), [52, 211, 154]);
      const tone = root.dataset.theme === "light" ? 1.32 : 0.9;
      return { ink, safe, tone };
    };

    const rgba = (rgb: Rgb, alpha: number) => `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`;
    const pointOnCurve = (t: number, p0: FieldPoint, p1: FieldPoint, p2: FieldPoint, p3: FieldPoint): FieldPoint => {
      const u = 1 - t;
      const a = u * u * u;
      const b = 3 * u * u * t;
      const c = 3 * u * t * t;
      const d = t * t * t;
      return [a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]];
    };

    const frame = () => {
      const { activeStation: station, view: currentView } = fieldStateRef.current;
      const max = root.scrollHeight - root.clientHeight;
      const scrollFraction = max > 0 ? Math.min(1, Math.max(0, root.scrollTop / max)) : 0;
      const section = Math.max(0, Math.min(5, station));
      const liveSafe = section === 1 || section === 3;
      const { ink, safe, tone } = colors();
      const line = (alpha: number) => rgba(ink, alpha * tone);
      const green = (alpha: number) => rgba(safe, alpha * tone);
      const themed = (useSafe: boolean, alpha: number) => useSafe ? green(alpha) : line(alpha);

      const bands = (useSafe: boolean) => {
        ctx.save();
        ctx.translate(width / 2, height / 2);
        ctx.rotate((-19 * Math.PI) / 180);
        const diagonal = Math.sqrt(width * width + height * height);
        const period = 500 * dpr;
        const bandWidth = 290 * dpr;
        const half = diagonal / 2 + period;
        const drift = (phase * 0.22 + scrollFraction * period * 2.4) % period;
        for (let x = -half + drift; x < half; x += period) {
          const gradient = ctx.createLinearGradient(x - bandWidth / 2, 0, x + bandWidth / 2, 0);
          gradient.addColorStop(0, themed(useSafe, 0));
          gradient.addColorStop(0.5, themed(useSafe, 0.07));
          gradient.addColorStop(1, themed(useSafe, 0));
          ctx.fillStyle = gradient;
          ctx.fillRect(x - bandWidth / 2, -half, bandWidth, half * 2);
          ctx.strokeStyle = themed(useSafe, 0.17);
          ctx.lineWidth = 1.6 * dpr;
          ctx.beginPath();
          ctx.moveTo(x + bandWidth / 2, -half);
          ctx.lineTo(x + bandWidth / 2, half);
          ctx.stroke();
        }
        ctx.restore();
      };

      const routes = (useSafe: boolean) => {
        const paths: [FieldPoint, FieldPoint, FieldPoint, FieldPoint][] = [
          [[-60, height * 0.26], [width * 0.32, height * 0.06], [width * 0.66, height * 0.62], [width + 60, height * 0.42]],
          [[-60, height * 0.82], [width * 0.30, height * 0.96], [width * 0.72, height * 0.34], [width + 60, height * 0.58]]
        ];
        paths.forEach((pathPoints, index) => {
          ctx.beginPath();
          ctx.moveTo(pathPoints[0][0], pathPoints[0][1]);
          ctx.bezierCurveTo(pathPoints[1][0], pathPoints[1][1], pathPoints[2][0], pathPoints[2][1], pathPoints[3][0], pathPoints[3][1]);
          ctx.strokeStyle = themed(useSafe, 0.19);
          ctx.lineWidth = 1.4 * dpr;
          ctx.setLineDash([7 * dpr, 9 * dpr]);
          ctx.lineDashOffset = -(phase * 0.7 + scrollFraction * 500);
          ctx.stroke();
          ctx.setLineDash([]);
          const pulseT = (phase * 0.0035 + index * 0.5 + scrollFraction) % 1;
          const pulse = pointOnCurve(pulseT, pathPoints[0], pathPoints[1], pathPoints[2], pathPoints[3]);
          ctx.beginPath();
          ctx.arc(pulse[0], pulse[1], 4 * dpr, 0, Math.PI * 2);
          ctx.fillStyle = themed(useSafe, 0.5);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(pulse[0], pulse[1], 9 * dpr, 0, Math.PI * 2);
          ctx.strokeStyle = themed(useSafe, 0.26);
          ctx.lineWidth = 1 * dpr;
          ctx.stroke();
        });
      };

      const focusX = () => width * 0.72;
      const focusY = () => height * 0.4;
      const probe = () => {
        const x = focusX();
        const y = focusY();
        for (let index = 0; index < 3; index += 1) {
          const t = (phase * 0.0032 + index / 3) % 1;
          ctx.beginPath();
          ctx.arc(x, y, t * Math.max(width, height) * 0.44, 0, Math.PI * 2);
          ctx.strokeStyle = line(0.26 * (1 - t));
          ctx.lineWidth = 1.5 * dpr;
          ctx.stroke();
        }
        const scanX = (phase * 0.004 % 1) * width;
        const gradient = ctx.createLinearGradient(scanX - 70 * dpr, 0, scanX + 70 * dpr, 0);
        gradient.addColorStop(0, line(0));
        gradient.addColorStop(0.5, line(0.05));
        gradient.addColorStop(1, line(0));
        ctx.fillStyle = gradient;
        ctx.fillRect(scanX - 70 * dpr, 0, 140 * dpr, height);
        ctx.beginPath();
        ctx.moveTo(scanX, 0);
        ctx.lineTo(scanX, height);
        ctx.strokeStyle = line(0.2);
        ctx.lineWidth = 1.6 * dpr;
        ctx.stroke();
      };

      const tolerance = () => {
        const y = focusY();
        ctx.beginPath();
        for (let x = 0; x <= width; x += 6 * dpr) {
          const waveY = y + Math.sin((x * 0.006) / dpr + phase * 0.04) * 52 * dpr * Math.sin((x * 0.0012) / dpr);
          if (x === 0) ctx.moveTo(x, waveY);
          else ctx.lineTo(x, waveY);
        }
        ctx.strokeStyle = green(0.3);
        ctx.lineWidth = 2 * dpr;
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.strokeStyle = green(0.09);
        ctx.lineWidth = 1 * dpr;
        ctx.stroke();
      };

      const clamp = () => {
        const t = Math.sin(phase * 0.02) * 0.5 + 0.5;
        const left = width * (0.2 + 0.08 * t);
        const right = width * (0.8 - 0.08 * t);
        const top = height * 0.15;
        const bottom = height * 0.85;
        ([[left, 1], [right, -1]] as [number, number][]).forEach(([x, direction]) => {
          const hook = direction * 20 * dpr;
          ctx.beginPath();
          ctx.moveTo(x, top);
          ctx.lineTo(x, bottom);
          ctx.moveTo(x, top);
          ctx.lineTo(x + hook, top);
          ctx.moveTo(x, bottom);
          ctx.lineTo(x + hook, bottom);
          ctx.strokeStyle = line(0.23);
          ctx.lineWidth = 2 * dpr;
          ctx.stroke();
        });
      };

      const latch = () => {
        const x = focusX();
        const y = focusY();
        for (let index = 0; index < 4; index += 1) {
          const t = (phase * 0.006 + index * 0.25) % 1;
          ctx.beginPath();
          ctx.arc(x, y, t * Math.max(width, height) * 0.42, 0, Math.PI * 2);
          ctx.strokeStyle = green(0.24 * (1 - t));
          ctx.lineWidth = 2 * dpr;
          ctx.stroke();
        }
      };

      const ledger = () => {
        const rows = 8;
        const gap = height / (rows + 1);
        const edge = width * 0.9;
        for (let index = 1; index <= rows; index += 1) {
          const y = gap * index;
          const flow = (phase * 0.004 + index * 0.12) % 1;
          const endX = edge * flow;
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(endX, y);
          ctx.strokeStyle = line(0.19);
          ctx.lineWidth = 1.2 * dpr;
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(endX, y, 3 * dpr, 0, Math.PI * 2);
          ctx.fillStyle = line(0.38);
          ctx.fill();
        }
        ctx.beginPath();
        ctx.moveTo(edge, 0);
        ctx.lineTo(edge, height);
        ctx.strokeStyle = line(0.15);
        ctx.lineWidth = 1.5 * dpr;
        ctx.stroke();
      };

      const seal = () => {
        const x = focusX();
        const y = focusY();
        const formed = Math.sin(phase * 0.01) * 0.5 + 0.5;
        for (let ring = 1; ring <= 3; ring += 1) {
          ctx.beginPath();
          ctx.arc(x, y, (90 + ring * 56) * dpr, 0, Math.PI * 2);
          ctx.strokeStyle = line(0.16 + (ring === 2 ? formed * 0.12 : 0.04));
          ctx.lineWidth = 1.4 * dpr;
          ctx.stroke();
        }
        const completeSegment = Math.floor(formed * 12);
        for (let tick = 0; tick < 12; tick += 1) {
          const angle = (tick / 12) * Math.PI * 2 - 1.57;
          const radius = 210 * dpr;
          ctx.beginPath();
          ctx.moveTo(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius);
          ctx.lineTo(x + Math.cos(angle) * (radius + 20 * dpr), y + Math.sin(angle) * (radius + 20 * dpr));
          ctx.strokeStyle = line(tick <= completeSegment ? 0.32 : 0.08);
          ctx.lineWidth = 1.6 * dpr;
          ctx.stroke();
        }
      };

      ctx.clearRect(0, 0, width, height);
      if (currentView === "console") {
        ctx.save();
        ctx.globalAlpha = 0.64;
        bands(false);
        ctx.restore();
        ctx.save();
        ctx.globalAlpha = 0.72;
        routes(true);
        ctx.restore();
        ctx.save();
        ctx.globalAlpha = 0.52;
        ledger();
        ctx.restore();
        ctx.save();
        ctx.globalAlpha = 0.42;
        latch();
        ctx.restore();
      } else {
        bands(liveSafe);
        routes(liveSafe);
        [probe, tolerance, clamp, latch, ledger, seal][section]?.();
      }
      phase += 1;
      if (!reducedMotion) frameId = window.requestAnimationFrame(frame);
    };

    resize();
    frame();
    window.addEventListener("resize", resize);
    return () => {
      if (frameId) window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  useEffect(() => {
    const collect = (event: Eip6963AnnounceEvent) => {
      setWallets((current) => uniqueWallets([
        ...current,
        {
          id: event.detail.info.uuid,
          name: event.detail.info.name,
          icon: event.detail.info.icon,
          rdns: event.detail.info.rdns,
          provider: event.detail.provider
        }
      ]));
    };

    window.addEventListener("eip6963:announceProvider", collect as EventListener);
    window.dispatchEvent(new Event("eip6963:requestProvider"));
    const fallback = window.setTimeout(() => setWallets((current) => uniqueWallets([...current, ...getInjectedWallets()])), 250);

    return () => {
      window.removeEventListener("eip6963:announceProvider", collect as EventListener);
      window.clearTimeout(fallback);
    };
  }, []);

  const provider = selectedWallet?.provider;
  const walletClient = useMemo(() => {
    if (!provider || !account) return undefined;
    return createWalletClient({ account, chain: GIWA_SEPOLIA, transport: custom(provider) });
  }, [account, provider]);

  const refreshBalance = useCallback(async (address = account) => {
    if (!address || !chainOk) {
      setNativeBalance(undefined);
      return;
    }
    setIsBalanceLoading(true);
    try {
      const balance = await publicClient.getBalance({ address });
      setNativeBalance(balance);
    } catch {
      setNativeBalance(undefined);
    } finally {
      setIsBalanceLoading(false);
    }
  }, [account, chainOk]);

  useEffect(() => {
    void refreshBalance(account);
  }, [account, chainOk, refreshBalance]);

  const clearWalletSession = useCallback(() => {
    setSelectedWallet(undefined);
    setAccount(undefined);
    setSignedSession(undefined);
    setChainOk(false);
    setPendingSends([]);
    setIncomingSends([]);
    setSendHistory([]);
    setNativeBalance(undefined);
    setTxHash(undefined);
    setTxStage("idle");
    window.localStorage.removeItem(WALLET_STORAGE_KEY);
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    setMessage("Wallet disconnected.");
  }, []);

  const signSession = useCallback(async (wallet: WalletOption, address: `0x${string}`) => {
    setIsSigningSession(true);
    try {
      const { issuedAt, message: sessionMessage } = createSessionMessage(address);
      const signature = (await wallet.provider.request({
        method: "personal_sign",
        params: [sessionMessage, address]
      })) as `0x${string}`;
      const verified = await verifyMessage({ address, message: sessionMessage, signature });
      if (!verified) throw new Error("Session signature could not be verified.");

      const session: SignedSession = {
        address,
        walletId: wallet.id,
        rdns: wallet.rdns,
        message: sessionMessage,
        signature,
        issuedAt
      };
      setSignedSession(session);
      window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
      setMessage("Wallet session signed.");
      return session;
    } finally {
      setIsSigningSession(false);
    }
  }, []);

  const refreshPending = useCallback(async (sender?: `0x${string}`, options: RefreshPendingOptions = {}) => {
    if (!sender) {
      setPendingSends([]);
      if (!options.silent) setMessage("Connect a wallet to read pending sends.");
      return [] as PendingSend[];
    }

    const attempts = options.attempts ?? 1;
    let activeRows: PendingSend[] = [];
    let lastError: unknown;
    setIsRefreshingPending(true);

    const readContractPending = async () => {
      const ids = (await publicClient.readContract({
        address: contracts.guardedSend,
        abi: guardedSendAbi,
        functionName: "pendingOf",
        args: [sender]
      })) as readonly bigint[];

      const rows = await Promise.all(
        ids.map(async (id) => {
          const row = await publicClient.readContract({
            address: contracts.guardedSend,
            abi: guardedSendAbi,
            functionName: "sendAt",
            args: [id]
          });
          return normalizePending(id, row);
        })
      );

      return rows.filter((row) => !row.claimed && !row.cancelled);
    };

    for (let attempt = 0; attempt < attempts; attempt += 1) {
      try {
        const response = await fetch(`/api/pending-sends?address=${sender}&role=sender&includeClosed=true`, { cache: "no-store" });
        const payload = (await response.json()) as PendingSendResponse;
        if (!response.ok) throw new Error(payload.error ?? "Pending refresh failed.");

        const allRows = (payload.rows ?? []).map(normalizePendingJson);
        activeRows = allRows.filter((row) => !row.claimed && !row.cancelled);
        if (activeRows.length < (options.minRows ?? 0) || payload.syncWarning) {
          activeRows = await readContractPending();
        }
        setPendingSends(activeRows);
        setSendHistory((current) => {
          const merged = [...current, ...allRows.filter((row) => row.claimed || row.cancelled)];
          return [...new Map(merged.map((row) => [row.id.toString(), row])).values()].sort((a, b) => Number(b.id - a.id));
        });
        if (activeRows.length >= (options.minRows ?? 0)) break;
      } catch (error) {
        lastError = error;
        try {
          activeRows = await readContractPending();
          setPendingSends(activeRows);
          if (activeRows.length >= (options.minRows ?? 0)) break;
        } catch (fallbackError) {
          lastError = fallbackError;
        }
      }

      if (attempt < attempts - 1) {
        await new Promise((resolve) => window.setTimeout(resolve, 700));
      }
    }

    setIsRefreshingPending(false);
    if (lastError && activeRows.length === 0) {
      if (!options.silent) setMessage(lastError instanceof Error ? lastError.message.split("\n")[0] ?? "Pending refresh failed." : "Pending refresh failed.");
      return [] as PendingSend[];
    }

    if (!options.silent) {
      setMessage(activeRows.length > 0 ? `Loaded ${activeRows.length} active guarded send${activeRows.length === 1 ? "" : "s"}.` : "No active guarded sends for this wallet.");
    }
    return activeRows;
  }, []);

  const refreshIncoming = useCallback(async (recipient?: `0x${string}`, options: RefreshPendingOptions = {}) => {
    if (!recipient) {
      setIncomingSends([]);
      return [] as PendingSend[];
    }

    try {
      const response = await fetch(`/api/pending-sends?address=${recipient}&role=recipient&includeClosed=true`, { cache: "no-store" });
      const payload = (await response.json()) as PendingSendResponse;
      if (!response.ok) throw new Error(payload.error ?? "Incoming refresh failed.");
      const rows = (payload.rows ?? []).map(normalizePendingJson);
      setIncomingSends(rows.filter((row) => !row.claimed && !row.cancelled));
      setSendHistory((current) => {
        const merged = [...current, ...rows.filter((row) => row.claimed || row.cancelled)];
        return [...new Map(merged.map((row) => [row.id.toString(), row])).values()].sort((a, b) => Number(b.id - a.id));
      });
      if (!options.silent) setMessage(rows.length > 0 ? `Loaded ${rows.length} incoming guarded send${rows.length === 1 ? "" : "s"}.` : "No incoming guarded sends for this wallet.");
      return rows;
    } catch (error) {
      if (!options.silent) setMessage(error instanceof Error ? error.message.split("\n")[0] ?? "Incoming refresh failed." : "Incoming refresh failed.");
      return [] as PendingSend[];
    }
  }, []);

  useEffect(() => {
    if (!provider?.on) return;

    const handleAccountsChanged = (...args: unknown[]) => {
      const accounts = (Array.isArray(args[0]) ? args[0] : []) as string[];
      if (!accounts[0]) {
        setAccount(undefined);
        setChainOk(false);
        setPendingSends([]);
        setIncomingSends([]);
        setSendHistory([]);
        setSignedSession(undefined);
        window.localStorage.removeItem(SESSION_STORAGE_KEY);
        setMessage("Wallet disconnected.");
        return;
      }
      const selected = getAddress(accounts[0]);
      setAccount(selected);
      void refreshPending(selected, { silent: true });
      void refreshIncoming(selected, { silent: true });
    };

    const handleChainChanged = (...args: unknown[]) => {
      const chainId = typeof args[0] === "string" ? args[0] : "0x0";
      const isGiwa = Number.parseInt(chainId, 16) === GIWA_SEPOLIA.id;
      setChainOk(isGiwa);
      setMessage(isGiwa ? "GIWA Sepolia ready." : "Switch to GIWA Sepolia to continue.");
    };

    provider.on("accountsChanged", handleAccountsChanged);
    provider.on("chainChanged", handleChainChanged);

    return () => {
      provider.removeListener?.("accountsChanged", handleAccountsChanged);
      provider.removeListener?.("chainChanged", handleChainChanged);
    };
  }, [provider, refreshIncoming, refreshPending]);

  useEffect(() => {
    if (!account) {
      setPendingSends([]);
      setIncomingSends([]);
      setSendHistory([]);
      return;
    }
    void refreshPending(account, { silent: true });
    void refreshIncoming(account, { silent: true });
  }, [account, refreshIncoming, refreshPending]);

  const switchNetwork = useCallback(async (targetProvider?: EthereumProvider) => {
    const activeProvider = targetProvider ?? provider;
    if (!activeProvider) {
      setWalletPanelOpen(true);
      setMessage("Choose a wallet before switching network.");
      return;
    }
    try {
      await activeProvider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0x164ce" }] });
      setChainOk(true);
    } catch {
      await activeProvider.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: "0x164ce",
            chainName: "GIWA Sepolia Testnet",
            nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
            rpcUrls: [GIWA_RPC_URL],
            blockExplorerUrls: ["https://sepolia-explorer.giwa.io"]
          }
        ]
      });
      setChainOk(true);
    }
  }, [provider]);

  const connectWallet = useCallback(async (wallet: WalletOption) => {
    setIsConnectingWallet(true);
    try {
      setSelectedWallet(wallet);
      setMessage("Select the account to use with Suho.");
      window.localStorage.setItem(WALLET_STORAGE_KEY, JSON.stringify({ id: wallet.id, rdns: wallet.rdns, name: wallet.name }));
      await wallet.provider.request({
        method: "wallet_requestPermissions",
        params: [{ eth_accounts: {} }]
      }).catch(() => undefined);
      const accounts = (await wallet.provider.request({ method: "eth_requestAccounts" })) as string[];
      if (!accounts[0]) throw new Error("No wallet account was selected.");
      const selected = getAddress(accounts[0]);
      setAccount(selected);
      setSignedSession(undefined);
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
      const chainId = (await wallet.provider.request({ method: "eth_chainId" })) as string;
      const isGiwa = Number.parseInt(chainId, 16) === GIWA_SEPOLIA.id;
      setChainOk(isGiwa);
      if (!isGiwa) await switchNetwork(wallet.provider);
      await signSession(wallet, selected);
      await refreshPending(selected, { silent: true });
      await refreshIncoming(selected, { silent: true });
      setWalletPanelOpen(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message.split("\n")[0] ?? "Wallet connection failed." : "Wallet connection failed.");
    } finally {
      setIsConnectingWallet(false);
    }
  }, [refreshIncoming, refreshPending, signSession, switchNetwork]);

  const switchWalletAccount = useCallback(async () => {
    if (!selectedWallet) return setWalletPanelOpen(true);
    try {
      await connectWallet(selectedWallet);
    } catch (error) {
      setMessage(error instanceof Error ? error.message.split("\n")[0] ?? "Account switch failed." : "Account switch failed.");
    }
  }, [connectWallet, selectedWallet]);

  useEffect(() => {
    if (hasRestoredWallet || account || wallets.length === 0) return;
    setHasRestoredWallet(true);

    const restore = async () => {
      const stored = window.localStorage.getItem(WALLET_STORAGE_KEY);
      if (!stored) return;

      let saved: { id?: string; rdns?: string; name?: string };
      try {
        saved = JSON.parse(stored) as { id?: string; rdns?: string; name?: string };
      } catch {
        window.localStorage.removeItem(WALLET_STORAGE_KEY);
        return;
      }

      const wallet = wallets.find((item) =>
        (saved.rdns && item.rdns === saved.rdns) || item.id === saved.id || item.name === saved.name
      );
      if (!wallet) return;

      const accounts = (await wallet.provider.request({ method: "eth_accounts" })) as string[];
      if (accounts.length === 0 || !accounts[0]) return;

      const selected = getAddress(accounts[0]);
      setSelectedWallet(wallet);
      setAccount(selected);
      const chainId = (await wallet.provider.request({ method: "eth_chainId" })) as string;
      const isGiwa = Number.parseInt(chainId, 16) === GIWA_SEPOLIA.id;
      setChainOk(isGiwa);

      const storedSession = window.localStorage.getItem(SESSION_STORAGE_KEY);
      if (storedSession) {
        try {
          const session = JSON.parse(storedSession) as SignedSession;
          const verified = isSessionFresh(session) && session.address.toLowerCase() === selected.toLowerCase() &&
            await verifyMessage({ address: selected, message: session.message, signature: session.signature });
          if (verified) setSignedSession(session);
          else window.localStorage.removeItem(SESSION_STORAGE_KEY);
        } catch {
          window.localStorage.removeItem(SESSION_STORAGE_KEY);
        }
      }

      if (isGiwa) {
        await refreshPending(selected, { silent: true });
        await refreshIncoming(selected, { silent: true });
        setMessage("Wallet restored. Sign session if needed.");
      } else {
        setMessage("Switch to GIWA Sepolia to continue.");
      }
    };

    void restore();
  }, [account, hasRestoredWallet, refreshIncoming, refreshPending, wallets]);

  const connect = useCallback(async () => {
    setWalletPanelOpen(true);
    setMessage(wallets.length === 0 ? "No wallet extension found in this browser." : "Choose a wallet provider to connect.");
  }, [wallets.length]);

  const requireSignedSession = useCallback(async () => {
    if (!selectedWallet || !account) {
      setMessage("Connect and sign a wallet session to continue.");
      await connect();
      return false;
    }
    if (isSessionFresh(signedSession) && signedSession?.address.toLowerCase() === account.toLowerCase()) return true;
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    setWalletPanelOpen(true);
    setMessage("Sign the wallet session to enable protected actions.");
    try {
      await signSession(selectedWallet, account);
      setWalletPanelOpen(false);
      return true;
    } catch (error) {
      setMessage(error instanceof Error ? error.message.split("\n")[0] ?? "Session signature was not completed." : "Session signature was not completed.");
      return false;
    }
  }, [account, connect, selectedWallet, signSession, signedSession]);

  const resolveRecipient = useCallback(async (value: string): Promise<{ address: `0x${string}`; label?: string }> => {
    const trimmed = value.trim();
    if (isAddress(trimmed)) return { address: getAddress(trimmed) };

    if (trimmed.endsWith(".up.id")) {
      const label = trimmed.slice(0, -6);
      const tokenId = BigInt(labelhash(label));
      const owner = (await publicClient.readContract({
        address: contracts.upIdRegistry,
        abi: upIdRegistryAbi,
        functionName: "ownerOf",
        args: [tokenId]
      })) as `0x${string}`;
      return { address: getAddress(owner), label: trimmed };
    }

    throw new Error("Enter a GIWA address or an active name ending in .up.id.");
  }, []);

  const checkRecipient = useCallback(async () => {
    setIsChecking(true);
    setRecipientError(undefined);
    setMessage("Checking live GIWA identity and registry state.");
    setTxStage("idle");
    try {
      const resolved = await resolveRecipient(recipientInput);
      const raw = await publicClient.readContract({
        address: contracts.trustOracle,
        abi: trustOracleAbi,
        functionName: "check",
        args: [resolved.address]
      });
      setResolvedRecipient(resolved.address);
      setResolvedLabel(resolved.label);
      setTrustReport(normalizeTrustReport(raw));
      setRecipientError(undefined);
      setMessage("Recipient checked.");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Trust check failed.";
      setTrustReport(undefined);
      setResolvedRecipient(undefined);
      setResolvedLabel(undefined);
      setRecipientError(errorMessage);
      setMessage(errorMessage);
    } finally {
      setIsChecking(false);
    }
  }, [recipientInput, resolveRecipient]);

  const trackTx = useCallback(async (hash: `0x${string}`) => {
    setTxHash(hash);
    setTxStage("submitted");
    setMessage("Wallet signed. Waiting for GIWA receipt.");
    for (let i = 0; i < 20; i += 1) {
      const receipt = await flashClient.getTransactionReceipt({ hash }).catch(() => null);
      if (receipt) {
        setTxStage("preconfirmed");
        setMessage("Preconfirmed by Flashblocks.");
        break;
      }
      await new Promise((resolve) => window.setTimeout(resolve, 120));
    }
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    setTxStage("included");
    setMessage(`Included in block ${receipt.blockNumber}. Activity will refresh shortly.`);
    window.setTimeout(() => {
      setTxStage("final");
      setMessage("Guarded send recorded.");
    }, 500);
  }, []);

  const guardedSend = useCallback(async () => {
    if (!walletClient || !account) return connect();
    if (!(await requireSignedSession())) return;
    if (!resolvedRecipient) return checkRecipient();
    if (account.toLowerCase() === resolvedRecipient.toLowerCase()) {
      setTxStage("error");
      setMessage("Choose a different recipient. Guarded sends cannot be sent to the connected wallet.");
      return;
    }
    const amountWei = parseAmountWei(amount);
    if (!amountWei || amountWei <= 0n) {
      setTxStage("error");
      setMessage("Enter an amount greater than zero.");
      return;
    }
    if (nativeBalance !== undefined && amountWei >= nativeBalance) {
      setTxStage("error");
      setMessage("Amount exceeds the wallet balance. Keep ETH for network fees.");
      return;
    }
    try {
      setTxStage("submitted");
      setMessage("Confirm guarded send in wallet.");
      const hash = await walletClient.writeContract({
        address: contracts.guardedSend,
        abi: guardedSendAbi,
        functionName: "sendGuarded",
        args: [resolvedRecipient],
        value: amountWei
      });
      await trackTx(hash);
      const activeRows = await refreshPending(account, { minRows: 1, attempts: 5 });
      const latestSend = [...activeRows].sort((a, b) => Number(b.id - a.id))[0];
      if (latestSend) {
        setActivityTab("active");
        setSelectedSend(latestSend);
      }
      await refreshBalance(account);
    } catch (error) {
      setTxStage("error");
      setMessage(error instanceof Error ? error.message.split("\n")[0] ?? "Guarded send failed." : "Guarded send failed.");
    }
  }, [account, amount, checkRecipient, connect, nativeBalance, refreshBalance, refreshPending, requireSignedSession, resolvedRecipient, trackTx, walletClient]);

  const reportRecipient = useCallback(async () => {
    if (!walletClient) return connect();
    if (!(await requireSignedSession())) return;
    if (!resolvedRecipient) return checkRecipient();

    const cleanEvidence = evidence.trim();
    if (!cleanEvidence || !reportAcknowledged) {
      setMessage("Confirm the live report and provide an evidence URI before writing to the registry.");
      return;
    }

    try {
      const minStake = (await publicClient.readContract({
        address: contracts.suhoRegistry,
        abi: registryAbi,
        functionName: "minStake"
      })) as bigint;
      const hash = await walletClient.writeContract({
        address: contracts.suhoRegistry,
        abi: registryAbi,
        functionName: "report",
        args: [resolvedRecipient, 4, cleanEvidence],
        value: minStake
      });
      await trackTx(hash);
      await checkRecipient();
    } catch (error) {
      setTxStage("error");
      setMessage(error instanceof Error ? error.message.split("\n")[0] ?? "Report failed." : "Report failed.");
    }
  }, [checkRecipient, connect, evidence, reportAcknowledged, requireSignedSession, resolvedRecipient, trackTx, walletClient]);

  const cancelSend = useCallback(async (id: bigint) => {
    if (!walletClient || !account) return connect();
    if (!(await requireSignedSession())) return;
    try {
      const hash = await walletClient.writeContract({
        address: contracts.guardedSend,
        abi: guardedSendAbi,
        functionName: "cancel",
        args: [id]
      });
      await trackTx(hash);
      await refreshPending(account, { attempts: 3 });
      await refreshIncoming(account, { silent: true });
    } catch (error) {
      setTxStage("error");
      setMessage(error instanceof Error ? error.message.split("\n")[0] ?? "Cancel failed." : "Cancel failed.");
    }
  }, [account, connect, refreshIncoming, refreshPending, requireSignedSession, trackTx, walletClient]);

  const claimSend = useCallback(async (id: bigint) => {
    if (!walletClient || !account) return connect();
    if (!(await requireSignedSession())) return;
    try {
      const hash = await walletClient.writeContract({
        address: contracts.guardedSend,
        abi: guardedSendAbi,
        functionName: "claim",
        args: [id]
      });
      await trackTx(hash);
      await refreshIncoming(account, { silent: true });
      await refreshPending(account, { silent: true });
      setActivityTab("history");
      setMessage("Claim confirmed. Funds released to the recipient wallet.");
    } catch (error) {
      setTxStage("error");
      setMessage(error instanceof Error ? error.message.split("\n")[0] ?? "Claim failed." : "Claim failed.");
    }
  }, [account, connect, refreshIncoming, refreshPending, requireSignedSession, trackTx, walletClient]);

  useEffect(() => {
    if (!resolvedRecipient || !trustReport) {
      setProfileActivity([]);
      return;
    }

    let cancelled = false;
    const loadProfileActivity = async () => {
      setIsProfileActivityLoading(true);
      try {
        const query = `address=${resolvedRecipient}&includeClosed=true`;
        const [sentResponse, incomingResponse] = await Promise.all([
          fetch(`/api/pending-sends?${query}&role=sender`, { cache: "no-store" }),
          fetch(`/api/pending-sends?${query}&role=recipient`, { cache: "no-store" })
        ]);
        const [sentPayload, incomingPayload] = await Promise.all([
          sentResponse.json() as Promise<PendingSendResponse>,
          incomingResponse.json() as Promise<PendingSendResponse>
        ]);
        if (!sentResponse.ok) throw new Error(sentPayload.error ?? "Profile activity refresh failed.");
        if (!incomingResponse.ok) throw new Error(incomingPayload.error ?? "Profile activity refresh failed.");

        const rows = [...(sentPayload.rows ?? []), ...(incomingPayload.rows ?? [])].map(normalizePendingJson);
        const merged = [...new Map(rows.map((row) => [row.id.toString(), row])).values()].sort((a, b) => Number(b.id - a.id));
        if (!cancelled) setProfileActivity(merged);
      } catch {
        if (!cancelled) setProfileActivity([]);
      } finally {
        if (!cancelled) setIsProfileActivityLoading(false);
      }
    };

    void loadProfileActivity();
    return () => {
      cancelled = true;
    };
  }, [resolvedRecipient, trustReport]);

  // ---- Derived view state ----
  const settlementStarted = Boolean(txHash && txStage !== "idle" && txStage !== "error");
  const activeStage = settlementStarted ? ["submitted", "preconfirmed", "included", "final"].indexOf(txStage) + 1 : -1;
  const amountWei = useMemo(() => parseAmountWei(amount), [amount]);
  const amountReady = Boolean(amountWei && amountWei > 0n);
  const balanceReady = nativeBalance !== undefined;
  const amountExceedsBalance = Boolean(amountWei && nativeBalance !== undefined && amountWei >= nativeBalance);
  const isSelfSend = Boolean(account && resolvedRecipient && account.toLowerCase() === resolvedRecipient.toLowerCase());
  const sessionReady = Boolean(account && isSessionFresh(signedSession, now * 1000) && signedSession?.address.toLowerCase() === account.toLowerCase());
  const sendInFlight = txStage === "submitted" || txStage === "preconfirmed" || txStage === "included";
  const sendNeedsSession = !account || !sessionReady;
  const sendBlocked = !resolvedRecipient || isSelfSend || !amountReady || amountExceedsBalance || Boolean(account && !chainOk) || sendInFlight;
  const sendBlockReason = !resolvedRecipient
    ? "Check a recipient first."
    : isSelfSend
      ? "Use a different recipient wallet."
      : !amountReady
        ? "Enter an amount greater than zero."
        : amountExceedsBalance
          ? "Amount exceeds wallet balance. Keep ETH for network fees."
          : !account
            ? "Connect and sign a wallet session."
            : !sessionReady
              ? "Sign the wallet session."
              : !chainOk
                ? "Switch to GIWA Sepolia."
                : sendInFlight
                  ? "Transaction in progress."
                  : "Ready to send guarded.";
  const guardedSendCta = sendInFlight
    ? "SENDING"
    : sendNeedsSession && !sendBlocked
      ? (!account ? "CONNECT WALLET TO SEND" : "SIGN SESSION TO SEND")
      : "RELEASE INTO GUARDED ROUTE";
  const evidenceReady = evidence.trim().length > 12;
  const reportCanAcknowledge = Boolean(resolvedRecipient && evidenceReady);
  const reportReady = Boolean(reportCanAcknowledge && reportAcknowledged);
  const reportBlockReason = !resolvedRecipient
    ? "Check a recipient first."
    : !evidenceReady
      ? "Add a specific evidence URI."
      : !reportAcknowledged
        ? "Confirm the evidence review."
        : "Ready to submit.";
  const trustTone = trustReport ? verdictCopy[trustReport.verdict]?.tone ?? "safe" : undefined;
  const identityToneClass = trustReport ? (trustReport.dojangVerified ? "ok" : "rk") : "";
  const registryToneClass = trustReport ? (trustReport.registryStatus === 0 || trustReport.registryStatus === 3 ? "ok" : trustReport.registryStatus === 1 ? "wn" : "rk") : "";
  const verdictToneClass = trustReport ? (trustTone === "safe" ? "ok" : trustTone === "caution" ? "wn" : "rk") : "";
  const reverseMatchCopy = trustReport ? (resolvedLabel ? "MATCH" : "ADDRESS CHECK") : "Pending";
  const reverseMatchToneClass = trustReport && resolvedLabel ? "ok" : "";
  const attesterSourceCopy = trustReport ? (trustReport.dojangVerified ? "DOJANG - VERIFIED" : "DOJANG - UNVERIFIED") : "Awaiting reading";
  const resolvedNameCopy = resolvedLabel ?? (trustReport ? "Address input" : "Not resolved");
  const verdictStatusCopy = trustReport ? (trustTone === "safe" ? "INSIDE TOLERANCE" : trustTone === "caution" ? "REVIEW BEFORE SEND" : "BLOCKED BY READING") : "Pending reading";

  const activityRows = useMemo(() => {
    const activeRows = pendingSends.map((send) => ({ send, bucket: "Sent" as const }));
    const incomingRows = incomingSends.map((send) => ({ send, bucket: "Incoming" as const }));
    const historyRows = sendHistory.map((send) => ({ send, bucket: sendDirection(send, account) as "Sent" | "Incoming" }));
    if (!account) return [];
    return mergeSends([...activeRows, ...incomingRows, ...historyRows].map((row) => row.send)).map((send) => ({
      send,
      bucket: sendDirection(send, account) as "Sent" | "Incoming"
    }));
  }, [account, incomingSends, pendingSends, sendHistory]);

  const visibleActivityRows = useMemo(() => {
    if (activityTab === "active") return activityRows.filter(({ send }) => !send.claimed && !send.cancelled && send.sender.toLowerCase() === account?.toLowerCase());
    if (activityTab === "incoming") return activityRows.filter(({ send }) => !send.claimed && !send.cancelled && send.recipient.toLowerCase() === account?.toLowerCase());
    if (activityTab === "history") return activityRows.filter(({ send }) => send.claimed || send.cancelled);
    return activityRows;
  }, [account, activityRows, activityTab]);

  const activityTabs: Array<{ id: ActivityTab; label: string; count: number }> = [
    { id: "all", label: "All", count: activityRows.length },
    { id: "active", label: "Sent", count: pendingSends.length },
    { id: "incoming", label: "Incoming", count: incomingSends.length },
    { id: "history", label: "Closed", count: sendHistory.length }
  ];

  const activityEmptyCopy = !account
    ? "Connect and sign a wallet to read activity."
    : activityTab === "active"
      ? "No active sent guarded sends."
      : activityTab === "incoming"
        ? "No incoming guarded sends."
        : activityTab === "history"
          ? "No closed guarded sends."
          : "No guarded sends indexed for this wallet.";

  const sessionLabel = sessionReady ? sessionAgeLabel(signedSession, now) : "Signature needed";
  const walletStatusCopy = !account ? "CONNECT WALLET" : `${shortAddress(account)} - ${sessionReady ? "SIGNED" : "UNSIGNED"}`;
  const walletStatusClass = !account ? "" : sessionReady ? "ok" : "warn";
  const sessionStatusCopy = !account ? "Connect wallet" : sessionReady ? `SIGNED - ${sessionLabel}` : "UNSIGNED - signature needed";
  const verdictPanelClass = trustReport ? (trustTone === "danger" ? "danger" : trustTone === "caution" ? "caution" : "safe") : "idle";
  const activeSentSends = useMemo(() => pendingSends
    .filter((send) => !send.claimed && !send.cancelled && (!account || send.sender.toLowerCase() === account.toLowerCase()))
    .sort((a, b) => Number(b.id - a.id)), [account, pendingSends]);
  const latestRecallSend = activeSentSends[0];
  const latestRecallRemaining = latestRecallSend ? Math.max(0, Number(latestRecallSend.releaseAt) - now) : 0;
  const latestRecallCanCancel = Boolean(latestRecallSend && latestRecallRemaining > 0);
  const latestRecallStatus = latestRecallSend
    ? latestRecallCanCancel
      ? `Recall window open - ${releaseLabel(latestRecallSend, now)}.`
      : "Recall window ended - recipient can claim."
    : "";
  const recipientActivity = useMemo(() => profileActivity.slice(0, 6), [profileActivity]);

  const riskReasons = useMemo(() => {
    if (!trustReport) return ["Run a recipient check to read live status."];
    const reasons: string[] = [];
    reasons.push(trustReport.dojangVerified ? "Dojang identity verified." : "No verified Dojang identity found.");
    const registryLabel = registryStatuses[trustReport.registryStatus] ?? "Unknown";
    reasons.push(`Registry status: ${registryLabel}.`);
    reasons.push(trustReport.reportCount > 0 ? `${trustReport.reportCount} registry report${trustReport.reportCount === 1 ? "" : "s"} found.` : "No registry reports found.");
    if (account && resolvedRecipient && account.toLowerCase() === resolvedRecipient.toLowerCase()) reasons.push("Connected wallet matches recipient.");
    if (recipientActivity.length > 0) reasons.push(`${recipientActivity.length} related guarded send${recipientActivity.length === 1 ? "" : "s"}.`);
    return reasons;
  }, [account, recipientActivity.length, resolvedRecipient, trustReport]);

  const recipientNotice: { tone: "caution" | "danger"; title: string; detail: string } | undefined = recipientError
    ? { tone: "danger", title: "Recipient check failed", detail: recipientError }
    : trustReport && trustTone && trustTone !== "safe"
      ? { tone: trustTone === "danger" ? "danger" : "caution", title: trustTone === "danger" ? "Recipient blocked" : "Recipient needs review", detail: riskReasons.join(" ") }
      : undefined;

  const sendReadiness: Array<{ label: string; value: string; tone: Tone }> = [
    { label: "Recipient", value: resolvedRecipient ? shortAddress(resolvedRecipient) : "Not checked", tone: resolvedRecipient ? "ready" : "idle" },
    { label: "Amount", value: amountReady ? `${amount} ETH` : "Required", tone: amountReady && !amountExceedsBalance ? "ready" : "warn" },
    { label: "Balance", value: isBalanceLoading ? "Reading" : balanceReady ? balanceLabel(nativeBalance) : "Unavailable", tone: amountExceedsBalance ? "warn" : balanceReady ? "ready" : "idle" },
    { label: "Session", value: sessionReady ? "Signed" : "Needed", tone: sessionReady ? "ready" : "warn" }
  ];

  const currentStageLabel = txStage === "idle"
    ? "Ready"
    : txStage === "error"
      ? "Needs attention"
      : txStage === "submitted"
        ? "Submitted"
        : txStage === "preconfirmed"
          ? "Preconfirmed"
          : txStage === "included"
            ? "Included"
            : "Final";

  const timelineSteps: Array<{ key: TxStage; label: string; detail: string }> = [
    { key: "submitted", label: "Submitted", detail: "Wallet signed" },
    { key: "preconfirmed", label: "Preconfirmed", detail: "Early receipt observed" },
    { key: "included", label: "Included", detail: "Included on GIWA" },
    { key: "final", label: "Final", detail: "Complete" }
  ];

  // ---- Route stations ----
  const checkTone: VerdictTone | undefined = trustReport ? verdictCopy[trustReport.verdict]?.tone : undefined;

  // Hero strip = live position of the current send along the route.
  const txRank = TX_RANK[txStage];
  const liveStationState = (index: number): StationState => {
    switch (index) {
      case 0: return trustReport ? "done" : isChecking ? "active" : "idle";
      case 1: return trustReport ? "done" : "idle";
      case 2: return txRank > 0 ? "done" : trustReport && !sendBlocked ? "active" : "idle";
      case 3: return txRank > 2 ? "done" : txRank >= 1 ? "active" : "idle";
      case 4: return txRank > 3 ? "done" : txRank === 3 ? "active" : "idle";
      case 5: return txRank >= 4 ? "done" : "idle";
      default: return "idle";
    }
  };
  const heroStations: RouteStation[] = ROUTE_STATIONS.map((station, index) => ({
    label: station.label,
    meta: station.meta,
    state: liveStationState(index),
    tone: index === 0 ? checkTone : undefined
  }));

  // Rail = scroll position through the page (storytelling), tinted by the verdict.
  const railStations: RouteStation[] = ROUTE_STATIONS.map((station, index) => ({
    label: station.label,
    meta: station.meta,
    state: index < activeStation ? "done" : index === activeStation ? "active" : "idle",
    tone: index === 0 ? checkTone : undefined
  }));

  return (
    <>
      <div className="bgfx" aria-hidden="true" />
      <canvas id="field" className="trust-field" aria-hidden="true" />
      <div className="veil" aria-hidden="true" />
      <div className="datum a" aria-hidden="true" />
      <div className="datum b" aria-hidden="true" />

      <div className={"view view--intro" + (isLaunchingConsole ? " is-launching" : "")} id="intro">
        <header className="bar">
          <div className="wrap bar__in">
            <a className="mark" href="#s01" aria-label="Suho assay overview">
              <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true" fill="none">
                <rect x="2.5" y="2.5" width="23" height="23" stroke="var(--ink)" strokeWidth="1.5" />
                <path d="M14 6.5v15M9 11h10" stroke="var(--ink)" strokeWidth="1.5" />
                <path d="M9 18.5h10" stroke="var(--seal)" strokeWidth="1.5" />
              </svg>
              <span><span className="mkid">SUHO</span><span className="mksub">Protected value instrument</span></span>
            </a>
            <div className="meta">
              <div><span className="lbl">Network</span><b className="ok">GIWA - 91342</b></div>
              <div><span className="lbl">Instrument</span><b>ASSAY</b></div>
              <div><span className="lbl">Flashblocks</span><b className="ok">ONLINE</b></div>
            </div>
            <div className="btns">
              <button className="tbtn" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"} title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}><span className="theme-icon" aria-hidden="true" /></button>
              <button className="wal" onClick={launchConsole}><span className="d" />LAUNCH CONSOLE &rarr;</button>
            </div>
          </div>
        </header>

        <div className="route">
          <div className="wrap route__in">
            <span className="route__k">ROUTE</span>
            <div className="rail">
              <div className="rail__fill" />
              <div className="rail__seg" />
              {ROUTE_STATIONS.map((station, index) => (
                <a key={station.label} className={["stn", index < routeStation ? "lock" : "", index === routeStation ? "cur" : ""].filter(Boolean).join(" ")} href={"#s" + String(Math.min(index + 1, 6)).padStart(2, "0")} style={{ left: ((index / Math.max(1, ROUTE_COUNT - 1)) * 100) + "%" }}>
                  <i /><b>{station.label.toUpperCase()}</b>
                </a>
              ))}
              <div className="needle" />
            </div>
            <span className="route__v">READING {trustReport ? shortAddress(resolvedRecipient) : "0x7C1A"} - <b>{trustReport ? verdictCopy[trustReport.verdict]?.name.toUpperCase() ?? "SAFE" : "SAFE"}</b></span>
          </div>
        </div>

        <nav className="railnav" aria-label="Register index">
          <div className="h">Register</div>
          {["Assay", "Registry", "Guard", "Settlement", "Ledger", "Protocol"].map((name, index) => (
            <a key={name} className={"rn " + (activeStation === index ? "on" : "")} href={"#s" + String(index + 1).padStart(2, "0")}>
              <span className="nm">{name}</span><span className="no">{String(index + 1).padStart(2, "0")}</span><span className="tk" />
            </a>
          ))}
        </nav>

        <main>
          <section className="stage" id="s01" data-station>
            <div className="wrap">
              <div className="hero-top" data-rise>
                <div>
                  <div className="kick"><span className="ln" /><span className="lbl">01 - Assay - recipient measurement</span></div>
                  <h1 className="h1">Assay the recipient <em>before value moves.</em></h1>
                  <p className="lede">Suho reads recipient identity and registry status, then keeps value on a recallable route until you are ready to release.</p>
                  <div className="herocta">
                    <button className="cta cta--primary" onClick={launchConsole}>LAUNCH CONSOLE &rarr;</button>
                    <a className="cta cta--ghost" href="#s02">SEE HOW IT WORKS &rarr;</a>
                  </div>
                </div>
                <div className="statrow">
                  <div className="stat"><span className="k">Recall window</span><span className="v num">10:00</span></div>
                  <div className="stat"><span className="k">Verdict speed</span><span className="v num">~200 ms</span></div>
                  <div className="stat"><span className="k">Checkpoints</span><span className="v num">6</span></div>
                </div>
              </div>

              <div className="bezel" data-rise>
                <div className="bz-head"><span className="t">Trust Assay - sample preview</span><span className="g" /><span className="demotag"><span className="d" />DEMO DATA</span></div>
                <div className="assaygrid">
                  <div className="l">
                    <div className="probe-wrap">
                      <div className="lbl" style={{ marginBottom: 10 }}>Sample - address or up.id - example reading</div>
                      <div className="probe demo"><span className="tag">SAMPLE</span><input value="merchant.up.id" spellCheck={false} readOnly aria-readonly="true" /><button className="go" onClick={launchConsole}>LAUNCH CONSOLE &rarr;</button></div>
                      <p className="lbl dim" style={{ marginTop: 11, letterSpacing: ".1em", textTransform: "none" }}>Preview only - not a live send. Measure real recipients in the Console.</p>
                    </div>
                    <div className="gauge"><div className="sweep" /><div className="gscale"><div className="gminor" /><div className="gbase" /><div className="gband" />{ROUTE_STATIONS.map((station, index) => <div key={"g-" + station.label} className={"gstn " + (index === 0 ? "lock" : index === 1 ? "cur" : "")} style={{ left: ((index / Math.max(1, ROUTE_COUNT - 1)) * 100) + "%" }}><i /><b>{station.label.toUpperCase()}</b></div>)}<div className="greading">READING - SAFE</div><div className="gneedle" /><div className="gnum"><span>00</span><span>01</span><span>02</span><span>03</span><span>04</span><span>05</span></div></div></div>
                  </div>
                  <div className="resid">
                    <div className="r"><span className="k">Resolved</span><span className="v">0x9F3C...4C2A</span></div>
                    <div className="r"><span className="k">up.id</span><span className="v ok">merchant.up.id</span></div>
                    <div className="r"><span className="k">Attester</span><span className="v">DOJANG - FAUCET</span></div>
                    <div className="r"><span className="k">Reverse</span><span className="v ok">MATCH</span></div>
                    <div className="r"><span className="k">Last seen</span><span className="v">BLOCK 4,912,077</span></div>
                    <div className="r"><span className="k">Route</span><span className="v">RECIPIENT &rarr; FINAL</span></div>
                  </div>
                </div>
              </div>
              <div className="infb" data-rise>
                <div className="c"><div className="h"><span className="dot" />What Suho protects against</div><p>Wrong-address transfers, address-poisoning look-alikes, and recipients with existing risk reports. Suho checks the recipient first, so value only moves after a reading.</p></div>
                <div className="c"><div className="h"><span className="dot" />What a reading is</div><p>A live check of on-chain identity, name resolution, and registry status, returned as one verdict before you commit.</p></div>
              </div>
            </div>
          </section>

          <IntroSection id="s02" no="02" kicker="Registry - identity and risk tolerance" title="Measure identity and risk against tolerance." body="Dojang verified identity, up.id reverse-match, and community scam intelligence resolve to a single reading. Green is inside tolerance; amber is caution; red is out.">
            <div className="bezel"><div className="bz-head"><span className="t">Tolerance readout</span><span className="g" /><span className="live">MEASURED</span></div><div className="reg"><div className="l"><div className="vk">Verdict - reading locked</div><div className="vbig safe">SAFE</div><div className="vd">Identity verified, registry clean - the reading sits inside tolerance. Clear to route.</div><div className="readgrid"><div className="m"><div className="k">Identity - Dojang</div><div className="v ok">VERIFIED</div></div><div className="m"><div className="k">Registry</div><div className="v">CLEAN</div></div><div className="m"><div className="k">Reports</div><div className="v num">0</div></div><div className="m"><div className="k">Reverse match</div><div className="v ok">TRUE</div></div></div></div><div className="r"><div className="tol"><div className="tolhead"><span className="lbl">Tolerance scale</span><span className="lbl dim">READING - 74%</span></div><div className="tolscale"><div className="tolzones"><div className="z danger"><span>DANGER</span></div><div className="z caution"><span>CAUTION</span></div><div className="z safe"><span>SAFE</span></div></div><div className="tolscan" /><div className="tolmark"><b>READING</b><i /></div></div></div></div></div></div>
          </IntroSection>

          <IntroSection id="s03" no="03" kicker="Guard - clamp value into a recallable route" title="Clamp the value. Release into escrow." body="The route holds it, recallable for ten minutes; a flagged recipient can never claim. Cancel any time before the window closes for an instant, full refund.">
            <div className="bezel"><div className="bz-head"><span className="t">Guarded send - escrow</span><span className="g" /><span className="lbl dim">GIWA-GUARD</span></div><div className="guard"><div className="l"><div className="amtk"><span className="lbl">Release amount</span><span className="lbl dim">Max 1.284</span></div><div className="amt"><input value="0.25" readOnly /><span className="u">ETH</span></div><div className="balbar"><i /></div><div className="balrow"><span>0.25 / 1.284 ETH COMMITTED</span><span>19.5%</span></div><button className="release" onClick={launchConsole}>RELEASE INTO GUARDED ROUTE &rarr;</button></div><div className="r"><div className="chks"><div className="r2 r"><span className="k">Recipient</span><span className="v ok">LOCKED - SAFE</span></div><div className="r"><span className="k">Amount</span><span className="v ok">0.25 ETH</span></div><div className="r"><span className="k">Balance</span><span className="v ok">1.284 ETH</span></div><div className="r"><span className="k">Session</span><span className="v ok">SIGNED - 8H</span></div></div></div></div></div>
          </IntroSection>

          <IntroSection id="s04" no="04" kicker="Settlement: preconfirmed to final" title="Watch the reading lock to final." body="Preconfirmed is an early Flashblocks signal. It is provisional, not final. Each stage updates as the send moves through GIWA.">
            <div className="bezel"><div className="bz-head"><span className="t">Settlement live reading</span><span className="g" /><span className="live">LIVE</span></div><div className="steps">{timelineSteps.map((step, index) => <div key={step.key} className={"step " + (activeStage > index ? "done" : activeStage === index ? "cur" : "")}><span className="fl" /><span className="tk" /><div className="no">0{index + 1}</div><div className="nm">{step.label}</div><div className="ds">{step.detail}</div></div>)}</div><div className="settle__foot"><div><div className="msg">{message}</div><div className="sub">PRECONFIRMED IS PROVISIONAL. WAIT FOR FINALITY.</div></div><a className="mono">{txHash ? shortAddress(txHash) + " \u2192" : "AWAITING REAL SEND"}</a></div></div>
          </IntroSection>

          <IntroSection id="s05" no="05" kicker="Ledger - recall activity" title="Every reading on record." body="Guarded sends by route, amount, and settlement window. Recall or claim inline; open any reading for its full record.">
            <div className="bezel"><div className="ledsum">{activityTabs.map((tab) => <button key={"intro-tab-" + tab.id} className={tab.id === activityTab ? "on" : ""} onClick={() => setActivityTab(tab.id)}><span className="k">{tab.label}</span><span className="v num">{tab.count}</span></button>)}</div>{visibleActivityRows.length === 0 ? <div className="empty" style={{ padding: 22 }}>{activityEmptyCopy}</div> : visibleActivityRows.slice(0, 3).map(({ send }) => <div key={"intro-row-" + send.id.toString()} className="logr"><span className={"rgly " + (sendDirection(send, account) === "Sent" ? "out" : "in")} /><div><div className="rt">{shortAddress(send.recipient)}</div><div className="sb">{sendDirection(send, account).toUpperCase()} - RECIPIENT</div></div><div><div className="amt2">{formatEther(send.amount)} ETH</div></div><div><span className="tp ok">{releaseLabel(send, now)}</span></div><div className="rbtns"><button className="rbtn" onClick={() => setSelectedSend(send)}>DETAIL</button></div></div>)}</div>
          </IntroSection>

          <IntroSection id="s06" no="06" kicker="Protocol - contracts, checks, GIWA Sepolia" title="On the record." body="Suho uses GIWA's trust stack: Dojang identity, EAS attestations, SuhoRegistry reports, and Flashblocks settlement. Each check is a public contract call.">
            <div className="bezel"><div className="bz-head"><span className="t">Instrument register</span><span className="g" /><span className="lbl dim">GIWA-SEPOLIA</span></div><div className="proto"><div className="l"><svg className="seal" viewBox="0 0 132 132" fill="none" aria-hidden="true"><circle cx="66" cy="66" r="63" stroke="var(--seal)" strokeWidth="1.2" /><circle cx="66" cy="66" r="52" stroke="var(--line3)" strokeWidth="1" /><rect x="50" y="50" width="32" height="32" stroke="var(--ink)" strokeWidth="1.4" /><path d="M66 55v22M58 62h16" stroke="var(--ink)" strokeWidth="1.4" /><path d="M58 72h16" stroke="var(--seal)" strokeWidth="1.4" /></svg><div className="sealtx">Recorded on GIWA</div><div className="sealsub">Every verdict and report is read from GIWA Sepolia contracts. Suho does not require a separate app database.</div></div><div className="r"><div className="regcol"><h4>Contracts</h4><div className="kv"><span className="k">CHAIN</span><span>91342</span></div><div className="kv"><span className="k">TRUST ORACLE</span><span>{shortAddress(contracts.trustOracle)}</span></div><div className="kv"><span className="k">GUARDED SEND</span><span>{shortAddress(contracts.guardedSend)}</span></div><div className="kv"><span className="k">REGISTRY</span><span>{shortAddress(contracts.suhoRegistry)}</span></div><div className="kv"><span className="k">EAS</span><span>{"GIWA EAS"}</span></div></div><div className="regcol"><h4>Checks</h4><div className="kv"><span className="k">IDENTITY</span><span>DOJANGSCROLL</span></div><div className="kv"><span className="k">NAME</span><span>UP.ID / ENS</span></div><div className="kv"><span className="k">RISK</span><span>SUHOREGISTRY</span></div><div className="kv"><span className="k">SETTLE</span><span>FLASHBLOCKS</span></div><div className="kv"><span className="k">RECALL</span><span>GUARDEDSEND / 600S</span></div></div></div></div></div>
          </IntroSection>

          <section className="stage finale" id="s07"><div className="wrap"><div data-rise><div className="kick"><span className="ln" /><span className="lbl">Launch protected value console</span></div><div className="big">Move value after a recipient reading.</div><p className="sub">In Console, connect a wallet, check a recipient on GIWA Sepolia, and release a guarded send with the verdict on record.</p><div className="herocta"><button className="cta cta--primary" onClick={launchConsole}>LAUNCH CONSOLE &rarr;</button><a className="cta cta--ghost" href="#s06">VIEW PROTOCOL</a></div><div className="assure"><span><i />Recallable for 10 minutes</span><span><i />Live GIWA Sepolia contract calls</span><span><i />Testnet only. Preconfirmed is not final</span></div></div></div></section>
        </main>
      </div>

      <div className={"view view--console" + (isLaunchingConsole ? " is-arriving" : "")} id="console">
        <header className="cbar">
          <div className="wrap cbar__in">
            <button className="mark" onClick={backToIntro} aria-label="Back to Assay overview"><span className="mkid">SUHO</span></button>
            <span className="viewtag">Console</span>
            <div className="cstatus"><span className="s"><span className="d" />GIWA - <b>91342</b></span><span className="s"><span className="d" />Flashblocks <b>ONLINE</b></span></div>
            <span className="sp" />
            <div className="btns"><button className="back-link" onClick={backToIntro}><span aria-hidden="true">{"\u2190"}</span><span className="bk-tx">Back to Assay overview</span></button><button className="tbtn" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"} title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}><span className="theme-icon" aria-hidden="true" /></button><button className={"wal " + walletStatusClass} onClick={() => { void connect(); }}><span className="d" /><span className="wal-tx">{walletStatusCopy}</span></button></div>
          </div>
        </header>

        <div className="wbwrap">
          <div className="wbtitle"><h1>Protected value workbench</h1><span className="rd">GIWA SEPOLIA - 91342 - connect - measure - send - monitor</span></div>
          <nav className="ctabbar" aria-label="Console sections"><a className="ct on" href="#p-assay"><span className="ci">01</span>Assay</a><a className="ct" href="#p-guard"><span className="ci">02</span>Guard</a><a className="ct" href="#p-settle"><span className="ci">03</span>Settlement</a><a className="ct" href="#p-ledger"><span className="ci">04</span>Ledger</a><a className="ct" href="#p-proto"><span className="ci">05</span>Protocol</a></nav>

          {!chainOk && account ? <div className="net-banner" role="alert"><span className="cluster"><AlertTriangle size={18} />Switch to GIWA Sepolia before any settlement action.</span><button onClick={() => { void switchNetwork(); }} className="btn btn--subtle btn--sm">Switch network</button></div> : null}

          <section className="pnl" id="p-session" style={{ marginBottom: 18 }}><div className="sessrow"><div className="c"><span className="k">Wallet</span><span className={"v " + walletStatusClass}>{account ? shortAddress(account) : "Connect wallet"}</span></div><div className="c"><span className="k">Network</span><span className={chainOk ? "v ok" : account ? "v warn" : "v"}>{account ? (chainOk ? "GIWA Sepolia - 91342" : "Wrong network") : "Connect wallet"}</span></div><div className="c"><span className="k">Session</span><span className={sessionReady ? "v ok" : account ? "v warn" : "v"}>{sessionStatusCopy}</span></div><div className="c"><span className="k">Workflow</span><span className="flow"><b>1</b> Connect - <b>2</b> Measure - <b>3</b> Send - <b>4</b> Monitor</span></div></div></section>

          <div className="wb">
            <div className="wbcol">
              <section className="pnl" id="p-assay"><div className="pnl__h"><span className="t">Recipient assay</span><span className="g" /><span className="st" style={{ color: "var(--safe)" }}>LIVE</span></div><div className="pnl__b"><div className="wblbl">Recipient - address or up.id</div><div className="cin"><span className="tag">TO</span><input value={recipientInput} onChange={(event) => { setRecipientInput(event.target.value); setResolvedRecipient(undefined); setResolvedLabel(undefined); setTrustReport(undefined); setProfileOpen(false); setRecipientError(undefined); }} onKeyDown={(event) => { if (event.key === "Enter") void checkRecipient(); }} placeholder="merchant.up.id" spellCheck={false} /><button onClick={() => { void checkRecipient(); }} disabled={isChecking}>{isChecking ? "MEASURING" : "MEASURE"}</button></div>{recipientError ? <div className="recipient-notice danger"><b>Recipient check failed</b><span>{recipientError}</span></div> : null}<div className="cgrid2" style={{ marginTop: 16 }}><div><div className="crow"><span className="k">Resolved</span><span className="v">{resolvedRecipient ? shortAddress(resolvedRecipient) : "Awaiting sample"}</span></div><div className="crow"><span className="k">up.id</span><span className={"v " + (resolvedLabel ? "ok" : "")}>{resolvedNameCopy}</span></div><div className="crow"><span className="k">Reverse match</span><span className={"v " + reverseMatchToneClass}>{reverseMatchCopy}</span></div>{trustReport ? <button className="detail-link" onClick={() => setProfileOpen(true)}>OPEN RECIPIENT RECORD</button> : null}</div><div><div className="crow"><span className="k">Attester / source</span><span className={"v " + identityToneClass}>{attesterSourceCopy}</span></div><div className="crow"><span className="k">Last seen</span><span className="v">{trustReport ? trustReport.reportCount + " reports" : "No reading yet"}</span></div><div className="crow"><span className="k">Route</span><span className="v">RECIPIENT &rarr; FINAL</span></div></div></div></div></section>
              <section className="pnl" id="p-registry"><div className="pnl__h"><span className="t">Registry verdict</span><span className="g" /><span className="st">SUHOREGISTRY</span></div><div className="pnl__b"><div className={"verdict " + verdictPanelClass}><div className="vv">{trustReport ? verdictCopy[trustReport.verdict]?.name.toUpperCase() ?? "SAFE" : "-"}</div><div className="vx">{trustReport ? (verdictCopy[trustReport.verdict]?.text ?? "Measured recipient.") : "Measure a recipient to resolve identity, registry, and tolerance."}</div></div>{recipientNotice ? <div className={"recipient-notice " + recipientNotice.tone}><b>{recipientNotice.title}</b><span>{recipientNotice.detail}</span></div> : null}<div className="cgrid2" style={{ marginTop: 14 }}><div><div className="crow"><span className="k">Identity</span><span className={"v " + identityToneClass}>{trustReport ? (trustReport.dojangVerified ? "DOJANG - VERIFIED" : "UNVERIFIED") : "-"}</span></div><div className="crow"><span className="k">Registry</span><span className={"v " + registryToneClass}>{trustReport ? (registryStatuses[trustReport.registryStatus] ?? "Unknown") : "-"}</span></div></div><div><div className="crow"><span className="k">Reports</span><span className="v">{trustReport?.reportCount ?? 0}</span></div><div className="crow"><span className="k">Verdict</span><span className={"v " + verdictToneClass}>{verdictStatusCopy}</span></div></div></div><div className="creport"><div className="h">Recipient looks wrong? Report risk</div><div className="crep-row"><input value={evidence} onChange={(event) => { setEvidence(event.target.value); setReportAcknowledged(false); }} placeholder="https://... public evidence URI" spellCheck={false} /><button onClick={() => { void reportRecipient(); }} disabled={!reportReady}>REPORT</button></div><label className="crep-check"><input type="checkbox" checked={reportCanAcknowledge && reportAcknowledged} disabled={!reportCanAcknowledge} onChange={(event) => setReportAcknowledged(event.target.checked)} /><span>I checked this recipient and the public evidence. Reporting stakes ETH into SuhoRegistry.</span></label><div className={"crep-hint " + (reportReady ? "ok" : "")}>{reportBlockReason}</div></div></div></section>
              <section className="pnl" id="p-guard"><div className="pnl__h"><span className="t">Guarded send</span><span className="g" /><span className="st" style={{ color: sendBlocked ? "var(--caution)" : "var(--safe)" }}>{sendBlocked ? "WAITING" : "RECIPIENT CHECKED"}</span></div><div className="pnl__b"><div className="wblbl">Release amount / max {balanceLabel(nativeBalance)}</div><div className="camt"><input value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.25" spellCheck={false} /><span className="u">ETH</span></div><div className="crow" style={{ marginTop: 12 }}><span className="k">Balance</span><span className="v">{isBalanceLoading ? "Reading" : balanceLabel(nativeBalance)}</span></div><div className="crecall"><div className="dial" /><div className="dialc">10:00</div><p>{sendBlockReason} Funds stay recallable for 10 minutes.</p></div>{latestRecallSend ? <div className="recallbox"><div><span className="k">Active recall route</span><b>{shortAddress(latestRecallSend.recipient)} - {formatEther(latestRecallSend.amount)} ETH</b><p>{latestRecallStatus}</p></div><div className="actions">{latestRecallCanCancel ? <button className="rbtn dn" onClick={() => { void cancelSend(latestRecallSend.id); }}>CANCEL SEND</button> : null}<button className="rbtn" onClick={() => setSelectedSend(latestRecallSend)}>DETAIL</button></div></div> : null}<button className="crelease" onClick={() => { void guardedSend(); }} disabled={sendBlocked}>{guardedSendCta}</button></div></section>
            </div>
            <div className="wbcol">
              <section className="pnl" id="p-settle"><div className="pnl__h"><span className="t">Settlement</span><span className="g" /><span className="st" style={{ color: settlementStarted ? "var(--safe)" : "var(--muted)" }}>{settlementStarted ? currentStageLabel.toUpperCase() : "WAITING"}</span></div><div className="pnl__b">{timelineSteps.map((step, index) => <div key={"c-" + step.key} className={"cstep " + (activeStage > index ? "done" : activeStage === index ? "cur" : "")}><span className="n">{activeStage > index ? "\u2713" : index + 1}</span><div style={{ flex: 1 }}><div className="nm">{step.label}</div><div className="ds">{step.detail}</div></div></div>)}<div className={settlementStarted ? "cwarn" : "cwarn cwarn--idle"}>{settlementStarted ? "PRECONFIRMED IS PROVISIONAL. WAIT FOR FINALITY." : "Settlement activates only after a real guarded send is signed and submitted."}</div></div></section>
              <section className="pnl" id="p-ledger"><div className="pnl__h"><span className="t">Activity ledger</span><span className="g" /><span className="st">{activityRows.length} READINGS</span></div><div className="ctabs">{activityTabs.map((tab) => <button key={"ct-" + tab.id} className={tab.id === activityTab ? "on" : ""} onClick={() => setActivityTab(tab.id)}>{tab.label.toUpperCase()} <b>{tab.count}</b></button>)}</div><div className="pnl__b pad0">{visibleActivityRows.length === 0 ? <div className="empty" style={{ padding: 18 }}>{activityEmptyCopy}</div> : visibleActivityRows.map(({ send }) => { const direction = sendDirection(send, account); const remaining = Math.max(0, Number(send.releaseAt) - now); const canCancel = direction === "Sent" && !send.claimed && !send.cancelled && remaining > 0; const canClaim = direction === "Incoming" && !send.claimed && !send.cancelled && remaining === 0; return <div key={"c-row-" + send.id.toString()} className="clog" onClick={() => setSelectedSend(send)}><span className={"rgly " + (direction === "Sent" ? "out" : "in")} /><div><div className="rt">{shortAddress(direction === "Sent" ? send.recipient : send.sender)}</div><div className="sb">{direction.toUpperCase()}</div></div><div className="a">{formatEther(send.amount)} ETH</div><div className="rbtns"><span className="tp warn">{releaseLabel(send, now)}</span>{canCancel ? <button className="rbtn dn" onClick={(event) => { event.stopPropagation(); void cancelSend(send.id); }}>CANCEL</button> : null}{canClaim ? <button className="rbtn sf" onClick={(event) => { event.stopPropagation(); void claimSend(send.id); }}>CLAIM</button> : null}</div></div>; })}</div></section>
            </div>
          </div>
          <section className="pnl" id="p-proto" style={{ marginTop: 18 }}><div className="pnl__h"><span className="t">Protocol - GIWA Sepolia</span><span className="g" /><span className="st" style={{ color: "var(--safe)" }}>ON-CHAIN</span></div><div className="pnl__b pad0"><div className="protogrid"><div className="kv"><span className="k">Chain</span><span className="v">91342</span></div><div className="kv"><span className="k">Trust oracle</span><span className="v">{shortAddress(contracts.trustOracle)}</span></div><div className="kv"><span className="k">Guarded send</span><span className="v">{shortAddress(contracts.guardedSend)}</span></div><div className="kv"><span className="k">Registry</span><span className="v">{shortAddress(contracts.suhoRegistry)}</span></div><div className="kv"><span className="k">EAS</span><span className="v">{"GIWA EAS"}</span></div><div className="kv"><span className="k">Settlement</span><span className="v">FLASHBLOCKS</span></div></div></div></section>
        </div>
      </div>

      {isLaunchingConsole ? <div className="launchwash" aria-hidden="true"><span /><b>ROUTING TO CONSOLE</b><i /></div> : null}
      {profileOpen && resolvedRecipient && trustReport ? <RecipientDrawer resolvedRecipient={resolvedRecipient} resolvedLabel={resolvedLabel} trustReport={trustReport} riskReasons={riskReasons} recipientActivity={recipientActivity} isProfileActivityLoading={isProfileActivityLoading} now={now} onClose={() => setProfileOpen(false)} onSelectSend={setSelectedSend} /> : null}
      {selectedSend ? <SendDrawer send={selectedSend} account={account} now={now} onClose={() => setSelectedSend(undefined)} onCancel={(id) => { void cancelSend(id); }} onClaim={(id) => { void claimSend(id); }} /> : null}
      {walletPanelOpen ? <WalletModal account={account} selectedWallet={selectedWallet} sessionLabel={sessionLabel} sessionReady={sessionReady} isSigningSession={isSigningSession} isConnectingWallet={isConnectingWallet} walletMessage={message} wallets={wallets} onClose={() => setWalletPanelOpen(false)} onConnectWallet={(wallet) => { void connectWallet(wallet); }} onReSign={() => { if (selectedWallet) void connectWallet(selectedWallet); }} onSwitchAccount={() => { void switchWalletAccount(); }} onDisconnect={clearWalletSession} /> : null}
    </>
  );
}


function IntroSection({ id, no, kicker, title, body, children }: { id: string; no: string; kicker: string; title: string; body: string; children: ReactNode }) {
  return (
    <section className="stage" id={id} data-station>
      <div className="wrap">
        <div className="smark" data-rise>
          <span className="n">{no}</span>
          <div className="x">
            <div className="k">{kicker}</div>
            <h2>{title}</h2>
            <p className="ld">{body}</p>
          </div>
        </div>
        {children}
        <div className="infb" data-rise>
          <div className="c"><div className="h">Operational meaning</div><p>This section is explanatory on the overview. The Console performs the live GIWA Sepolia read and guarded send flow.</p></div>
          <div className="c"><div className="h ok"><span className="dot" />Live in Console</div><p>Wallet, recipient, registry, settlement, ledger, and protocol actions stay attached to the working console.</p></div>
        </div>
      </div>
    </section>
  );
}
