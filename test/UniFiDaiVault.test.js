//const { BN, constants, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const { expect } = require("chai")
const { BigNumber } = require("ethers")
//const { ZERO_ADDRESS } = constants;

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
    await this.depositToken.connect(this.bob).approve(this.pool.address, this.alice_deposit)
    await this.pool.connect(this.bob).deposit(this.alice_deposit)
  })

  it("should have correct state variables", async function () {
    expect(await this.pool.owner()).to.equal(this.owner.address)
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
      blockTime = await network.provider.send("eth_getBlockByNumber", ["latest", false])
      expect(blockTime.timestamp).to.equal(depositTime._hex)
      expected_deposit = this.alice_deposit.sub(this.alice_deposit.mul("50").div("10000"))
      expect(deposit).to.equal(expected_deposit)
    })

    it("owner receives fee for the deposit", async function () {
      ownerBalance = await this.depositToken.balanceOf(this.owner.address)
      balance = this.alice_deposit.mul("50").div("10000")
      expect(ownerBalance).to.equal(balance)
    })

    it("getting a reward for not the first deposits // bad work? Logs above", async function () {
      await this.depositToken.connect(this.bob).transfer(this.alice.address, this.alice_deposit)
      await this.depositToken.connect(this.alice).approve(this.pool.address, this.alice_deposit)

      await this.rewardToken.approve(this.pool.address, 1000000)
      await this.pool.addContractBalance(1000000)

      total_reward = await this.pool.contractBalance()
      balance1 = await this.rewardToken.balanceOf(this.alice.address)
      await this.pool.connect(this.alice).deposit(this.alice_deposit)
      balance2 = await this.rewardToken.balanceOf(this.alice.address)

      console.log("total number of reward tokens", total_reward.toString())
      console.log("initial balance of reward tokens", balance1.toString())
      console.log("the balance of reward tokens after receiving the reward", balance2.toString())
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

      it("getting a reward when withdrawing funds // bad work? Logs above", async function () {
        await this.rewardToken.approve(this.pool.address, 1000000)
        await this.pool.addContractBalance(1000000)

        total_reward = await this.pool.contractBalance()
        balance1 = await this.rewardToken.balanceOf(this.alice.address)
        await this.pool.connect(this.alice).withdraw(this.half_alice_deposit)
        balance2 = await this.rewardToken.balanceOf(this.alice.address)

        console.log("total number of reward tokens", total_reward.toString())
        console.log("initial balance of reward tokens", balance1.toString())
        console.log("the balance of reward tokens after receiving the reward", balance2.toString())
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
    it("function only owner", async function () {
      await expect(this.pool.connect(this.alice).addContractBalance(1000)).to.be.revertedWith("Ownable: caller is not the owner")
    })

    it("increase contractBalance", async function () {
      await this.rewardToken.approve(this.pool.address, 1000)
      await this.pool.addContractBalance(1000)
      balance = await this.rewardToken.balanceOf(this.pool.address)
      contractBalance = await this.pool.contractBalance()
      expect(balance).to.equal(1000)
      expect(contractBalance).to.equal(1000)
    })
  })
})
