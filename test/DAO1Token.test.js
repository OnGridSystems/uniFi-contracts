const { expect } = require("chai");

describe("DAO1 token", function() {

  const totalSupplyAmount = ethers.utils.parseEther("3600000")

  beforeEach(async function () {
    this.signers = await ethers.getSigners()
    this.deployer = this.signers[0]
    this.owner = this.signers[1]
    this.account1 = this.signers[2]
    this.account2 = this.signers[3]

    this.contract = await ethers.getContractFactory("DAO1")
    this.token = await this.contract.deploy("DAO1", "DAO1", this.owner.address)
  });

  it("has a name", async function () {
    expect(await this.token.name()).to.equal("DAO1")
  });

  it("has a symbol", async function () {
    expect(await this.token.symbol()).to.equal("DAO1")
  });

  it("has 18 decimals", async function () {
    expect(await this.token.decimals()).to.equal(18)
  });

  it("returns the total amount of tokens", async function () {
    expect(await this.token.totalSupply()).to.equal(totalSupplyAmount)
  });

  it("is the owner of the token", async function () {
    expect(await this.token.owner()).to.equal(this.owner.address)
  });

  it("returns the balance of owner", async function () {
    expect(await this.token.balanceOf(this.owner.address))
      .to.equal(totalSupplyAmount)
  });

  describe("Checking token methods", function () {

    const amount = ethers.utils.parseEther("1")
    const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"

    describe("Checking transfer method", function () {

      beforeEach(async function () {
        ownerDAO1Balance = await this.token.balanceOf(this.owner.address)
        transfer = await this.token.connect(this.owner)
          .transfer(this.account1.address, amount)
      });

      it("emits event Transfer", async function () {
        await expect(transfer).to.emit(this.token, "Transfer")
                .withArgs(this.owner.address, this.account1.address, amount)
      });

      it("check owner balance after transfer", async function () {
        expect(await this.token.balanceOf(this.owner.address))
          .to.equal(ownerDAO1Balance.sub(amount))
      });

      it("check account1 balance after transfer", async function () {
        expect(await this.token.balanceOf(this.account1.address)).to.equal(amount)
      });

      it("reverts if account1 has not enough balance", async function () {
        await expect(this.token.connect(this.account1)
                .transfer(this.account2.address, amount.add(1)))
                  .to.be.revertedWith("ERC20: transfer amount exceeds balance")
      })

    });

    describe("Checking approve method", function () {

      beforeEach(async function () {
        approve = await this.token.connect(this.owner)
                          .approve(this.account1.address, amount)
      });

      it("emits event Approval", async function () {
        await expect(approve).to.emit(this.token, "Approval")
                .withArgs(this.owner.address, this.account1.address, amount)
      });

      it("reverts if account1 has ZERO_ADDRESS", async function () {
         await expect(this.token.connect(this.owner)
                .approve(ZERO_ADDRESS, amount))
                  .to.be.revertedWith("ERC20: approve to the zero address")
      });

      describe("Checking transferFrom method", function () {
        beforeEach(async function () {
          ownerDAO1Balance = await this.token.balanceOf(this.owner.address)
          transferFrom = await this.token.connect(this.account1)
                                .transferFrom(
                                  this.owner.address,
                                  this.account2.address,
                                  amount
                                )
        });

        it("emits event Transfer", async function () {
          await expect(transferFrom).to.emit(this.token, "Transfer")
                  .withArgs(this.owner.address, this.account2.address, amount)
        });

        it("emits event Approval (decreaseAllowance)", async function () {
          await expect(transferFrom).to.emit(this.token, "Approval")
                  .withArgs(this.owner.address, this.account1.address, 0)
        });

        it("check owner allowance to account1", async function () {
          expect(await this.token.allowance(this.owner.address, this.account1.address))
            .to.equal(0)
        });

        it("check owner balance after transfer", async function () {
          expect(await this.token.balanceOf(this.owner.address))
            .to.equal(ownerDAO1Balance.sub(amount))
        });

        it("check account2 balance after transfer", async function () {
          expect(await this.token.balanceOf(this.account2.address)).to.equal(amount)
        });

        it("reverts if account1 has not enough allowance", async function () {

          transferFrom = this.token.connect(this.account1)
                          .transferFrom(
                            this.owner.address,
                            this.account2.address,
                            amount.add(1)
                          )

          await expect(transferFrom)
                  .to.be.revertedWith("ERC20: transfer amount exceeds allowance")
        });
      });
    });

    describe("Checking transferOwnership method", function () {

      beforeEach(async function () {
        transferOwnership = await this.token.connect(this.owner)
                              .transferOwnership(this.account1.address)
      });

      it("emits event OwnershipTransferred", async function () {
        await expect(transferOwnership).to.emit(this.token, "OwnershipTransferred")
                .withArgs(this.owner.address, this.account1.address)
      });


      it("is the owner of the token", async function () {
        expect(await this.token.owner()).to.equal(this.account1.address)
      });

      it("reverts if newOwner has ZERO_ADDRESS", async function () {

        transferOwnership = this.token.connect(this.account1)
                              .transferOwnership(ZERO_ADDRESS)
        await expect(transferOwnership)
                  .to.be.revertedWith("Ownable: new owner is the zero address")
      })
    });

    describe("Checking renounceOwnership method", function () {

      beforeEach(async function () {
        renounceOwnership = await this.token.connect(this.owner).renounceOwnership()
      });

      it("emits event OwnershipTransferred", async function () {
        await expect(renounceOwnership).to.emit(this.token, "OwnershipTransferred")
                .withArgs(this.owner.address, ZERO_ADDRESS)
      });


      it("contract without an owner", async function () {
        expect(await this.token.owner()).to.equal(ZERO_ADDRESS)
      });


    });
  });
});
