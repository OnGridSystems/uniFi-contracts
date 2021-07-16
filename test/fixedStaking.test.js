const { ethers } = require("hardhat")
const { expect } = require("chai")
const { BigNumber } = require("ethers")

const days = BigNumber.from("60").mul("60").mul("24")

describe("FixedStaking", function () {
  before(async function () {
    this.signers = await ethers.getSigners()
    this.alice = this.signers[0]
    this.bob = this.signers[1]
    this.tokenFactory = await ethers.getContractFactory("DAO1")
    this.contract = await ethers.getContractFactory("FixedStakingMock")
  })

  describe("30 days, 1.55% interest, 1.55% penalty", function () {
    beforeEach(async function () {
      this.token = await this.tokenFactory.deploy("DAO1", "DAO1", this.alice.address)
      await this.token.deployed()
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

      expect(await this.token.balanceOf(this.alice.address))
        .to.equal(BigNumber.from("3600000").mul(BigNumber.from(10).pow(18)))
    })

    describe("Start staking", async function()  {
      beforeEach(async function () {
        await this.pool.start()
      })

      it("should revert if stake without approve", async function() {
      await expect(this.pool.stake(1000)).to.be.revertedWith("ERC20: transfer amount exceeds allowance")
      })

      describe("Alice staked", function () {
        beforeEach(async function () {
          
          // Filling pool with reward tokens
          reward = BigNumber.from("10000").mul("155").div("10000")
          secondReward = BigNumber.from("20000").mul("155").div("10000")
          totalReward = reward.add(secondReward)
          await this.token.transfer(this.pool.address, totalReward)

          aliceInitBalance = BigNumber.from(await this.token.balanceOf(this.alice.address))
          await this.token.approve(this.pool.address, 1000000)

          stake1 = await this.pool.stake(10000)
        })

        it("emits event Transfer on staking", async function () {
          await expect(stake1).to.emit(this.token, "Transfer")
                  .withArgs(this.alice.address, this.pool.address, 10000)
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

        it("getStakingLength and pool token balance increased", async function () {
          expect(await this.pool.getStakesLength(this.alice.address)).to.equal("1")
          expect(await this.token.balanceOf(this.pool.address)).to.equal(BigNumber.from(10000).add(totalReward))

          expect(await this.token.balanceOf(this.alice.address))
            .to.equal(aliceInitBalance.sub(10000))
        })

        it("check stake details", async function () {
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
            stake2 = await this.pool.stake(20000)
          })

          it("emits event Transfer on staking", async function () {
            await expect(stake2).to.emit(this.token, "Transfer")
                    .withArgs(this.alice.address, this.pool.address, 20000)
          })

          it("check stakes length and token balance", async function () {
            expect(await this.pool.totalStaked()).to.equal("30000")
            expect(await this.pool.getStakesLength(this.alice.address)).to.equal("2")
            expect(await this.token.balanceOf(this.pool.address)).to.equal(BigNumber.from(30000).add(totalReward))
          })

          it("check details of Alice's second stake", async function () {
            expect(await this.token.balanceOf(this.alice.address)).to.equal(aliceInitBalance.sub(10000).sub(20000))
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
                unstake1 = await this.pool.unstake(0)
              })

              it("emits event Transfer on unstaking", async function () {
                fee1 = BigNumber.from(10000).mul("155").div(10000)
                await expect(unstake1).to.emit(this.token, "Transfer")
                        .withArgs(this.pool.address, this.alice.address, BigNumber.from(10000).sub(fee1))
              })

              it("fee stays on pool balance", async function () {
                expect(await this.pool.totalStaked()).to.equal("20000")
                expect(await this.pool.getStakesLength(this.alice.address)).to.equal("2")
                expect(await this.pool.collectedFees()).to.equal(reward)
                expect(await this.token.balanceOf(this.pool.address)).to.equal(BigNumber.from(20000).add(fee1).add(totalReward))
                expect(await this.pool.collectedFees()).to.equal(fee1)
              })

              it("her stake is correct", async function () {
                expect(await this.token.balanceOf(this.alice.address)).to.equal(aliceInitBalance.sub(20000).sub(fee1))

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

              describe("owner withdraws collected fees", function () {
                it("reverts if amount > collectedFees", async function () {
                  await expect(this.pool.withdrawCollectedFees(this.alice.address, 1000)).to.be.revertedWith(
                    "Amount is more than there are collectedFees"
                  )
                })

                it("withdrawCollectedFees", async function () {
                  await this.pool.withdrawCollectedFees(this.alice.address, fee1.sub(10))
                  expect(await this.token.balanceOf(this.alice.address)).to.equal(aliceInitBalance.sub(20000).sub(10))
                  expect(await this.pool.collectedFees()).to.equal(10)
                })

                it("emits Transfer event on withdrawCollectedFees", async function() {
                  await expect(await this.pool.withdrawCollectedFees(this.alice.address, 10))
                          .to.emit(this.token, "Transfer")
                            .withArgs(this.pool.address, this.alice.address, 10)
                })
              })

              describe("harvesting on first stake", function () {
                beforeEach(async function () {
                  expect(await this.token.balanceOf(this.alice.address)).to.equal(aliceInitBalance.sub(20000).sub(fee1))
                  harvest1 = await this.pool.harvest(0)
                })

                it("emits event Transfer with harvesting rewards", async function() {
                  await expect(harvest1).to.emit(this.token, "Transfer")
                          .withArgs(this.pool.address, this.alice.address, reward.div(2))
                })

                it("Alice's stake became inactive and fee got withheld", async function () {
                  expect(await this.token.balanceOf(this.alice.address))
                    .to.equal(aliceInitBalance.sub(20000).sub(fee1).add(reward.div(2)));

                  expect((await this.pool.getStake(this.alice.address, 0)).harvestableYield).to.equal(0)
                  expect((await this.pool.getStake(this.alice.address, 0)).harvestedYield).to.equal(reward.div("2"))
                  expect((await this.pool.getStake(this.alice.address, 0)).lastHarvestTime).to.equal(days.mul("15"))
                  expect(await this.token.balanceOf(this.pool.address))
                    .to.equal(BigNumber.from(20000).add(fee1).sub(reward.div(2)).add(totalReward))
                })

                it("second harvest does not issue extra tokens", async function () {
                  await expect(this.pool.harvest(0)).to.be.revertedWith("harvestableYield is zero")
                })
              })

              describe("early unstake second deposit after first", function () {
                beforeEach(async function () {
                  unstake2 = await this.pool.unstake(1)
                })

                it("emits Transfer event on unstaking", async function () {
                  fee2 = BigNumber.from(20000).mul("155").div(10000)
                  await expect(unstake2).to.emit(this.token, "Transfer")
                          .withArgs(this.pool.address, this.alice.address, BigNumber.from(20000).sub(fee2))
                })

                it("contract states", async function () {

                  expect(await this.pool.totalStaked()).to.equal("0")
                  expect(await this.pool.getStakesLength(this.alice.address)).to.equal("2")
                  expect(await this.pool.collectedFees()).to.equal(reward.add(secondReward))
                  expect(await this.token.balanceOf(this.pool.address)).to.equal(fee1.add(fee2).add(totalReward))
                })

                it("her stake is correct", async function () {
                  expect(await this.token.balanceOf(this.alice.address)).to.equal(aliceInitBalance.sub(fee1).sub(fee2))

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

                describe("owner withdraws collected fees", function () {
                  it("reverts if amount > collectedFees", async function () {
                    await expect(this.pool.withdrawCollectedFees(this.alice.address, 1000)).to.be.revertedWith(
                      "Amount is more than there are collectedFees"
                    )
                  })

                  it("withdrawCollectedFees", async function () {
                    await this.pool.withdrawCollectedFees(this.alice.address, fee2.sub(25))
                    expect(await this.token.balanceOf(this.alice.address)).to.equal(aliceInitBalance.sub(fee1).sub(25))
                    expect(await this.pool.collectedFees()).to.equal(fee1.add(25))
                  })

                  it("emits Transfer event on withdrawCollectedFees", async function() {
                    await expect(await this.pool.withdrawCollectedFees(this.alice.address, 25))
                            .to.emit(this.token, "Transfer")
                              .withArgs(this.pool.address, this.alice.address, 25)
                  })
                })

                describe("harvesting on second stake", function () {
                  beforeEach(async function () {
                    expect(await this.token.balanceOf(this.alice.address)).to.equal(aliceInitBalance.sub(fee1).sub(fee2))
                    harvest2 = await this.pool.harvest(1)
                  })

                  it("emits Transfer event with harvesting", async function() {
                    await expect(harvest2).to.emit(this.token, "Transfer")
                            .withArgs(this.pool.address, this.alice.address, secondReward.div(2))
                  })

                  it("her stake is correct", async function () {
                    expect(await this.token.balanceOf(this.alice.address))
                      .to.equal(aliceInitBalance.sub(fee1).sub(fee2).add(secondReward.div("2")))
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
                  unstake1 = await this.pool.unstake(0)
                })
  
                it("emits Transfer event on unstaking", async function () {
                  await expect(unstake1).to.emit(this.token, "Transfer")
                          .withArgs(this.pool.address, this.alice.address, BigNumber.from(10000).sub(fee1))
                })

                it("contract states", async function () {
                  expect(await this.pool.totalStaked()).to.equal("20000")
                  expect(await this.pool.getStakesLength(this.alice.address)).to.equal("2")
                  expect(await this.pool.collectedFees()).to.equal(reward)
                })

                it("her stake is correct", async function () {
                  expect(await this.token.balanceOf(this.alice.address)).to.equal(aliceInitBalance.sub(20000).sub(fee1))
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

                describe("owner withdraws collected fees", function () {
                  it("reverts if amount > collectedFees", async function () {
                    await expect(this.pool.withdrawCollectedFees(this.alice.address, 1000)).to.be.revertedWith(
                      "Amount is more than there are collectedFees"
                    )
                  })

                  it("withdrawCollectedFees", async function () {
                    await this.pool.withdrawCollectedFees(this.alice.address, reward.div("2").sub("1"))
                    expect(await this.token.balanceOf(this.alice.address))
                      .to.equal(aliceInitBalance.sub(20000).sub(fee1).add(reward.div("2").sub("1")))
                    expect(await this.pool.collectedFees()).to.equal(reward.sub(reward.div("2").sub("1")))
                  })

                  it("emits Transfer event on withdrawCollectedFees", async function() {
                    await expect(await this.pool.withdrawCollectedFees(this.alice.address, 1))
                            .to.emit(this.token, "Transfer")
                              .withArgs(this.pool.address, this.alice.address, 1)
                  })
                })

                describe("Alice harvests her first stake", function () {
                  beforeEach(async function () {
                    await this.pool.harvest(0)
                  })

                  it("check resulting balance", async function () {
                    expect(await this.token.balanceOf(this.alice.address)).to.equal(aliceInitBalance.sub(20000))

                    expect((await this.pool.getStake(this.alice.address, 0)).harvestableYield).to.equal(0)
                    expect((await this.pool.getStake(this.alice.address, 0)).harvestedYield).to.equal(reward)
                    expect((await this.pool.getStake(this.alice.address, 0)).lastHarvestTime).to.equal(days.mul("30"))
                  })

                  it("unable to harvest already harvested stake again", async function () {
                    await expect(this.pool.harvest(0)).to.be.revertedWith("harvestableYield is zero")
                  })
                })

                describe("Alice early unstakes second deposit", function () {
                  beforeEach(async function () {
                    unstake2 = await this.pool.unstake(1)
                  })
    
                  it("emits event Transfer on unstaking", async function () {
                    await expect(unstake2).to.emit(this.token, "Transfer")
                            .withArgs(this.pool.address, this.alice.address, BigNumber.from(20000).sub(fee2))
                  })

                  it("contract states", async function () {
                    expect(await this.pool.totalStaked()).to.equal("0")
                    expect(await this.pool.getStakesLength(this.alice.address)).to.equal("2")
                    expect(await this.pool.collectedFees()).to.equal(reward.add(secondReward))
                  })

                  it("check resulting Alice's balance and stake status", async function () {
                    expect(await this.token.balanceOf(this.alice.address)).to.equal(aliceInitBalance.sub(fee1).sub(fee2))

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

                  describe("owner withdraws collected fees", function () {
                    it("reverts if amount > collectedFees", async function () {
                      await expect(this.pool.withdrawCollectedFees(this.alice.address, 1000)).to.be.revertedWith(
                        "Amount is more than there are collectedFees"
                      )
                    })

                    it("withdrawCollectedFees", async function () {
                      await this.pool.withdrawCollectedFees(this.alice.address, secondReward.div("2").sub("1"))
                      expect(await this.token.balanceOf(this.alice.address))
                        .to.equal(aliceInitBalance.sub(fee1).sub(fee2).add(secondReward.div("2").sub("1")))
                      expect(await this.pool.collectedFees()).to.equal(secondReward.add(reward).sub(secondReward.div("2").sub("1")))
                    })

                    it("emits Transfer event on withdrawCollectedFees", async function() {
                      await expect(await this.pool.withdrawCollectedFees(this.alice.address, 1))
                              .to.emit(this.token, "Transfer")
                                .withArgs(this.pool.address, this.alice.address, 1)
                    })
                  })

                  describe("Alice harvests second stake", function () {
                    beforeEach(async function () {
                      expect(await this.token.balanceOf(this.alice.address)).to.equal(aliceInitBalance.sub(fee1).sub(fee2))
                      await this.pool.harvest(1)
                    })

                    it("check token balance and stake status", async function () {
                      expect(await this.token.balanceOf(this.alice.address)).to.equal(aliceInitBalance.sub(fee1))
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
                    unstake1 = await this.pool.unstake(0)
                  })
    
                  it("emits event Transfer on unstaking", async function () {
                    await expect(unstake1).to.emit(this.token, "Transfer")
                            .withArgs(this.pool.address, this.alice.address, BigNumber.from(10000))
                  })

                  it("contract states", async function () {
                    expect(await this.pool.totalStaked()).to.equal("20000")
                    expect(await this.pool.getStakesLength(this.alice.address)).to.equal("2")
                    expect(await this.pool.collectedFees()).to.equal("0")

                    expect(await this.token.balanceOf(this.pool.address)).to.equal(BigNumber.from(20000).add(totalReward))
                  })

                  it("her stake is correct", async function () {
                    expect(await this.token.balanceOf(this.alice.address)).to.equal(aliceInitBalance.sub(20000))
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

                  describe("harvesting on first stake", function () {
                    beforeEach(async function () {
                      await this.pool.harvest(0)
                    })

                    it("her stake is correct", async function () {
                      expect(await this.token.balanceOf(this.alice.address)).to.equal(aliceInitBalance.sub(20000).add(reward))
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
                      unstake2 = await this.pool.unstake(1)
                    })
      
                    it("emits event Transfer on unstaking", async function () {
                      await expect(unstake2).to.emit(this.token, "Transfer")
                              .withArgs(this.pool.address, this.alice.address, BigNumber.from(20000))
                    })

                    it("contract states", async function () {
                      expect(await this.pool.totalStaked()).to.equal("0")
                      expect(await this.pool.getStakesLength(this.alice.address)).to.equal("2")
                      expect(await this.pool.collectedFees()).to.equal("0")

                      expect(await this.token.balanceOf(this.pool.address)).to.equal(totalReward)
                    })

                    it("her stake is correct", async function () {
                      expect(await this.token.balanceOf(this.alice.address)).to.equal(aliceInitBalance)
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

                    describe("harvesting on first and second stake", function () {
                      beforeEach(async function () {
                        expect(await this.token.balanceOf(this.alice.address)).to.equal(aliceInitBalance)
                        expect(await this.token.balanceOf(this.pool.address)).to.equal(totalReward);
                        harvest1 = await this.pool.harvest(0)
                        harvest2 = await this.pool.harvest(1)
                      })

                      it("emits Transfers event on harvesting", async function() {
                        await expect(harvest1).to.emit(this.token, "Transfer")
                                .withArgs(this.pool.address, this.alice.address, reward)
                        await expect(harvest2).to.emit(this.token, "Transfer")
                                .withArgs(this.pool.address, this.alice.address, secondReward)
                        })

                      it("her stake is correct after both harvest", async function () {
                        expect(await this.token.balanceOf(this.alice.address)).to.equal(aliceInitBalance.add(totalReward))
                        expect((await this.pool.getStake(this.alice.address, 1)).harvestableYield).to.equal(0)
                        expect((await this.pool.getStake(this.alice.address, 1)).harvestedYield).to.equal(secondReward)
                        expect((await this.pool.getStake(this.alice.address, 1)).lastHarvestTime).to.equal(days.mul("31"))

                        expect(await this.token.balanceOf(this.alice.address)).to.equal(aliceInitBalance.add(totalReward))
                        expect(await this.token.balanceOf(this.pool.address)).to.equal(0)
                      })

                      it("second harvest does not issue extra tokens", async function () {
                        await expect(this.pool.harvest(0)).to.be.revertedWith("harvestableYield is zero")
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
              bobReward = BigNumber.from(345).mul(155).div(10000)
              await this.token.transfer(this.pool.address, bobReward)

              await this.token.transfer(this.bob.address, BigNumber.from(345))
              await this.token.connect(this.bob).approve(this.pool.address, 345)
              await this.pool.connect(this.bob).stake(345)
            })

            it("check Bob's stake details", async function () {
              expect(await this.pool.getStakesLength(this.bob.address)).to.equal("1")
              expect((await this.pool.getStake(this.bob.address, 0)).active).to.equal(true)
              expect((await this.pool.getStake(this.bob.address, 0)).stakedAmount).to.equal("345")
              expect((await this.pool.getStake(this.bob.address, 0)).harvestedYield).to.equal("0")
              expect((await this.pool.getStake(this.bob.address, 0)).totalYield).to.equal(BigNumber.from("345").mul("155").div("10000"))
            })

            describe("after 1 day passed Bob unstakes with fee charged", function() {
              beforeEach(async function () {
                await this.pool.increaseCurrentTime(days.mul("1"))
                bobUnstake1 = this.pool.connect(this.bob).unstake(0)
              })

              it("emits events Transfer and changes states", async function() {
                feeBob = BigNumber.from(345).mul(155).div(10000)

                await expect(bobUnstake1).to.emit(this.token, 'Transfer')
                        .withArgs(this.pool.address, this.bob.address, BigNumber.from(345).sub(feeBob))
                
                expect(await this.token.balanceOf(this.bob.address)).to.equal(BigNumber.from(345).sub(feeBob))
                expect(await this.pool.collectedFees()).to.equal(feeBob)
              })
            })

            describe("after 30 day passed Bob unstakes with fee charged", function() {
              beforeEach(async function () {
                await this.pool.increaseCurrentTime(days.mul("30"))
                bobUnstake30 = this.pool.connect(this.bob).unstake(0)
              })

              it("emits events Transfer and changes states", async function() {
                await expect(bobUnstake30).to.emit(this.token, 'Transfer')
                        .withArgs(this.pool.address, this.bob.address, BigNumber.from(345).sub(feeBob))

                expect(await this.token.balanceOf(this.bob.address)).to.equal(BigNumber.from(345).sub(feeBob))
                expect(await this.pool.collectedFees()).to.equal(feeBob)
              })
            })

            describe("after 30 day passed Bob unstakes without fee charged", function() {
              beforeEach(async function () {
                await this.pool.increaseCurrentTime(days.mul("31"))
                bobUnstake31 = this.pool.connect(this.bob).unstake(0)
              })

              it("emits events Transfer and changes states", async function() {
                await expect(bobUnstake31).to.emit(this.token, 'Transfer')
                        .withArgs(this.pool.address, this.bob.address, BigNumber.from(345))
                
                expect(await this.token.balanceOf(this.bob.address)).to.equal(BigNumber.from(345))
                expect(await this.pool.collectedFees()).to.equal(0)
              })
            }) 

            it("Non-owner can't stop staking", async function () {
              await expect(this.pool.connect(this.bob).stop()).to.be.revertedWith("Ownable: caller is not the owner")
            })
          })
        })
      })
    })
  })

  describe("90 days, 11.05% interest, 11.05% penalty", function () {
    beforeEach(async function () {
      this.token = await this.tokenFactory.deploy("DAO1", "DAO1", this.alice.address)
      await this.token.deployed()
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
