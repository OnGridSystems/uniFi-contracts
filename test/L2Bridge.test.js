const { expect } = require("chai")
const { parseEther } = ethers.utils

describe("L2Bridge", function () {
  beforeEach(async function () {
    this.signers = await ethers.getSigners()
    this.owner = this.signers[0]
    this.account1 = this.signers[1]

    this.dao1TokenFactory = await ethers.getContractFactory("DAO1")
    this.dao1Token = await this.dao1TokenFactory.deploy("DAO1", "DAO1", this.owner.address)
    this.bridgeFactory = await ethers.getContractFactory("L2Bridge")
    this.bridge = await this.bridgeFactory.deploy(this.dao1Token.address)
  })

  it("should be deployed", async function () {
    expect(await this.bridge.deployed(), true)
    expect(await this.dao1Token.deployed(), true)
  })

  it("outboundTransfer: unable to send 0 tokens", async function () {
    expect(this.bridge.outboundTransfer(this.owner.address, 0)).to.be.revertedWith("Cannot burn 0 Tokens")
  })

  it("finalizeInboundTransfer: unable to mint 0 tokens", async function () {
    expect(
      this.bridge.finalizeInboundTransfer(this.owner.address, 0, "0x117ddadadc7b8d342cf48513fef06a2cba15dfb9c488dc51aefc998abcefb52b")
    ).to.be.revertedWith("Cannot mint 0 Tokens")
  })
})
