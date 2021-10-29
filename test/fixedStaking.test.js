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
      await this.pool.setCurrentTime(0)
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
        await this.pool.start()
        await this.pool.stake(10000)
        reward = BigNumber.from("10000").mul("155").div("10000")
      })

      it("Stop() called by owner closes stakes", async function () {
        await this.pool.stop()
        expect(await this.pool.stakesOpen()).to.equal(false)
      })

      it("Stake should revert if stakes are not open", async function () {
        await this.pool.stop()
        await expect(this.pool.stake(10000)).to.be.revertedWith("stake: not open")
      })

      it("Non-owner can't stop staking", async function () {
        await expect(this.pool.connect(this.bob).stop()).to.be.revertedWith("Ownable: caller is not the owner")
      })

      it("her stake is visible", async function () {
        expect(await this.pool.getStakesLength(this.alice.address)).to.equal("1")
      })

      it("her stake is visible", async function () {
        expect((await this.pool.getStake(this.alice.address, 0)).active).to.equal(true)
        expect((await this.pool.getStake(this.alice.address, 0)).stakedAmount).to.equal("10000")
        expect((await this.pool.getStake(this.alice.address, 0)).startTime).to.equal(0)
        expect((await this.pool.getStake(this.alice.address, 0)).endTime).to.equal(days.mul("30"))
        expect((await this.pool.getStake(this.alice.address, 0)).totalYield).to.equal(reward)
        expect((await this.pool.getStake(this.alice.address, 0)).harvestedYield).to.equal("0")
        expect((await this.pool.getStake(this.alice.address, 0)).lastHarvestTime).to.equal(
          (await this.pool.getStake(this.alice.address, 0)).startTime
        )
        expect((await this.pool.getStake(this.alice.address, 0)).harvestableYield).to.equal("0")
      })

      describe("second stake of Alice", function () {
        beforeEach(async function () {
          await this.pool.stake(20000)
          secondReward = BigNumber.from("20000").mul("155").div("10000")
        })

        it("contract states", async function () {
          expect(await this.pool.totalStaked()).to.equal("30000")
          expect(await this.pool.getStakesLength(this.alice.address)).to.equal("2")
        })

        it("her stake is visible", async function () {
          expect((await this.pool.getStake(this.alice.address, 1)).active).to.equal(true)
          expect((await this.pool.getStake(this.alice.address, 1)).stakedAmount).to.equal("20000")
          expect((await this.pool.getStake(this.alice.address, 1)).startTime).to.equal("0")
          expect((await this.pool.getStake(this.alice.address, 1)).endTime).to.equal(days.mul("30"))
          expect((await this.pool.getStake(this.alice.address, 1)).totalYield).to.equal(secondReward)
          expect((await this.pool.getStake(this.alice.address, 1)).harvestedYield).to.equal("0")
          expect((await this.pool.getStake(this.alice.address, 1)).lastHarvestTime).to.equal(
            (await this.pool.getStake(this.alice.address, 1)).startTime
          )
          expect((await this.pool.getStake(this.alice.address, 1)).harvestableYield).to.equal("0")
        })

        describe("15 days (half) passed", function () {
          beforeEach(async function () {
            await this.pool.increaseCurrentTime(days.mul("15"))
          })

          it("her stake is correct", async function () {
            expect((await this.pool.getStake(this.alice.address, 0)).active).to.equal(true)
            expect((await this.pool.getStake(this.alice.address, 0)).stakedAmount).to.equal("10000")
            expect((await this.pool.getStake(this.alice.address, 0)).startTime).to.equal("0")
            expect((await this.pool.getStake(this.alice.address, 0)).endTime).to.equal(days.mul("30"))
            expect((await this.pool.getStake(this.alice.address, 0)).totalYield).to.equal(reward)
            expect((await this.pool.getStake(this.alice.address, 0)).harvestedYield).to.equal("0")
            expect((await this.pool.getStake(this.alice.address, 0)).lastHarvestTime).to.equal(
              (await this.pool.getStake(this.alice.address, 0)).startTime
            )
            expect((await this.pool.getStake(this.alice.address, 0)).harvestableYield).to.equal(reward.div(2))

            expect((await this.pool.getStake(this.alice.address, 1)).active).to.equal(true)
            expect((await this.pool.getStake(this.alice.address, 1)).stakedAmount).to.equal("20000")
            expect((await this.pool.getStake(this.alice.address, 1)).startTime).to.equal("0")
            expect((await this.pool.getStake(this.alice.address, 1)).endTime).to.equal(days.mul("30"))
            expect((await this.pool.getStake(this.alice.address, 1)).totalYield).to.equal(secondReward)
            expect((await this.pool.getStake(this.alice.address, 1)).harvestedYield).to.equal("0")
            expect((await this.pool.getStake(this.alice.address, 1)).lastHarvestTime).to.equal(
              (await this.pool.getStake(this.alice.address, 1)).startTime
            )
            expect((await this.pool.getStake(this.alice.address, 1)).harvestableYield).to.equal(secondReward.div("2"))
          })

          describe("early unstake first deposit", function () {
            beforeEach(async function () {
              await this.pool.unstake(0)
            })

            it("contract states", async function () {
              expect(await this.pool.totalStaked()).to.equal("20000")
              expect(await this.pool.getStakesLength(this.alice.address)).to.equal("2")
              expect(await this.pool.collectedFees()).to.equal(reward)
            })

            it("her stake is correct", async function () {
              // it is possible to check Alice's balance when the DAO 1 token is connected
              expect((await this.pool.getStake(this.alice.address, 0)).active).to.equal(false)
              expect((await this.pool.getStake(this.alice.address, 0)).endTime).to.equal(days.mul("15"))
              expect((await this.pool.getStake(this.alice.address, 0)).totalYield).to.equal(reward.div("2"))
              expect((await this.pool.getStake(this.alice.address, 0)).harvestedYield).to.equal("0")
              expect((await this.pool.getStake(this.alice.address, 0)).lastHarvestTime).to.equal(
                (await this.pool.getStake(this.alice.address, 0)).startTime
              )
              expect((await this.pool.getStake(this.alice.address, 0)).harvestableYield).to.equal(reward.div("2"))
            })

            it("can't second time unstake position", async function () {
              await expect(this.pool.unstake(0)).to.be.revertedWith("Stake is not active!")
            })

            describe("function withdrawCollectedFees", function () {
              it("not possible when amount is greater than the penalties", async function () {
                await expect(this.pool.withdrawCollectedFees(this.alice.address, 1000)).to.be.revertedWith(
                  "Amount is more than there are collectedFees"
                )
              })

              it("withdrawCollectedFees", async function () {
                await this.pool.withdrawCollectedFees(this.alice.address, reward.div("2").sub("1"))
                // it is possible to check Alice's balance when the DAO 1 token is connected
                expect(await this.pool.collectedFees()).to.equal(reward.sub(reward.div("2").sub("1")))
              })
            })

            describe("function harvest", function () {
              beforeEach(async function () {
                await this.pool.harvest(0)
              })

              it("her stake is correct", async function () {
                // it is possible to check Alice's balance when the DAO 1 token is connected
                expect((await this.pool.getStake(this.alice.address, 0)).harvestableYield).to.equal(0)
                expect((await this.pool.getStake(this.alice.address, 0)).harvestedYield).to.equal(reward.div("2"))
                expect((await this.pool.getStake(this.alice.address, 0)).lastHarvestTime).to.equal(days.mul("15"))
              })

              it("second harvest does not issue extra tokens", async function () {
                await expect(this.pool.harvest(0)).to.be.revertedWith("harvestableYield is zero")
              })
            })

            describe("early unstake second deposit after first", function () {
              beforeEach(async function () {
                await this.pool.unstake(1)
              })

              it("contract states", async function () {
                expect(await this.pool.totalStaked()).to.equal("0")
                expect(await this.pool.getStakesLength(this.alice.address)).to.equal("2")
                expect(await this.pool.collectedFees()).to.equal(reward.add(secondReward))
              })

              it("her stake is correct", async function () {
                // it is possible to check Alice's balance when the DAO 1 token is connected
                expect((await this.pool.getStake(this.alice.address, 1)).active).to.equal(false)
                expect((await this.pool.getStake(this.alice.address, 1)).endTime).to.equal(days.mul("15"))
                expect((await this.pool.getStake(this.alice.address, 1)).totalYield).to.equal(secondReward.div("2"))
                expect((await this.pool.getStake(this.alice.address, 1)).harvestedYield).to.equal("0")
                expect((await this.pool.getStake(this.alice.address, 1)).lastHarvestTime).to.equal(
                  (await this.pool.getStake(this.alice.address, 1)).startTime
                )
                expect((await this.pool.getStake(this.alice.address, 1)).harvestableYield).to.equal(secondReward.div("2"))
              })

              it("can't second time unstake position", async function () {
                await expect(this.pool.unstake(1)).to.be.revertedWith("Stake is not active!")
              })

              describe("function withdrawCollectedFees", function () {
                it("not possible when amount is greater than the penalties", async function () {
                  await expect(this.pool.withdrawCollectedFees(this.alice.address, 1000)).to.be.revertedWith(
                    "Amount is more than there are collectedFees"
                  )
                })

                it("withdrawCollectedFees", async function () {
                  await this.pool.withdrawCollectedFees(this.alice.address, secondReward.div("2").sub("1"))
                  // it is possible to check Alice's balance when the DAO 1 token is connected
                  expect(await this.pool.collectedFees()).to.equal(secondReward.add(reward).sub(secondReward.div("2").sub("1")))
                })
              })

              describe("function harvest", function () {
                beforeEach(async function () {
                  await this.pool.harvest(1)
                })

                it("her stake is correct", async function () {
                  // it is possible to check Alice's balance when the DAO 1 token is connected
                  expect((await this.pool.getStake(this.alice.address, 1)).harvestableYield).to.equal(0)
                  expect((await this.pool.getStake(this.alice.address, 1)).harvestedYield).to.equal(secondReward.div("2"))
                  expect((await this.pool.getStake(this.alice.address, 1)).lastHarvestTime).to.equal(days.mul("15"))
                })

                it("second harvest does not issue extra tokens", async function () {
                  await expect(this.pool.harvest(1)).to.be.revertedWith("harvestableYield is zero")
                })
              })
            })
          })

          describe("+ 15 days (entire interval) passed", function () {
            beforeEach(async function () {
              await this.pool.increaseCurrentTime(days.mul("15"))
            })

            it("her stake is correct", async function () {
              expect((await this.pool.getStake(this.alice.address, 0)).active).to.equal(true)
              expect((await this.pool.getStake(this.alice.address, 0)).stakedAmount).to.equal("10000")
              expect((await this.pool.getStake(this.alice.address, 0)).startTime).to.equal("0")
              expect((await this.pool.getStake(this.alice.address, 0)).endTime).to.equal(days.mul("30"))
              expect((await this.pool.getStake(this.alice.address, 0)).totalYield).to.equal(reward)
              expect((await this.pool.getStake(this.alice.address, 0)).harvestedYield).to.equal("0")
              expect((await this.pool.getStake(this.alice.address, 0)).lastHarvestTime).to.equal(
                (await this.pool.getStake(this.alice.address, 0)).startTime
              )
              expect((await this.pool.getStake(this.alice.address, 0)).harvestableYield).to.equal(reward)

              expect((await this.pool.getStake(this.alice.address, 1)).active).to.equal(true)
              expect((await this.pool.getStake(this.alice.address, 1)).stakedAmount).to.equal("20000")
              expect((await this.pool.getStake(this.alice.address, 1)).startTime).to.equal("0")
              expect((await this.pool.getStake(this.alice.address, 1)).endTime).to.equal(days.mul("30"))
              expect((await this.pool.getStake(this.alice.address, 1)).totalYield).to.equal(secondReward)
              expect((await this.pool.getStake(this.alice.address, 1)).harvestedYield).to.equal("0")
              expect((await this.pool.getStake(this.alice.address, 1)).lastHarvestTime).to.equal(
                (await this.pool.getStake(this.alice.address, 1)).startTime
              )
              expect((await this.pool.getStake(this.alice.address, 1)).harvestableYield).to.equal(secondReward)
            })

            describe("early unstake first deposit", function () {
              beforeEach(async function () {
                await this.pool.unstake(0)
              })

              it("contract states", async function () {
                expect(await this.pool.totalStaked()).to.equal("20000")
                expect(await this.pool.getStakesLength(this.alice.address)).to.equal("2")
                expect(await this.pool.collectedFees()).to.equal(reward)
              })

              it("her stake is correct", async function () {
                // it is possible to check Alice's balance when the DAO 1 token is connected
                expect((await this.pool.getStake(this.alice.address, 0)).active).to.equal(false)
                expect((await this.pool.getStake(this.alice.address, 0)).endTime).to.equal(days.mul("30"))
                expect((await this.pool.getStake(this.alice.address, 0)).totalYield).to.equal(reward)
                expect((await this.pool.getStake(this.alice.address, 0)).harvestedYield).to.equal("0")
                expect((await this.pool.getStake(this.alice.address, 0)).lastHarvestTime).to.equal(
                  (await this.pool.getStake(this.alice.address, 0)).startTime
                )
                expect((await this.pool.getStake(this.alice.address, 0)).harvestableYield).to.equal(reward)
              })

              it("can't second time unstake position", async function () {
                await expect(this.pool.unstake(0)).to.be.revertedWith("Stake is not active!")
              })

              describe("function withdrawCollectedFees", function () {
                it("not possible when amount is greater than the penalties", async function () {
                  await expect(this.pool.withdrawCollectedFees(this.alice.address, 1000)).to.be.revertedWith(
                    "Amount is more than there are collectedFees"
                  )
                })

                it("withdrawCollectedFees", async function () {
                  await this.pool.withdrawCollectedFees(this.alice.address, reward.div("2").sub("1"))
                  // it is possible to check Alice's balance when the DAO 1 token is connected
                  expect(await this.pool.collectedFees()).to.equal(reward.sub(reward.div("2").sub("1")))
                })
              })

              describe("function harvest", function () {
                beforeEach(async function () {
                  await this.pool.harvest(0)
                })

                it("her stake is correct", async function () {
                  // it is possible to check Alice's balance when the DAO 1 token is connected
                  expect((await this.pool.getStake(this.alice.address, 0)).harvestableYield).to.equal(0)
                  expect((await this.pool.getStake(this.alice.address, 0)).harvestedYield).to.equal(reward)
                  expect((await this.pool.getStake(this.alice.address, 0)).lastHarvestTime).to.equal(days.mul("30"))
                })

                it("second harvest does not issue extra tokens", async function () {
                  await expect(this.pool.harvest(0)).to.be.revertedWith("harvestableYield is zero")
                })
              })

              describe("early unstake second deposit after first", function () {
                beforeEach(async function () {
                  await this.pool.unstake(1)
                })

                it("contract states", async function () {
                  expect(await this.pool.totalStaked()).to.equal("0")
                  expect(await this.pool.getStakesLength(this.alice.address)).to.equal("2")
                  expect(await this.pool.collectedFees()).to.equal(reward.add(secondReward))
                })

                it("her stake is correct", async function () {
                  // it is possible to check Alice's balance when the DAO 1 token is connected
                  expect((await this.pool.getStake(this.alice.address, 1)).active).to.equal(false)
                  expect((await this.pool.getStake(this.alice.address, 1)).endTime).to.equal(days.mul("30"))
                  expect((await this.pool.getStake(this.alice.address, 1)).totalYield).to.equal(secondReward)
                  expect((await this.pool.getStake(this.alice.address, 1)).harvestedYield).to.equal("0")
                  expect((await this.pool.getStake(this.alice.address, 1)).lastHarvestTime).to.equal(
                    (await this.pool.getStake(this.alice.address, 1)).startTime
                  )
                  expect((await this.pool.getStake(this.alice.address, 1)).harvestableYield).to.equal(secondReward)
                })

                it("can't second time unstake position", async function () {
                  await expect(this.pool.unstake(1)).to.be.revertedWith("Stake is not active!")
                })

                describe("function withdrawCollectedFees", function () {
                  it("not possible when amount is greater than the penalties", async function () {
                    await expect(this.pool.withdrawCollectedFees(this.alice.address, 1000)).to.be.revertedWith(
                      "Amount is more than there are collectedFees"
                    )
                  })

                  it("withdrawCollectedFees", async function () {
                    await this.pool.withdrawCollectedFees(this.alice.address, secondReward.div("2").sub("1"))
                    // it is possible to check Alice's balance when the DAO 1 token is connected
                    expect(await this.pool.collectedFees()).to.equal(secondReward.add(reward).sub(secondReward.div("2").sub("1")))
                  })
                })

                describe("function harvest", function () {
                  beforeEach(async function () {
                    await this.pool.harvest(1)
                  })

                  it("her stake is correct", async function () {
                    // it is possible to check Alice's balance when the DAO 1 token is connected
                    expect((await this.pool.getStake(this.alice.address, 1)).harvestableYield).to.equal(0)
                    expect((await this.pool.getStake(this.alice.address, 1)).harvestedYield).to.equal(secondReward)
                    expect((await this.pool.getStake(this.alice.address, 1)).lastHarvestTime).to.equal(days.mul("30"))
                  })

                  it("second harvest does not issue extra tokens", async function () {
                    await expect(this.pool.harvest(1)).to.be.revertedWith("harvestableYield is zero")
                  })
                })
              })
            })
            describe("+ 1 day passed (all expired))", function () {
              beforeEach(async function () {
                await this.pool.increaseCurrentTime(days.mul("1"))
              })

              it("her stake is correct", async function () {
                expect((await this.pool.getStake(this.alice.address, 0)).active).to.equal(true)
                expect((await this.pool.getStake(this.alice.address, 0)).stakedAmount).to.equal("10000")
                expect((await this.pool.getStake(this.alice.address, 0)).startTime).to.equal("0")
                expect((await this.pool.getStake(this.alice.address, 0)).endTime).to.equal(days.mul("30"))
                expect((await this.pool.getStake(this.alice.address, 0)).totalYield).to.equal(reward)
                expect((await this.pool.getStake(this.alice.address, 0)).harvestedYield).to.equal("0")
                expect((await this.pool.getStake(this.alice.address, 0)).lastHarvestTime).to.equal(
                  (await this.pool.getStake(this.alice.address, 0)).startTime
                )
                expect((await this.pool.getStake(this.alice.address, 0)).harvestableYield).to.equal(reward)

                expect((await this.pool.getStake(this.alice.address, 1)).active).to.equal(true)
                expect((await this.pool.getStake(this.alice.address, 1)).stakedAmount).to.equal("20000")
                expect((await this.pool.getStake(this.alice.address, 1)).startTime).to.equal("0")
                expect((await this.pool.getStake(this.alice.address, 1)).endTime).to.equal(days.mul("30"))
                expect((await this.pool.getStake(this.alice.address, 1)).totalYield).to.equal(secondReward)
                expect((await this.pool.getStake(this.alice.address, 1)).harvestedYield).to.equal("0")
                expect((await this.pool.getStake(this.alice.address, 1)).lastHarvestTime).to.equal(
                  (await this.pool.getStake(this.alice.address, 1)).startTime
                )
                expect((await this.pool.getStake(this.alice.address, 1)).harvestableYield).to.equal(secondReward)
              })

              describe("unstake first deposit", function () {
                beforeEach(async function () {
                  await this.pool.unstake(0)
                })

                it("contract states", async function () {
                  expect(await this.pool.totalStaked()).to.equal("20000")
                  expect(await this.pool.getStakesLength(this.alice.address)).to.equal("2")
                  expect(await this.pool.collectedFees()).to.equal("0")
                })

                it("her stake is correct", async function () {
                  // it is possible to check Alice's balance when the DAO 1 token is connected
                  expect((await this.pool.getStake(this.alice.address, 0)).active).to.equal(false)
                  expect((await this.pool.getStake(this.alice.address, 0)).endTime).to.equal(days.mul("30"))
                  expect((await this.pool.getStake(this.alice.address, 0)).totalYield).to.equal(reward)
                  expect((await this.pool.getStake(this.alice.address, 0)).harvestedYield).to.equal("0")
                  expect((await this.pool.getStake(this.alice.address, 0)).lastHarvestTime).to.equal(
                    (await this.pool.getStake(this.alice.address, 0)).startTime
                  )
                  expect((await this.pool.getStake(this.alice.address, 0)).harvestableYield).to.equal(reward)
                })

                it("can't second time unstake position", async function () {
                  await expect(this.pool.unstake(0)).to.be.revertedWith("Stake is not active!")
                })

                describe("function harvest", function () {
                  beforeEach(async function () {
                    await this.pool.harvest(0)
                  })

                  it("her stake is correct", async function () {
                    // it is possible to check Alice's balance when the DAO 1 token is connected
                    expect((await this.pool.getStake(this.alice.address, 0)).harvestableYield).to.equal(0)
                    expect((await this.pool.getStake(this.alice.address, 0)).harvestedYield).to.equal(reward)
                    expect((await this.pool.getStake(this.alice.address, 0)).lastHarvestTime).to.equal(days.mul("31"))
                  })

                  it("second harvest does not issue extra tokens", async function () {
                    await expect(this.pool.harvest(0)).to.be.revertedWith("harvestableYield is zero")
                  })
                })

                describe("unstake second deposit after first", function () {
                  beforeEach(async function () {
                    await this.pool.unstake(1)
                  })

                  it("contract states", async function () {
                    expect(await this.pool.totalStaked()).to.equal("0")
                    expect(await this.pool.getStakesLength(this.alice.address)).to.equal("2")
                    expect(await this.pool.collectedFees()).to.equal("0")
                  })

                  it("her stake is correct", async function () {
                    // it is possible to check Alice's balance when the DAO 1 token is connected
                    expect((await this.pool.getStake(this.alice.address, 1)).active).to.equal(false)
                    expect((await this.pool.getStake(this.alice.address, 1)).endTime).to.equal(days.mul("30"))
                    expect((await this.pool.getStake(this.alice.address, 1)).totalYield).to.equal(secondReward)
                    expect((await this.pool.getStake(this.alice.address, 1)).harvestedYield).to.equal("0")
                    expect((await this.pool.getStake(this.alice.address, 1)).lastHarvestTime).to.equal(
                      (await this.pool.getStake(this.alice.address, 1)).startTime
                    )
                    expect((await this.pool.getStake(this.alice.address, 1)).harvestableYield).to.equal(secondReward)
                  })

                  it("can't second time unstake position", async function () {
                    await expect(this.pool.unstake(1)).to.be.revertedWith("Stake is not active!")
                  })

                  describe("function harvest", function () {
                    beforeEach(async function () {
                      await this.pool.harvest(1)
                    })

                    it("her stake is correct", async function () {
                      // it is possible to check Alice's balance when the DAO 1 token is connected
                      expect((await this.pool.getStake(this.alice.address, 1)).harvestableYield).to.equal(0)
                      expect((await this.pool.getStake(this.alice.address, 1)).harvestedYield).to.equal(secondReward)
                      expect((await this.pool.getStake(this.alice.address, 1)).lastHarvestTime).to.equal(days.mul("31"))
                    })

                    it("second harvest does not issue extra tokens", async function () {
                      await expect(this.pool.harvest(1)).to.be.revertedWith("harvestableYield is zero")
                    })
                  })
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
          it("Non-owner can't stop staking", async function () {
            await expect(this.pool.connect(this.bob).stop()).to.be.revertedWith("Ownable: caller is not the owner")
          })
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
