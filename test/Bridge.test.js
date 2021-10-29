const { expect } = require("chai")
const { parseEther } = ethers.utils

describe("Bridge", function () {
  beforeEach(async function () {
    this.signers = await ethers.getSigners()
    this.owner = this.signers[0]
    this.account1 = this.signers[1]

    this.tokenFactory = await ethers.getContractFactory("DAO1")
    this.depositToken = await this.tokenFactory.deploy("DAO1", "DAO1", this.owner.address)
    this.contractFactory = await ethers.getContractFactory("Bridge")
    this.contract = await this.contractFactory.deploy(this.depositToken.address)
  })

  it("should be deployed", async function () {
    expect(await this.contract.deployed(), true)
    expect(await this.depositToken.deployed(), true)
  })

  it("should have correct state variables", async function () {
    expect(await this.depositToken.owner()).to.equal(this.owner.address)
  })

  it("impossible to deposit zero tokens", async function () {
    expect(this.contract.deposit(0)).to.be.revertedWith("Cannot deposit 0 Tokens")
  })

  it("impossible to deposit without allowance", async function () {
    await expect(this.contract.deposit(1)).to.be.revertedWith("ERC20: transfer amount exceeds allowance")
  })

  it("impossible to deposit more than allowance", async function () {
    await this.depositToken.approve(this.contract.address, "12")
    await expect(this.contract.deposit(15)).to.be.revertedWith("ERC20: transfer amount exceeds allowance")
  })

  it("impossible to deposit more than available balance", async function () {
    await this.depositToken.connect(this.account1).approve(this.contract.address, "12")
    await expect(this.contract.connect(this.account1).deposit(5)).to.be.revertedWith("ERC20: transfer amount exceeds balance")
  })

  describe("after token deposited(first holder)", function () {
    beforeEach(async function () {
      await this.depositToken.approve(this.contract.address, parseEther("500000"))
      expect(await this.contract.deposit(parseEther("500000")), true)
    })

    it("token balance is correct", async function () {
      const depositBalance = await this.depositToken.balanceOf(this.contract.address)
      expect(depositBalance).to.equal(parseEther("500000"))
    })
    it("depositedTokens increased", async function () {
      const depositBalanceOwner = await this.contract.balances(this.owner.address)
      expect(depositBalanceOwner).to.equal(parseEther("500000"))
    })

    it("impossible to withdraw 0 tokens", async function () {
      await expect(this.contract.withdraw(0)).to.be.revertedWith("Cannot withdraw 0 Tokens")
    })

    it("impossible to withdraw more than balance", async function () {
      await expect(this.contract.withdraw(parseEther("1000000"))).to.be.revertedWith("Invalid amount to withdraw")
    })

    describe("then first holder withdraws", function () {
      beforeEach(async function () {
        expect(await this.contract.withdraw(parseEther("300000")), true)
      })
      it("token balance is correct", async function () {
        const depositBalance = await this.depositToken.balanceOf(this.contract.address)
        expect(depositBalance).to.equal(parseEther("200000"))
      })
      it("depositedTokens decreased", async function () {
        const depositBalanceOwner = await this.contract.balances(this.owner.address)
        expect(depositBalanceOwner).to.equal(parseEther("200000"))
      })
    })

    describe("then second user deposited", function () {
      beforeEach(async function () {
        await this.depositToken.transfer(this.account1.address, parseEther("500000"))
        await this.depositToken.connect(this.account1).approve(this.contract.address, parseEther("500000"))
        expect(await this.contract.connect(this.account1).deposit(parseEther("500000")), true)
      })
      it("token balance is correct", async function () {
        const depositBalance = await this.depositToken.balanceOf(this.contract.address)
        expect(depositBalance).to.equal(parseEther("1000000"))
      })
      it("depositedTokens increased", async function () {
        const depositBalanceAccount = await this.contract.balances(this.account1.address)
        expect(depositBalanceAccount).to.equal(parseEther("500000"))
      })

      describe("then first holder withdraws", function () {
        beforeEach(async function () {
          expect(await this.contract.withdraw(parseEther("300000")), true)
        })
        it("token balance is correct", async function () {
          const depositBalance = await this.depositToken.balanceOf(this.contract.address)
          expect(depositBalance).to.equal(parseEther("700000"))
        })
        it("depositedTokens decreased", async function () {
          const depositBalanceOwner = await this.contract.balances(this.owner.address)
          expect(depositBalanceOwner).to.equal(parseEther("200000"))
        })
      })
    })
  })
})
