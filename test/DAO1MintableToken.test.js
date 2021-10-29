const { expect } = require("chai")
const { parseEther } = ethers.utils

describe("DAO1 mintable token", function () {

  beforeEach(async function () {
    this.signers = await ethers.getSigners()
    this.owner = this.signers[0]
    this.account1 = this.signers[1]
    this.account2 = this.signers[2]

    this.contract = await ethers.getContractFactory("DAO1MintableToken")
    this.token = await this.contract.deploy()
  })

  it("has a name", async function () {
    expect(await this.token.name()).to.equal("DAO1")
  })

  it("has a symbol", async function () {
    expect(await this.token.symbol()).to.equal("DAO1")
  })

  it("has 18 decimals", async function () {
    expect(await this.token.decimals()).to.equal(18)
  })

  it("returns the total amount of tokens", async function () {
    expect(await this.token.totalSupply()).to.equal(0)
  })

  it("returns the balance of owner", async function () {
    expect(await this.token.balanceOf(this.owner.address)).to.equal(0)
  })

  describe("Checking token methods", function () {

    const amount = parseEther("500000")
    const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"

    describe("Mint tokens", function () {
      beforeEach(async function () {
        await this.token.connect(this.owner).mint(this.owner.address, amount)
      })

      it("owner's balance increased", async function () {
        expect(await this.token.balanceOf(this.owner.address)).to.equal(amount)
      })

      it("total amount of tokens increased", async function () {
        expect(await this.token.totalSupply()).to.equal(amount)
      })

      it("reverts if ZERO_ADDRESS", async function () {
        await expect(this.token.connect(this.owner).mint(ZERO_ADDRESS, amount)).to.be.revertedWith("ERC20: mint to the zero address")
      })

    })

  })
})
