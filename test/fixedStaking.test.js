const { ethers } = require("hardhat")
const { expect } = require("chai")
const { BN } = require("bn.js")

describe("FixedStaking", function () {
  before(async function () {
    this.signers = await ethers.getSigners()
    this.alice = this.signers[0]
    this.bob = this.signers[1]
    this.token = this.signers[2]

    this.contract = await ethers.getContractFactory("FixedStaking")
  })

  describe("30 days, 1.55% interest, 1.55% penalty", function () {
    beforeEach(async function () {
      this.pool = await this.contract.deploy(this.token.address, 30, 155, 155)
      await this.pool.deployed()
    })

    it("initial states", async function () {
      const deployed = await this.pool.deployed()
      expect(deployed, true)
      expect(await this.pool.owner()).to.equal(this.alice.address)
      expect(await this.pool.active()).to.equal(false)
      expect(await this.pool.stakeDurationDays()).to.equal("30")
      expect(await this.pool.rewardRate()).to.equal("155")
      expect(await this.pool.earlyUnstakeFee()).to.equal("155")
      expect(await this.pool.totalStaked()).to.equal("0")
      expect(await this.pool.getStakesLength(this.alice.address)).to.equal("0")
    })

    describe("Alice deposited", function () {
      beforeEach(async function () {
        await this.pool.stake(123)
      })

      it("her stake is visible", async function () {
        expect(await this.pool.getStakesLength(this.alice.address)).to.equal("1")
        expect((await this.pool.stakes(this.alice.address, 0)).active).to.equal(true)
        expect((await this.pool.stakes(this.alice.address, 0)).stakedAmount).to.equal("123")
        expect((await this.pool.stakes(this.alice.address, 0)).claimed).to.equal("0")
      })

      it("second stake of Alice", async function () {
        await this.pool.stake(667)
        expect(await this.pool.getStakesLength(this.alice.address)).to.equal("2")
        expect((await this.pool.stakes(this.alice.address, 1)).active).to.equal(true)
        expect((await this.pool.stakes(this.alice.address, 1)).stakedAmount).to.equal("667")
        expect((await this.pool.stakes(this.alice.address, 1)).claimed).to.equal("0")
      })

      describe("then Bob deposited", function () {
        beforeEach(async function () {
          await this.pool.connect(this.bob).stake(345)
        })

        it("his stake is also visible", async function () {
          expect(await this.pool.getStakesLength(this.bob.address)).to.equal("1")
          expect((await this.pool.stakes(this.bob.address, 0)).active).to.equal(true)
          expect((await this.pool.stakes(this.bob.address, 0)).stakedAmount).to.equal("345")
          expect((await this.pool.stakes(this.bob.address, 0)).claimed).to.equal("0")
        })
      })
    })
  })

  describe("90 days, 11.05% interest, 11.05% penalty", function () {
    beforeEach(async function () {
      this.pool = await this.contract.deploy(this.token.address, 90, 1105, 1105)
      await this.pool.deployed()
    })

    it("initial states", async function () {
      const deployed = await this.pool.deployed()
      expect(deployed, true)
      expect(await this.pool.owner()).to.equal(this.alice.address)
      expect(await this.pool.active()).to.equal(false)
      expect(await this.pool.stakeDurationDays()).to.equal("90")
      expect(await this.pool.rewardRate()).to.equal("1105")
      expect(await this.pool.earlyUnstakeFee()).to.equal("1105")
      expect(await this.pool.totalStaked()).to.equal("0")
      expect(await this.pool.getStakesLength(this.alice.address)).to.equal("0")
    })
  })
})
