// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IEAS} from "../interfaces/IEAS.sol";

contract MockEAS is IEAS {
    struct StoredAttestation {
        bytes32 schema;
        address recipient;
        bytes data;
        bool revocable;
        bool revoked;
    }

    uint256 public attestCount;
    uint256 public revokeCount;
    mapping(bytes32 uid => StoredAttestation attestation) public attestations;

    event MockAttested(bytes32 indexed uid, bytes32 indexed schema, address indexed recipient, bytes data);
    event MockRevoked(bytes32 indexed uid, bytes32 indexed schema);

    function attest(AttestationRequest calldata request) external payable returns (bytes32 uid) {
        attestCount += 1;
        uid = keccak256(abi.encode(address(this), block.chainid, attestCount, request.schema, request.data.recipient));
        attestations[uid] = StoredAttestation({
            schema: request.schema,
            recipient: request.data.recipient,
            data: request.data.data,
            revocable: request.data.revocable,
            revoked: false
        });
        emit MockAttested(uid, request.schema, request.data.recipient, request.data.data);
    }

    function revoke(RevocationRequest calldata request) external payable {
        StoredAttestation storage item = attestations[request.data.uid];
        require(item.revocable, "NOT_REVOCABLE");
        item.revoked = true;
        revokeCount += 1;
        emit MockRevoked(request.data.uid, request.schema);
    }
}