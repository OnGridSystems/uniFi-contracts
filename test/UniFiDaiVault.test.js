const { expect } = require("chai")
const { BigNumber } = require("ethers")

const days = BigNumber.from("60").mul("60").mul("24")

describe("UniFiStake", function () {
  before(async function () {
    this.signers = await ethers.getSigners()
    this.owner = this.signers[0]
    this.alice = this.signers[1]
    this.bob = this.signers[2]
    this.dan = this.signers[3]
    this.frank = this.signers[4]
    this.holderDepositToken = this.signers[5]

    this.deposit = BigNumber.from("10000")
    this.aliceFirstDeposit = this.deposit.mul("2")
    this.aliceSecondDeposit = this.deposit.mul("4")
    this.bobDeposit = this.deposit.mul("25").div("10")
    this.danDeposit = this.deposit
    this.frankDeposit = this.deposit.mul("5").div("10")

    this.aliceFee1 = this.aliceFirstDeposit.mul("50").div("10000")
    this.aliceFee2 = this.aliceSecondDeposit.mul("50").div("10000")
    this.bobFee = this.bobDeposit.mul("50").div("10000")
    this.danFee = this.danDeposit.mul("50").div("10000")
    this.frankFee = this.frankDeposit.mul("50").div("10000")

    this.tokenFactory = await ethers.getContractFactory("UniFi")
    this.poolFactory = await ethers.getContractFactory("UniFiDaiVaultMock")
  })

  describe("Pool and tokens deployed", function () {
    beforeEach(async function () {
      this.depositToken = await this.tokenFactory.deploy("UniFi", "UniFi", this.owner.address)
      this.rewardToken = await this.tokenFactory.deploy("DAO2", "DAO2", this.owner.address)
      this.pool = await this.poolFactory.deploy(this.depositToken.address, this.rewardToken.address)
    })

    it("should be deployed", async function () {
      expect(await this.depositToken.deployed(), true)
      expect(await this.rewardToken.deployed(), true)
      expect(await this.pool.deployed(), true)
    })

    it("should have correct state variables", async function () {
      expect(await this.pool.owner()).to.equal(this.owner.address)
      expect(await this.pool.trustedDepositTokenAddress()).to.equal(this.depositToken.address)
      expect(await this.pool.trustedRewardTokenAddress()).to.equal(this.rewardToken.address)
      expect(await this.pool.LOCKUP_TIME()).to.equal(days.mul("120"))
      expect(await this.pool.STAKING_FEE_RATE_X_100()).to.equal("50")
      expect(await this.pool.UNSTAKING_FEE_RATE_X_100()).to.equal("50")
      expect(await this.pool.disburseAmount()).to.equal(BigNumber.from("8100000000000000000000"))
      expect(await this.pool.disburseDuration()).to.equal(days.mul("180"))
      expect(await this.pool.adminCanClaimAfter()).to.equal(days.mul("200"))
      expect(await this.pool.disbursePercentX100()).to.equal("10000")
      block = await network.provider.send("eth_getBlockByNumber", ["latest", false])
      expect(await this.pool.contractDeployTime()).to.equal(block.timestamp)
      expect(await this.pool.adminClaimableTime()).to.equal(days.mul("200").add(block.timestamp))
      expect(await this.pool.lastDisburseTime()).to.equal(await this.pool.contractDeployTime())
      expect(await this.pool.totalClaimedRewards()).to.equal("0")
      expect(await this.pool.totalTokensDisbursed()).to.equal("0")
      expect(await this.pool.contractBalance()).to.equal("0")
      expect(await this.pool.totalDivPoints()).to.equal("0")
      expect(await this.pool.totalTokens()).to.equal("0")
      expect(await this.pool.getNumberOfHolders()).to.equal("0")
      await expect(this.pool.getHoldersList(0, 1)).to.be.reverted
    })

    it("impossible to deposit zero tokens", async function () {
      await expect(this.pool.deposit(0)).to.be.revertedWith("Cannot deposit 0 Tokens")
    })

    it("impossible to deposit more than available balance", async function () {
      await expect(this.pool.connect(this.alice).deposit(1)).to.be.revertedWith("ERC20: transfer amount exceeds balance")
    })

    describe("Owner added reward token on the contract", async function () {
      beforeEach(async function () {
        await this.rewardToken.approve(this.pool.address, "5400000000000000000000")
        await this.pool.addContractBalance("5400000000000000000000")
      })

      it("only owner can transact addContractBalance(..)", async function () {
        await expect(this.pool.connect(this.alice).addContractBalance(100)).to.be.revertedWith("Ownable: caller is not the owner")
      })

      it("contractBalance increased", async function () {
        const balance = await this.rewardToken.balanceOf(this.pool.address)
        const contractBalance = await this.pool.contractBalance()
        expect(balance).to.equal("5400000000000000000000")
        expect(contractBalance).to.equal("5400000000000000000000")
      })

      it("transferAnyERC20Token reverts if called not by owner", async function () {
        await expect(this.pool.connect(this.alice).transferAnyERC20Token(this.depositToken.address, this.owner.address, 100)).to.be.revertedWith(
          "Ownable: caller is not the owner"
        )
      })

      it("transferAnyOldERC20Token reverts if called not by owner", async function () {
        await expect(
          this.pool.connect(this.alice).transferAnyOldERC20Token(this.depositToken.address, this.owner.address, 100)
        ).to.be.revertedWith("Ownable: caller is not the owner")
      })

      it("owner can't withdraw deposit token using transferAnyERC20Token()", async function () {
        await expect(this.pool.connect(this.owner).transferAnyERC20Token(this.depositToken.address, this.owner.address, 100)).to.be.revertedWith(
          "Admin cannot transfer out deposit tokens from this vault!"
        )
      })

      it("owner can't withdraw deposit token using transferAnyOldERC20Token()", async function () {
        await expect(
          this.pool.connect(this.owner).transferAnyOldERC20Token(this.depositToken.address, this.owner.address, 100)
        ).to.be.revertedWith("Admin cannot transfer out deposit tokens from this vault!")
      })

      it("can't transfer reward tokens(transferAnyERC20Token)", async function () {
        await expect(this.pool.transferAnyERC20Token(this.rewardToken.address, this.owner.address, 1000)).to.revertedWith(
          "Admin cannot Transfer out Reward Tokens Yet!"
        )
      })

      it("can't transfer reward tokens(transferAnyOldERC20Token)", async function () {
        await expect(this.pool.transferAnyOldERC20Token(this.rewardToken.address, this.owner.address, 1000)).to.revertedWith(
          "Admin cannot Transfer out Reward Tokens Yet!"
        )
      })

      describe("User puts other erc20 tokens on the contract", function () {
        beforeEach(async function () {
          this.otherToken = await this.tokenFactory.deploy("UniFi", "UniFi", this.owner.address)
          await this.otherToken.transfer(this.pool.address, "100")
        })

        it("owner can withdraw other ERC20 token using transferAnyERC20Token()", async function () {
          await this.pool.connect(this.owner).transferAnyERC20Token(this.otherToken.address, this.bob.address, "100")
          const rewardBalance = await this.otherToken.balanceOf(this.bob.address)
          expect(rewardBalance).to.equal("100")
        })

        it("owner can withdraw other old ERC20 token using transferAnyOldERC20Token()", async function () {
          await this.pool.connect(this.owner).transferAnyOldERC20Token(this.otherToken.address, this.bob.address, "100")
          const rewardBalance = await this.otherToken.balanceOf(this.bob.address)
          expect(rewardBalance).to.equal("100")
        })

        it("owner can't withdraw more than a balance(transferAnyERC20Token)", async function () {
          await expect(
            this.pool.connect(this.owner).transferAnyERC20Token(this.otherToken.address, this.bob.address, "1000")
          ).to.be.revertedWith("ERC20: transfer amount exceeds balance")
        })

        it("owner can't withdraw more than a balance(transferAnyOldERC20Token)", async function () {
          await expect(
            this.pool.connect(this.owner).transferAnyOldERC20Token(this.otherToken.address, this.bob.address, "1000")
          ).to.be.revertedWith("ERC20: transfer amount exceeds balance")
        })
      })

      describe("After first Alice's deposit", function () {
        beforeEach(async function () {
          ownerBalance = await this.depositToken.balanceOf(this.owner.address)
          await this.depositToken.transfer(this.holderDepositToken.address, ownerBalance) // for easier comparison of the commission received by the owner

          await this.depositToken
            .connect(this.holderDepositToken)
            .transfer(this.alice.address, this.aliceFirstDeposit.add(this.aliceSecondDeposit))
          await this.depositToken.connect(this.alice).approve(this.pool.address, this.aliceFirstDeposit)
          await this.pool.connect(this.alice).deposit(this.aliceFirstDeposit)
          expectedBalance = this.aliceFirstDeposit.sub(this.aliceFee1)
        })

        it("getNumberOfHolders() increased", async function () {
          getNumberOfHolders = await this.pool.getNumberOfHolders()
          expect(1).to.equal(getNumberOfHolders)
        })

        it("new holder and his deposit appeared in getHoldersList(...)", async function () {
          const len = 1
          const expectedDeposit = this.aliceFirstDeposit.sub(this.aliceFee1)

          getHoldersList = await this.pool.getHoldersList(0, len)
          block = await network.provider.send("eth_getBlockByNumber", ["latest", false])

          stakers = getHoldersList["stakers"]
          stakingTimestamps = getHoldersList["stakingTimestamps"]
          lastClaimedTimeStamps = getHoldersList["lastClaimedTimeStamps"]
          stakedTokens = getHoldersList["stakedTokens"]

          expect(stakers.length).to.equal(len)
          expect(stakingTimestamps.length).to.equal(len)
          expect(lastClaimedTimeStamps.length).to.equal(len)
          expect(stakedTokens.length).to.equal(len)

          expect(stakers[0]).to.equal(this.alice.address)
          expect(stakingTimestamps[0]).to.equal(block.timestamp)
          expect(lastClaimedTimeStamps[0]).to.equal(block.timestamp)
          expect(stakedTokens[0]).to.equal(expectedDeposit)
        })

        it("unable to make deposit without approval", async function () {
          await expect(this.pool.connect(this.alice).deposit(this.aliceSecondDeposit)).to.be.revertedWith(
            "ERC20: transfer amount exceeds allowance"
          )
        })

        it("balance of depositToken increased", async function () {
          const contractBalance = await this.depositToken.balanceOf(this.pool.address)
          expect(contractBalance).to.equal(expectedBalance)
        })

        it("totalTokens increased", async function () {
          const contractBalance = await this.pool.totalTokens()
          expect(contractBalance).to.equal(expectedBalance)
        })

        it("check Alice's deposit", async function () {
          const deposit = await this.pool.depositedTokens(this.alice.address)
          const depositTime = await this.pool.depositTime(this.alice.address)
          const block = await network.provider.send("eth_getBlockByNumber", ["latest", false])
          const expectedDeposit = this.aliceFirstDeposit.sub(this.aliceFee1)

          expect(block.timestamp).to.equal(depositTime._hex)
          expect(deposit).to.equal(expectedDeposit)
        })

        it("owner receives fee for the deposit", async function () {
          const ownerBalance = await this.depositToken.balanceOf(this.owner.address)
          const balance = this.aliceFee1
          expect(ownerBalance).to.equal(balance)
        })

        it("unable to emergencyWithdraw(...)", async function () {
          await expect(this.pool.connect(this.alice).emergencyWithdraw(this.aliceFirstDeposit)).to.be.revertedWith(
            "You recently staked, please wait before withdrawing."
          )
        })

        it("unable to withdraw", async function () {
          await expect(this.pool.connect(this.alice).withdraw(this.aliceFirstDeposit)).to.be.revertedWith(
            "You recently staked, please wait before withdrawing."
          )
        })

        it("getEstimatedPendingDivs increased", async function () {
          await this.pool.connect(this.signers[10]).claim() // an insignificant operation, moves to the next block in which the parameters are changed
          this.aliceEstimatedPendingDivs = await this.pool.getEstimatedPendingDivs(this.alice.address)
          expect(this.aliceEstimatedPendingDivs).to.be.above(0)
        })

        describe("After Alice claim()ed her deposit back", function () {
          beforeEach(async function () {
            totalEarnedTokensBeforeClaim = await this.pool.totalEarnedTokens(this.frank.address)
            await this.pool.connect(this.alice).claim()
          })

          it("claim() resets getEstimatedPendingDivs", async function () {
            await this.pool.connect(this.alice).claim()
            expect(await this.pool.getEstimatedPendingDivs(this.alice.address)).to.equal(0)

            await this.pool.connect(this.bob).claim()
            expect(await this.pool.getEstimatedPendingDivs(this.bob.address)).to.equal(0)

            await this.pool.connect(this.dan).claim()
            expect(await this.pool.getEstimatedPendingDivs(this.dan.address)).to.equal(0)

            await this.pool.connect(this.frank).claim()
            expect(await this.pool.getEstimatedPendingDivs(this.frank.address)).to.equal(0)
          })

          it("reward is accrued", async function () {
            const aliceRewardBalance = await this.rewardToken.balanceOf(this.alice.address)
            expect(aliceRewardBalance).to.be.above(0)
          })

          it("totalEarnedTokens increased", async function () {
            expect(0).to.equal(totalEarnedTokensBeforeClaim)
            const aliceRewardBalance = await this.rewardToken.balanceOf(this.alice.address)
            const aliceTotalAfterClaim = await this.pool.totalEarnedTokens(this.alice.address)
            expect(aliceRewardBalance).to.be.above(0)
            expect(aliceTotalAfterClaim).to.be.above(0)
          })

          it("lastClaimedTime increased", async function () {
            const aliceLastClaimedTime = await this.pool.lastClaimedTime(this.alice.address)
            const block = await network.provider.send("eth_getBlockByNumber", ["latest", false])
            expect(BigNumber.from(aliceLastClaimedTime)._hex).to.equal(block.timestamp)
          })
        })

        describe("After Bob deposited", function () {
          beforeEach(async function () {
            await this.depositToken.connect(this.holderDepositToken).transfer(this.bob.address, this.bobDeposit)
            await this.depositToken.connect(this.bob).approve(this.pool.address, this.bobDeposit)
            await this.pool.connect(this.bob).deposit(this.bobDeposit)
            expectedBalance = this.aliceFirstDeposit.add(this.bobDeposit).sub(this.aliceFee1).sub(this.bobFee)
          })

          it("getNumberOfHolders increased", async function () {
            getNumberOfHolders = await this.pool.getNumberOfHolders()
            expect(2).to.equal(getNumberOfHolders)
          })

          it("new holder appeared in getHoldersList()", async function () {
            const len = 2
            const expectedDeposit = this.bobDeposit.sub(this.bobFee)

            getHoldersList = await this.pool.getHoldersList(0, len)
            block = await network.provider.send("eth_getBlockByNumber", ["latest", false])

            stakers = getHoldersList["stakers"]
            stakingTimestamps = getHoldersList["stakingTimestamps"]
            lastClaimedTimeStamps = getHoldersList["lastClaimedTimeStamps"]
            stakedTokens = getHoldersList["stakedTokens"]

            expect(stakers.length).to.equal(len)
            expect(stakingTimestamps.length).to.equal(len)
            expect(lastClaimedTimeStamps.length).to.equal(len)
            expect(stakedTokens.length).to.equal(len)

            expect(stakers[len - 1]).to.equal(this.bob.address)
            expect(stakingTimestamps[len - 1]).to.equal(block.timestamp)
            expect(lastClaimedTimeStamps[len - 1]).to.equal(block.timestamp)
            expect(stakedTokens[len - 1]).to.equal(expectedDeposit)
          })

          it("balance of depositToken increased", async function () {
            const contractBalance = await this.depositToken.balanceOf(this.pool.address)
            expect(contractBalance).to.equal(expectedBalance)
          })

          it("totalTokens increased", async function () {
            const contractBalance = await this.pool.totalTokens()
            expect(contractBalance).to.equal(expectedBalance)
          })

          it("check Bob's deposit time and amount", async function () {
            const deposit = await this.pool.depositedTokens(this.bob.address)
            const depositTime = await this.pool.depositTime(this.bob.address)
            const block = await network.provider.send("eth_getBlockByNumber", ["latest", false])
            const expectedDeposit = this.bobDeposit.sub(this.bobFee)

            expect(block.timestamp).to.equal(depositTime._hex)
            expect(deposit).to.equal(expectedDeposit)
          })

          it("owner received fee for the deposit", async function () {
            const ownerBalance = await this.depositToken.balanceOf(this.owner.address)
            const balance = this.aliceFee1.add(this.bobFee)
            expect(ownerBalance).to.equal(balance)
          })

          it("unable to emergencyWithdraw()", async function () {
            await expect(this.pool.connect(this.bob).emergencyWithdraw(this.bobDeposit)).to.be.revertedWith(
              "You recently staked, please wait before withdrawing."
            )
          })

          it("unable to withdraw()", async function () {
            await expect(this.pool.connect(this.bob).withdraw(this.bobDeposit)).to.be.revertedWith(
              "You recently staked, please wait before withdrawing."
            )
          })

          it("getEstimatedPendingDivs increased", async function () {
            await this.pool.connect(this.signers[10]).claim() // an insignificant operation, moves to the next block in which the parameters are changed
            expect(await this.pool.getEstimatedPendingDivs(this.alice.address)).to.be.above(this.aliceEstimatedPendingDivs)
            expect(await this.pool.getEstimatedPendingDivs(this.bob.address)).to.be.above(0)

            this.aliceEstimatedPendingDivs = await this.pool.getEstimatedPendingDivs(this.alice.address)
            this.bobEstimatedPendingDivs = await this.pool.getEstimatedPendingDivs(this.bob.address)
          })

          describe("Alice and Bob claimed their tokens", function () {
            beforeEach(async function () {
              totalEarnedTokensBeforeClaim = await this.pool.totalEarnedTokens(this.frank.address)
              await this.pool.connect(this.alice).claim()
              block1 = await network.provider.send("eth_getBlockByNumber", ["latest", false])
              await this.pool.connect(this.bob).claim()
              block2 = await network.provider.send("eth_getBlockByNumber", ["latest", false])
            })

            it("getEstimatedPendingDivs were reset to 0", async function () {
              await this.pool.connect(this.alice).claim()
              expect(await this.pool.getEstimatedPendingDivs(this.alice.address)).to.equal(0)

              await this.pool.connect(this.bob).claim()
              expect(await this.pool.getEstimatedPendingDivs(this.bob.address)).to.equal(0)

              await this.pool.connect(this.dan).claim()
              expect(await this.pool.getEstimatedPendingDivs(this.dan.address)).to.equal(0)

              await this.pool.connect(this.frank).claim()
              expect(await this.pool.getEstimatedPendingDivs(this.frank.address)).to.equal(0)
            })

            it("reward is accrued", async function () {
              const aliceRewardBalance = await this.rewardToken.balanceOf(this.alice.address)
              expect(aliceRewardBalance).to.be.above(0)
              const bobRewardBalance = await this.rewardToken.balanceOf(this.bob.address)
              expect(bobRewardBalance).to.be.above(0)
            })

            it("totalEarnedTokens increased", async function () {
              expect(0).to.equal(totalEarnedTokensBeforeClaim)
              const aliceRewardBalance = await this.rewardToken.balanceOf(this.alice.address)
              const aliceTotalAfterClaim = await this.pool.totalEarnedTokens(this.alice.address)
              expect(aliceRewardBalance).to.be.above(0)
              expect(aliceTotalAfterClaim).to.be.above(0)
              const bobRewardBalance = await this.rewardToken.balanceOf(this.bob.address)
              const bobTotalAfterClaim = await this.pool.totalEarnedTokens(this.bob.address)
              expect(bobRewardBalance).to.be.above(0)
              expect(bobTotalAfterClaim).to.be.above(0)
            })

            it("lastClaimedTime updated", async function () {
              const aliceLastClaimedTime = await this.pool.lastClaimedTime(this.alice.address)
              const bobLastClaimedTime = await this.pool.lastClaimedTime(this.bob.address)

              expect(BigNumber.from(aliceLastClaimedTime)._hex).to.equal(block1.timestamp)
              expect(BigNumber.from(bobLastClaimedTime)._hex).to.equal(block2.timestamp)
            })
          })
          describe("After Dan deposited", function () {
            beforeEach(async function () {
              //LOCKUP_TIME = await this.pool.LOCKUP_TIME()
              //await network.provider.send("evm_increaseTime", [parseInt(LOCKUP_TIME)/2 + 1])
              await this.depositToken.connect(this.holderDepositToken).transfer(this.dan.address, this.danDeposit)
              await this.depositToken.connect(this.dan).approve(this.pool.address, this.danDeposit)
              await this.pool.connect(this.dan).deposit(this.danDeposit)
              expectedBalance = this.aliceFirstDeposit
                .add(this.bobDeposit)
                .add(this.danDeposit)
                .sub(this.aliceFee1)
                .sub(this.bobFee)
                .sub(this.danFee)
            })

            it("getNumberOfHolders increased", async function () {
              getNumberOfHolders = await this.pool.getNumberOfHolders()
              expect(3).to.equal(getNumberOfHolders)
            })

            it("Dan appeared in getHoldersList()", async function () {
              const len = 3
              const expectedDeposit = this.danDeposit.sub(this.danFee)

              getHoldersList = await this.pool.getHoldersList(0, len)
              block = await network.provider.send("eth_getBlockByNumber", ["latest", false])

              stakers = getHoldersList["stakers"]
              stakingTimestamps = getHoldersList["stakingTimestamps"]
              lastClaimedTimeStamps = getHoldersList["lastClaimedTimeStamps"]
              stakedTokens = getHoldersList["stakedTokens"]

              expect(stakers.length).to.equal(len)
              expect(stakingTimestamps.length).to.equal(len)
              expect(lastClaimedTimeStamps.length).to.equal(len)
              expect(stakedTokens.length).to.equal(len)

              expect(stakers[len - 1]).to.equal(this.dan.address)
              expect(stakingTimestamps[len - 1]).to.equal(block.timestamp)
              expect(lastClaimedTimeStamps[len - 1]).to.equal(block.timestamp)
              expect(stakedTokens[len - 1]).to.equal(expectedDeposit)
            })

            it("the balance of depositToken increased", async function () {
              const contractBalance = await this.depositToken.balanceOf(this.pool.address)
              expect(contractBalance).to.equal(expectedBalance)
            })

            it("totalTokens increased", async function () {
              const contractBalance = await this.pool.totalTokens()
              expect(contractBalance).to.equal(expectedBalance)
            })

            it("check Dan's deposit value and time", async function () {
              const deposit = await this.pool.depositedTokens(this.dan.address)
              const depositTime = await this.pool.depositTime(this.dan.address)
              const block = await network.provider.send("eth_getBlockByNumber", ["latest", false])
              const expectedDeposit = this.danDeposit.sub(this.danFee)

              expect(block.timestamp).to.equal(depositTime._hex)
              expect(deposit).to.equal(expectedDeposit)
            })

            it("owner received his fee", async function () {
              const ownerBalance = await this.depositToken.balanceOf(this.owner.address)
              const balance = this.aliceFee1.add(this.bobFee).add(this.danFee)
              expect(ownerBalance).to.equal(balance)
            })

            it("emergencyWithdraw impossible", async function () {
              await expect(this.pool.connect(this.dan).emergencyWithdraw(this.danDeposit)).to.be.revertedWith(
                "You recently staked, please wait before withdrawing."
              )
            })

            it("withdraw impossible", async function () {
              await expect(this.pool.connect(this.dan).withdraw(this.danDeposit)).to.be.revertedWith(
                "You recently staked, please wait before withdrawing."
              )
            })

            it("getEstimatedPendingDivs increased", async function () {
              await this.pool.connect(this.signers[10]).claim() // an insignificant operation, moves to the next block in which the parameters are changed
              expect(await this.pool.getEstimatedPendingDivs(this.alice.address)).to.be.above(this.aliceEstimatedPendingDivs)
              expect(await this.pool.getEstimatedPendingDivs(this.bob.address)).to.be.above(this.bobEstimatedPendingDivs)
              expect(await this.pool.getEstimatedPendingDivs(this.dan.address)).to.be.above(0)

              this.aliceEstimatedPendingDivs = await this.pool.getEstimatedPendingDivs(this.alice.address)
              this.bobEstimatedPendingDivs = await this.pool.getEstimatedPendingDivs(this.bob.address)
              this.danEstimatedPendingDivs = await this.pool.getEstimatedPendingDivs(this.dan.address)
            })

            describe("after Alice, Bob and Dan claimed", function () {
              beforeEach(async function () {
                totalEarnedTokensBeforeClaim = await this.pool.totalEarnedTokens(this.frank.address)
                await this.pool.connect(this.alice).claim()
                block1 = await network.provider.send("eth_getBlockByNumber", ["latest", false])
                await this.pool.connect(this.bob).claim()
                block2 = await network.provider.send("eth_getBlockByNumber", ["latest", false])
                await this.pool.connect(this.dan).claim()
                block3 = await network.provider.send("eth_getBlockByNumber", ["latest", false])
              })

              it("getEstimatedPendingDivs were reset to 0", async function () {
                await this.pool.connect(this.alice).claim()
                expect(await this.pool.getEstimatedPendingDivs(this.alice.address)).to.equal(0)

                await this.pool.connect(this.bob).claim()
                expect(await this.pool.getEstimatedPendingDivs(this.bob.address)).to.equal(0)

                await this.pool.connect(this.dan).claim()
                expect(await this.pool.getEstimatedPendingDivs(this.dan.address)).to.equal(0)

                await this.pool.connect(this.frank).claim()
                expect(await this.pool.getEstimatedPendingDivs(this.frank.address)).to.equal(0)
              })

              it("reward is accrued", async function () {
                const aliceRewardBalance = await this.rewardToken.balanceOf(this.alice.address)
                expect(aliceRewardBalance).to.be.above(0)
                const bobRewardBalance = await this.rewardToken.balanceOf(this.bob.address)
                expect(bobRewardBalance).to.be.above(0)
                const danRewardBalance = await this.rewardToken.balanceOf(this.dan.address)
                expect(danRewardBalance).to.be.above(0)
              })

              it("totalEarnedTokens increased", async function () {
                expect(0).to.equal(totalEarnedTokensBeforeClaim)
                const aliceRewardBalance = await this.rewardToken.balanceOf(this.alice.address)
                const aliceTotalAfterClaim = await this.pool.totalEarnedTokens(this.alice.address)
                expect(aliceRewardBalance).to.be.above(0)
                expect(aliceTotalAfterClaim).to.be.above(0)
                const bobRewardBalance = await this.rewardToken.balanceOf(this.bob.address)
                const bobTotalAfterClaim = await this.pool.totalEarnedTokens(this.bob.address)
                expect(bobRewardBalance).to.be.above(0)
                expect(bobTotalAfterClaim).to.be.above(0)
                const danRewardBalance = await this.rewardToken.balanceOf(this.dan.address)
                const danTotalAfterClaim = await this.pool.totalEarnedTokens(this.dan.address)
                expect(danRewardBalance).to.be.above(0)
                expect(danTotalAfterClaim).to.be.above(0)
              })

              it("lastClaimedTime increased", async function () {
                const aliceLastClaimedTime = await this.pool.lastClaimedTime(this.alice.address)
                const bobLastClaimedTime = await this.pool.lastClaimedTime(this.bob.address)
                const danLastClaimedTime = await this.pool.lastClaimedTime(this.dan.address)

                expect(BigNumber.from(aliceLastClaimedTime)._hex).to.equal(block1.timestamp)
                expect(BigNumber.from(bobLastClaimedTime)._hex).to.equal(block2.timestamp)
                expect(BigNumber.from(danLastClaimedTime)._hex).to.equal(block3.timestamp)
              })
            })

            describe("After Frank deposited", function () {
              beforeEach(async function () {
                this.frank = this.signers[4]
                await this.depositToken.connect(this.holderDepositToken).transfer(this.frank.address, this.frankDeposit)
                await this.depositToken.connect(this.frank).approve(this.pool.address, this.frankDeposit)
                await this.pool.connect(this.frank).deposit(this.frankDeposit)
                expectedBalance = this.aliceFirstDeposit
                  .add(this.bobDeposit)
                  .add(this.danDeposit)
                  .add(this.frankDeposit)
                  .sub(this.aliceFee1)
                  .sub(this.bobFee)
                  .sub(this.danFee)
                  .sub(this.frankFee)
              })

              it("getNumberOfHolders inccreased", async function () {
                getNumberOfHolders = await this.pool.getNumberOfHolders()
                expect(4).to.equal(getNumberOfHolders)
              })

              it("Frank's deposit appeared in getHoldersList()", async function () {
                const len = 4
                const expectedDeposit = this.frankDeposit.sub(this.frankFee)
                getHoldersList = await this.pool.getHoldersList(0, len)
                block = await network.provider.send("eth_getBlockByNumber", ["latest", false])

                stakers = getHoldersList["stakers"]
                stakingTimestamps = getHoldersList["stakingTimestamps"]
                lastClaimedTimeStamps = getHoldersList["lastClaimedTimeStamps"]
                stakedTokens = getHoldersList["stakedTokens"]

                expect(stakers.length).to.equal(len)
                expect(stakingTimestamps.length).to.equal(len)
                expect(lastClaimedTimeStamps.length).to.equal(len)
                expect(stakedTokens.length).to.equal(len)

                expect(stakers[len - 1]).to.equal(this.frank.address)
                expect(stakingTimestamps[len - 1]).to.equal(block.timestamp)
                expect(lastClaimedTimeStamps[len - 1]).to.equal(block.timestamp)
                expect(stakedTokens[len - 1]).to.equal(expectedDeposit)
              })

              it("depositToken balance increased", async function () {
                const contractBalance = await this.depositToken.balanceOf(this.pool.address)
                expect(contractBalance).to.equal(expectedBalance)
              })

              it("totalTokens increased", async function () {
                const contractBalance = await this.pool.totalTokens()
                expect(contractBalance).to.equal(expectedBalance)
              })

              it("check Frank's deposit value and time", async function () {
                const deposit = await this.pool.depositedTokens(this.frank.address)
                const depositTime = await this.pool.depositTime(this.frank.address)
                const block = await network.provider.send("eth_getBlockByNumber", ["latest", false])
                const expectedDeposit = this.frankDeposit.sub(this.frankFee)

                expect(block.timestamp).to.equal(depositTime._hex)
                expect(deposit).to.equal(expectedDeposit)
              })

              it("owner received fee for the deposit", async function () {
                const ownerBalance = await this.depositToken.balanceOf(this.owner.address)
                const balance = this.aliceFee1.add(this.bobFee).add(this.danFee).add(this.frankFee)
                expect(ownerBalance).to.equal(balance)
              })

              it("emergencyWithdraw impossible", async function () {
                await expect(this.pool.connect(this.frank).emergencyWithdraw(this.frankDeposit)).to.be.revertedWith(
                  "You recently staked, please wait before withdrawing."
                )
              })

              it("withdraw impossible", async function () {
                await expect(this.pool.connect(this.frank).withdraw(this.frankDeposit)).to.be.revertedWith(
                  "You recently staked, please wait before withdrawing."
                )
              })

              it("getEstimatedPendingDivs increased", async function () {
                await this.pool.connect(this.signers[10]).claim() // an insignificant operation, moves to the next block in which the parameters are changed
                expect(await this.pool.getEstimatedPendingDivs(this.alice.address)).to.be.above(this.aliceEstimatedPendingDivs)
                expect(await this.pool.getEstimatedPendingDivs(this.bob.address)).to.be.above(this.bobEstimatedPendingDivs)
                expect(await this.pool.getEstimatedPendingDivs(this.dan.address)).to.be.above(this.danEstimatedPendingDivs)
                expect(await this.pool.getEstimatedPendingDivs(this.frank.address)).to.be.above(0)

                this.aliceEstimatedPendingDivs = await this.pool.getEstimatedPendingDivs(this.alice.address)
                this.bobEstimatedPendingDivs = await this.pool.getEstimatedPendingDivs(this.bob.address)
                this.danEstimatedPendingDivs = await this.pool.getEstimatedPendingDivs(this.dan.address)
                this.frankEstimatedPendingDivs = await this.pool.getEstimatedPendingDivs(this.frank.address)
              })

              describe("After all guys claimed", function () {
                beforeEach(async function () {
                  totalEarnedTokensBeforeClaim = await this.pool.totalEarnedTokens(this.frank.address)
                  await this.pool.connect(this.alice).claim()
                  block1 = await network.provider.send("eth_getBlockByNumber", ["latest", false])
                  await this.pool.connect(this.bob).claim()
                  block2 = await network.provider.send("eth_getBlockByNumber", ["latest", false])
                  await this.pool.connect(this.dan).claim()
                  block3 = await network.provider.send("eth_getBlockByNumber", ["latest", false])
                  await this.pool.connect(this.frank).claim()
                  block4 = await network.provider.send("eth_getBlockByNumber", ["latest", false])
                })

                it("resetting getEstimatedPendingDivs", async function () {
                  await this.pool.connect(this.alice).claim()
                  expect(await this.pool.getEstimatedPendingDivs(this.alice.address)).to.equal(0)

                  await this.pool.connect(this.bob).claim()
                  expect(await this.pool.getEstimatedPendingDivs(this.bob.address)).to.equal(0)

                  await this.pool.connect(this.dan).claim()
                  expect(await this.pool.getEstimatedPendingDivs(this.dan.address)).to.equal(0)

                  await this.pool.connect(this.frank).claim()
                  expect(await this.pool.getEstimatedPendingDivs(this.frank.address)).to.equal(0)
                })

                it("reward is accrued", async function () {
                  const aliceRewardBalance = await this.rewardToken.balanceOf(this.alice.address)
                  expect(aliceRewardBalance).to.be.above(0)
                  const bobRewardBalance = await this.rewardToken.balanceOf(this.bob.address)
                  expect(bobRewardBalance).to.be.above(0)
                  const danRewardBalance = await this.rewardToken.balanceOf(this.dan.address)
                  expect(danRewardBalance).to.be.above(0)
                  const frankRewardBalance = await this.rewardToken.balanceOf(this.frank.address)
                  expect(frankRewardBalance).to.be.above(0)
                })

                it("totalEarnedTokens increased", async function () {
                  expect(0).to.equal(totalEarnedTokensBeforeClaim)
                  const aliceRewardBalance = await this.rewardToken.balanceOf(this.alice.address)
                  const aliceTotalAfterClaim = await this.pool.totalEarnedTokens(this.alice.address)
                  expect(aliceRewardBalance).to.be.above(0)
                  expect(aliceTotalAfterClaim).to.be.above(0)
                  const bobRewardBalance = await this.rewardToken.balanceOf(this.bob.address)
                  const bobTotalAfterClaim = await this.pool.totalEarnedTokens(this.bob.address)
                  expect(bobRewardBalance).to.be.above(0)
                  expect(bobTotalAfterClaim).to.be.above(0)
                  const danRewardBalance = await this.rewardToken.balanceOf(this.dan.address)
                  const danTotalAfterClaim = await this.pool.totalEarnedTokens(this.dan.address)
                  expect(danRewardBalance).to.be.above(0)
                  expect(danTotalAfterClaim).to.be.above(0)
                  const frankRewardBalance = await this.rewardToken.balanceOf(this.frank.address)
                  const frankTotalAfterClaim = await this.pool.totalEarnedTokens(this.frank.address)
                  expect(frankRewardBalance).to.be.above(0)
                  expect(frankTotalAfterClaim).to.be.above(0)
                })

                it("lastClaimedTime increased", async function () {
                  const aliceLastClaimedTime = await this.pool.lastClaimedTime(this.alice.address)
                  const bobLastClaimedTime = await this.pool.lastClaimedTime(this.bob.address)
                  const danLastClaimedTime = await this.pool.lastClaimedTime(this.dan.address)
                  const frankLastClaimedTime = await this.pool.lastClaimedTime(this.frank.address)

                  expect(BigNumber.from(aliceLastClaimedTime)._hex).to.equal(block1.timestamp)
                  expect(BigNumber.from(bobLastClaimedTime)._hex).to.equal(block2.timestamp)
                  expect(BigNumber.from(danLastClaimedTime)._hex).to.equal(block3.timestamp)
                  expect(BigNumber.from(frankLastClaimedTime)._hex).to.equal(block4.timestamp)
                })
              })

              describe("After second Alice's deposit", function () {
                beforeEach(async function () {
                  //LOCKUP_TIME = await this.pool.LOCKUP_TIME()
                  //await network.provider.send("evm_increaseTime", [parseInt(LOCKUP_TIME) / 4 + 1])
                  await this.depositToken.connect(this.alice).approve(this.pool.address, this.aliceSecondDeposit)
                  //console.log((await this.pool.getEstimatedPendingDivs(this.alice.address)).toString()) =450
                  await this.pool.connect(this.alice).deposit(this.aliceSecondDeposit)
                  //console.log((await this.pool.getEstimatedPendingDivs(this.alice.address)).toString()) =0
                  expectedBalance = this.aliceFirstDeposit
                    .add(this.aliceSecondDeposit)
                    .add(this.bobDeposit)
                    .add(this.danDeposit)
                    .add(this.frankDeposit)
                    .sub(this.aliceFee1)
                    .sub(this.aliceFee2)
                    .sub(this.bobFee)
                    .sub(this.danFee)
                    .sub(this.frankFee)
                })

                it("getNumberOfHolders is not changed ", async function () {
                  getNumberOfHolders = await this.pool.getNumberOfHolders()
                  expect(4).to.equal(getNumberOfHolders)
                })

                it("Alice's record in getHoldersList() updated", async function () {
                  const len = 4
                  const expectedDeposit = this.aliceFirstDeposit.add(this.aliceSecondDeposit).sub(this.aliceFee1).sub(this.aliceFee2)

                  getHoldersList = await this.pool.getHoldersList(0, len)
                  block = await network.provider.send("eth_getBlockByNumber", ["latest", false])

                  stakers = getHoldersList["stakers"]
                  stakingTimestamps = getHoldersList["stakingTimestamps"]
                  lastClaimedTimeStamps = getHoldersList["lastClaimedTimeStamps"]
                  stakedTokens = getHoldersList["stakedTokens"]

                  expect(stakers.length).to.equal(len)
                  expect(stakingTimestamps.length).to.equal(len)
                  expect(lastClaimedTimeStamps.length).to.equal(len)
                  expect(stakedTokens.length).to.equal(len)

                  expect(stakers[0]).to.equal(this.alice.address)
                  expect(stakingTimestamps[0]).to.equal(block.timestamp)
                  expect(lastClaimedTimeStamps[0]).to.equal(block.timestamp)
                  expect(stakedTokens[0]).to.equal(expectedDeposit)
                })

                it("balance of depositToken increased", async function () {
                  const contractBalance = await this.depositToken.balanceOf(this.pool.address)
                  expect(contractBalance).to.equal(expectedBalance)
                })

                it("totalTokens increased", async function () {
                  const contractBalance = await this.pool.totalTokens()
                  expect(contractBalance).to.equal(expectedBalance)
                })

                it("check Alice's deposit value and time", async function () {
                  const deposit = await this.pool.depositedTokens(this.alice.address)
                  const depositTime = await this.pool.depositTime(this.alice.address)
                  const block = await network.provider.send("eth_getBlockByNumber", ["latest", false])
                  const expectedDeposit = this.aliceFirstDeposit.add(this.aliceSecondDeposit).sub(this.aliceFee1).sub(this.aliceFee2)
                  expect(block.timestamp).to.equal(depositTime._hex)
                  expect(deposit).to.equal(expectedDeposit)
                })

                it("owner receives fee for the deposit", async function () {
                  const ownerBalance = await this.depositToken.balanceOf(this.owner.address)
                  const balance = this.aliceFee1.add(this.aliceFee2).add(this.bobFee).add(this.danFee).add(this.frankFee)
                  expect(ownerBalance).to.equal(balance)
                })

                it("emergencyWithdraw impossible", async function () {
                  await expect(this.pool.connect(this.alice).emergencyWithdraw(this.aliceSecondDeposit)).to.be.revertedWith(
                    "You recently staked, please wait before withdrawing."
                  )
                })

                it("withdraw impossible", async function () {
                  await expect(this.pool.connect(this.alice).withdraw(this.aliceSecondDeposit)).to.be.revertedWith(
                    "You recently staked, please wait before withdrawing."
                  )
                })

                it("getEstimatedPendingDivs of Alice set to 0", async function () {
                  expect(await this.pool.getEstimatedPendingDivs(this.alice.address)).to.equal(0)
                  this.aliceEstimatedPendingDivs = await this.pool.getEstimatedPendingDivs(this.alice.address)
                })

                it("getEstimatedPendingDivs increased for everyone except alice", async function () {
                  await this.pool.connect(this.signers[10]).claim() // an insignificant operation, moves to the next block in which the parameters are changed
                  expect(await this.pool.getEstimatedPendingDivs(this.bob.address)).to.be.above(this.bobEstimatedPendingDivs)
                  expect(await this.pool.getEstimatedPendingDivs(this.dan.address)).to.be.above(this.danEstimatedPendingDivs)
                  expect(await this.pool.getEstimatedPendingDivs(this.frank.address)).to.be.above(this.frankEstimatedPendingDivs)

                  this.bobEstimatedPendingDivs = await this.pool.getEstimatedPendingDivs(this.bob.address)
                  this.danEstimatedPendingDivs = await this.pool.getEstimatedPendingDivs(this.dan.address)
                  this.frankEstimatedPendingDivs = await this.pool.getEstimatedPendingDivs(this.frank.address)
                })

                it("part of reward is accrued", async function () {
                  const aliceRewardBalance = await this.rewardToken.balanceOf(this.alice.address)
                  expect(aliceRewardBalance).to.be.above(0)
                })

                describe("Stake period has passed", function () {
                  beforeEach(async function () {
                    LOCKUP_TIME = await this.pool.LOCKUP_TIME()
                    await network.provider.send("evm_increaseTime", [parseInt(LOCKUP_TIME) + 1])
                  })

                  it("getEstimatedPendingDivs increased", async function () {
                    await this.pool.connect(this.signers[10]).claim() // an insignificant operation, moves to the next block in which the parameters are changed

                    expect(await this.pool.getEstimatedPendingDivs(this.alice.address)).to.be.above(this.aliceEstimatedPendingDivs)
                    expect(await this.pool.getEstimatedPendingDivs(this.bob.address)).to.be.above(this.bobEstimatedPendingDivs)
                    expect(await this.pool.getEstimatedPendingDivs(this.dan.address)).to.be.above(this.danEstimatedPendingDivs)
                    expect(await this.pool.getEstimatedPendingDivs(this.frank.address)).to.be.above(this.frankEstimatedPendingDivs)

                    this.aliceEstimatedPendingDivs = await this.pool.getEstimatedPendingDivs(this.alice.address)
                    this.bobEstimatedPendingDivs = await this.pool.getEstimatedPendingDivs(this.bob.address)
                    this.danEstimatedPendingDivs = await this.pool.getEstimatedPendingDivs(this.dan.address)
                    this.frankEstimatedPendingDivs = await this.pool.getEstimatedPendingDivs(this.frank.address)
                  })

                  it("impossible to withdraw 0 tokens", async function () {
                    await expect(this.pool.connect(this.alice).withdraw(0)).to.be.revertedWith("Cannot withdraw 0 Tokens")
                    await expect(this.pool.connect(this.bob).withdraw(0)).to.be.revertedWith("Cannot withdraw 0 Tokens")
                    await expect(this.pool.connect(this.dan).withdraw(0)).to.be.revertedWith("Cannot withdraw 0 Tokens")
                    await expect(this.pool.connect(this.frank).withdraw(0)).to.be.revertedWith("Cannot withdraw 0 Tokens")
                  })

                  it("impossible to withdraw more than balance", async function () {
                    await expect(this.pool.connect(this.alice).withdraw(this.aliceSecondDeposit.mul("2"))).to.be.revertedWith(
                      "Invalid amount to withdraw"
                    )
                    await expect(this.pool.connect(this.alice).withdraw(this.aliceSecondDeposit.mul("2"))).to.be.revertedWith(
                      "Invalid amount to withdraw"
                    )
                    await expect(this.pool.connect(this.alice).withdraw(this.aliceSecondDeposit.mul("2"))).to.be.revertedWith(
                      "Invalid amount to withdraw"
                    )
                    await expect(this.pool.connect(this.alice).withdraw(this.aliceSecondDeposit.mul("2"))).to.be.revertedWith(
                      "Invalid amount to withdraw"
                    )
                  })

                  it("impossible to emergencyWithdraw 0 tokens", async function () {
                    await expect(this.pool.connect(this.alice).emergencyWithdraw(0)).to.be.revertedWith("Cannot withdraw 0 Tokens")
                    await expect(this.pool.connect(this.bob).emergencyWithdraw(0)).to.be.revertedWith("Cannot withdraw 0 Tokens")
                    await expect(this.pool.connect(this.dan).emergencyWithdraw(0)).to.be.revertedWith("Cannot withdraw 0 Tokens")
                    await expect(this.pool.connect(this.frank).emergencyWithdraw(0)).to.be.revertedWith("Cannot withdraw 0 Tokens")
                  })

                  it("impossible to emergencyWithdraw more than balance", async function () {
                    await expect(this.pool.connect(this.alice).emergencyWithdraw(this.aliceSecondDeposit.mul("2"))).to.be.revertedWith(
                      "Invalid amount to withdraw"
                    )
                    await expect(this.pool.connect(this.alice).emergencyWithdraw(this.aliceSecondDeposit.mul("2"))).to.be.revertedWith(
                      "Invalid amount to withdraw"
                    )
                    await expect(this.pool.connect(this.alice).emergencyWithdraw(this.aliceSecondDeposit.mul("2"))).to.be.revertedWith(
                      "Invalid amount to withdraw"
                    )
                    await expect(this.pool.connect(this.alice).withdraw(this.aliceSecondDeposit.mul("2"))).to.be.revertedWith(
                      "Invalid amount to withdraw"
                    )
                  })

                  describe("After Alice withdrawn", function () {
                    beforeEach(async function () {
                      await this.pool.connect(this.alice).withdraw(this.aliceSecondDeposit)
                      await this.pool.connect(this.bob).withdraw(this.bobDeposit.sub(this.bobFee))
                      await this.pool.connect(this.dan).withdraw(this.danDeposit.div("2"))
                      await this.pool.connect(this.frank).withdraw(this.frankDeposit.sub(this.frankFee))
                      expectedBalance = this.aliceFirstDeposit
                        .add(this.danDeposit)
                        .sub(this.aliceFee1)
                        .sub(this.aliceFee2)
                        .sub(this.danFee)
                        .sub(this.danDeposit.div("2"))
                    })

                    it("check balances", async function () {
                      const contractBalance = await this.depositToken.balanceOf(this.pool.address)
                      const holderBalance = await this.depositToken.balanceOf(this.alice.address)
                      const aliceDepositedTokens = await this.pool.depositedTokens(this.alice.address)

                      const expectedHolderBalance = this.aliceSecondDeposit.sub(this.aliceFee2)
                      const expectedAliceDepositedTokens = this.aliceFirstDeposit.sub(this.aliceFee1).sub(this.aliceFee2)

                      expect(contractBalance).to.equal(expectedBalance)
                      expect(holderBalance).to.equal(expectedHolderBalance)
                      expect(aliceDepositedTokens).to.equal(expectedAliceDepositedTokens)
                    })

                    it("owner received his fee", async function () {
                      const ownerBalance = await this.depositToken.balanceOf(this.owner.address)
                      const fee = this.aliceFee1
                        .add(this.aliceFee2)
                        .add(this.bobFee)
                        .add(this.danFee)
                        .add(this.frankFee)
                        .add(this.aliceFee2)
                        .add(this.danFee.div("2"))
                        .add(this.bobDeposit.sub(this.bobFee).mul("50").div("10000"))
                        .add(this.frankDeposit.sub(this.frankFee).mul("50").div("10000"))
                      expect(ownerBalance).to.equal(fee)
                    })

                    it("totalTokens decreased", async function () {
                      const contractBalance = await this.pool.totalTokens()
                      expect(expectedBalance).to.equal(contractBalance)
                    })

                    it("reward is accrued", async function () {
                      const decimals = BigNumber.from("1000000000000000000")
                      const reward = BigNumber.from("5400").mul(decimals)
                      const aliceReward = parseInt((await this.rewardToken.balanceOf(this.alice.address)).div(decimals))
                      const bobReward = parseInt((await this.rewardToken.balanceOf(this.bob.address)).div(decimals)) + 1
                      const danReward = parseInt((await this.rewardToken.balanceOf(this.dan.address)).div(decimals)) + 1
                      const frankReward = parseInt((await this.rewardToken.balanceOf(this.frank.address)).div(decimals)) + 1
                      //one is added due to rounding and counting reward errors.

                      const totalDeposit = this.aliceFirstDeposit
                        .add(this.aliceSecondDeposit)
                        .add(this.bobDeposit)
                        .add(this.frankDeposit)
                        .add(this.danDeposit)
                      const expectedAliceReward = parseInt(
                        this.aliceFirstDeposit.add(this.aliceSecondDeposit).mul(reward).div(totalDeposit).div(decimals)
                      )
                      const expectedBobReward = parseInt(this.bobDeposit.mul(reward).div(totalDeposit).div(decimals))
                      const expectedDanReward = parseInt(this.danDeposit.mul(reward).div(totalDeposit).div(decimals))
                      const expectedFrankReward = parseInt(this.frankDeposit.mul(reward).div(totalDeposit).div(decimals))

                      expect(aliceReward).to.equal(expectedAliceReward)
                      expect(bobReward).to.equal(expectedBobReward)
                      expect(danReward).to.equal(expectedDanReward)
                      expect(frankReward).to.equal(expectedFrankReward)
                    })
                  })

                  describe("After emergencyWithdraw", function () {
                    beforeEach(async function () {
                      await this.pool.connect(this.alice).emergencyWithdraw(this.aliceSecondDeposit)
                      await this.pool.connect(this.bob).emergencyWithdraw(this.bobDeposit.sub(this.bobFee))
                      await this.pool.connect(this.dan).emergencyWithdraw(this.danDeposit.div("2"))
                      await this.pool.connect(this.frank).emergencyWithdraw(this.frankDeposit.sub(this.frankFee))
                      expectedBalance = this.aliceFirstDeposit
                        .add(this.danDeposit)
                        .sub(this.aliceFee1)
                        .sub(this.aliceFee2)
                        .sub(this.danFee)
                        .sub(this.danDeposit.div("2"))
                    })

                    it("check balances", async function () {
                      const contractBalance = await this.depositToken.balanceOf(this.pool.address)
                      const holderBalance = await this.depositToken.balanceOf(this.alice.address)
                      const aliceDepositedTokens = await this.pool.depositedTokens(this.alice.address)

                      const expectedHolderBalance = this.aliceSecondDeposit.sub(this.aliceFee2)
                      const expectedAliceDepositedTokens = this.aliceFirstDeposit.sub(this.aliceFee1).sub(this.aliceFee2)

                      expect(contractBalance).to.equal(expectedBalance)
                      expect(holderBalance).to.equal(expectedHolderBalance)
                      expect(aliceDepositedTokens).to.equal(expectedAliceDepositedTokens)
                    })

                    it("owner receives fee for withdraw", async function () {
                      const ownerBalance = await this.depositToken.balanceOf(this.owner.address)
                      const fee = this.aliceFee1
                        .add(this.aliceFee2)
                        .add(this.bobFee)
                        .add(this.danFee)
                        .add(this.frankFee)
                        .add(this.aliceFee2)
                        .add(this.danFee.div("2"))
                        .add(this.bobDeposit.sub(this.bobFee).mul("50").div("10000"))
                        .add(this.frankDeposit.sub(this.frankFee).mul("50").div("10000"))
                      expect(ownerBalance).to.equal(fee)
                    })

                    it("totalTokens decreased", async function () {
                      const contractBalance = await this.pool.totalTokens()
                      expect(expectedBalance).to.equal(contractBalance)
                    })

                    it("reward not issued", async function () {
                      const aliceReward = await this.rewardToken.balanceOf(this.alice.address)
                      const bobReward = await this.rewardToken.balanceOf(this.bob.address)
                      const danReward = await this.rewardToken.balanceOf(this.dan.address)
                      const frankReward = await this.rewardToken.balanceOf(this.frank.address)

                      expect(aliceReward).to.be.above(0) //part of the reward was paid during Alice's second deposit
                      expect(bobReward).to.equal(0)
                      expect(danReward).to.equal(0)
                      expect(frankReward).to.equal(0)
                    })
                  })

                  describe("Alice, Bob, Dan and Frank claim()", function () {
                    beforeEach(async function () {
                      totalEarnedTokensBeforeClaim = await this.pool.totalEarnedTokens(this.frank.address)
                      await this.pool.connect(this.alice).claim()
                      block1 = await network.provider.send("eth_getBlockByNumber", ["latest", false])
                      await this.pool.connect(this.bob).claim()
                      block2 = await network.provider.send("eth_getBlockByNumber", ["latest", false])
                      await this.pool.connect(this.dan).claim()
                      block3 = await network.provider.send("eth_getBlockByNumber", ["latest", false])
                      await this.pool.connect(this.frank).claim()
                      block4 = await network.provider.send("eth_getBlockByNumber", ["latest", false])
                    })

                    it("getEstimatedPendingDivs reset to 0", async function () {
                      await this.pool.connect(this.alice).claim()
                      expect(await this.pool.getEstimatedPendingDivs(this.alice.address)).to.equal(0)

                      await this.pool.connect(this.bob).claim()
                      expect(await this.pool.getEstimatedPendingDivs(this.bob.address)).to.equal(0)

                      await this.pool.connect(this.dan).claim()
                      expect(await this.pool.getEstimatedPendingDivs(this.dan.address)).to.equal(0)

                      await this.pool.connect(this.frank).claim()
                      expect(await this.pool.getEstimatedPendingDivs(this.frank.address)).to.equal(0)
                    })

                    it("reward is accrued", async function () {
                      const decimals = BigNumber.from("1000000000000000000")
                      const reward = BigNumber.from("5400").mul(decimals)
                      const aliceReward = parseInt((await this.rewardToken.balanceOf(this.alice.address)).div(decimals))
                      const bobReward = parseInt((await this.rewardToken.balanceOf(this.bob.address)).div(decimals)) + 1
                      const danReward = parseInt((await this.rewardToken.balanceOf(this.dan.address)).div(decimals)) + 1
                      const frankReward = parseInt((await this.rewardToken.balanceOf(this.frank.address)).div(decimals)) + 1
                      //one is added due to rounding and counting reward errors.

                      const totalDeposit = this.aliceFirstDeposit
                        .add(this.aliceSecondDeposit)
                        .add(this.bobDeposit)
                        .add(this.frankDeposit)
                        .add(this.danDeposit)
                      const expectedAliceReward = parseInt(
                        this.aliceFirstDeposit.add(this.aliceSecondDeposit).mul(reward).div(totalDeposit).div(decimals)
                      )
                      const expectedBobReward = parseInt(this.bobDeposit.mul(reward).div(totalDeposit).div(decimals))
                      const expectedDanReward = parseInt(this.danDeposit.mul(reward).div(totalDeposit).div(decimals))
                      const expectedFrankReward = parseInt(this.frankDeposit.mul(reward).div(totalDeposit).div(decimals))

                      expect(aliceReward).to.equal(expectedAliceReward)
                      expect(bobReward).to.equal(expectedBobReward)
                      expect(danReward).to.equal(expectedDanReward)
                      expect(frankReward).to.equal(expectedFrankReward)
                    })

                    it("totalEarnedTokens increased", async function () {
                      expect(0).to.equal(totalEarnedTokensBeforeClaim)
                      const decimals = BigNumber.from("1000000000000000000")
                      const reward = BigNumber.from("5400").mul(decimals)
                      const aliceReward = parseInt((await this.pool.totalEarnedTokens(this.alice.address)).div(decimals))
                      const bobReward = parseInt((await this.pool.totalEarnedTokens(this.bob.address)).div(decimals)) + 1
                      const danReward = parseInt((await this.pool.totalEarnedTokens(this.dan.address)).div(decimals)) + 1
                      const frankReward = parseInt((await this.pool.totalEarnedTokens(this.frank.address)).div(decimals)) + 1
                      //one is added due to rounding and counting reward errors.

                      const totalDeposit = this.aliceFirstDeposit
                        .add(this.aliceSecondDeposit)
                        .add(this.bobDeposit)
                        .add(this.frankDeposit)
                        .add(this.danDeposit)
                      const expectedAliceReward = parseInt(
                        this.aliceFirstDeposit.add(this.aliceSecondDeposit).mul(reward).div(totalDeposit).div(decimals)
                      )
                      const expectedBobReward = parseInt(this.bobDeposit.mul(reward).div(totalDeposit).div(decimals))
                      const expectedDanReward = parseInt(this.danDeposit.mul(reward).div(totalDeposit).div(decimals))
                      const expectedFrankReward = parseInt(this.frankDeposit.mul(reward).div(totalDeposit).div(decimals))

                      expect(aliceReward).to.equal(expectedAliceReward)
                      expect(bobReward).to.equal(expectedBobReward)
                      expect(danReward).to.equal(expectedDanReward)
                      expect(frankReward).to.equal(expectedFrankReward)
                    })

                    it("lastClaimedTime increased", async function () {
                      const aliceLastClaimedTime = await this.pool.lastClaimedTime(this.alice.address)
                      const bobLastClaimedTime = await this.pool.lastClaimedTime(this.bob.address)
                      const danLastClaimedTime = await this.pool.lastClaimedTime(this.dan.address)
                      const frankLastClaimedTime = await this.pool.lastClaimedTime(this.frank.address)

                      expect(BigNumber.from(aliceLastClaimedTime)._hex).to.equal(block1.timestamp)
                      expect(BigNumber.from(bobLastClaimedTime)._hex).to.equal(block2.timestamp)
                      expect(BigNumber.from(danLastClaimedTime)._hex).to.equal(block3.timestamp)
                      expect(BigNumber.from(frankLastClaimedTime)._hex).to.equal(block4.timestamp)
                    })
                  })

                  describe("Deposit (disburseDuration) period has passed", function () {
                    it("impossible to deposit", async function () {
                      await expect(this.pool.connect(this.alice).deposit(this.aliceSecondDeposit)).to.be.revertedWith("Deposits are closed now!")
                    })

                    describe("adminClaimableTime period has passed", function () {
                      beforeEach(async function () {
                        adminCanClaimAfter = await this.pool.adminCanClaimAfter()
                        await network.provider.send("evm_increaseTime", [parseInt(adminCanClaimAfter.toString())])
                      })

                      it("owner can withdraw reward token using transferAnyERC20Token()", async function () {
                        await this.pool.connect(this.owner).transferAnyERC20Token(this.rewardToken.address, this.bob.address, "100")
                        const rewardBalance = await this.rewardToken.balanceOf(this.bob.address)
                        expect(rewardBalance).to.equal("100")
                      })

                      it("owner can withdraw reward token using transferAnyOldERC20Token()", async function () {
                        await this.pool.connect(this.owner).transferAnyOldERC20Token(this.rewardToken.address, this.bob.address, "100")
                        const rewardBalance = await this.rewardToken.balanceOf(this.bob.address)
                        expect(rewardBalance).to.equal("100")
                      })
                    })
                  })
                })
              })
            })
          })
        })
      })
    })
  })
})
