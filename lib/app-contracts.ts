import deployments from "../deployments.json";
import { GIWA_CONTRACTS } from "./giwa";

export const contracts = {
  suhoRegistry: deployments.contracts.SuhoRegistry.address as `0x${string}`,
  trustOracle: deployments.contracts.TrustOracle.address as `0x${string}`,
  guardedSend: deployments.contracts.GuardedSend.address as `0x${string}`,
  upIdRegistry: GIWA_CONTRACTS.upIdRegistry as `0x${string}`
} as const;

export const trustOracleAbi = [
  {
    type: "function",
    name: "check",
    stateMutability: "view",
    inputs: [{ name: "recipient", type: "address" }],
    outputs: [
      {
        name: "report",
        type: "tuple",
        components: [
          { name: "verdict", type: "uint8" },
          { name: "dojangVerified", type: "bool" },
          { name: "registryStatus", type: "uint8" },
          { name: "reportCount", type: "uint32" },
          { name: "totalStake", type: "uint256" }
        ]
      }
    ]
  }
] as const;

export const guardedSendAbi = [
  {
    type: "function",
    name: "sendGuarded",
    stateMutability: "payable",
    inputs: [{ name: "recipient", type: "address" }],
    outputs: [{ name: "id", type: "uint256" }]
  },
  {
    type: "function",
    name: "cancel",
    stateMutability: "nonpayable",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: []
  },
  {
    type: "function",
    name: "claim",
    stateMutability: "nonpayable",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: []
  },
  {
    type: "event",
    name: "Sent",
    inputs: [
      { name: "id", type: "uint256", indexed: true },
      { name: "sender", type: "address", indexed: true },
      { name: "recipient", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "releaseAt", type: "uint64", indexed: false }
    ]
  },
  {
    type: "event",
    name: "Cancelled",
    inputs: [{ name: "id", type: "uint256", indexed: true }]
  },
  {
    type: "event",
    name: "Claimed",
    inputs: [{ name: "id", type: "uint256", indexed: true }]
  },
  {
    type: "function",
    name: "pendingOf",
    stateMutability: "view",
    inputs: [{ name: "sender", type: "address" }],
    outputs: [{ name: "", type: "uint256[]" }]
  },
  {
    type: "function",
    name: "sendAt",
    stateMutability: "view",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "sender", type: "address" },
          { name: "recipient", type: "address" },
          { name: "amount", type: "uint256" },
          { name: "releaseAt", type: "uint64" },
          { name: "claimed", type: "bool" },
          { name: "cancelled", type: "bool" }
        ]
      }
    ]
  },
  {
    type: "function",
    name: "recallWindow",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint64" }]
  },
  {
    type: "function",
    name: "sendCount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }]
  }
] as const;

export const registryAbi = [
  {
    type: "function",
    name: "report",
    stateMutability: "payable",
    inputs: [
      { name: "suspect", type: "address" },
      { name: "category", type: "uint8" },
      { name: "evidenceURI", type: "string" }
    ],
    outputs: [{ name: "attestationUID", type: "bytes32" }]
  },
  {
    type: "function",
    name: "statusOf",
    stateMutability: "view",
    inputs: [{ name: "suspect", type: "address" }],
    outputs: [
      { name: "status", type: "uint8" },
      { name: "reports", type: "uint32" },
      { name: "totalStake", type: "uint256" }
    ]
  },
  {
    type: "function",
    name: "minStake",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }]
  }
] as const;

export const upIdRegistryAbi = [
  {
    type: "function",
    name: "ownerOf",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "owner", type: "address" }]
  },
  {
    type: "function",
    name: "getLabel",
    stateMutability: "view",
    inputs: [{ name: "key", type: "bytes32" }],
    outputs: [{ name: "", type: "string" }]
  }
] as const;