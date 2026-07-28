// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {ISuhoRegistry} from "./interfaces/ISuhoRegistry.sol";

/// @title GuardedSend
/// @notice Recallable ETH settlement for GIWA payments.
contract GuardedSend is ReentrancyGuard {
    struct PendingSend {
        address sender;
        address recipient;
        uint256 amount;
        uint64 releaseAt;
        bool claimed;
        bool cancelled;
    }

    error InvalidAddress();
    error InvalidConfiguration();
    error NoValue();
    error InvalidSendId();
    error NotSender();
    error NotRecipient();
    error AlreadyClosed(uint256 id);
    error RecallWindowExpired(uint256 id);
    error RecallWindowActive(uint256 id);
    error RecipientFlagged(address recipient);
    error TransferFailed();

    event Sent(
        uint256 indexed id,
        address indexed sender,
        address indexed recipient,
        uint256 amount,
        uint64 releaseAt
    );
    event Cancelled(uint256 indexed id);
    event Claimed(uint256 indexed id);

    ISuhoRegistry public immutable registry;
    uint64 public immutable recallWindow;

    PendingSend[] private _sends;
    mapping(address sender => uint256[] ids) private _pendingBySender;

    /// @notice Creates a recallable settlement vault.
    constructor(address registry_, uint64 recallWindow_) {
        if (registry_ == address(0)) revert InvalidAddress();
        if (recallWindow_ == 0) revert InvalidConfiguration();

        registry = ISuhoRegistry(registry_);
        recallWindow = recallWindow_;
    }

    /// @notice Opens a guarded ETH send with a recall window.
    function sendGuarded(address recipient) external payable nonReentrant returns (uint256 id) {
        if (recipient == address(0) || recipient == msg.sender) revert InvalidAddress();
        if (msg.value == 0) revert NoValue();

        id = _sends.length;
        uint64 releaseAt = uint64(block.timestamp) + recallWindow;
        _sends.push(
            PendingSend({
                sender: msg.sender,
                recipient: recipient,
                amount: msg.value,
                releaseAt: releaseAt,
                claimed: false,
                cancelled: false
            })
        );
        _pendingBySender[msg.sender].push(id);

        emit Sent(id, msg.sender, recipient, msg.value, releaseAt);
    }

    /// @notice Cancels a pending send before release, or any time if the recipient is flagged.
    function cancel(uint256 id) external nonReentrant {
        PendingSend storage item = _openSend(id);
        if (msg.sender != item.sender) revert NotSender();

        bool flagged = _isFlagged(item.recipient);
        if (!flagged && block.timestamp >= item.releaseAt) revert RecallWindowExpired(id);

        item.cancelled = true;
        uint256 amount = item.amount;
        item.amount = 0;

        (bool ok,) = item.sender.call{value: amount}("");
        if (!ok) revert TransferFailed();

        emit Cancelled(id);
    }

    /// @notice Claims a pending send after release if the recipient is not flagged.
    function claim(uint256 id) external nonReentrant {
        PendingSend storage item = _openSend(id);
        if (msg.sender != item.recipient) revert NotRecipient();
        if (block.timestamp < item.releaseAt) revert RecallWindowActive(id);
        if (_isFlagged(item.recipient)) revert RecipientFlagged(item.recipient);

        item.claimed = true;
        uint256 amount = item.amount;
        item.amount = 0;

        (bool ok,) = item.recipient.call{value: amount}("");
        if (!ok) revert TransferFailed();

        emit Claimed(id);
    }

    /// @notice Returns ids opened by a sender.
    function pendingOf(address sender) external view returns (uint256[] memory) {
        return _pendingBySender[sender];
    }

    /// @notice Returns one pending send record.
    function sendAt(uint256 id) external view returns (PendingSend memory) {
        if (id >= _sends.length) revert InvalidSendId();
        return _sends[id];
    }

    /// @notice Returns total sends ever opened.
    function sendCount() external view returns (uint256) {
        return _sends.length;
    }

    function _openSend(uint256 id) private view returns (PendingSend storage item) {
        if (id >= _sends.length) revert InvalidSendId();
        item = _sends[id];
        if (item.claimed || item.cancelled) revert AlreadyClosed(id);
    }

    function _isFlagged(address recipient) private view returns (bool) {
        (ISuhoRegistry.Status status,,) = registry.statusOf(recipient);
        return status == ISuhoRegistry.Status.Flagged;
    }
}