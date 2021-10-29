//const { BN, constants, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const { expect } = require("chai")
const { BigNumber } = require("ethers")
//const { ZERO_ADDRESS } = constants;

describe("UniFiStake", function () {
  beforeEach(async function () {
    ;[owner, addr1, addr2, ...addrs] = await ethers.getSigners()
    UniFifactory = await ethers.getContractFactory("UniFi")
    UniFi = await UniFifactory.deploy("UniFi", "UniFi", owner.address)
    DAO2 = await UniFifactory.deploy("DAO2", "DAO2", owner.address)

    UniFiStake = await ethers.getContractFactory("UniFiDaiVaultMock")
    UniFiStake = await UniFiStake.deploy()
    await UniFiStake.ChangeDepositToken(UniFi.address)
    await UniFiStake.ChangeRewardToken(DAO2.address)

    ownerBalance = await UniFi.balanceOf(owner.address)
    amount = 20000
    await UniFi.transfer(addr1.address, amount)
    await UniFi.connect(addr1).approve(UniFiStake.address, amount)
    amount = 10000
    fee = 0.005
    time = BigNumber.from("0")

    await UniFiStake.connect(addr1).deposit(amount, { from: addr1.address })
  })

  describe("deposit function", function () {
    it("deposit token on stake contract", async function () {
      // the test fails because the line for transferring the fee to the contract owner is commented out
      contract_balance = await UniFi.balanceOf(UniFiStake.address)
      expected_balance = BigNumber.from((amount * (1 - fee)).toString())
      expect(expected_balance).to.equal(contract_balance)
    })

    it("increase in the total number of deposit tokens during the deposit", async function () {
      contract_balance = await UniFiStake.totalTokens()
      expected_balance = BigNumber.from((amount * (1 - fee)).toString())
      expect(expected_balance).to.equal(contract_balance)
    })

    it("creating a position for the user", async function () {
      deposit = await UniFiStake.depositedTokens(addr1.address)
      depositTime = await UniFiStake.depositTime(addr1.address)
      blockTime = await network.provider.send("eth_getBlockByNumber", ["latest", false])
      expect(blockTime.timestamp).to.equal(depositTime._hex)
      expected_deposit = BigNumber.from((amount * (1 - fee)).toString())
      expect(deposit).to.equal(expected_deposit)
    })

    it("owner receives fee for the deposit", async function () {
      // the test fails because the line for transferring the fee to the contract owner is commented out
      ownerBalance2 = await UniFi.balanceOf(owner.address)
      balance = BigNumber.from("3599999999999999999980050") // the initial balance, set in the UniFi smart contract minus amount plus fee
      expect(ownerBalance2).to.equal(balance)
    })

    it("----------------", async function () {
      await DAO2.approve(UniFiStake.address, 1000000)
      await UniFiStake.addContractBalance(1000000)

      total_reward = await UniFiStake.contractBalance()
      console.log("total number of reward tokens", total_reward.toString())
      //expect(balance2).to.equal(100000);

      balance1 = await DAO2.balanceOf(addr1.address)
      balance4 = await UniFiStake.contractBalance()
      //await UniFiStake.connect(addr1).deposit(amount,{from:addr1.address});
      await UniFiStake.connect(addr1).claim()
      balance2 = await DAO2.balanceOf(addr1.address)
      balance3 = await UniFiStake.contractBalance()
      console.log("initial balance of reward tokens", balance1.toString())
      console.log("the balance of reward tokens after receiving the reward", balance2.toString())
    })

    it("can't deposit 0 token", async function () {
      await expect(UniFiStake.deposit(0)).to.be.revertedWith("Cannot deposit 0 Tokens")
    })
    //it("can't deposit more than the balance", async function() {
    //  await expect(UniFiStake.deposit(ownerBalance,period1)).to.be.revertedWith("Insufficient Token Allowance");
    //});
    // !!!! TODO: outputs the ERC20 error code of the contract, then whether it is necessary to check this operation in the contract using require?
    it("can't make a deposit after 60 days of contract creation", async function () {
      await network.provider.send("evm_increaseTime", [60 * 24 * 60 * 60 + 1])
      await expect(UniFiStake.deposit(amount)).to.be.revertedWith("Deposits are closed now!")
    })
  })

  // describe("getPosition function", function() {
  //   it("index out of range", async function() {
  //     await expect(UniFiStake.getPosition(owner.address,5)).to.be.revertedWith("index out of range");
  //   });
  //   it("get position by position id", async function() {
  //     ZeroPosition=await UniFiStake.getPosition(owner.address,0);
  //     amount=BigNumber.from(amount1.toString())
  //     period=BigNumber.from(period1.toString())
  //     expect(ZeroPosition["depositTime"]).to.equal(time)
  //     expect(ZeroPosition["period"]).to.equal(period);;
  //     expect(ZeroPosition["amount"]).to.equal(amount);
  //     expect(ZeroPosition["status"]).to.equal(true);

  //   });

  // });

  // describe("withdraw function", function() { // write checks that the tokens were actually debited from the contract to the owner's address
  //   it("index out of range", async function() {
  //     await expect(UniFiStake.withdraw(5)).to.be.revertedWith("index out of range");
  //   });
  //   it("you can't withdraw until the stake period has passed", async function() {
  //     await expect(UniFiStake.withdraw(0)).to.be.revertedWith("You recently staked, please wait before withdrawing.");
  //   });
  //   it("withdraw when stake period has passed", async function() {
  //     count=BigNumber.from("2");
  //     time=BigNumber.from((period1*24*60*60+1).toString())

  //     await UniFiStake.setCurrentBlockTime(time);
  //     await UniFiStake.withdraw(0);

  //     contract_balance = await UniFi.balanceOf(UniFiStake.address);
  //     holder_balance = await UniFi.balanceOf(owner.address);
  //     expect(contract_balance).to.equal(BigNumber.from((amount-amount1).toString()))
  //     balance=BigNumber.from("3599999999999999999999850") // the initial balance, set in the UniFi smart contract minus amount2, amount3
  //     expect(holder_balance).to.equal(balance)

  //     ZeroPosition=await UniFiStake.getPosition(owner.address,0);
  //     amount0=BigNumber.from(amount1.toString())
  //     period0=BigNumber.from(period1.toString())
  //     time0=BigNumber.from("0")
  //     if ((ZeroPosition["depositTime"]._hex===time0._hex) && (ZeroPosition["period"]._hex===period0._hex) && (ZeroPosition["amount"]._hex===amount0._hex)){
  //       expect(1).to.equal(0);
  //     }

  //     await UniFiStake.withdraw(0);
  //     ZeroPosition2=await UniFiStake.getPosition(owner.address,0);
  //     if ((ZeroPosition["depositTime"]._hex===ZeroPosition2["depositTime"]._hex) && (ZeroPosition["period"]._hex===ZeroPosition2["period"]._hex) && (ZeroPosition["amount"]._hex===ZeroPosition2["amount"]._hex)){
  //       expect(2).to.equal(0);
  //      }
  //   });
  // });

  // describe("CountPositions mapping", function() {
  //   it("initial zero counter", async function() {
  //     count=BigNumber.from("0");
  //     expect(await UniFiStake.CountPositions(addr1.address)).to.equal(count);
  //   });
  //   it("increasing the counter when making a deposit", async function() {
  //     count=BigNumber.from("3");
  //     expect(await UniFiStake.CountPositions(owner.address)).to.equal(count);
  //   });
  //   it("reducing the counter when withdrawing position", async function() {
  //     count=BigNumber.from("2");
  //     time=BigNumber.from((period1*24*60*60+1).toString())
  //     await UniFiStake.setCurrentBlockTime(time);
  //     await UniFiStake.withdraw(0);
  //     expect(await UniFiStake.CountPositions(owner.address)).to.equal(count);

  //   });
  //   });
})
