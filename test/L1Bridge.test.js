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
    this.oracle = this.signers[4]
    this.blackhole = this.signers[4]

    this.TokenFactory = await ethers.getContractFactory("DAO1")
    this.L1BridgeFactory = await ethers.getContractFactory("L1Bridge")
  })

  beforeEach(async function () {
    this.token = await this.TokenFactory.deploy("DAO1", "DAO1", this.owner.address)
    // burn tokens for round numbers in tests
    await this.token.transfer(this.blackhole.address, parseEther("2600000"))
    this.bridge = await this.L1BridgeFactory.deploy(this.token.address, this.l2Token.address)
    const ORACLE_ROLE = await this.bridge.ORACLE_ROLE()
    await this.bridge.grantRole(ORACLE_ROLE, this.oracle.address)
  })

  it("should be deployed", async function () {
    expect(await this.bridge.deployed(), true)
    expect(await this.token.deployed(), true)
  })

  it("owner has token balance", async function () {
    expect(await this.token.balanceOf(this.owner.address)).to.equal(parseEther("1000000"))
  })

  it("bridge has zero balance", async function () {
    expect(await this.token.balanceOf(this.bridge.address)).to.equal(parseEther("0"))
    expect(await this.bridge.totalBridgedBalance()).to.equal("0")
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
      await this.token.approve(this.bridge.address, parseEther("300000"))
      await this.bridge.outboundTransfer(this.l2holder.address, parseEther("300000"))
    })

    it("token balance moved from holder to bridge", async function () {
      expect(await this.token.balanceOf(this.owner.address)).to.equal(parseEther("700000"))
      expect(await this.token.balanceOf(this.bridge.address)).to.equal(parseEther("300000"))
    })
    it("totalBridgedBalance increased", async function () {
      expect(await this.bridge.totalBridgedBalance()).to.equal(parseEther("300000"))
    })

    it("impossible to withdraw 0 tokens", async function () {
      await expect(
        this.bridge
          .connect(this.oracle)
          .finalizeInboundTransfer(this.owner.address, "0xb4bc6ad84cfeebaa482049e38e64e3b21e20e755bde80740417845c79c180af2", 0)
      ).to.be.revertedWith("NO_AMOUNT")
    })

    it("impossible to withdraw more than balance", async function () {
      await expect(
        this.bridge
          .connect(this.oracle)
          .finalizeInboundTransfer(
            this.owner.address,
            "0xb4bc6ad84cfeebaa482049e38e64e3b21e20e755bde80740417845c79c180af2",
            parseEther("1000000")
          )
      ).to.be.revertedWith("NOT_ENOUGH_BALANCE")
    })

    it("Non-oracle cannot call finalizeInboundTransfer", async function () {
      await expect(
        this.bridge
          .finalizeInboundTransfer(
            this.owner.address,
            "0xb4bc6ad84cfeebaa482049e38e64e3b21e20e755bde80740417845c79c180af2",
            parseEther("1000000")
          )
      ).to.be.reverted
    })

    describe("then first holder withdraws (oracle calls finalizeInboundTransfer about it)", function () {
      beforeEach(async function () {
        await this.bridge
          .connect(this.oracle)
          .finalizeInboundTransfer(
            this.owner.address,
            "0xb4bc6ad84cfeebaa482049e38e64e3b21e20e755bde80740417845c79c180af2",
            parseEther("200000")
          )
      })

      it("amount of tokens moved from bridge to receiver", async function () {
        expect(await this.token.balanceOf(this.bridge.address)).to.equal(parseEther("100000"))
        expect(await this.token.balanceOf(this.owner.address)).to.equal(parseEther("900000"))
      })

      it("totalBridgedBalance decreased", async function () {
        expect(await this.bridge.totalBridgedBalance()).to.equal(parseEther("100000"))
      })
    })

    describe("then second user deposited", function () {
      beforeEach(async function () {
        await this.token.connect(this.blackhole).transfer(this.account1.address, parseEther("1000000"))
        await this.token.connect(this.account1).approve(this.bridge.address, parseEther("400000"))
        await this.bridge.connect(this.account1).outboundTransfer(this.l2holder.address, parseEther("400000"))
      })
      it("token transferred from second user to bridge", async function () {
        expect(await this.token.balanceOf(this.account1.address)).to.equal(parseEther("600000"))
        expect(await this.token.balanceOf(this.bridge.address)).to.equal(parseEther("700000")) // was 300K, added 400K
      })
      it("totalBridgedBalance increased", async function () {
        expect(await this.bridge.totalBridgedBalance()).to.equal(parseEther("700000"))
      })

      describe("then first holder withdraws", function () {
        beforeEach(async function () {
          await this.bridge
            .connect(this.oracle)
            .finalizeInboundTransfer(
              this.owner.address,
              "0xb4bc6ad84cfeebaa482049e38e64e3b21e20e755bde80740417845c79c180af2",
              parseEther("100000")
            )
        })
        it("amount of tokens moved from bridge to first holder", async function () {
          expect(await this.token.balanceOf(this.bridge.address)).to.equal(parseEther("600000"))
          expect(await this.token.balanceOf(this.owner.address)).to.equal(parseEther("800000"))
        })
        it("totalBridgedBalance decreased", async function () {
          expect(await this.bridge.totalBridgedBalance()).to.equal(parseEther("600000"))
        })
      })
    })
  })
})
