// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IDojangScroll, DojangAttesterId} from "./interfaces/IDojangScroll.sol";
import {ISuhoRegistry} from "./interfaces/ISuhoRegistry.sol";

/// @title TrustOracle
/// @notice One-call trust verdict surface for GIWA wallets and dApps.
contract TrustOracle {
    enum Verdict {
        Green,
        Yellow,
        Red
    }

    struct TrustReport {
        Verdict verdict;
        bool dojangVerified;
        ISuhoRegistry.Status registryStatus;
        uint32 reportCount;
        uint256 totalStake;
    }

    error InvalidAddress();

    IDojangScroll public immutable dojangScroll;
    ISuhoRegistry public immutable registry;
    DojangAttesterId public immutable dojangAttesterId;

    /// @notice Creates the oracle against a Dojang attester and SuhoRegistry.
    constructor(address dojangScroll_, bytes32 dojangAttesterId_, address registry_) {
        if (dojangScroll_ == address(0) || registry_ == address(0) || dojangAttesterId_ == bytes32(0)) {
            revert InvalidAddress();
        }

        dojangScroll = IDojangScroll(dojangScroll_);
        registry = ISuhoRegistry(registry_);
        dojangAttesterId = DojangAttesterId.wrap(dojangAttesterId_);
    }

    /// @notice Returns a GIWA-native trust verdict for a recipient address.
    function check(address recipient) external view returns (TrustReport memory report) {
        if (recipient == address(0)) revert InvalidAddress();

        bool verified = dojangScroll.isVerified(recipient, dojangAttesterId);
        (ISuhoRegistry.Status registryStatus, uint32 reportCount, uint256 totalStake) = registry.statusOf(recipient);

        Verdict verdict = Verdict.Yellow;
        if (registryStatus == ISuhoRegistry.Status.Flagged) {
            verdict = Verdict.Red;
        } else if (verified && registryStatus == ISuhoRegistry.Status.Clean) {
            verdict = Verdict.Green;
        }

        report = TrustReport({
            verdict: verdict,
            dojangVerified: verified,
            registryStatus: registryStatus,
            reportCount: reportCount,
            totalStake: totalStake
        });
    }
}