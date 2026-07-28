import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import { parseEther } from "viem";

const SCHEMA_UID = "0x5512e735739f9bb56213d5bd69e04bdff780cb8c9e22e7195ace20112f145584" as const;
const ATTESTER_ID = "0xaa92f8c143657dde575de430aecaea6ca91f2e6072339b16932d426895d8d678" as const;
const MIN_STAKE = parseEther("0.01");

const Verdict = {
  Green: 0,
  Yellow: 1,
  Red: 2
} as const;

const Status = {
  Clean: 0,
  Reported: 1,
  Flagged: 2,
  Cleared: 3
} as const;

async function deployOracleFixture() {
  const [owner, reporter, secondReporter, thirdReporter, verifiedRecipient, unverifiedRecipient, flaggedRecipient] =
    await hre.viem.getWalletClients();
  const eas = await hre.viem.deployContract("MockEAS");
  const registry = await hre.viem.deployContract("SuhoRegistry", [
    eas.address,
    SCHEMA_UID,
    MIN_STAKE,
    3,
    24 * 60 * 60,
    owner.account.address
  ]);
  const dojang = await hre.viem.deployContract("MockDojangScroll");
  const oracle = await hre.viem.deployContract("TrustOracle", [dojang.address, ATTESTER_ID, registry.address]);

  await dojang.write.setVerified([
    verifiedRecipient.account.address,
    ATTESTER_ID,
    true,
    "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
  ]);

  return { registry, dojang, oracle, reporter, secondReporter, thirdReporter, verifiedRecipient, unverifiedRecipient, flaggedRecipient };
}

describe("TrustOracle", function () {
  it("returns Green for verified and clean recipients", async function () {
    const { oracle, verifiedRecipient } = await loadFixture(deployOracleFixture);

    const report = await oracle.read.check([verifiedRecipient.account.address]);

    expect(report.verdict).to.equal(Verdict.Green);
    expect(report.dojangVerified).to.equal(true);
    expect(report.registryStatus).to.equal(Status.Clean);
  });

  it("returns Yellow for clean but unverified recipients", async function () {
    const { oracle, unverifiedRecipient } = await loadFixture(deployOracleFixture);

    const report = await oracle.read.check([unverifiedRecipient.account.address]);

    expect(report.verdict).to.equal(Verdict.Yellow);
    expect(report.dojangVerified).to.equal(false);
    expect(report.registryStatus).to.equal(Status.Clean);
  });

  it("returns Red for flagged recipients", async function () {
    const { registry, oracle, reporter, secondReporter, thirdReporter, flaggedRecipient } = await loadFixture(
      deployOracleFixture
    );

    await registry.write.report([flaggedRecipient.account.address, 0, "ipfs://one"], {
      account: reporter.account,
      value: MIN_STAKE
    });
    await registry.write.report([flaggedRecipient.account.address, 0, "ipfs://two"], {
      account: secondReporter.account,
      value: MIN_STAKE
    });
    await registry.write.report([flaggedRecipient.account.address, 0, "ipfs://three"], {
      account: thirdReporter.account,
      value: MIN_STAKE
    });

    const report = await oracle.read.check([flaggedRecipient.account.address]);

    expect(report.verdict).to.equal(Verdict.Red);
    expect(report.registryStatus).to.equal(Status.Flagged);
    expect(report.reportCount).to.equal(3);
  });
});