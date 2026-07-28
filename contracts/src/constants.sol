// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice GIWA Sepolia constants copied from official GIWA docs and giwa-io/dojang on 2026-07-24.
/// @dev Sources: https://docs.giwa.io/giwa-chain/en/giwa-ecosystem/dojang/contracts and https://github.com/giwa-io/dojang
library GiwaConstants {
    address internal constant SCHEMA_REGISTRY = 0x4200000000000000000000000000000000000020;
    address internal constant EAS = 0x4200000000000000000000000000000000000021;
    address internal constant DOJANG_SCROLL = 0xd5077b67dcb56caC8b270C7788FC3E6ee03F17B9;
    address internal constant ATTESTATION_INDEXER = 0x9C9Bf29880448aB39795a11b669e22A0f1d790ec;
    address internal constant ADDRESS_DOJANG_RESOLVER = 0x692009FE206C3F897867F6BF7B5B45506B747F9e;

    bytes32 internal constant VERIFIED_ADDRESS_SCHEMA_UID =
        0x072d75e18b2be4f89a13a7147240477481c4b526d5795802acba59046b426e08;

    bytes32 internal constant UPBIT_KOREA_ATTESTER_ID =
        0xd99b42e778498aa3c9c1f6a012359130252780511687a35982e8e52735453034;
    bytes32 internal constant TESTNET_FAUCET_ATTESTER_ID =
        0xaa92f8c143657dde575de430aecaea6ca91f2e6072339b16932d426895d8d678;
    address internal constant TESTNET_FAUCET_ATTESTER = 0x63CCe2b569A7bC35895ee24306c1512fefc06121;
}