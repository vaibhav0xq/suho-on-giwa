import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import { parseEther } from "viem";

const SCHEMA_UID = "0x5512e735739f9bb56213d5bd69e04bdff780cb8c9e22e7195ace20112f145584" as const;
const MIN_STAKE = parseEther("0.01");
const RECALL_WINDOW = 600;
const SEND_AMOUNT = parseEther("0.05");

async function deployGuardedFixture() {
  const [owner, sender, recipient, reporter, secondReporter, thirdReporter] = await hre.viem.getWalletClients();
  const publicClient = await hre.viem.getPublicClient();
  const eas = await hre.viem.deployContract("MockEAS");
  const registry = await hre.viem.deployContract("SuhoRegistry", [
    eas.address,
    SCHEMA_UID,
    MIN_STAKE,
    3,
    24 * 60 * 60,
    owner.account.address
  ]);
  const guarded = await hre.viem.deployContract("GuardedSend", [registry.address, RECALL_WINDOW]);

  return { registry, guarded, publicClient, sender, recipient, reporter, secondReporter, thirdReporter };
}

async function openSend(guarded: any, sender: any, recipient: `0x${string}`) {
  return guarded.write.sendGuarded([recipient], {
    account: sender.account,
    value: SEND_AMOUNT
  });
}

async function flagRecipient(registry: any, recipient: `0x${string}`, reporter: any, secondReporter: any, thirdReporter: any) {
  await registry.write.report([recipient, 0, "ipfs://one"], { account: reporter.account, value: MIN_STAKE });
  await registry.write.report([recipient, 0, "ipfs://two"], { account: secondReporter.account, value: MIN_STAKE });
  await registry.write.report([recipient, 0, "ipfs://three"], { account: thirdReporter.account, value: MIN_STAKE });
}

describe("GuardedSend", function () {
  it("opens a guarded send and lets the sender cancel during recall window", async function () {
    const { guarded, publicClient, sender, recipient } = await loadFixture(deployGuardedFixture);

    await openSend(guarded, sender, recipient.account.address);

    const pending = await guarded.read.sendAt([0n]);
    const ids = await guarded.read.pendingOf([sender.account.address]);
    expect(pending.sender.toLowerCase()).to.equal(sender.account.address.toLowerCase());
    expect(pending.recipient.toLowerCase()).to.equal(recipient.account.address.toLowerCase());
    expect(pending.amount).to.equal(SEND_AMOUNT);
    expect(ids).to.deep.equal([0n]);

    const before = await publicClient.getBalance({ address: sender.account.address });
    const hash = await guarded.write.cancel([0n], { account: sender.account });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    const after = await publicClient.getBalance({ address: sender.account.address });
    const gasCost = receipt.gasUsed * receipt.effectiveGasPrice;

    expect(after + gasCost - before).to.equal(SEND_AMOUNT);
    const closed = await guarded.read.sendAt([0n]);
    expect(closed.cancelled).to.equal(true);
    expect(closed.amount).to.equal(0n);
  });

  it("lets the recipient claim after the recall window", async function () {
    const { guarded, publicClient, sender, recipient } = await loadFixture(deployGuardedFixture);

    await openSend(guarded, sender, recipient.account.address);
    await time.increase(RECALL_WINDOW + 1);

    const before = await publicClient.getBalance({ address: recipient.account.address });
    const hash = await guarded.write.claim([0n], { account: recipient.account });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    const after = await publicClient.getBalance({ address: recipient.account.address });
    const gasCost = receipt.gasUsed * receipt.effectiveGasPrice;

    expect(after + gasCost - before).to.equal(SEND_AMOUNT);
    const closed = await guarded.read.sendAt([0n]);
    expect(closed.claimed).to.equal(true);
    expect(closed.amount).to.equal(0n);
  });

  it("rejects early claim and late cancel when recipient is clean", async function () {
    const { guarded, sender, recipient } = await loadFixture(deployGuardedFixture);

    await openSend(guarded, sender, recipient.account.address);

    await expect(guarded.write.claim([0n], { account: recipient.account })).to.be.rejectedWith("RecallWindowActive");

    await time.increase(RECALL_WINDOW + 1);

    await expect(guarded.write.cancel([0n], { account: sender.account })).to.be.rejectedWith("RecallWindowExpired");
  });

  it("freezes claim and lets sender cancel if recipient becomes flagged", async function () {
    const { registry, guarded, sender, recipient, reporter, secondReporter, thirdReporter } = await loadFixture(
      deployGuardedFixture
    );

    await openSend(guarded, sender, recipient.account.address);
    await flagRecipient(registry, recipient.account.address, reporter, secondReporter, thirdReporter);
    await time.increase(RECALL_WINDOW + 1);

    await expect(guarded.write.claim([0n], { account: recipient.account })).to.be.rejectedWith("RecipientFlagged");

    await guarded.write.cancel([0n], { account: sender.account });
    const closed = await guarded.read.sendAt([0n]);
    expect(closed.cancelled).to.equal(true);
  });
});