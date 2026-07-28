// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ISuhoRegistry {
    enum Status {
        Clean,
        Reported,
        Flagged,
        Cleared
    }

    function statusOf(address suspect) external view returns (Status status, uint32 reports, uint256 totalStake);
}