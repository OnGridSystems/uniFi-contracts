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
      expect(await this.pool.yieldRate()).to.equal("155")
      expect(await this.pool.earlyUnstakeFee()).to.equal("155")
      expect(await this.pool.stakedTokens()).to.equal("0")
      expect(await this.pool.getStakesLength(this.alice.address)).to.equal("0")

      expect(await this.token.balanceOf(this.alice.address)).to.equal(BigNumber.from("3600000").mul(BigNumber.from(10).pow(18)))
    })

    describe("Start staking", async function () {
      beforeEach(async function () {
        await this.pool.start()
      })

      it("should revert if not enough reward tokens", async function () {
        await this.token.transfer(this.pool.address, 155)
        await expect(this.pool.stake(10000)).to.be.revertedWith("ERC20: transfer amount exceeds allowance")
      })

      describe("Owner added reward token on the contract", async function () {
        beforeEach(async function () {
          reward = BigNumber.from("10000").mul("155").div("10000")
          secondReward = BigNumber.from("20000").mul("155").div("10000")
          fee1 = reward
          fee2 = secondReward
          totalReward = reward.add(secondReward)
          await this.token.transfer(this.pool.address, totalReward)
        })

        it("should revert if stake without approve", async function () {
          await expect(this.pool.stake(10000)).to.be.revertedWith("ERC20: transfer amount exceeds allowance")
        })

        it("Stop() called by owner closes stakes", async function () {
          await this.pool.stop()
          expect(await this.pool.stakesOpen()).to.equal(false)
        })

        it("unallocatedTokens increased", async function () {
          expect(await this.pool.unallocatedTokens()).to.equal(totalReward)
        })

        describe("Alice staked", function () {
          beforeEach(async function () {
            aliceInitBalance = BigNumber.from(await this.token.balanceOf(this.alice.address))
            await this.token.approve(this.pool.address, 1000000)

            stake1 = await this.pool.stake(10000)
          })

          it("emits event Transfer on staking", async function () {
            await expect(stake1).to.emit(this.token, "Transfer").withArgs(this.alice.address, this.pool.address, 10000)
          })

          it("emits event Stake", async function () {
            const stakesLength = 1
            const depositAmount = 10000
            const startTime = 0
            const endTime = 30 * 24 * 60 * 60

            await expect(stake1).to.emit(this.pool, "Stake").withArgs(this.alice.address, stakesLength, depositAmount, startTime, endTime)
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

            expect(await this.token.balanceOf(this.alice.address)).to.equal(aliceInitBalance.sub(10000))
          })

          it("allocatedTokens increased", async function () {
            expect(await this.pool.allocatedTokens()).to.equal(reward)
          })

          it("unallocatedTokens decreased", async function () {
            expect(await this.pool.unallocatedTokens()).to.equal(secondReward)
          })

          it("check stake details", async function () {
            expect((await this.pool.getStake(this.alice.address, 0)).staked).to.equal(true)
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
              await expect(stake2).to.emit(this.token, "Transfer").withArgs(this.alice.address, this.pool.address, 20000)
            })
            it("emits event Stake", async function () {
              const stakesLength = 2
              const depositAmount = 20000
              const startTime = 0
              const endTime = 30 * 24 * 60 * 60

              await expect(stake2).to.emit(this.pool, "Stake").withArgs(this.alice.address, stakesLength, depositAmount, startTime, endTime)
            })

            it("check stakes length and token balance", async function () {
              expect(await this.pool.stakedTokens()).to.equal("30000")
              expect(await this.pool.getStakesLength(this.alice.address)).to.equal("2")
              expect(await this.token.balanceOf(this.pool.address)).to.equal(BigNumber.from(30000).add(totalReward))
            })

            it("allocatedTokens increased", async function () {
              expect(await this.pool.allocatedTokens()).to.equal(totalReward)
            })

            it("unallocatedTokens decreased", async function () {
              expect(await this.pool.unallocatedTokens()).to.equal(0)
            })

            it("check details of Alice's second stake", async function () {
              expect(await this.token.balanceOf(this.alice.address)).to.equal(aliceInitBalance.sub(10000).sub(20000))
              expect((await this.pool.getStake(this.alice.address, 1)).staked).to.equal(true)
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
                expect((await this.pool.getStake(this.alice.address, 0)).staked).to.equal(true)
                expect((await this.pool.getStake(this.alice.address, 0)).stakedAmount).to.equal("10000")
                expect((await this.pool.getStake(this.alice.address, 0)).startTime).to.equal("0")
                expect((await this.pool.getStake(this.alice.address, 0)).endTime).to.equal(days.mul("30"))
                expect((await this.pool.getStake(this.alice.address, 0)).totalYield).to.equal(reward)
                expect((await this.pool.getStake(this.alice.address, 0)).harvestedYield).to.equal("0")
                expect((await this.pool.getStake(this.alice.address, 0)).lastHarvestTime).to.equal(
                  (await this.pool.getStake(this.alice.address, 0)).startTime
                )
                expect((await this.pool.getStake(this.alice.address, 0)).harvestableYield).to.equal(reward.div(2))

                expect((await this.pool.getStake(this.alice.address, 1)).staked).to.equal(true)
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
                  await expect(unstake1)
                    .to.emit(this.token, "Transfer")
                    .withArgs(this.pool.address, this.alice.address, BigNumber.from(10000).sub(fee1))
                })

                it("emits event Unstake", async function () {
                  const stakeId = 0
                  const depositAmount = 10000
                  const startTime = 0
                  const endTime = 30 * 24 * 60 * 60
                  const earlyStake = true

                  await expect(unstake1)
                    .to.emit(this.pool, "Unstake")
                    .withArgs(this.alice.address, stakeId, depositAmount, startTime, endTime, earlyStake)
                })

                it("fee stays on pool balance", async function () {
                  expect(await this.pool.stakedTokens()).to.equal(BigNumber.from(20000))
                  expect(await this.pool.getStakesLength(this.alice.address)).to.equal("2")
                  expect(await this.token.balanceOf(this.pool.address)).to.equal(BigNumber.from(20000).add(fee1).add(totalReward))
                })

                it("her stake is correct", async function () {
                  expect(await this.token.balanceOf(this.alice.address)).to.equal(aliceInitBalance.sub(20000).sub(fee1))

                  expect((await this.pool.getStake(this.alice.address, 0)).staked).to.equal(false)
                  expect((await this.pool.getStake(this.alice.address, 0)).endTime).to.equal(days.mul("15"))
                  expect((await this.pool.getStake(this.alice.address, 0)).totalYield).to.equal(reward.div("2"))
                  expect((await this.pool.getStake(this.alice.address, 0)).harvestedYield).to.equal("0")
                  expect((await this.pool.getStake(this.alice.address, 0)).lastHarvestTime).to.equal(
                    (await this.pool.getStake(this.alice.address, 0)).startTime
                  )
                  expect((await this.pool.getStake(this.alice.address, 0)).harvestableYield).to.equal(reward.div("2"))
                })

                it("can't second time unstake position", async function () {
                  await expect(this.pool.unstake(0)).to.be.revertedWith("Unstaked already")
                })

                it("allocatedTokens decreased", async function () {
                  expect(await this.pool.allocatedTokens()).to.equal(totalReward.sub(reward.sub(reward.div("2"))))
                })

                it("unallocatedTokens increased", async function () {
                  expect(await this.pool.unallocatedTokens()).to.equal(fee1.add(reward.sub(reward.div("2"))))
                })

                describe("owner withdraws unalocated tokens", function () {
                  it("emits Transfer event on withdrawUnallocatedTokens", async function () {
                    await expect(await this.pool.withdrawUnallocatedTokens(this.alice.address, 10))
                      .to.emit(this.token, "Transfer")
                      .withArgs(this.pool.address, this.alice.address, 10)
                  })

                  it("reverts if amount > unallocatedTokens", async function () {
                    await expect(
                      this.pool.withdrawUnallocatedTokens(this.alice.address, fee1.add(reward.sub(reward.div("2"))).add("1"))
                    ).to.be.revertedWith("Not enough unallocatedTokens")
                  })

                  it("withdrawUnallocatedTokens", async function () {
                    await this.pool.withdrawUnallocatedTokens(this.alice.address, "10")
                    expect(await this.token.balanceOf(this.alice.address)).to.equal(aliceInitBalance.sub("20000").sub(fee1).add("10"))
                    expect(await this.pool.unallocatedTokens()).to.equal(fee1.add(reward.sub(reward.div("2"))).sub("10"))
                  })
                })

                describe("harvesting on first stake", function () {
                  beforeEach(async function () {
                    expect(await this.token.balanceOf(this.alice.address)).to.equal(aliceInitBalance.sub(20000).sub(fee1))
                    harvest1 = await this.pool.harvest(0)
                  })

                  it("allocatedTokens decreased", async function () {
                    expect(await this.pool.allocatedTokens()).to.equal(totalReward.sub(reward))
                  })

                  it("emits event Transfer with harvesting rewards", async function () {
                    await expect(harvest1).to.emit(this.token, "Transfer").withArgs(this.pool.address, this.alice.address, reward.div(2))
                  })

                  it("emits event Harvest", async function () {
                    const stakeId = 0
                    const harvestableYield = 77
                    const currentTime = 15 * 24 * 60 * 60

                    await expect(harvest1).to.emit(this.pool, "Harvest").withArgs(this.alice.address, stakeId, harvestableYield, currentTime)
                  })

                  it("Alice's stake became inactive and fee got withheld", async function () {
                    expect(await this.token.balanceOf(this.alice.address)).to.equal(aliceInitBalance.sub(20000).sub(fee1).add(reward.div(2)))

                    expect((await this.pool.getStake(this.alice.address, 0)).harvestableYield).to.equal(0)
                    expect((await this.pool.getStake(this.alice.address, 0)).harvestedYield).to.equal(reward.div("2"))
                    expect((await this.pool.getStake(this.alice.address, 0)).lastHarvestTime).to.equal(days.mul("15"))
                    expect(await this.token.balanceOf(this.pool.address)).to.equal(
                      BigNumber.from(20000).add(fee1).sub(reward.div(2)).add(totalReward)
                    )
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
                    await expect(unstake2)
                      .to.emit(this.token, "Transfer")
                      .withArgs(this.pool.address, this.alice.address, BigNumber.from(20000).sub(fee2))
                  })

                  it("emits event Unstake on unstaking", async function () {
                    const stakeId = 1
                    const depositAmount = 20000
                    const startTime = 0
                    const endTime = 30 * 24 * 60 * 60
                    const earlyStake = true

                    await expect(unstake2)
                      .to.emit(this.pool, "Unstake")
                      .withArgs(this.alice.address, stakeId, depositAmount, startTime, endTime, earlyStake)
                  })

                  it("contract states", async function () {
                    expect(await this.pool.stakedTokens()).to.equal("0")
                    expect(await this.pool.getStakesLength(this.alice.address)).to.equal("2")
                    expect(await this.token.balanceOf(this.pool.address)).to.equal(fee1.add(fee2).add(totalReward))
                  })

                  it("her stake is correct", async function () {
                    expect(await this.token.balanceOf(this.alice.address)).to.equal(aliceInitBalance.sub(fee1).sub(fee2))

                    expect((await this.pool.getStake(this.alice.address, 1)).staked).to.equal(false)
                    expect((await this.pool.getStake(this.alice.address, 1)).endTime).to.equal(days.mul("15"))
                    expect((await this.pool.getStake(this.alice.address, 1)).totalYield).to.equal(secondReward.div("2"))
                    expect((await this.pool.getStake(this.alice.address, 1)).harvestedYield).to.equal("0")
                    expect((await this.pool.getStake(this.alice.address, 1)).lastHarvestTime).to.equal(
                      (await this.pool.getStake(this.alice.address, 1)).startTime
                    )
                    expect((await this.pool.getStake(this.alice.address, 1)).harvestableYield).to.equal(secondReward.div("2"))
                  })

                  it("can't second time unstake position", async function () {
                    await expect(this.pool.unstake(1)).to.be.revertedWith("Unstaked already")
                  })

                  it("allocatedTokens decreased", async function () {
                    expect(await this.pool.allocatedTokens()).to.equal(
                      totalReward.sub(reward.sub(reward.div("2"))).sub(secondReward.sub(secondReward.div("2")))
                    )
                  })

                  it("unallocatedTokens increased", async function () {
                    expect(await this.pool.unallocatedTokens()).to.equal(
                      fee1
                        .add(fee2)
                        .add(reward.sub(reward.div("2")))
                        .add(secondReward.sub(secondReward.div("2")))
                    )
                  })

                  describe("owner withdraws unalocated tokens", function () {
                    it("emits Transfer event on withdrawUnallocatedTokens", async function () {
                      await expect(await this.pool.withdrawUnallocatedTokens(this.alice.address, 10))
                        .to.emit(this.token, "Transfer")
                        .withArgs(this.pool.address, this.alice.address, 10)
                    })

                    it("reverts if amount > unallocatedTokens", async function () {
                      await expect(
                        this.pool.withdrawUnallocatedTokens(
                          this.alice.address,
                          fee1
                            .add(fee2)
                            .add(reward.sub(reward.div("2")))
                            .add(secondReward.sub(secondReward.div("2")))
                            .add("1")
                        )
                      ).to.be.revertedWith("Not enough unallocatedTokens")
                    })

                    it("withdrawUnallocatedTokens", async function () {
                      await this.pool.withdrawUnallocatedTokens(this.alice.address, "10")
                      expect(await this.token.balanceOf(this.alice.address)).to.equal(aliceInitBalance.sub(fee2).sub(fee1).add("10"))
                      expect(await this.pool.unallocatedTokens()).to.equal(
                        fee1
                          .add(fee2)
                          .add(reward.sub(reward.div("2")))
                          .add(secondReward.sub(secondReward.div("2")))
                          .sub("10")
                      )
                    })
                  })

                  describe("harvesting on second stake", function () {
                    beforeEach(async function () {
                      expect(await this.token.balanceOf(this.alice.address)).to.equal(aliceInitBalance.sub(fee1).sub(fee2))
                      harvest2 = await this.pool.harvest(1)
                    })

                    it("allocatedTokens decreased", async function () {
                      expect(await this.pool.allocatedTokens()).to.equal(reward.div("2"))
                    })

                    it("emits Transfer event with harvesting", async function () {
                      await expect(harvest2).to.emit(this.token, "Transfer").withArgs(this.pool.address, this.alice.address, secondReward.div(2))
                    })

                    it("emits event Harvest with harvesting rewards", async function () {
                      const stakeId = 1
                      const harvestableYield = 155
                      const currentTime = 15 * 24 * 60 * 60

                      await expect(harvest2).to.emit(this.pool, "Harvest").withArgs(this.alice.address, stakeId, harvestableYield, currentTime)
                    })

                    it("her stake is correct", async function () {
                      expect(await this.token.balanceOf(this.alice.address)).to.equal(
                        aliceInitBalance.sub(fee1).sub(fee2).add(secondReward.div("2"))
                      )
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
                  expect((await this.pool.getStake(this.alice.address, 0)).staked).to.equal(true)
                  expect((await this.pool.getStake(this.alice.address, 0)).stakedAmount).to.equal("10000")
                  expect((await this.pool.getStake(this.alice.address, 0)).startTime).to.equal("0")
                  expect((await this.pool.getStake(this.alice.address, 0)).endTime).to.equal(days.mul("30"))
                  expect((await this.pool.getStake(this.alice.address, 0)).totalYield).to.equal(reward)
                  expect((await this.pool.getStake(this.alice.address, 0)).harvestedYield).to.equal("0")
                  expect((await this.pool.getStake(this.alice.address, 0)).lastHarvestTime).to.equal(
                    (await this.pool.getStake(this.alice.address, 0)).startTime
                  )
                  expect((await this.pool.getStake(this.alice.address, 0)).harvestableYield).to.equal(reward)

                  expect((await this.pool.getStake(this.alice.address, 1)).staked).to.equal(true)
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
                    await expect(unstake1)
                      .to.emit(this.token, "Transfer")
                      .withArgs(this.pool.address, this.alice.address, BigNumber.from(10000).sub(fee1))
                  })

                  it("emits event Unstake on unstaking", async function () {
                    const stakeId = 0
                    const depositAmount = 10000
                    const startTime = 0
                    const endTime = 30 * 24 * 60 * 60
                    const earlyStake = true

                    await expect(unstake1)
                      .to.emit(this.pool, "Unstake")
                      .withArgs(this.alice.address, stakeId, depositAmount, startTime, endTime, earlyStake)
                  })

                  it("contract states", async function () {
                    expect(await this.pool.stakedTokens()).to.equal("20000")
                    expect(await this.pool.getStakesLength(this.alice.address)).to.equal("2")
                  })

                  it("her stake is correct", async function () {
                    expect(await this.token.balanceOf(this.alice.address)).to.equal(aliceInitBalance.sub(20000).sub(fee1))
                    expect((await this.pool.getStake(this.alice.address, 0)).staked).to.equal(false)
                    expect((await this.pool.getStake(this.alice.address, 0)).endTime).to.equal(days.mul("30"))
                    expect((await this.pool.getStake(this.alice.address, 0)).totalYield).to.equal(reward)
                    expect((await this.pool.getStake(this.alice.address, 0)).harvestedYield).to.equal("0")
                    expect((await this.pool.getStake(this.alice.address, 0)).lastHarvestTime).to.equal(
                      (await this.pool.getStake(this.alice.address, 0)).startTime
                    )
                    expect((await this.pool.getStake(this.alice.address, 0)).harvestableYield).to.equal(reward)
                  })

                  it("can't second time unstake position", async function () {
                    await expect(this.pool.unstake(0)).to.be.revertedWith("Unstaked already")
                  })

                  it("unallocatedTokens increased", async function () {
                    expect(await this.pool.unallocatedTokens()).to.equal(fee1)
                  })

                  describe("owner withdraws unalocated tokens", function () {
                    it("emits Transfer event on withdrawUnallocatedTokens", async function () {
                      await expect(await this.pool.withdrawUnallocatedTokens(this.alice.address, 10))
                        .to.emit(this.token, "Transfer")
                        .withArgs(this.pool.address, this.alice.address, 10)
                    })

                    it("reverts if amount > unallocatedTokens", async function () {
                      await expect(this.pool.withdrawUnallocatedTokens(this.alice.address, fee1.add("1"))).to.be.revertedWith(
                        "Not enough unallocatedTokens"
                      )
                    })

                    it("withdrawUnallocatedTokens", async function () {
                      await this.pool.withdrawUnallocatedTokens(this.alice.address, "10")
                      expect(await this.token.balanceOf(this.alice.address)).to.equal(aliceInitBalance.sub("20000").sub(fee1).add("10"))
                      expect(await this.pool.unallocatedTokens()).to.equal(fee1.sub("10"))
                    })
                  })

                  describe("Alice harvests her first stake", function () {
                    beforeEach(async function () {
                      harvest1 = await this.pool.harvest(0)
                    })

                    it("emits event Transfer on harvest", async function () {
                      await expect(harvest1).to.emit(this.token, "Transfer").withArgs(this.pool.address, this.alice.address, reward)
                    })

                    it("emits event Harvest with harvesting rewards", async function () {
                      const stakeId = 0
                      const harvestableYield = 155
                      const currentTime = 30 * 24 * 60 * 60

                      await expect(harvest1).to.emit(this.pool, "Harvest").withArgs(this.alice.address, stakeId, harvestableYield, currentTime)
                    })

                    it("allocatedTokens decreased", async function () {
                      expect(await this.pool.allocatedTokens()).to.equal(totalReward.sub(reward))
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
                      await expect(unstake2)
                        .to.emit(this.token, "Transfer")
                        .withArgs(this.pool.address, this.alice.address, BigNumber.from(20000).sub(fee2))
                    })

                    it("emits event Unstake on unstaking", async function () {
                      const stakeId = 1
                      const depositAmount = 20000
                      const startTime = 0
                      const endTime = 30 * 24 * 60 * 60
                      const earlyStake = true

                      await expect(unstake2)
                        .to.emit(this.pool, "Unstake")
                        .withArgs(this.alice.address, stakeId, depositAmount, startTime, endTime, earlyStake)
                    })

                    it("contract states", async function () {
                      expect(await this.pool.stakedTokens()).to.equal("0")
                      expect(await this.pool.getStakesLength(this.alice.address)).to.equal("2")
                    })

                    it("check resulting Alice's balance and stake status", async function () {
                      expect(await this.token.balanceOf(this.alice.address)).to.equal(aliceInitBalance.sub(fee1).sub(fee2))

                      expect((await this.pool.getStake(this.alice.address, 1)).staked).to.equal(false)
                      expect((await this.pool.getStake(this.alice.address, 1)).endTime).to.equal(days.mul("30"))
                      expect((await this.pool.getStake(this.alice.address, 1)).totalYield).to.equal(secondReward)
                      expect((await this.pool.getStake(this.alice.address, 1)).harvestedYield).to.equal("0")
                      expect((await this.pool.getStake(this.alice.address, 1)).lastHarvestTime).to.equal(
                        (await this.pool.getStake(this.alice.address, 1)).startTime
                      )
                      expect((await this.pool.getStake(this.alice.address, 1)).harvestableYield).to.equal(secondReward)
                    })

                    it("can't second time unstake position", async function () {
                      await expect(this.pool.unstake(1)).to.be.revertedWith("Unstaked already")
                    })

                    it("unallocatedTokens increased", async function () {
                      expect(await this.pool.unallocatedTokens()).to.equal(fee1.add(fee2))
                    })

                    describe("owner withdraws unalocated tokens", function () {
                      it("emits Transfer event on withdrawUnallocatedTokens", async function () {
                        await expect(await this.pool.withdrawUnallocatedTokens(this.alice.address, 10))
                          .to.emit(this.token, "Transfer")
                          .withArgs(this.pool.address, this.alice.address, 10)
                      })

                      it("reverts if amount > unallocatedTokens", async function () {
                        await expect(this.pool.withdrawUnallocatedTokens(this.alice.address, fee1.add(fee2).add("1"))).to.be.revertedWith(
                          "Not enough unallocatedTokens"
                        )
                      })

                      it("withdrawUnallocatedTokens", async function () {
                        await this.pool.withdrawUnallocatedTokens(this.alice.address, "10")
                        expect(await this.token.balanceOf(this.alice.address)).to.equal(aliceInitBalance.sub(fee2).sub(fee1).add("10"))
                        expect(await this.pool.unallocatedTokens()).to.equal(fee1.add(fee2).sub("10"))
                      })
                    })

                    describe("Alice harvests second stake", function () {
                      beforeEach(async function () {
                        expect(await this.token.balanceOf(this.alice.address)).to.equal(aliceInitBalance.sub(fee1).sub(fee2))
                        harvest2 = await this.pool.harvest(1)
                      })

                      it("allocatedTokens decreased", async function () {
                        expect(await this.pool.allocatedTokens()).to.equal(totalReward.sub(secondReward))
                      })

                      it("emits event Transfer on harvest", async function () {
                        await expect(harvest2).to.emit(this.token, "Transfer").withArgs(this.pool.address, this.alice.address, secondReward)
                      })
                      it("emits event Harvest with harvesting rewards", async function () {
                        const stakeId = 1
                        const harvestableYield = 310
                        const currentTime = 30 * 24 * 60 * 60

                        await expect(harvest2).to.emit(this.pool, "Harvest").withArgs(this.alice.address, stakeId, harvestableYield, currentTime)
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
                    expect((await this.pool.getStake(this.alice.address, 0)).staked).to.equal(true)
                    expect((await this.pool.getStake(this.alice.address, 0)).stakedAmount).to.equal("10000")
                    expect((await this.pool.getStake(this.alice.address, 0)).startTime).to.equal("0")
                    expect((await this.pool.getStake(this.alice.address, 0)).endTime).to.equal(days.mul("30"))
                    expect((await this.pool.getStake(this.alice.address, 0)).totalYield).to.equal(reward)
                    expect((await this.pool.getStake(this.alice.address, 0)).harvestedYield).to.equal("0")
                    expect((await this.pool.getStake(this.alice.address, 0)).lastHarvestTime).to.equal(
                      (await this.pool.getStake(this.alice.address, 0)).startTime
                    )
                    expect((await this.pool.getStake(this.alice.address, 0)).harvestableYield).to.equal(reward)

                    expect((await this.pool.getStake(this.alice.address, 1)).staked).to.equal(true)
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
                      await expect(unstake1)
                        .to.emit(this.token, "Transfer")
                        .withArgs(this.pool.address, this.alice.address, BigNumber.from(10000))
                    })

                    it("emits event Unstake on unstaking", async function () {
                      const stakeId = 0
                      const depositAmount = 10000
                      const startTime = 0
                      const endTime = 30 * 24 * 60 * 60
                      const earlyStake = false

                      await expect(unstake1)
                        .to.emit(this.pool, "Unstake")
                        .withArgs(this.alice.address, stakeId, depositAmount, startTime, endTime, earlyStake)
                    })

                    it("contract states", async function () {
                      expect(await this.pool.stakedTokens()).to.equal("20000")
                      expect(await this.pool.getStakesLength(this.alice.address)).to.equal("2")

                      expect(await this.token.balanceOf(this.pool.address)).to.equal(BigNumber.from(20000).add(totalReward))
                    })

                    it("her stake is correct", async function () {
                      expect(await this.token.balanceOf(this.alice.address)).to.equal(aliceInitBalance.sub(20000))
                      expect((await this.pool.getStake(this.alice.address, 0)).staked).to.equal(false)
                      expect((await this.pool.getStake(this.alice.address, 0)).endTime).to.equal(days.mul("30"))
                      expect((await this.pool.getStake(this.alice.address, 0)).totalYield).to.equal(reward)
                      expect((await this.pool.getStake(this.alice.address, 0)).harvestedYield).to.equal("0")
                      expect((await this.pool.getStake(this.alice.address, 0)).lastHarvestTime).to.equal(
                        (await this.pool.getStake(this.alice.address, 0)).startTime
                      )
                      expect((await this.pool.getStake(this.alice.address, 0)).harvestableYield).to.equal(reward)
                    })

                    it("can't second time unstake position", async function () {
                      await expect(this.pool.unstake(0)).to.be.revertedWith("Unstaked already")
                    })

                    describe("harvesting on first stake", function () {
                      beforeEach(async function () {
                        harvest1 = await this.pool.harvest(0)
                      })

                      it("allocatedTokens decreased", async function () {
                        expect(await this.pool.allocatedTokens()).to.equal(fee2)
                      })

                      it("emits event Transfer on harvest", async function () {
                        await expect(harvest1).to.emit(this.token, "Transfer").withArgs(this.pool.address, this.alice.address, reward)
                      })

                      it("emits event Harvest with harvesting rewards", async function () {
                        const stakeId = 0
                        const harvestableYield = 155
                        const currentTime = 31 * 24 * 60 * 60

                        await expect(harvest1).to.emit(this.pool, "Harvest").withArgs(this.alice.address, stakeId, harvestableYield, currentTime)
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
                        await expect(unstake2)
                          .to.emit(this.token, "Transfer")
                          .withArgs(this.pool.address, this.alice.address, BigNumber.from(20000))
                      })

                      it("emits event Unstake on unstaking", async function () {
                        const stakeId = 1
                        const depositAmount = 20000
                        const startTime = 0
                        const endTime = 30 * 24 * 60 * 60
                        const earlyStake = false

                        await expect(unstake2)
                          .to.emit(this.pool, "Unstake")
                          .withArgs(this.alice.address, stakeId, depositAmount, startTime, endTime, earlyStake)
                      })

                      it("contract states", async function () {
                        expect(await this.pool.stakedTokens()).to.equal("0")
                        expect(await this.pool.getStakesLength(this.alice.address)).to.equal("2")

                        expect(await this.token.balanceOf(this.pool.address)).to.equal(totalReward)
                      })

                      it("her stake is correct", async function () {
                        expect(await this.token.balanceOf(this.alice.address)).to.equal(aliceInitBalance)
                        expect((await this.pool.getStake(this.alice.address, 1)).staked).to.equal(false)
                        expect((await this.pool.getStake(this.alice.address, 1)).endTime).to.equal(days.mul("30"))
                        expect((await this.pool.getStake(this.alice.address, 1)).totalYield).to.equal(secondReward)
                        expect((await this.pool.getStake(this.alice.address, 1)).harvestedYield).to.equal("0")
                        expect((await this.pool.getStake(this.alice.address, 1)).lastHarvestTime).to.equal(
                          (await this.pool.getStake(this.alice.address, 1)).startTime
                        )
                        expect((await this.pool.getStake(this.alice.address, 1)).harvestableYield).to.equal(secondReward)
                      })

                      it("can't second time unstake position", async function () {
                        await expect(this.pool.unstake(1)).to.be.revertedWith("Unstaked already")
                      })

                      describe("harvesting on first and second stake", function () {
                        beforeEach(async function () {
                          expect(await this.token.balanceOf(this.alice.address)).to.equal(aliceInitBalance)
                          expect(await this.token.balanceOf(this.pool.address)).to.equal(totalReward)
                          harvest1 = await this.pool.harvest(0)
                          harvest2 = await this.pool.harvest(1)
                        })

                        it("allocatedTokens decreased", async function () {
                          expect(await this.pool.allocatedTokens()).to.equal(0)
                        })

                        it("emits Transfers event on harvesting", async function () {
                          await expect(harvest1).to.emit(this.token, "Transfer").withArgs(this.pool.address, this.alice.address, reward)
                          await expect(harvest2).to.emit(this.token, "Transfer").withArgs(this.pool.address, this.alice.address, secondReward)
                        })

                        it("emits event Harvest with harvesting rewards", async function () {
                          const stakeId = 0
                          const harvestableYield = 155
                          const currentTime = 31 * 24 * 60 * 60

                          await expect(harvest1)
                            .to.emit(this.pool, "Harvest")
                            .withArgs(this.alice.address, stakeId, harvestableYield, currentTime)
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
                stake1 = await this.pool.connect(this.bob).stake(345)
              })

              it("emits event Stake", async function () {
                const stakesLength = 1
                const depositAmount = 345
                const startTime = 0
                const endTime = 30 * 24 * 60 * 60

                await expect(stake1).to.emit(this.pool, "Stake").withArgs(this.bob.address, stakesLength, depositAmount, startTime, endTime)
              })

              it("check Bob's stake details", async function () {
                expect(await this.pool.getStakesLength(this.bob.address)).to.equal("1")
                expect((await this.pool.getStake(this.bob.address, 0)).staked).to.equal(true)
                expect((await this.pool.getStake(this.bob.address, 0)).stakedAmount).to.equal("345")
                expect((await this.pool.getStake(this.bob.address, 0)).harvestedYield).to.equal("0")
                expect((await this.pool.getStake(this.bob.address, 0)).totalYield).to.equal(BigNumber.from("345").mul("155").div("10000"))
              })

              describe("after 1 day passed Bob unstakes with fee charged", function () {
                beforeEach(async function () {
                  await this.pool.increaseCurrentTime(days.mul("1"))
                  bobUnstake1 = this.pool.connect(this.bob).unstake(0)
                })

                it("emits events Transfer and changes states", async function () {
                  feeBob = BigNumber.from(345).mul(155).div(10000)

                  await expect(bobUnstake1)
                    .to.emit(this.token, "Transfer")
                    .withArgs(this.pool.address, this.bob.address, BigNumber.from(345).sub(feeBob))

                  expect(await this.token.balanceOf(this.bob.address)).to.equal(BigNumber.from(345).sub(feeBob))
                  expect(await this.pool.unallocatedTokens()).to.equal(feeBob.add(bobReward))
                })

                it("emits event Unstake", async function () {
                  const stakeId = 0
                  const depositAmount = 345
                  const startTime = 0
                  const endTime = 30 * 24 * 60 * 60
                  const earlyStake = true

                  await expect(bobUnstake1)
                    .to.emit(this.pool, "Unstake")
                    .withArgs(this.bob.address, stakeId, depositAmount, startTime, endTime, earlyStake)
                })
              })

              describe("after 30 day passed Bob unstakes with fee charged", function () {
                beforeEach(async function () {
                  await this.pool.increaseCurrentTime(days.mul("30"))
                  bobUnstake30 = this.pool.connect(this.bob).unstake(0)
                })

                it("emits events Transfer and changes states", async function () {
                  await expect(bobUnstake30)
                    .to.emit(this.token, "Transfer")
                    .withArgs(this.pool.address, this.bob.address, BigNumber.from(345).sub(feeBob))

                  expect(await this.token.balanceOf(this.bob.address)).to.equal(BigNumber.from(345).sub(feeBob))
                  expect(await this.pool.unallocatedTokens()).to.equal(feeBob)
                })

                it("emits event Unstake", async function () {
                  const stakeId = 0
                  const depositAmount = 345
                  const startTime = 0
                  const endTime = 30 * 24 * 60 * 60
                  const earlyStake = true

                  await expect(bobUnstake30)
                    .to.emit(this.pool, "Unstake")
                    .withArgs(this.bob.address, stakeId, depositAmount, startTime, endTime, earlyStake)
                })
              })

              describe("after 30 day passed Bob unstakes without fee charged", function () {
                beforeEach(async function () {
                  await this.pool.increaseCurrentTime(days.mul("31"))
                  bobUnstake31 = this.pool.connect(this.bob).unstake(0)
                })

                it("emits events Transfer and changes states", async function () {
                  await expect(bobUnstake31).to.emit(this.token, "Transfer").withArgs(this.pool.address, this.bob.address, BigNumber.from(345))

                  expect(await this.token.balanceOf(this.bob.address)).to.equal(BigNumber.from(345))
                  expect(await this.pool.unallocatedTokens()).to.equal(0)
                })

                it("emits event Unstake", async function () {
                  const stakeId = 0
                  const depositAmount = 345
                  const startTime = 0
                  const endTime = 30 * 24 * 60 * 60
                  const earlyStake = false

                  await expect(bobUnstake31)
                    .to.emit(this.pool, "Unstake")
                    .withArgs(this.bob.address, stakeId, depositAmount, startTime, endTime, earlyStake)
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
        expect(await this.pool.yieldRate()).to.equal("1105")
        expect(await this.pool.earlyUnstakeFee()).to.equal("1105")
        expect(await this.pool.stakedTokens()).to.equal("0")
        expect(await this.pool.getStakesLength(this.alice.address)).to.equal("0")
      })
    })
  })
})
