const { expect } = require("chai")
const { BigNumber } = require("ethers")

describe("UniFiStake", function () {
  before(async function () {
    this.signers = await ethers.getSigners()
    this.owner = this.signers[0]
    this.alice = this.signers[1]
    this.bob = this.signers[2]
    this.token = await ethers.getContractFactory("UniFi")
    this.contract = await ethers.getContractFactory("UniFiDaiVaultMock")
  })

  beforeEach(async function () {
    this.depositToken = await this.token.deploy("UniFi", "UniFi", this.owner.address)
    this.rewardToken = await this.token.deploy("DAO2", "DAO2", this.owner.address)
    this.pool = await this.contract.deploy(this.depositToken.address, this.rewardToken.address)

    this.alice_deposit = BigNumber.from("10000")
    this.half_alice_deposit = this.alice_deposit.div("2")

    await this.depositToken.transfer(this.alice.address, this.alice_deposit)
    await this.depositToken.connect(this.alice).approve(this.pool.address, this.alice_deposit)

    owner_balance = await this.depositToken.balanceOf(this.owner.address)
    await this.depositToken.transfer(this.bob.address, owner_balance)

    await this.pool.connect(this.alice).deposit(this.alice_deposit)
  })

  it("should be deployed", async function () {
    const deployed = await this.pool.deployed()
    expect(deployed, true)
  })

  it("should have correct state variables", async function () {
    expect(await this.pool.owner()).to.equal(this.owner.address)
  })

  it("function getHoldersList()", async function () {
    getHoldersList_after = await this.pool.getHoldersList(0, 1)
    block = await network.provider.send("eth_getBlockByNumber", ["latest", false])

    stakers = getHoldersList_after["stakers"][0]
    stakingTimestamps = getHoldersList_after["stakingTimestamps"][0]
    lastClaimedTimeStamps = getHoldersList_after["lastClaimedTimeStamps"][0]
    stakedTokens = getHoldersList_after["stakedTokens"][0]

    expect(stakers).to.equal(this.alice.address)
    expect(stakingTimestamps).to.equal(block.timestamp)
    expect(lastClaimedTimeStamps).to.equal(block.timestamp)
    expect(stakedTokens).to.equal(this.alice_deposit.sub(this.alice_deposit.mul("50").div("10000")))
  })

  it("reward logic // logs above", async function () {
    twoSign = this.signers[3]
    threeSign = this.signers[4]
    fourSign = this.signers[5]

    two_deposit = this.alice_deposit.mul("6")
    three_deposit = this.alice_deposit.mul("25").div("10")
    four_deposit = this.alice_deposit.mul("5").div("10")

    await this.depositToken.connect(this.bob).transfer(twoSign.address, two_deposit)
    await this.depositToken.connect(this.bob).transfer(threeSign.address, three_deposit)
    await this.depositToken.connect(this.bob).transfer(fourSign.address, four_deposit)

    await this.depositToken.connect(twoSign).approve(this.pool.address, two_deposit)
    await this.depositToken.connect(threeSign).approve(this.pool.address, three_deposit)
    await this.depositToken.connect(fourSign).approve(this.pool.address, four_deposit)

    await this.pool.connect(twoSign).deposit(two_deposit)
    await this.pool.connect(threeSign).deposit(three_deposit)
    await this.pool.connect(fourSign).deposit(four_deposit)

    total_tokens = two_deposit.add(three_deposit).add(four_deposit).add(this.alice_deposit)
    console.log(total_tokens.toString())
    total_reward = BigNumber.from("100")
    await this.rewardToken.approve(this.pool.address, total_reward)
    await this.pool.addContractBalance(total_reward)

    await this.pool.connect(this.alice).claim()
    await this.pool.connect(twoSign).claim()
    await this.pool.connect(threeSign).claim()
    await this.pool.connect(fourSign).claim()

    alice_reward = await this.rewardToken.balanceOf(this.alice.address)
    two_reward = await this.rewardToken.balanceOf(twoSign.address)
    three_reward = await this.rewardToken.balanceOf(threeSign.address)
    four_reward = await this.rewardToken.balanceOf(fourSign.address)

    console.log("total number of reward tokens", total_reward.toString())
    console.log("total number of award tokens issued", two_reward.add(three_reward).add(four_reward).add(alice_reward).toString())
    console.log("one_reward", two_reward.toString())
    console.log("two_reward", three_reward.toString())
    console.log("alice_reward", alice_reward.toString())
    console.log("three_reward", four_reward.toString())
    console.log(
      "approximately the percentage of the deposit from the total number of invested tokens\nis the percentage of reward tokens that the user will receive"
    )

    expect(this.alice_deposit.mul(total_reward).div(total_tokens).sub("1")).to.equal(alice_reward) // 1 is lost during calculations reward
    expect(two_deposit.mul(total_reward).div(total_tokens).sub("1")).to.equal(two_reward) // 1 is lost during calculations reward
    expect(three_deposit.mul(total_reward).div(total_tokens).sub("1")).to.equal(three_reward) // 1 is lost during calculations reward
    expect(four_deposit.mul(total_reward).div(total_tokens).sub("1")).to.equal(four_reward) // 1 is lost during calculations reward
  })

  describe("function claim()", function () {
    it("transfers reward tokens to the user", async function () {
      balance = 1000
      await this.rewardToken.approve(this.pool.address, balance)
      await this.pool.addContractBalance(balance)

      await this.pool.connect(this.alice).claim()
      alice_reward_balance = await this.rewardToken.balanceOf(this.alice.address)

      expect(balance - 1).to.equal(alice_reward_balance) // 1 is lost during calculations reward
    })

    it("increase totalEarnedTokens when receiving reward funds", async function () {
      total_before_claim = await this.pool.totalEarnedTokens(this.alice.address)
      expect(0).to.equal(total_before_claim)

      balance = 1000
      await this.rewardToken.approve(this.pool.address, balance)
      await this.pool.addContractBalance(balance)

      await this.pool.connect(this.alice).claim()
      alice_reward_balance = await this.rewardToken.balanceOf(this.alice.address)
      total_after_claim = await this.pool.totalEarnedTokens(this.alice.address)

      expect(total_after_claim).to.equal(alice_reward_balance)
    })

    it("increasing the lastClaimedTime when claim", async function () {
      await this.pool.connect(this.alice).claim()
      lastClaimedTime = await this.pool.lastClaimedTime(this.alice.address)
      block = await network.provider.send("eth_getBlockByNumber", ["latest", false])
      expect(lastClaimedTime).to.equal(block.timestamp)
    })
  })

  describe("function deposit()", function () {
    it("deposit token on stake contract", async function () {
      contract_balance = await this.depositToken.balanceOf(this.pool.address)
      expected_balance = this.alice_deposit.sub(this.alice_deposit.mul("50").div("10000"))
      expect(expected_balance).to.equal(contract_balance)
    })

    it("increase in the total number of deposit tokens during the deposit", async function () {
      contract_balance = await this.pool.totalTokens()
      expected_balance = this.alice_deposit.sub(this.alice_deposit.mul("50").div("10000"))
      expect(expected_balance).to.equal(contract_balance)
    })

    it("creating a position for the user", async function () {
      deposit = await this.pool.depositedTokens(this.alice.address)
      depositTime = await this.pool.depositTime(this.alice.address)
      block = await network.provider.send("eth_getBlockByNumber", ["latest", false])
      expect(block.timestamp).to.equal(depositTime._hex)
      expected_deposit = this.alice_deposit.sub(this.alice_deposit.mul("50").div("10000"))
      expect(deposit).to.equal(expected_deposit)
    })

    it("owner receives fee for the deposit", async function () {
      ownerBalance = await this.depositToken.balanceOf(this.owner.address)
      balance = this.alice_deposit.mul("50").div("10000")
      expect(ownerBalance).to.equal(balance)
    })
    describe("second holder deposit", function () {
      beforeEach(async function () {
        getNumberOfHolders_before = await this.pool.getNumberOfHolders()
        await this.depositToken.connect(this.bob).approve(this.pool.address, this.alice_deposit)
        await this.pool.connect(this.bob).deposit(this.alice_deposit)
        getNumberOfHolders_after = await this.pool.getNumberOfHolders()
      })

      describe("increasing getNumberOfHolders(), getHoldersList() on deposit ", function () {
        it("increasing getNumberOfHolders when deposit", async function () {
          expect(getNumberOfHolders_before.add(1)).to.equal(getNumberOfHolders_after)
        })

        it("increasing getHoldersList when deposit", async function () {
          getHoldersList_after = await this.pool.getHoldersList(0, getNumberOfHolders_after)
          stakers_length = getHoldersList_after["stakers"].length
          stakingTimestamps_length = getHoldersList_after["stakingTimestamps"].length
          lastClaimedTimeStamps_length = getHoldersList_after["lastClaimedTimeStamps"].length
          stakedTokens_length = getHoldersList_after["stakedTokens"].length
          expect(stakers_length).to.equal(getNumberOfHolders_after)
          expect(stakingTimestamps_length).to.equal(getNumberOfHolders_after)
          expect(lastClaimedTimeStamps_length).to.equal(getNumberOfHolders_after)
          expect(stakedTokens_length).to.equal(getNumberOfHolders_after)
        })
      })

      describe("decreasing getNumberOfHolders(), getHoldersList() on withdraw ", function () {
        beforeEach(async function () {
          LOCKUP_TIME = await this.pool.LOCKUP_TIME()
          await network.provider.send("evm_increaseTime", [parseInt(LOCKUP_TIME) + 1])
        })
        describe("func withdraw()", function () {
          it("decreasing getNumberOfHolders when withdraw all holder deposit", async function () {
            getNumberOfHolders_before = await this.pool.getNumberOfHolders()
            await this.pool.connect(this.alice).withdraw(this.alice_deposit.sub(this.alice_deposit.mul("50").div("10000")))
            getNumberOfHolders_after = await this.pool.getNumberOfHolders()
            expect(getNumberOfHolders_before.sub("1")).to.equal(getNumberOfHolders_after)
          })

          it("decreasing getHoldersList when withdraw", async function () {
            await this.pool.connect(this.alice).withdraw(this.alice_deposit.sub(this.alice_deposit.mul("50").div("10000")))
            getHoldersList_after = await this.pool.getHoldersList(0, getNumberOfHolders_after.sub("1"))

            stakers_length = getHoldersList_after["stakers"].length
            stakingTimestamps_length = getHoldersList_after["stakingTimestamps"].length
            lastClaimedTimeStamps_length = getHoldersList_after["lastClaimedTimeStamps"].length
            stakedTokens_length = getHoldersList_after["stakedTokens"].length
            expected_length = getNumberOfHolders_after.sub("1")

            expect(stakers_length).to.equal(expected_length)
            expect(stakingTimestamps_length).to.equal(expected_length)
            expect(lastClaimedTimeStamps_length).to.equal(expected_length)
            expect(stakedTokens_length).to.equal(expected_length)
          })
        })

        describe("func emergencyWithdraw()", function () {
          it("decreasing getNumberOfHolders when emergencyWithdraw all holder deposit", async function () {
            lastClaimedTime_before = await this.pool.getNumberOfHolders()
            await this.pool.connect(this.alice).emergencyWithdraw(this.alice_deposit.sub(this.alice_deposit.mul("50").div("10000")))
            lastClaimedTime_after = await this.pool.getNumberOfHolders()
            expect(lastClaimedTime_before.sub("1")).to.equal(lastClaimedTime_after)
          })

          it("decreasing getHoldersList when emergencyWithdraw", async function () {
            await this.pool.connect(this.alice).emergencyWithdraw(this.alice_deposit.sub(this.alice_deposit.mul("50").div("10000")))
            getHoldersList_after = await this.pool.getHoldersList(0, getNumberOfHolders_after.sub("1"))

            stakers_length = getHoldersList_after["stakers"].length
            stakingTimestamps_length = getHoldersList_after["stakingTimestamps"].length
            lastClaimedTimeStamps_length = getHoldersList_after["lastClaimedTimeStamps"].length
            stakedTokens_length = getHoldersList_after["stakedTokens"].length
            expected_length = getNumberOfHolders_after.sub("1")

            expect(stakers_length).to.equal(expected_length)
            expect(stakingTimestamps_length).to.equal(expected_length)
            expect(lastClaimedTimeStamps_length).to.equal(expected_length)
            expect(stakedTokens_length).to.equal(expected_length)
          })
        })
      })
    })

    it("getting a reward for not the first deposits", async function () {
      await this.depositToken.connect(this.bob).transfer(this.alice.address, this.alice_deposit)
      await this.depositToken.connect(this.alice).approve(this.pool.address, this.alice_deposit)

      balance = 1000
      await this.rewardToken.approve(this.pool.address, balance)
      await this.pool.addContractBalance(balance)

      await this.pool.connect(this.alice).deposit(this.alice_deposit)
      alice_reward_balance = await this.rewardToken.balanceOf(this.alice.address)

      expect(balance - 1).to.equal(alice_reward_balance) // 1 is lost during calculations reward
    })

    it("can't deposit 0 token", async function () {
      await expect(this.pool.deposit(0)).to.be.revertedWith("Cannot deposit 0 Tokens")
    })

    it("can't deposit more than the balance", async function () {
      await expect(this.pool.deposit(10000)).to.be.revertedWith("ERC20: transfer amount exceeds balance")
    })

    it("not possible to make a deposit after the specified days from the date of creation of the contract", async function () {
      disburseDuration = await this.pool.disburseDuration()
      LOCKUP_TIME = await this.pool.LOCKUP_TIME()
      work_contract_time = disburseDuration - LOCKUP_TIME
      await network.provider.send("evm_increaseTime", [work_contract_time + 1])
      await expect(this.pool.deposit(this.alice_deposit)).to.be.revertedWith("Deposits are closed now!")
    })
  })

  describe("function withdraw()", function () {
    it("can't withdraw 0 token", async function () {
      await expect(this.pool.withdraw(0)).to.be.revertedWith("Cannot withdraw 0 Tokens")
    })

    it("you can't withdraw until the stake period has passed", async function () {
      await expect(this.pool.connect(this.alice).withdraw(5000)).to.be.revertedWith("You recently staked, please wait before withdrawing.")
    })

    describe("Stake period has passed", function () {
      beforeEach(async function () {
        LOCKUP_TIME = await this.pool.LOCKUP_TIME()
        await network.provider.send("evm_increaseTime", [parseInt(LOCKUP_TIME) + 1])
      })

      it("you can't withdraw more than you have on the balance sheet", async function () {
        await expect(this.pool.connect(this.alice).withdraw(this.alice_deposit)).to.be.revertedWith("Invalid amount to withdraw")
      })

      it("withdraw when stake period has passed", async function () {
        await this.pool.connect(this.alice).withdraw(this.half_alice_deposit)
        contract_balance = await this.depositToken.balanceOf(this.pool.address)
        holder_balance = await this.depositToken.balanceOf(this.alice.address)
        pool_balance = await this.pool.depositedTokens(this.alice.address)

        expected_balance = this.alice_deposit.sub(this.half_alice_deposit).sub(this.alice_deposit.mul("50").div("10000"))
        expected_holder_balance = this.half_alice_deposit.sub(this.half_alice_deposit.mul("50").div("10000"))

        expect(contract_balance).to.equal(expected_balance)
        expect(holder_balance).to.equal(expected_holder_balance)
        expect(pool_balance).to.equal(expected_balance)
      })

      it("owner receives fee for the withdraw", async function () {
        await this.pool.connect(this.alice).withdraw(this.half_alice_deposit)
        ownerBalance = await this.depositToken.balanceOf(this.owner.address)

        deposit_fee = this.alice_deposit.mul("50").div("10000")
        withdraw_fee = this.half_alice_deposit.mul("50").div("10000")
        fee = deposit_fee.add(withdraw_fee)

        expect(ownerBalance).to.equal(fee)
      })

      it("decrease in the total number of deposit tokens during the withdraw", async function () {
        await this.pool.connect(this.alice).withdraw(this.half_alice_deposit)
        contract_balance = await this.pool.totalTokens()
        expected_balance = this.alice_deposit.sub(this.half_alice_deposit).sub(this.alice_deposit.mul("50").div("10000"))
        expect(expected_balance).to.equal(contract_balance)
      })

      it("getting a reward when withdrawing funds", async function () {
        balance = 1000
        await this.rewardToken.approve(this.pool.address, balance)
        await this.pool.addContractBalance(balance)

        await this.pool.connect(this.alice).withdraw(this.half_alice_deposit)
        alice_reward_balance = await this.rewardToken.balanceOf(this.alice.address)

        expect(balance - 1).to.equal(alice_reward_balance) // 1 is lost during calculations reward
      })
    })
  })

  describe("function emergencyWithdraw()", function () {
    // write checks that the tokens were actually debited from the contract to the owner's address
    it("Cannot withdraw 0 Tokens!", async function () {
      await expect(this.pool.emergencyWithdraw(0)).to.be.revertedWith("Cannot withdraw 0 Tokens!")
    })

    it("you can't emergencyWithdraw until the stake period has passed", async function () {
      await expect(this.pool.connect(this.alice).emergencyWithdraw(5000)).to.be.revertedWith(
        "You recently staked, please wait before withdrawing."
      )
    })

    describe("Stake period has passed", function () {
      beforeEach(async function () {
        LOCKUP_TIME = await this.pool.LOCKUP_TIME()
        await network.provider.send("evm_increaseTime", [parseInt(LOCKUP_TIME) + 1])
      })

      it("you can't emergencyWithdraw more than you have on the balance sheet", async function () {
        await expect(this.pool.connect(this.alice).emergencyWithdraw(this.alice_deposit)).to.be.revertedWith("Invalid amount to withdraw")
      })

      it("emergencyWithdraw when stake period has passed", async function () {
        await this.pool.connect(this.alice).emergencyWithdraw(this.half_alice_deposit)
        contract_balance = await this.depositToken.balanceOf(this.pool.address)
        holder_balance = await this.depositToken.balanceOf(this.alice.address)
        pool_balance = await this.pool.depositedTokens(this.alice.address)

        expected_balance = this.alice_deposit.sub(this.half_alice_deposit).sub(this.alice_deposit.mul("50").div("10000"))
        expected_holder_balance = this.half_alice_deposit.sub(this.half_alice_deposit.mul("50").div("10000"))

        expect(contract_balance).to.equal(expected_balance)
        expect(holder_balance).to.equal(expected_holder_balance)
        expect(pool_balance).to.equal(expected_balance)
      })

      it("owner receives fee for the emergencyWithdraw", async function () {
        await this.pool.connect(this.alice).emergencyWithdraw(this.half_alice_deposit)
        ownerBalance = await this.depositToken.balanceOf(this.owner.address)

        deposit_fee = this.alice_deposit.mul("50").div("10000")
        withdraw_fee = this.half_alice_deposit.mul("50").div("10000")
        fee = deposit_fee.add(withdraw_fee)

        expect(ownerBalance).to.equal(fee)
      })

      it("decrease in the total number of deposit tokens during the emergencyWithdraw", async function () {
        await this.pool.connect(this.alice).emergencyWithdraw(this.half_alice_deposit)
        contract_balance = await this.pool.totalTokens()
        expected_balance = this.alice_deposit.sub(this.half_alice_deposit).sub(this.alice_deposit.mul("50").div("10000"))
        expect(expected_balance).to.equal(contract_balance)
      })

      it("increasing the lastClaimedTime when emergencyWithdraw", async function () {
        await this.pool.connect(this.alice).emergencyWithdraw(this.half_alice_deposit)
        lastClaimedTime = await this.pool.lastClaimedTime(this.alice.address)
        block = await network.provider.send("eth_getBlockByNumber", ["latest", false])
        expect(lastClaimedTime).to.equal(block.timestamp)
      })

      it("emergency withdrawing does not issue a reward", async function () {
        await this.rewardToken.approve(this.pool.address, 1000000)
        await this.pool.addContractBalance(1000000)

        balance1 = await this.rewardToken.balanceOf(this.alice.address)
        await this.pool.connect(this.alice).emergencyWithdraw(this.half_alice_deposit)
        balance2 = await this.rewardToken.balanceOf(this.alice.address)
        expect(balance1).to.equal(balance2)
      })
    })
  })

  describe("function transferAnyERC20Token()", function () {
    it("function only owner", async function () {
      await expect(this.pool.connect(this.alice).transferAnyERC20Token(this.rewardToken.address, this.alice.address, 1000)).to.be.revertedWith(
        "Ownable: caller is not the owner"
      )
    })

    it("can't transfer out deposit tokens", async function () {
      await expect(this.pool.transferAnyERC20Token(this.depositToken.address, this.owner.address, 1000)).to.revertedWith(
        "Admin cannot transfer out deposit tokens from this vault!"
      )
    })

    it("can't transfer reward tokens until 'adminCanClaimAfter' time has passed", async function () {
      await expect(this.pool.transferAnyERC20Token(this.rewardToken.address, this.owner.address, 1000)).to.revertedWith(
        "Admin cannot Transfer out Reward Tokens Yet!"
      )
    })

    it("can transfer bonus tokens 'adminCanClaimAfter' time has passed", async function () {
      await this.rewardToken.approve(this.pool.address, 1000000)
      await this.pool.addContractBalance(1000000)

      adminCanClaimAfter = await this.pool.adminCanClaimAfter()
      await network.provider.send("evm_increaseTime", [parseInt(adminCanClaimAfter) + 1])

      await this.pool.transferAnyERC20Token(this.rewardToken.address, this.alice.address, 1000)
      alice_balance = await this.rewardToken.balanceOf(this.alice.address)
      expect(alice_balance).to.equal(1000)
    })

    it("can transfer other ERC20 tokens", async function () {
      ERC20 = await this.token.deploy("DAO1", "DAO1", this.owner.address)
      await ERC20.transfer(this.pool.address, 1000)
      await this.pool.transferAnyERC20Token(ERC20.address, this.alice.address, 1000)

      alice_balance = await ERC20.balanceOf(this.alice.address)
      expect(alice_balance).to.equal(1000)
    })

    it("can't transfer any ERC20 tokens more than the balance", async function () {
      adminCanClaimAfter = await this.pool.adminCanClaimAfter()
      await network.provider.send("evm_increaseTime", [parseInt(adminCanClaimAfter) + 1])
      await expect(this.pool.transferAnyERC20Token(this.rewardToken.address, this.owner.address, 1000)).to.revertedWith(
        "ERC20: transfer amount exceeds balance"
      )
    })
  })

  describe("function transferAnyOldERC20Token()", function () {
    it("function only owner", async function () {
      await expect(
        this.pool.connect(this.alice).transferAnyOldERC20Token(this.rewardToken.address, this.alice.address, 1000)
      ).to.be.revertedWith("Ownable: caller is not the owner")
    })

    it("can't transfer out deposit tokens", async function () {
      await expect(this.pool.transferAnyOldERC20Token(this.depositToken.address, this.owner.address, 1000)).to.revertedWith(
        "Admin cannot transfer out deposit tokens from this vault!"
      )
    })

    it("can't transfer reward tokens until 'adminCanClaimAfter' time has passed", async function () {
      await expect(this.pool.transferAnyOldERC20Token(this.rewardToken.address, this.owner.address, 1000)).to.revertedWith(
        "Admin cannot Transfer out Reward Tokens Yet!"
      )
    })

    it("can transfer bonus tokens 'adminCanClaimAfter' time has passed", async function () {
      await this.rewardToken.approve(this.pool.address, 1000000)
      await this.pool.addContractBalance(1000000)
      adminCanClaimAfter = await this.pool.adminCanClaimAfter()
      await network.provider.send("evm_increaseTime", [parseInt(adminCanClaimAfter) + 1])
      await this.pool.transferAnyOldERC20Token(this.rewardToken.address, this.alice.address, 1000)
      alice_balance = await this.rewardToken.balanceOf(this.alice.address)
      expect(alice_balance).to.equal(1000)
    })

    it("can transfer other ERC20 tokens", async function () {
      ERC20 = await this.token.deploy("DAO1", "DAO1", this.owner.address)
      await ERC20.transfer(this.pool.address, 1000)
      await this.pool.transferAnyOldERC20Token(ERC20.address, this.alice.address, 1000)
      alice_balance = await ERC20.balanceOf(this.alice.address)
      expect(alice_balance).to.equal(1000)
    })

    it("can't transfer any ERC20 tokens more than the balance", async function () {
      adminCanClaimAfter = await this.pool.adminCanClaimAfter()
      await network.provider.send("evm_increaseTime", [parseInt(adminCanClaimAfter) + 1])
      await expect(this.pool.transferAnyOldERC20Token(this.rewardToken.address, this.owner.address, 1000)).to.revertedWith(
        "ERC20: transfer amount exceeds balance"
      )
    })
  })

  describe("function addContractBalance()", async function () {
    beforeEach(async function () {
      await this.rewardToken.approve(this.pool.address, 1000)
      await this.pool.addContractBalance(1000)
      balance = await this.rewardToken.balanceOf(this.pool.address)
    })

    it("function only owner", async function () {
      await expect(this.pool.connect(this.alice).addContractBalance(1000)).to.be.revertedWith("Ownable: caller is not the owner")
    })

    it("increase contractBalance", async function () {
      contractBalance = await this.pool.contractBalance()
      expect(balance).to.equal(1000)
      expect(contractBalance).to.equal(1000)
    })

    it("increase getEstimatedPendingDivs", async function () {
      getEstimatedPendingDivs = await this.pool.getEstimatedPendingDivs(this.alice.address)
      expect(getEstimatedPendingDivs).to.equal(balance)
    })
  })
})
