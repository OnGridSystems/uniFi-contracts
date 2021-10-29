const { ethers } = require("hardhat")
const { expect } = require("chai")
const { BigNumber } = require("ethers")

const days = BigNumber.from("60").mul("60").mul("24")

describe("FixedStaking", function () {
  before(async function () {
    this.signers = await ethers.getSigners()
    this.alice = this.signers[0]
    this.bob = this.signers[1]
    this.token = this.signers[2]

    this.contract = await ethers.getContractFactory("FixedStakingMock")
  })

  describe("30 days, 1.55% interest, 1.55% penalty", function () {
    beforeEach(async function () {
      this.pool = await this.contract.deploy(this.token.address, 30, 155, 155)
      await this.pool.deployed()
      await this.pool.setCurrentTime(1700000000)
    })

    it("initial states", async function () {
      const deployed = await this.pool.deployed()
      expect(deployed, true)
      expect(await this.pool.owner()).to.equal(this.alice.address)
      expect(await this.pool.stakesOpen()).to.equal(false)
      expect(await this.pool.stakeDurationDays()).to.equal("30")
      expect(await this.pool.rewardRate()).to.equal("155")
      expect(await this.pool.earlyUnstakeFee()).to.equal("155")
      expect(await this.pool.totalStaked()).to.equal("0")
      expect(await this.pool.getStakesLength(this.alice.address)).to.equal("0")
    })

    describe("Alice deposited", function () {
      beforeEach(async function () {
        await this.pool.stake(10000)
        reward = BigNumber.from("10000").mul("155").div("10000")
      })

      it("contract states", async function () {
        expect(await this.pool.totalStaked()).to.equal("10000")
        expect(await this.pool.getStakesLength(this.alice.address)).to.equal("1")
        activeStake = await this.pool.activeStake(this.alice.address)
        expect(activeStake.length).to.equal(1)
        expect(activeStake[0]).to.equal(true)
      })

      it("her stake is visible", async function () {
        expect(await this.pool.getStakesLength(this.alice.address)).to.equal("1")
        expect((await this.pool.getStake(this.alice.address, 0)).active).to.equal(true)
        expect((await this.pool.getStake(this.alice.address, 0)).stakedAmount).to.equal("10000")
        expect((await this.pool.getStake(this.alice.address, 0)).startTime).to.equal(1700000000)
        expect((await this.pool.getStake(this.alice.address, 0)).endTime).to.equal(BigNumber.from("1700000000").add(days.mul("30")))
        expect((await this.pool.getStake(this.alice.address, 0)).totalYield).to.equal(reward)
        expect((await this.pool.getStake(this.alice.address, 0)).harvestedYield).to.equal("0")
        expect((await this.pool.getStake(this.alice.address, 0)).lastHarvestTime).to.equal(
          (await this.pool.getStake(this.alice.address, 0)).startTime
        )
        expect((await this.pool.getStake(this.alice.address, 0)).harvestableYield).to.equal("0")
      })

      // it("second stake of Alice", async function () {
      //   amount = BigNumber.from((1e18).toString())
      //   reward = amount.mul("155").div("10000")
      //   await this.pool.stake(amount)
      //   await this.pool.increaseCurrentTime(days.mul("15"))

      //   expect(await this.pool.getStakesLength(this.alice.address)).to.equal("2")
      //   expect((await this.pool.getStake(this.alice.address, 1)).active).to.equal(true)
      //   expect((await this.pool.getStake(this.alice.address, 1)).stakedAmount).to.equal(amount)
      //   expect((await this.pool.getStake(this.alice.address, 1)).harvestedYield).to.equal("0")
      //   expect((await this.pool.getStake(this.alice.address, 1)).totalYield).to.equal(reward)

      //   activeStake=await this.pool.activeStake(this.alice.address)
      //   expect(activeStake[0]).to.equal(true)
      //   expect(activeStake[1]).to.equal(true)

      //   expect((await this.pool.getStake(this.alice.address, 1)).harvestableYield).to.equal(
      //     BigNumber.from(amount).mul("155").div("10000").div("2")
      //   )
      //   await this.pool.harvest(1)
      //   expect((await this.pool.getStake(this.alice.address, 1)).harvestedYield).to.equal(reward.div("2"))
      //   expect((await this.pool.getStake(this.alice.address, 1)).lastHarvestTime).to.equal(BigNumber.from("1700000000").add(days.mul("15")))
      // })

      describe("15 days (half) passed", function () {
        beforeEach(async function () {
          await this.pool.increaseCurrentTime(days.mul("15"))
        })

        describe("earlyUnstake", function () {
          beforeEach(async function () {
            await this.pool.earlyUnstake(0)
          })
          describe("function withdrawalPenalties", function () {
            it("not possible when amount is greater than the penalties", async function () {
              await expect(this.pool.withdrawalPenalties(this.alice.address, reward)).to.be.revertedWith(
                "Amount is more than there are penalties"
              )
            })

            it("contract state", async function () {
              await this.pool.withdrawalPenalties(this.alice.address, reward.div("2").sub("1"))
              expect(await this.pool.penalties()).to.equal(reward.sub(reward.div("2").sub("1")))
            })
          })

          it("contract states", async function () {
            expect(await this.pool.totalStaked()).to.equal("0")
            expect(await this.pool.getStakesLength(this.alice.address)).to.equal("1")
            activeStake = await this.pool.activeStake(this.alice.address)
            expect(activeStake.length).to.equal(1)
            expect(activeStake[0]).to.equal(false)
            expect(await this.pool.penalties()).to.equal(reward)
          })

          it("her stake is visible", async function () {
            expect(await this.pool.getStakesLength(this.alice.address)).to.equal("1")
            expect((await this.pool.getStake(this.alice.address, 0)).active).to.equal(false)
            expect((await this.pool.getStake(this.alice.address, 0)).endTime).to.equal(BigNumber.from("1700000000").add(days.mul("15")))
            expect((await this.pool.getStake(this.alice.address, 0)).totalYield).to.equal(reward.div("2"))
            expect((await this.pool.getStake(this.alice.address, 0)).harvestedYield).to.equal("0")
            expect((await this.pool.getStake(this.alice.address, 0)).lastHarvestTime).to.equal(
              (await this.pool.getStake(this.alice.address, 0)).startTime
            )
            expect((await this.pool.getStake(this.alice.address, 0)).harvestableYield).to.equal(reward.div("2"))
          })

          it("harvest", async function () {
            expect((await this.pool.getStake(this.alice.address, 0)).harvestableYield).to.equal(reward.div("2"))
            await this.pool.harvest(0)
            //it is possible to check Alice's balance when the DAO 1 token is connected
            expect((await this.pool.getStake(this.alice.address, 0)).harvestedYield).to.equal(reward.div("2"))
            expect((await this.pool.getStake(this.alice.address, 0)).lastHarvestTime).to.equal(BigNumber.from("1700000000").add(days.mul("15")))
            expect((await this.pool.getStake(this.alice.address, 0)).harvestableYield).to.equal("0")
          })
        })

        it("her stake is visible", async function () {
          expect(await this.pool.getStakesLength(this.alice.address)).to.equal("1")
          expect((await this.pool.getStake(this.alice.address, 0)).active).to.equal(true)
          expect((await this.pool.getStake(this.alice.address, 0)).stakedAmount).to.equal("10000")
          expect((await this.pool.getStake(this.alice.address, 0)).startTime).to.equal(1700000000)
          expect((await this.pool.getStake(this.alice.address, 0)).endTime).to.equal(BigNumber.from("1700000000").add(days.mul("30")))
          expect((await this.pool.getStake(this.alice.address, 0)).totalYield).to.equal(reward)
          expect((await this.pool.getStake(this.alice.address, 0)).harvestedYield).to.equal("0")
          expect((await this.pool.getStake(this.alice.address, 0)).lastHarvestTime).to.equal(
            (await this.pool.getStake(this.alice.address, 0)).startTime
          )
          expect((await this.pool.getStake(this.alice.address, 0)).harvestableYield).to.equal(reward.div("2"))
        })

        it("harvest", async function () {
          await this.pool.harvest(0)
          //it is possible to check Alice's balance when the DAO 1 token is connected
          expect((await this.pool.getStake(this.alice.address, 0)).harvestedYield).to.equal(reward.div("2"))
          expect((await this.pool.getStake(this.alice.address, 0)).lastHarvestTime).to.equal(BigNumber.from("1700000000").add(days.mul("15")))
        })

        it("unstake is not allowed because the time has not expired", async function () {
          await expect(this.pool.unstake(0)).to.be.revertedWith("Deadline for unstake has not passed!")
        })

        describe("+ 15 days (entire interval) passed", function () {
          beforeEach(async function () {
            await this.pool.increaseCurrentTime(days.mul("15"))
          })

          it("her stake is visible", async function () {
            expect(await this.pool.getStakesLength(this.alice.address)).to.equal("1")
            expect((await this.pool.getStake(this.alice.address, 0)).active).to.equal(true)
            expect((await this.pool.getStake(this.alice.address, 0)).stakedAmount).to.equal("10000")
            expect((await this.pool.getStake(this.alice.address, 0)).startTime).to.equal(1700000000)
            expect((await this.pool.getStake(this.alice.address, 0)).endTime).to.equal(BigNumber.from("1700000000").add(days.mul("30")))
            expect((await this.pool.getStake(this.alice.address, 0)).totalYield).to.equal(reward)
            expect((await this.pool.getStake(this.alice.address, 0)).harvestedYield).to.equal("0")
            expect((await this.pool.getStake(this.alice.address, 0)).lastHarvestTime).to.equal(
              (await this.pool.getStake(this.alice.address, 0)).startTime
            )
            expect((await this.pool.getStake(this.alice.address, 0)).harvestableYield).to.equal(reward)
          })

          it("unstake is not allowed because the time has not expired", async function () {
            await expect(this.pool.unstake(0)).to.be.revertedWith("Deadline for unstake has not passed!")
          })

          it("harvest", async function () {
            await this.pool.harvest(0)
            //it is possible to check Alice's balance when the DAO 1 token is connected
            expect((await this.pool.getStake(this.alice.address, 0)).harvestedYield).to.equal(reward)
            expect((await this.pool.getStake(this.alice.address, 0)).lastHarvestTime).to.equal(BigNumber.from("1700000000").add(days.mul("30")))
          })

          describe("+ 1 day passed (all expired))", function () {
            beforeEach(async function () {
              await this.pool.increaseCurrentTime(days.mul("1"))
            })

            it("her stake is visible", async function () {
              expect(await this.pool.getStakesLength(this.alice.address)).to.equal("1")
              expect((await this.pool.getStake(this.alice.address, 0)).active).to.equal(true)
              expect((await this.pool.getStake(this.alice.address, 0)).stakedAmount).to.equal("10000")
              expect((await this.pool.getStake(this.alice.address, 0)).startTime).to.equal(1700000000)
              expect((await this.pool.getStake(this.alice.address, 0)).endTime).to.equal(BigNumber.from("1700000000").add(days.mul("30")))
              expect((await this.pool.getStake(this.alice.address, 0)).totalYield).to.equal(reward)
              expect((await this.pool.getStake(this.alice.address, 0)).harvestedYield).to.equal("0")
              expect((await this.pool.getStake(this.alice.address, 0)).lastHarvestTime).to.equal(
                (await this.pool.getStake(this.alice.address, 0)).startTime
              )
              expect((await this.pool.getStake(this.alice.address, 0)).harvestableYield).to.equal(reward)
            })

            it("harvest", async function () {
              await this.pool.harvest(0)
              //it is possible to check Alice's balance when the DAO 1 token is connected
              expect((await this.pool.getStake(this.alice.address, 0)).harvestedYield).to.equal(reward)
              expect((await this.pool.getStake(this.alice.address, 0)).lastHarvestTime).to.equal(
                BigNumber.from("1700000000").add(days.mul("31"))
              )
            })

            describe("unstake", function () {
              beforeEach(async function () {
                await this.pool.unstake(0)
              })

              it("contract states", async function () {
                expect(await this.pool.totalStaked()).to.equal("0")
                expect(await this.pool.getStakesLength(this.alice.address)).to.equal("1")
                activeStake = await this.pool.activeStake(this.alice.address)
                expect(activeStake.length).to.equal(1)
                expect(activeStake[0]).to.equal(false)
              })
              it("can't second time unstacke position", async function () {
                await expect(this.pool.unstake(0)).to.be.revertedWith("Stake is not active!")
              })
            })
          })
        })
      })

      describe("then Bob deposited", function () {
        beforeEach(async function () {
          await this.pool.connect(this.bob).stake(345)
        })

        it("his stake is also visible", async function () {
          expect(await this.pool.getStakesLength(this.bob.address)).to.equal("1")
          expect((await this.pool.getStake(this.bob.address, 0)).active).to.equal(true)
          expect((await this.pool.getStake(this.bob.address, 0)).stakedAmount).to.equal("345")
          expect((await this.pool.getStake(this.bob.address, 0)).harvestedYield).to.equal("0")
          expect((await this.pool.getStake(this.bob.address, 0)).totalYield).to.equal(BigNumber.from("345").mul("155").div("10000"))
        })
      })
    })
  })

  describe("90 days, 11.05% interest, 11.05% penalty", function () {
    beforeEach(async function () {
      this.pool = await this.contract.deploy(this.token.address, 90, 1105, 1105)
      await this.pool.deployed()
      await this.pool.setCurrentTime(1700000000)
    })

    it("initial states", async function () {
      const deployed = await this.pool.deployed()
      expect(deployed, true)
      expect(await this.pool.owner()).to.equal(this.alice.address)
      expect(await this.pool.stakesOpen()).to.equal(false)
      expect(await this.pool.stakeDurationDays()).to.equal("90")
      expect(await this.pool.rewardRate()).to.equal("1105")
      expect(await this.pool.earlyUnstakeFee()).to.equal("1105")
      expect(await this.pool.totalStaked()).to.equal("0")
      expect(await this.pool.getStakesLength(this.alice.address)).to.equal("0")
    })
  })
})
