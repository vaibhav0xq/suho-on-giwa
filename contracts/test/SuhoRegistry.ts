import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import { encodeAbiParameters, parseEther } from "viem";

const SCHEMA_UID = "0x5512e735739f9bb56213d5bd69e04bdff780cb8c9e22e7195ace20112f145584" as const;
const MIN_STAKE = parseEther("0.01");
const FLAG_THRESHOLD = 3;
const UNCHALLENGED_DELAY = 24n * 60n * 60n;

const Status = {
  Clean: 0,
  Reported: 1,
  Flagged: 2,
  Cleared: 3
} as const;

const Category = {
  Phishing: 0,
  Impersonation: 1,
  Rug: 2,
  MuleAccount: 3,
  Other: 4
} as const;

async function deployRegistryFixture() {
  const [owner, reporter, secondReporter, thirdReporter, challenger, suspect] = await hre.viem.getWalletClients();
  const publicClient = await hre.viem.getPublicClient();
  const eas = await hre.viem.deployContract("MockEAS");
  const registry = await hre.viem.deployContract("SuhoRegistry", [
    eas.address,
    SCHEMA_UID,
    MIN_STAKE,
    FLAG_THRESHOLD,
    UNCHALLENGED_DELAY,
    owner.account.address
  ]);

  return { owner, reporter, secondReporter, thirdReporter, challenger, suspect, publicClient, eas, registry };
}

async function reportFrom(registry: any, reporter: any, suspect: `0x${string}`, evidence = "ipfs://case-1") {
  return registry.write.report([suspect, Category.Phishing, evidence], {
    account: reporter.account,
    value: MIN_STAKE
  });
}

describe("SuhoRegistry", function () {
  it("writes a staked report and EAS attestation", async function () {
    const { registry, eas, reporter, suspect } = await loadFixture(deployRegistryFixture);

    await reportFrom(registry, reporter, suspect.account.address);

    const report = await registry.read.reportAt([0n]);
    const status = await registry.read.statusOf([suspect.account.address]);
    const stored = await eas.read.attestations([report.attestationUID]);

    expect(status[0]).to.equal(Status.Reported);
    expect(status[1]).to.equal(1);
    expect(status[2]).to.equal(MIN_STAKE);
    expect(report.reporter.toLowerCase()).to.equal(reporter.account.address.toLowerCase());
    expect(report.suspect.toLowerCase()).to.equal(suspect.account.address.toLowerCase());
    expect(stored[0]).to.equal(SCHEMA_UID);
    expect(stored[1].toLowerCase()).to.equal(suspect.account.address.toLowerCase());
    expect(stored[2]).to.equal(
      encodeAbiParameters(
        [
          { type: "address" },
          { type: "uint8" },
          { type: "string" },
          { type: "uint256" }
        ],
        [suspect.account.address, Category.Phishing, "ipfs://case-1", MIN_STAKE]
      )
    );
  });

  it("rejects invalid and duplicate reports", async function () {
    const { registry, reporter, suspect } = await loadFixture(deployRegistryFixture);

    await expect(
      registry.write.report([suspect.account.address, Category.Phishing, "ipfs://low"], {
        account: reporter.account,
        value: MIN_STAKE - 1n
      })
    ).to.be.rejectedWith("InsufficientStake");

    await expect(
      registry.write.report([suspect.account.address, Category.Phishing, ""], {
        account: reporter.account,
        value: MIN_STAKE
      })
    ).to.be.rejectedWith("InvalidEvidenceURI");

    await reportFrom(registry, reporter, suspect.account.address);

    await expect(reportFrom(registry, reporter, suspect.account.address, "ipfs://dupe")).to.be.rejectedWith(
      "DuplicateReporter"
    );
  });

  it("flags a suspect at the reporter threshold", async function () {
    const { registry, reporter, secondReporter, thirdReporter, suspect } = await loadFixture(deployRegistryFixture);

    await reportFrom(registry, reporter, suspect.account.address, "ipfs://one");
    await reportFrom(registry, secondReporter, suspect.account.address, "ipfs://two");
    await reportFrom(registry, thirdReporter, suspect.account.address, "ipfs://three");

    const status = await registry.read.statusOf([suspect.account.address]);
    expect(status[0]).to.equal(Status.Flagged);
    expect(status[1]).to.equal(3);
    expect(status[2]).to.equal(MIN_STAKE * 3n);
  });

  it("flags one unchallenged report after the delay", async function () {
    const { registry, reporter, suspect } = await loadFixture(deployRegistryFixture);

    await reportFrom(registry, reporter, suspect.account.address);
    await time.increase(Number(UNCHALLENGED_DELAY) + 1);

    const status = await registry.read.statusOf([suspect.account.address]);
    expect(status[0]).to.equal(Status.Flagged);
  });

  it("challenge blocks the unchallenged-delay flag rule", async function () {
    const { registry, reporter, challenger, suspect } = await loadFixture(deployRegistryFixture);

    await reportFrom(registry, reporter, suspect.account.address);
    await registry.write.challenge([suspect.account.address], {
      account: challenger.account,
      value: MIN_STAKE
    });
    await time.increase(Number(UNCHALLENGED_DELAY) + 1);

    const status = await registry.read.statusOf([suspect.account.address]);
    expect(status[0]).to.equal(Status.Reported);

    await expect(
      registry.write.challenge([suspect.account.address], {
        account: challenger.account,
        value: MIN_STAKE
      })
    ).to.be.rejectedWith("AlreadyChallenged");
  });

  it("clearing a suspect revokes report attestations", async function () {
    const { registry, eas, owner, reporter, suspect } = await loadFixture(deployRegistryFixture);

    await reportFrom(registry, reporter, suspect.account.address);
    const report = await registry.read.reportAt([0n]);

    await registry.write.resolve([suspect.account.address, false], {
      account: owner.account
    });

    const status = await registry.read.statusOf([suspect.account.address]);
    const stored = await eas.read.attestations([report.attestationUID]);
    expect(status[0]).to.equal(Status.Cleared);
    expect(stored[4]).to.equal(true);
    expect(await eas.read.revokeCount()).to.equal(1n);
  });

  it("upholding a suspect allows reporter stake withdrawal", async function () {
    const { registry, owner, reporter, suspect, publicClient } = await loadFixture(deployRegistryFixture);

    await reportFrom(registry, reporter, suspect.account.address);
    await registry.write.resolve([suspect.account.address, true], {
      account: owner.account
    });

    const before = await publicClient.getBalance({ address: reporter.account.address });
    const hash = await registry.write.withdrawStake([0n], {
      account: reporter.account
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    const after = await publicClient.getBalance({ address: reporter.account.address });
    const gasCost = receipt.gasUsed * receipt.effectiveGasPrice;

    expect(after + gasCost - before).to.equal(MIN_STAKE);

    const status = await registry.read.statusOf([suspect.account.address]);
    expect(status[0]).to.equal(Status.Flagged);
    expect(status[2]).to.equal(0n);

    await expect(
      registry.write.withdrawStake([0n], {
        account: reporter.account
      })
    ).to.be.rejectedWith("StakeNotWithdrawable");
  });
});