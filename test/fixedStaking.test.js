const { ethers } = require("hardhat")
const { expect } = require("chai")
const { BN } = require("bn.js")

describe("FixedStaking", function () {
  before(async function () {
    this.signers = await ethers.getSigners()
    this.alice = this.signers[0]
    this.token = this.signers[1]

    this.contract = await ethers.getContractFactory("FixedStaking")
  })

  beforeEach(async function () {
    this.pool = await this.contract.deploy(this.token.address, 0, 0, 0)
    await this.pool.deployed()
  })

  it("should be deployed", async function () {
    const deployed = await this.pool.deployed()
    expect(deployed, true)
  })

  it("should have correct state variables", async function () {
    expect(await this.pool.owner()).to.equal(this.alice.address)
  })
})
