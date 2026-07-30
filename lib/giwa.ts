import { defineChain } from "viem";

function resolveHttpUrl(value: string | undefined, fallback: string) {
  if (!value) return fallback;
  try {
    const url = new URL(value);
    return url.hostname && (url.protocol === "https:" || url.protocol === "http:") ? value : fallback;
  } catch {
    return fallback;
  }
}

export const GIWA_DOCS = {
  connect: "https://docs.giwa.io/giwa-chain/en/get-started/connect-to-giwa",
  dojangContracts: "https://docs.giwa.io/giwa-chain/en/giwa-ecosystem/dojang/contracts",
  dojangGithub: "https://github.com/giwa-io/dojang",
  verifiedAddress: "https://docs.giwa.io/giwa-chain/en/giwa-ecosystem/dojang/verified-address",
  upId: "https://docs.giwa.io/giwa-chain/en/giwa-ecosystem/giwa-id",
  flashblocks: "https://docs.giwa.io/giwa-chain/en/network-information/flashblocks"
} as const;

export const GIWA_SEPOLIA = defineChain({
  id: 91342,
  name: "GIWA Sepolia",
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18
  },
  rpcUrls: {
    default: {
      http: ["https://sepolia-rpc.giwa.io"]
    },
    public: {
      http: ["https://sepolia-rpc.giwa.io"]
    }
  },
  blockExplorers: {
    default: {
      name: "GIWA Sepolia Explorer",
      url: "https://sepolia-explorer.giwa.io"
    }
  },
  testnet: true
});

export const GIWA_RPC_URL = resolveHttpUrl(process.env.GIWA_RPC_URL, "https://sepolia-rpc.giwa.io");
export const GIWA_FLASHBLOCKS_RPC_URL = resolveHttpUrl(
  process.env.GIWA_FLASHBLOCKS_RPC_URL,
  "https://sepolia-rpc-flashblocks.giwa.io"
);
export const ETHEREUM_RPC_URL = resolveHttpUrl(process.env.ETHEREUM_RPC_URL, "https://ethereum-rpc.publicnode.com");

export const GIWA_CONTRACTS = {
  // Sources: GIWA Dojang Contracts docs and giwa-io/dojang README, copied 2026-07-24.
  schemaRegistry: "0x4200000000000000000000000000000000000020",
  eas: "0x4200000000000000000000000000000000000021",
  schemaBook: "0x78cBb3413FBb6aF05EF1D21e646440e56baE3AD6",
  dojangAttesterBook: "0xDA282E89244424E297Ce8e78089B54D043FB28B6",
  attestationIndexer: "0x9C9Bf29880448aB39795a11b669e22A0f1d790ec",
  addressDojangResolver: "0x692009FE206C3F897867F6BF7B5B45506B747F9e",
  dojangScroll: "0xd5077b67dcb56caC8b270C7788FC3E6ee03F17B9",
  upIdRegistry: "0x091D00004f21eb2Fc30964A8a4995692d9b49628"
} as const;

export const DOJANG_ATTESTER_IDS = {
  upbitKorea: "0xd99b42e778498aa3c9c1f6a012359130252780511687a35982e8e52735453034",
  testnetFaucet: "0xaa92f8c143657dde575de430aecaea6ca91f2e6072339b16932d426895d8d678"
} as const;

export const DOJANG_ATTESTER_ADDRESSES = {
  // The current GIWA docs publish a 39-hex-digit UPBIT KOREA address, so Suho does not pin it as an address yet.
  testnetFaucet: "0x63CCe2b569A7bC35895ee24306c1512fefc06121"
} as const;

export const DOJANG_SCHEMAS = {
  verifiedAddress: {
    content: "bool isVerified",
    id: "0x568eb581cdf80b03d3bdfa414f3203bfdcc4bba4e66355612bd0e879da812f06",
    uid: "0x072d75e18b2be4f89a13a7147240477481c4b526d5795802acba59046b426e08"
  }
} as const;
