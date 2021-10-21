const { expect } = require("chai")
const { parseEther } = ethers.utils

describe("L1 Bridge", function () {
  before(async function () {
    this.signers = await ethers.getSigners()
    this.owner = this.signers[0]
    this.account1 = this.signers[1]
    // code on L2 is not callable directly, so we take just random address
    this.l2Token = this.signers[2]
    this.l2holder = this.signers[3]

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
    expect(this.bridge.outboundTransfer(this.l2holder.address, 0)).to.be.revertedWith("Cannot deposit 0 Tokens")
  })

  it("impossible to deposit without allowance", async function () {
    await expect(this.bridge.outboundTransfer(this.l2holder.address, "1234")).to.be.revertedWith("ERC20: transfer amount exceeds allowance")
  })

  it("impossible to deposit more than allowance", async function () {
    await this.token.approve(this.bridge.address, "12")
    await expect(this.bridge.outboundTransfer(this.l2holder.address, 13)).to.be.revertedWith("ERC20: transfer amount exceeds allowance")
  })

  describe("after token deposited(first holder)", function () {
    beforeEach(async function () {
      await this.token.approve(this.bridge.address, parseEther("500000"))
      await this.bridge.outboundTransfer(this.l2holder.address, parseEther("500000"))
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
      await expect(
        this.bridge.finalizeInboundTransfer(this.owner.address, "0xb4bc6ad84cfeebaa482049e38e64e3b21e20e755bde80740417845c79c180af2", 0)
      ).to.be.revertedWith("NO_AMOUNT")
    })

    it("impossible to withdraw more than balance", async function () {
      await expect(
        this.bridge.finalizeInboundTransfer(
          this.owner.address,
          "0xb4bc6ad84cfeebaa482049e38e64e3b21e20e755bde80740417845c79c180af2",
          parseEther("1000000")
        )
      ).to.be.revertedWith("NOT_ENOUGH_BALANCE")
    })

    describe("then first holder withdraws", function () {
      beforeEach(async function () {
        await this.bridge.finalizeInboundTransfer(
          this.owner.address,
          "0xb4bc6ad84cfeebaa482049e38e64e3b21e20e755bde80740417845c79c180af2",
          parseEther("300000")
        )
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
        await this.bridge.connect(this.account1).outboundTransfer(this.l2holder.address, parseEther("500000"))
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
          await this.bridge.finalizeInboundTransfer(
            this.owner.address,
            "0xb4bc6ad84cfeebaa482049e38e64e3b21e20e755bde80740417845c79c180af2",
            parseEther("300000")
          )
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
