// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IDojangScroll, DojangAttesterId} from "../interfaces/IDojangScroll.sol";

contract MockDojangScroll is IDojangScroll {
    mapping(address account => mapping(bytes32 attesterId => bool verified)) public verified;
    mapping(address account => mapping(bytes32 attesterId => bytes32 uid)) public attestationUid;

    function setVerified(address account, bytes32 attesterId, bool verifiedStatus, bytes32 uid) external {
        verified[account][attesterId] = verifiedStatus;
        attestationUid[account][attesterId] = uid;
    }

    function isVerified(address addr, DojangAttesterId attesterId) external view returns (bool) {
        return verified[addr][DojangAttesterId.unwrap(attesterId)];
    }

    function getVerifiedAddressAttestationUid(address addr, DojangAttesterId attesterId)
        external
        view
        returns (bytes32)
    {
        return attestationUid[addr][DojangAttesterId.unwrap(attesterId)];
    }
}