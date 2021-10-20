const { expect } = require("chai")
const { parseEther } = ethers.utils

describe("L2Bridge", function () {
  before(async function () {
    this.signers = await ethers.getSigners()
    this.owner = this.signers[0]
    this.account1 = this.signers[1]
    // code on L1 is not callable directly, so we take just random address
    this.l1Token = this.signers[2]
    this.oracle = this.signers[3]
    this.holder = this.signers[4]

    this.dao1TokenFactory = await ethers.getContractFactory("DAO1BridgedToken")
    this.bridgeFactory = await ethers.getContractFactory("L2Bridge")
  })

  beforeEach(async function () {
    this.dao1Token = await this.dao1TokenFactory.deploy("DAO1", "DAO1")
    this.bridge = await this.bridgeFactory.deploy(this.l1Token.address, this.dao1Token.address)
    const MINTER_ROLE = await this.dao1Token.MINTER_ROLE()
    await this.dao1Token.grantRole(MINTER_ROLE, this.bridge.address)
  })

  it("should be deployed", async function () {
    expect(await this.bridge.deployed(), true)
    expect(await this.dao1Token.deployed(), true)
  })

  it("l1 token has proper name and symbol", async function () {
    expect(await this.token.name()).to.equal("DAO1")
    expect(await this.token.symbol()).to.equal("DAO1")
  })

  it("outboundTransfer: unable to send 0 tokens", async function () {
    expect(this.bridge.outboundTransfer(this.owner.address, 0)).to.be.revertedWith("Cannot burn 0 Tokens")
  })

  it("finalizeInboundTransfer: unable to mint 0 tokens", async function () {
    expect(
      this.bridge.finalizeInboundTransfer(this.holder.address, "0x117ddadadc7b8d342cf48513fef06a2cba15dfb9c488dc51aefc998abcefb52b", 0)
    ).to.be.revertedWith("Cannot mint 0 Tokens")
  })

  describe("oracle calls finalizeInboundTransfer", function () {
    beforeEach(async function () {
      await this.bridge.finalizeInboundTransfer(
        this.holder.address,
        "0x117ddadadc7b8d342cf48513fef06a2cba15dfb9c488dc51aefc998abcefb52b",
        "123456"
      )
    })

    it("l2token supply increased", async function () {
      expect(await this.token.totalSupply()).to.equal("123456")
    })

    it("l2token balance of holder increased", async function () {
      expect(await this.token.balanceOf(this.holder.address)).to.equal("123456")
    })
  })
})
