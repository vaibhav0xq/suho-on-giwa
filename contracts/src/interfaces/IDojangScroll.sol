// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

type DojangAttesterId is bytes32;

interface IDojangScroll {
    function isVerified(address addr, DojangAttesterId attesterId) external view returns (bool);
    function getVerifiedAddressAttestationUid(address addr, DojangAttesterId attesterId)
        external
        view
        returns (bytes32);
}