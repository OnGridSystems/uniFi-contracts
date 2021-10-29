//const { BN, constants, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');
const { BigNumber } = require('ethers');
//const { ZERO_ADDRESS } = constants;


describe("DAO1Stake", function() {
  beforeEach(async function () {
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();
    
    DAO1factory = await ethers.getContractFactory("DAO1");
    DAO1 = await DAO1factory.deploy("DAO1","DAO1",owner.address);
    DAO2 = await DAO1factory.deploy("DAO2","DAO2",owner.address);

    DAO1Stake = await ethers.getContractFactory("DAO1DaiVaultMock");
    DAO1Stake = await DAO1Stake.deploy();
    await DAO1Stake.ChangeDepositToken(DAO1.address)
    await DAO1Stake.ChangeRewardToken(DAO2.address)

    ownerBalance = await DAO1.balanceOf(owner.address);
    await DAO1.approve(DAO1Stake.address,ownerBalance,{from:owner.address})

    time=BigNumber.from("0");
    amount=30;
    amountBN=BigNumber.from(amount.toString())
    await DAO1Stake.deposit(amount);
  });

  describe("deposit function", function() {
    it("deposit token on stake contract", async function() {
      const contract_balance = await DAO1.balanceOf(DAO1Stake.address);
      expect(amountBN).to.equal(contract_balance);
    });
  //   it("can't deposit 0 token", async function() {
  //     await expect(DAO1Stake.deposit(0,period1)).to.be.revertedWith("Cannot deposit 0 Tokens");
  //   });
  //   //it("can't deposit more than the balance", async function() {
  //   //  await expect(DAO1Stake.deposit(ownerBalance,period1)).to.be.revertedWith("Insufficient Token Allowance");
  //   //});
  //   // !!!! TODO: outputs the ERC20 error code of the contract, then whether it is necessary to check this operation in the contract using require?
  //   it("creating a position for the user", async function() {
  //     position= await DAO1Stake.getPosition(owner.address,0)
  //     // !!!! TODO: comparison confirming the test
  //     //console.log(position)
  //   });
  // });

  // describe("getPosition function", function() {
  //   it("index out of range", async function() {
  //     await expect(DAO1Stake.getPosition(owner.address,5)).to.be.revertedWith("index out of range");
  //   });
  //   it("get position by position id", async function() {
  //     ZeroPosition=await DAO1Stake.getPosition(owner.address,0);
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
  //     await expect(DAO1Stake.withdraw(5)).to.be.revertedWith("index out of range");
  //   });
  //   it("you can't withdraw until the stake period has passed", async function() {
  //     await expect(DAO1Stake.withdraw(0)).to.be.revertedWith("You recently staked, please wait before withdrawing.");
  //   });
  //   it("withdraw when stake period has passed", async function() {
  //     count=BigNumber.from("2");
  //     time=BigNumber.from((period1*24*60*60+1).toString())

  //     await DAO1Stake.setCurrentBlockTime(time);
  //     await DAO1Stake.withdraw(0);

  //     contract_balance = await DAO1.balanceOf(DAO1Stake.address);
  //     holder_balance = await DAO1.balanceOf(owner.address);
  //     expect(contract_balance).to.equal(BigNumber.from((amount-amount1).toString()))
  //     balance=BigNumber.from("3599999999999999999999850") // the initial balance, set in the dao1 smart contract minus amount2, amount3
  //     expect(holder_balance).to.equal(balance)
      
  //     ZeroPosition=await DAO1Stake.getPosition(owner.address,0);
  //     amount0=BigNumber.from(amount1.toString())
  //     period0=BigNumber.from(period1.toString())
  //     time0=BigNumber.from("0")
  //     if ((ZeroPosition["depositTime"]._hex===time0._hex) && (ZeroPosition["period"]._hex===period0._hex) && (ZeroPosition["amount"]._hex===amount0._hex)){
  //       expect(1).to.equal(0);
  //     }


  //     await DAO1Stake.withdraw(0);
  //     ZeroPosition2=await DAO1Stake.getPosition(owner.address,0);
  //     if ((ZeroPosition["depositTime"]._hex===ZeroPosition2["depositTime"]._hex) && (ZeroPosition["period"]._hex===ZeroPosition2["period"]._hex) && (ZeroPosition["amount"]._hex===ZeroPosition2["amount"]._hex)){
  //       expect(2).to.equal(0);
  //      }
  //   });
  // });

  // describe("CountPositions mapping", function() {
  //   it("initial zero counter", async function() {
  //     count=BigNumber.from("0");
  //     expect(await DAO1Stake.CountPositions(addr1.address)).to.equal(count);
  //   });
  //   it("increasing the counter when making a deposit", async function() {
  //     count=BigNumber.from("3");
  //     expect(await DAO1Stake.CountPositions(owner.address)).to.equal(count);
  //   });
  //   it("reducing the counter when withdrawing position", async function() {
  //     count=BigNumber.from("2");
  //     time=BigNumber.from((period1*24*60*60+1).toString())
  //     await DAO1Stake.setCurrentBlockTime(time);
  //     await DAO1Stake.withdraw(0);
  //     expect(await DAO1Stake.CountPositions(owner.address)).to.equal(count);

  //   });
   });
});