const { expect } = require("chai")
const { parseEther } = ethers.utils

describe("L1 Bridge", function () {
  before(async function () {
    this.signers = await ethers.getSigners()
    this.owner = this.signers[0]
    this.account1 = this.signers[1]
    // code on L2 is not callable directly, so we take just random address
    this.l2Token = this.signers[2]

    this.TokenFactory = await ethers.getContractFactory("DAO1")
    this.L1BridgeFactory = await ethers.getContractFactory("L1Bridge")
  })

  beforeEach(async function () {
    this.token = await this.TokenFactory.deploy("DAO1", "DAO1", this.owner.address)
    this.bridge = await this.L1BridgeFactory.deploy(this.token.address, this.l2Token.address)
  })

  it("should be deployed", async function () {
    expect(await this.bridge.deployed(), true)
    expect(await this.token.deployed(), true)
  })

  it("should have correct state variables", async function () {
    expect(await this.token.owner()).to.equal(this.owner.address)
  })

  it("impossible to deposit zero tokens", async function () {
    expect(this.bridge.deposit(0)).to.be.revertedWith("Cannot deposit 0 Tokens")
  })

  it("impossible to deposit without allowance", async function () {
    await expect(this.bridge.deposit(1)).to.be.revertedWith("ERC20: transfer amount exceeds allowance")
  })

  it("impossible to deposit more than allowance", async function () {
    await this.token.approve(this.bridge.address, "12")
    await expect(this.bridge.deposit(15)).to.be.revertedWith("ERC20: transfer amount exceeds allowance")
  })

  it("impossible to deposit more than available balance", async function () {
    await this.token.connect(this.account1).approve(this.bridge.address, "12")
    await expect(this.bridge.connect(this.account1).deposit(5)).to.be.revertedWith("ERC20: transfer amount exceeds balance")
  })

  describe("after token deposited(first holder)", function () {
    beforeEach(async function () {
      await this.token.approve(this.bridge.address, parseEther("500000"))
      expect(await this.bridge.deposit(parseEther("500000")), true)
    })

    it("token balance is correct", async function () {
      const depositBalance = await this.token.balanceOf(this.bridge.address)
      expect(depositBalance).to.equal(parseEther("500000"))
    })
    it("depositedTokens increased", async function () {
      const depositBalanceOwner = await this.bridge.balances(this.owner.address)
      expect(depositBalanceOwner).to.equal(parseEther("500000"))
    })

    it("impossible to withdraw 0 tokens", async function () {
      await expect(this.bridge.withdraw(0)).to.be.revertedWith("Cannot withdraw 0 Tokens")
    })

    it("impossible to withdraw more than balance", async function () {
      await expect(this.bridge.withdraw(parseEther("1000000"))).to.be.revertedWith("Invalid amount to withdraw")
    })

    describe("then first holder withdraws", function () {
      beforeEach(async function () {
        expect(await this.bridge.withdraw(parseEther("300000")), true)
      })
      it("token balance is correct", async function () {
        const depositBalance = await this.token.balanceOf(this.bridge.address)
        expect(depositBalance).to.equal(parseEther("200000"))
      })
      it("depositedTokens decreased", async function () {
        const depositBalanceOwner = await this.bridge.balances(this.owner.address)
        expect(depositBalanceOwner).to.equal(parseEther("200000"))
      })
    })

    describe("then second user deposited", function () {
      beforeEach(async function () {
        await this.token.transfer(this.account1.address, parseEther("500000"))
        await this.token.connect(this.account1).approve(this.bridge.address, parseEther("500000"))
        expect(await this.bridge.connect(this.account1).deposit(parseEther("500000")), true)
      })
      it("token balance is correct", async function () {
        const depositBalance = await this.token.balanceOf(this.bridge.address)
        expect(depositBalance).to.equal(parseEther("1000000"))
      })
      it("depositedTokens increased", async function () {
        const depositBalanceAccount = await this.bridge.balances(this.account1.address)
        expect(depositBalanceAccount).to.equal(parseEther("500000"))
      })

      describe("then first holder withdraws", function () {
        beforeEach(async function () {
          expect(await this.bridge.withdraw(parseEther("300000")), true)
        })
        it("token balance is correct", async function () {
          const depositBalance = await this.token.balanceOf(this.bridge.address)
          expect(depositBalance).to.equal(parseEther("700000"))
        })
        it("depositedTokens decreased", async function () {
          const depositBalanceOwner = await this.bridge.balances(this.owner.address)
          expect(depositBalanceOwner).to.equal(parseEther("200000"))
        })
      })
    })
  })
})
