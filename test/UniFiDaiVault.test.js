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

    this.alice_deposit = 10000
    this.fee = 0.005

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

  describe("deposit function", function () {
    it("deposit token on stake contract", async function () {
      contract_balance = await this.depositToken.balanceOf(this.pool.address)
      expected_balance = BigNumber.from((this.alice_deposit * (1 - this.fee)).toString())
      expect(expected_balance).to.equal(contract_balance)
    })

    it("increase in the total number of deposit tokens during the deposit", async function () {
      contract_balance = await this.pool.totalTokens()
      expected_balance = BigNumber.from((this.alice_deposit * (1 - this.fee)).toString())
      expect(expected_balance).to.equal(contract_balance)
    })

    it("creating a position for the user", async function () {
      deposit = await this.pool.depositedTokens(this.alice.address)
      depositTime = await this.pool.depositTime(this.alice.address)
      blockTime = await network.provider.send("eth_getBlockByNumber", ["latest", false])
      expect(blockTime.timestamp).to.equal(depositTime._hex)
      expected_deposit = BigNumber.from((this.alice_deposit * (1 - this.fee)).toString())
      expect(deposit).to.equal(expected_deposit)
    })

    it("owner receives fee for the deposit", async function () {
      ownerBalance = await this.depositToken.balanceOf(this.owner.address)
      balance = BigNumber.from((this.alice_deposit * this.fee).toString())
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

  describe("withdraw function", function () {
    // write checks that the tokens were actually debited from the contract to the owner's address
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
        await this.pool.connect(this.alice).withdraw(this.alice_deposit / 2)
        contract_balance = await this.depositToken.balanceOf(this.pool.address)
        holder_balance = await this.depositToken.balanceOf(this.alice.address)
        pool_balance = await this.pool.depositedTokens(this.alice.address)
        expected_pool_balance = this.alice_deposit * (1 - this.fee) - this.alice_deposit / 2
        expect(contract_balance).to.equal(this.alice_deposit * (1 - this.fee) - this.alice_deposit / 2)
        expect(holder_balance).to.equal((this.alice_deposit / 2) * (1 - this.fee))
        expect(pool_balance).to.equal(expected_pool_balance)
      })

      it("owner receives fee for the withdraw", async function () {
        await this.pool.connect(this.alice).withdraw(this.alice_deposit / 2)
        ownerBalance = await this.depositToken.balanceOf(this.owner.address)

        deposit_fee = this.alice_deposit * this.fee
        withdraw_fee = (this.alice_deposit / 2) * this.fee
        expect(ownerBalance).to.equal(deposit_fee + withdraw_fee)
      })

      it("decrease in the total number of deposit tokens during the withdraw", async function () {
        await this.pool.connect(this.alice).withdraw(this.alice_deposit / 2)
        contract_balance = await this.pool.totalTokens()
        expected_balance = this.alice_deposit * (1 - this.fee) - this.alice_deposit / 2
        expect(expected_balance).to.equal(contract_balance)
      })

      it("getting a reward when withdrawing funds // bad work? Logs above", async function () {
        await this.rewardToken.approve(this.pool.address, 1000000)
        await this.pool.addContractBalance(1000000)

        total_reward = await this.pool.contractBalance()
        balance1 = await this.rewardToken.balanceOf(this.alice.address)
        await this.pool.connect(this.alice).withdraw(this.alice_deposit / 2)
        balance2 = await this.rewardToken.balanceOf(this.alice.address)

        console.log("total number of reward tokens", total_reward.toString())
        console.log("initial balance of reward tokens", balance1.toString())
        console.log("the balance of reward tokens after receiving the reward", balance2.toString())
      })
    })
  })

  describe("emergency withdraw function", function () {
    // write checks that the tokens were actually debited from the contract to the owner's address
    it("Cannot withdraw 0 Tokens!", async function () {
      await expect(this.pool.emergencyWithdraw(0)).to.be.revertedWith("Cannot withdraw 0 Tokens!")
    })

    it("you can't emergencyWithdraw until the stake period has passed", async function () {
      await expect(this.pool.connect(this.alice).emergencyWithdraw(5000)).to.be.revertedWith("You recently staked, please wait before withdrawing.")
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
        await this.pool.connect(this.alice).emergencyWithdraw(this.alice_deposit / 2)
        contract_balance = await this.depositToken.balanceOf(this.pool.address)
        holder_balance = await this.depositToken.balanceOf(this.alice.address)
        pool_balance = await this.pool.depositedTokens(this.alice.address)
        expected_pool_balance = this.alice_deposit * (1 - this.fee) - this.alice_deposit / 2
        expect(contract_balance).to.equal(this.alice_deposit * (1 - this.fee) - this.alice_deposit / 2)
        expect(holder_balance).to.equal((this.alice_deposit / 2) * (1 - this.fee))
        expect(pool_balance).to.equal(expected_pool_balance)
      })

      it("owner receives fee for the emergencyWithdraw", async function () {
        await this.pool.connect(this.alice).emergencyWithdraw(this.alice_deposit / 2)
        ownerBalance = await this.depositToken.balanceOf(this.owner.address)

        deposit_fee = this.alice_deposit * this.fee
        withdraw_fee = (this.alice_deposit / 2) * this.fee
        expect(ownerBalance).to.equal(deposit_fee + withdraw_fee)
      })

      it("decrease in the total number of deposit tokens during the emergencyWithdraw", async function () {
        await this.pool.connect(this.alice).emergencyWithdraw(this.alice_deposit / 2)
        contract_balance = await this.pool.totalTokens()
        expected_balance = this.alice_deposit * (1 - this.fee) - this.alice_deposit / 2
        expect(expected_balance).to.equal(contract_balance)
      })

      it("emergency withdrawing does not issue a reward", async function () {
        await this.rewardToken.approve(this.pool.address, 1000000)
        await this.pool.addContractBalance(1000000)

        balance1 = await this.rewardToken.balanceOf(this.alice.address)
        await this.pool.connect(this.alice).emergencyWithdraw(this.alice_deposit / 2)
        balance2 = await this.rewardToken.balanceOf(this.alice.address)
        expect(balance1).to.equal(balance2)

      })
    })
  })
})
