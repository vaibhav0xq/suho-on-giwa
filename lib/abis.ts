export const schemaRegistryAbi = [
  {
    type: "function",
    name: "register",
    stateMutability: "payable",
    inputs: [
      { name: "schema", type: "string" },
      { name: "resolver", type: "address" },
      { name: "revocable", type: "bool" }
    ],
    outputs: [{ name: "", type: "bytes32" }]
  }
] as const;

export const dojangScrollAbi = [
  {
    type: "function",
    name: "isVerified",
    stateMutability: "view",
    inputs: [
      { name: "addr", type: "address" },
      { name: "attesterId", type: "bytes32" }
    ],
    outputs: [{ name: "", type: "bool" }]
  },
  {
    type: "function",
    name: "getVerifiedAddressAttestationUid",
    stateMutability: "view",
    inputs: [
      { name: "addr", type: "address" },
      { name: "attesterId", type: "bytes32" }
    ],
    outputs: [{ name: "", type: "bytes32" }]
  }
] as const;

export const easReadAbi = [
  {
    type: "function",
    name: "getAttestation",
    stateMutability: "view",
    inputs: [{ name: "uid", type: "bytes32" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "uid", type: "bytes32" },
          { name: "schema", type: "bytes32" },
          { name: "time", type: "uint64" },
          { name: "expirationTime", type: "uint64" },
          { name: "revocationTime", type: "uint64" },
          { name: "refUID", type: "bytes32" },
          { name: "recipient", type: "address" },
          { name: "attester", type: "address" },
          { name: "revocable", type: "bool" },
          { name: "data", type: "bytes" }
        ]
      }
    ]
  }
] as const;
export const upIdRegistryAbi = [
  {
    type: "function",
    name: "hasActiveName",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "bool" }]
  },
  {
    type: "function",
    name: "ownedTokenId",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    type: "function",
    name: "getLabel",
    stateMutability: "view",
    inputs: [{ name: "key", type: "bytes32" }],
    outputs: [{ name: "", type: "string" }]
  },
  {
    type: "function",
    name: "ownerOf",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "owner", type: "address" }]
  }
] as const;