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

    this.alice_balance_depositToken = 20000
    this.alice_deposit = 10000
    this.fee = 0.005

    await this.depositToken.transfer(this.alice.address, this.alice_balance_depositToken)
    await this.depositToken.connect(this.alice).approve(this.pool.address, this.alice_balance_depositToken)

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

    it("getting a reward for not the first deposits // bad work?", async function () {
      await this.rewardToken.approve(this.pool.address, 1000000)
      await this.pool.addContractBalance(1000000)

      total_reward = await this.pool.contractBalance()
      //expect(balance2).to.equal(100000);

      balance1 = await this.rewardToken.balanceOf(this.alice.address)
      balance4 = await this.pool.contractBalance()
      await this.pool.connect(this.alice).deposit(this.alice_deposit,{from:this.alice.address});
      //await this.pool.connect(this.alice).claim()
      balance2 = await this.rewardToken.balanceOf(this.alice.address)
      balance3 = await this.pool.contractBalance()

      console.log("total number of reward tokens", total_reward.toString())
      console.log("initial balance of reward tokens", balance1.toString())
      console.log("the balance of reward tokens after receiving the reward", balance2.toString())
    })

    it("can't deposit 0 token", async function () {
      await expect(this.pool.deposit(0)).to.be.revertedWith("Cannot deposit 0 Tokens")
    })
    //it("can't deposit more than the balance", async function() {
    //  await expect(this.pool.deposit(ownerBalance,period1)).to.be.revertedWith("Insufficient Token Allowance");
    //});
    // !!!! TODO: outputs the ERC20 error code of the contract, then whether it is necessary to check this operation in the contract using require?
    it("not possible to make a deposit after the specified days from the date of creation of the contract", async function () {
      disburseDuration = await this.pool.disburseDuration()
      LOCKUP_TIME = await this.pool.LOCKUP_TIME()
      work_contract_time = disburseDuration - LOCKUP_TIME
      await network.provider.send("evm_increaseTime", [work_contract_time + 1])
      await expect(this.pool.deposit(this.alice_deposit)).to.be.revertedWith("Deposits are closed now!")
    })
  })
})
