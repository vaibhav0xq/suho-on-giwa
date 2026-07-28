// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IEAS} from "./interfaces/IEAS.sol";

/// @title SuhoRegistry
/// @notice Staked scam intelligence registry that writes every report as a native GIWA EAS attestation.
contract SuhoRegistry is Ownable, ReentrancyGuard {
    enum Category {
        Phishing,
        Impersonation,
        Rug,
        MuleAccount,
        Other
    }

    enum Status {
        Clean,
        Reported,
        Flagged,
        Cleared
    }

    struct Report {
        address suspect;
        address reporter;
        Category category;
        string evidenceURI;
        uint256 stake;
        bytes32 attestationUID;
        uint64 createdAt;
        bool resolved;
        bool upheld;
        bool withdrawn;
    }

    struct SuspectState {
        Status status;
        uint32 reportCount;
        uint256 totalStake;
        uint256 challengeStake;
        address challenger;
        uint64 firstReportedAt;
        bool challenged;
    }

    error InvalidAddress();
    error InvalidConfiguration();
    error InvalidEvidenceURI();
    error InvalidReportId();
    error InvalidCategory();
    error InsufficientStake(uint256 required, uint256 provided);
    error DuplicateReporter(address suspect, address reporter);
    error AlreadyChallenged(address suspect);
    error NothingToChallenge(address suspect);
    error ChallengeStakeTooLow(uint256 required, uint256 provided);
    error StakeNotWithdrawable(uint256 reportId);
    error TransferFailed();

    event Reported(
        uint256 indexed reportId,
        address indexed suspect,
        address indexed reporter,
        bytes32 attestationUID,
        uint8 category,
        uint256 stake,
        string evidenceURI
    );
    event Flagged(address indexed suspect);
    event Challenged(address indexed suspect, address indexed challenger, uint256 stake);
    event Resolved(address indexed suspect, bool upheld);
    event StakeWithdrawn(uint256 indexed reportId, address indexed reporter, uint256 amount);

    IEAS public immutable eas;
    bytes32 public immutable schemaUID;
    uint256 public immutable minStake;
    uint32 public immutable flagThreshold;
    uint64 public immutable unchallengedFlagDelay;

    Report[] private _reports;
    mapping(address suspect => SuspectState state) private _states;
    mapping(address suspect => mapping(address reporter => bool reported)) public hasReported;

    /// @notice Creates the registry for one GIWA EAS schema.
    constructor(
        address eas_,
        bytes32 schemaUID_,
        uint256 minStake_,
        uint32 flagThreshold_,
        uint64 unchallengedFlagDelay_,
        address initialOwner_
    ) Ownable(initialOwner_) {
        if (eas_ == address(0) || initialOwner_ == address(0) || schemaUID_ == bytes32(0)) revert InvalidAddress();
        if (minStake_ == 0 || flagThreshold_ == 0 || unchallengedFlagDelay_ == 0) revert InvalidConfiguration();

        eas = IEAS(eas_);
        schemaUID = schemaUID_;
        minStake = minStake_;
        flagThreshold = flagThreshold_;
        unchallengedFlagDelay = unchallengedFlagDelay_;
    }

    /// @notice Reports a suspect address and writes a corresponding EAS attestation.
    function report(address suspect, Category category, string calldata evidenceURI)
        external
        payable
        nonReentrant
        returns (bytes32 attestationUID)
    {
        if (suspect == address(0) || suspect == msg.sender) revert InvalidAddress();
        if (bytes(evidenceURI).length == 0) revert InvalidEvidenceURI();
        if (msg.value < minStake) revert InsufficientStake(minStake, msg.value);
        if (hasReported[suspect][msg.sender]) revert DuplicateReporter(suspect, msg.sender);

        attestationUID = eas.attest(
            IEAS.AttestationRequest({
                schema: schemaUID,
                data: IEAS.AttestationRequestData({
                    recipient: suspect,
                    expirationTime: 0,
                    revocable: true,
                    refUID: bytes32(0),
                    data: abi.encode(suspect, uint8(category), evidenceURI, msg.value),
                    value: 0
                })
            })
        );

        uint256 reportId = _reports.length;
        _reports.push(
            Report({
                suspect: suspect,
                reporter: msg.sender,
                category: category,
                evidenceURI: evidenceURI,
                stake: msg.value,
                attestationUID: attestationUID,
                createdAt: uint64(block.timestamp),
                resolved: false,
                upheld: false,
                withdrawn: false
            })
        );

        SuspectState storage state = _states[suspect];
        if (state.status == Status.Clean || state.status == Status.Cleared) {
            state.status = Status.Reported;
            state.firstReportedAt = uint64(block.timestamp);
        }
        state.reportCount += 1;
        state.totalStake += msg.value;
        hasReported[suspect][msg.sender] = true;

        emit Reported(reportId, suspect, msg.sender, attestationUID, uint8(category), msg.value, evidenceURI);
        _refreshFlag(suspect, state);
    }

    /// @notice Challenges reports against a suspect by matching the current report stake.
    function challenge(address suspect) external payable nonReentrant {
        if (suspect == address(0)) revert InvalidAddress();

        SuspectState storage state = _states[suspect];
        if (state.reportCount == 0) revert NothingToChallenge(suspect);
        if (state.challenged) revert AlreadyChallenged(suspect);
        if (msg.value < state.totalStake) revert ChallengeStakeTooLow(state.totalStake, msg.value);

        state.challenged = true;
        state.challenger = msg.sender;
        state.challengeStake = msg.value;

        emit Challenged(suspect, msg.sender, msg.value);
    }

    /// @notice Resolves a suspect. `upheld=true` confirms reports; `upheld=false` clears and revokes their attestations.
    function resolve(address suspect, bool upheld) external onlyOwner {
        if (suspect == address(0)) revert InvalidAddress();

        SuspectState storage state = _states[suspect];
        if (state.reportCount == 0) revert NothingToChallenge(suspect);

        state.status = upheld ? Status.Flagged : Status.Cleared;

        for (uint256 i = 0; i < _reports.length; i += 1) {
            Report storage item = _reports[i];
            if (item.suspect != suspect || item.resolved) continue;

            item.resolved = true;
            item.upheld = upheld;

            if (!upheld) {
                eas.revoke(
                    IEAS.RevocationRequest({
                        schema: schemaUID,
                        data: IEAS.RevocationRequestData({uid: item.attestationUID, value: 0})
                    })
                );
            }
        }

        emit Resolved(suspect, upheld);
        if (upheld) emit Flagged(suspect);
    }

    /// @notice Withdraws a reporter stake after reports have been upheld.
    function withdrawStake(uint256 reportId) external nonReentrant {
        if (reportId >= _reports.length) revert InvalidReportId();

        Report storage item = _reports[reportId];
        if (item.reporter != msg.sender || !item.resolved || !item.upheld || item.withdrawn) {
            revert StakeNotWithdrawable(reportId);
        }

        item.withdrawn = true;
        _states[item.suspect].totalStake -= item.stake;

        (bool ok,) = msg.sender.call{value: item.stake}("");
        if (!ok) revert TransferFailed();

        emit StakeWithdrawn(reportId, msg.sender, item.stake);
    }

    /// @notice Returns the current status summary for a suspect.
    function statusOf(address suspect) external view returns (Status status, uint32 reports, uint256 totalStake) {
        SuspectState storage state = _states[suspect];
        status = _computedStatus(state);
        reports = state.reportCount;
        totalStake = state.totalStake;
    }

    /// @notice Returns a stored report by id.
    function reportAt(uint256 reportId) external view returns (Report memory) {
        if (reportId >= _reports.length) revert InvalidReportId();
        return _reports[reportId];
    }

    /// @notice Returns the number of reports stored.
    function reportCount() external view returns (uint256) {
        return _reports.length;
    }

    function _refreshFlag(address suspect, SuspectState storage state) private {
        Status status = _computedStatus(state);
        if (status == Status.Flagged && state.status != Status.Flagged) {
            state.status = Status.Flagged;
            emit Flagged(suspect);
        }
    }

    function _computedStatus(SuspectState storage state) private view returns (Status) {
        if (state.status == Status.Flagged || state.status == Status.Cleared) return state.status;
        if (state.reportCount == 0) return Status.Clean;
        if (state.reportCount >= flagThreshold) return Status.Flagged;
        if (!state.challenged && block.timestamp >= state.firstReportedAt + unchallengedFlagDelay) return Status.Flagged;
        return Status.Reported;
    }
}