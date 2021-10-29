const { expect } = require("chai")
const { parseEther } = ethers.utils

describe("DAO1 bridged token", function () {
  beforeEach(async function () {
    this.signers = await ethers.getSigners()
    this.owner = this.signers[0]
    this.account1 = this.signers[1]
    this.account2 = this.signers[2]

    this.contract = await ethers.getContractFactory("DAO1BridgedToken")
    this.token = await this.contract.deploy()
  })

  it("has a name", async function () {
    expect(await this.token.name()).to.equal("DAO1")
  })

  it("has a symbol", async function () {
    expect(await this.token.symbol()).to.equal("DAO1")
  })

  it("has 18 decimals", async function () {
    expect(await this.token.decimals()).to.equal(18)
  })

  it("returns the total amount of tokens", async function () {
    expect(await this.token.totalSupply()).to.equal(0)
  })

  it("returns the balance of owner", async function () {
    expect(await this.token.balanceOf(this.owner.address)).to.equal(0)
  })

  describe("Checking token methods", function () {
    const amount = parseEther("500000")
    const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"

    describe("Mint tokens", function () {
      beforeEach(async function () {
        await this.token.connect(this.owner).mint(this.owner.address, amount)
      })

      it("owner's balance increased", async function () {
        expect(await this.token.balanceOf(this.owner.address)).to.equal(amount)
      })

      it("total amount of tokens increased", async function () {
        expect(await this.token.totalSupply()).to.equal(amount)
      })

      it("reverts if ZERO_ADDRESS", async function () {
        await expect(this.token.connect(this.owner).mint(ZERO_ADDRESS, amount)).to.be.revertedWith("ERC20: mint to the zero address")
      })

      describe("Basic transfers", function () {
        beforeEach(async function () {
          ownerDAO1Balance = await this.token.balanceOf(this.owner.address)
          transfer = await this.token.connect(this.owner).transfer(this.account1.address, amount)
        })

        it("emits event Transfer", async function () {
          await expect(transfer).to.emit(this.token, "Transfer").withArgs(this.owner.address, this.account1.address, amount)
        })

        it("spender's balance decreased", async function () {
          expect(await this.token.balanceOf(this.owner.address)).to.equal(ownerDAO1Balance.sub(amount))
        })

        it("receiver's balance increased", async function () {
          expect(await this.token.balanceOf(this.account1.address)).to.equal(amount)
        })

        it("reverts if account1 has not enough balance", async function () {
          await expect(this.token.connect(this.account1).transfer(this.account2.address, amount.add(1))).to.be.revertedWith(
            "ERC20: transfer amount exceeds balance"
          )
        })
      })

      describe("Approve", function () {
        beforeEach(async function () {
          approve = await this.token.connect(this.owner).approve(this.account1.address, amount)
        })

        it("emits event Approval", async function () {
          await expect(approve).to.emit(this.token, "Approval").withArgs(this.owner.address, this.account1.address, amount)
        })

        it("allowance to account1", async function () {
          expect(await this.token.allowance(this.owner.address, this.account1.address)).to.equal(amount)
        })

        it("reverts if ZERO_ADDRESS", async function () {
          await expect(this.token.connect(this.owner).approve(ZERO_ADDRESS, amount)).to.be.revertedWith("ERC20: approve to the zero address")
        })

        describe("transferFrom", function () {
          beforeEach(async function () {
            ownerDAO1Balance = await this.token.balanceOf(this.owner.address)
            transferFrom = await this.token.connect(this.account1).transferFrom(this.owner.address, this.account2.address, amount.sub(1))
          })

          it("emits event Transfer", async function () {
            await expect(transferFrom).to.emit(this.token, "Transfer").withArgs(this.owner.address, this.account2.address, amount.sub(1))
          })

          it("emits event Approval (allowance decreased)", async function () {
            await expect(transferFrom).to.emit(this.token, "Approval").withArgs(this.owner.address, this.account1.address, 1)
          })

          it("owner allowance to account1", async function () {
            expect(await this.token.allowance(this.owner.address, this.account1.address)).to.equal(1)
          })

          it("owner balance after transfer", async function () {
            expect(await this.token.balanceOf(this.owner.address)).to.equal(1)
          })

          it("check account2 balance after transfer", async function () {
            expect(await this.token.balanceOf(this.account2.address)).to.equal(amount.sub(1))
          })

          it("allowance to account2", async function () {
            expect(await this.token.allowance(this.owner.address, this.account2.address)).to.equal(0)
          })

          it("reverts if account2 has not enough allowance", async function () {
            transferFrom = this.token.connect(this.account2).transferFrom(this.owner.address, this.account2.address, 1)

            await expect(transferFrom).to.be.revertedWith("ERC20: transfer amount exceeds allowance")
          })
        })
      })

      describe("increaseAllowance", function () {
        beforeEach(async function () {
          increaseAllowanceResult = await this.token.connect(this.owner).increaseAllowance(this.account1.address, amount)
        })

        it("emits event Approval", async function () {
          await expect(increaseAllowanceResult).to.emit(this.token, "Approval").withArgs(this.owner.address, this.account1.address, amount)
        })

        it("check owner allowance to account1", async function () {
          expect(await this.token.allowance(this.owner.address, this.account1.address)).to.equal(amount)
        })

        describe("decreaseAllowance", function () {
          beforeEach(async function () {
            decreaseAllowanceResult = await this.token.connect(this.owner).decreaseAllowance(this.account1.address, amount.div(2))
          })

          it("emits event Approval", async function () {
            const allowance = await this.token.allowance(this.owner.address, this.account1.address)
            await expect(decreaseAllowanceResult)
              .to.emit(this.token, "Approval")
              .withArgs(this.owner.address, this.account1.address, amount.sub(allowance))
          })

          it("owner allowance to account1", async function () {
            expect(await this.token.allowance(this.owner.address, this.account1.address)).to.equal(amount.sub(amount.div(2)))
          })

          it("reverts when decreased allowance below zero", async function () {
            await expect(this.token.connect(this.owner).decreaseAllowance(this.account1.address, amount.div(2).add(1))).to.be.revertedWith(
              "ERC20: decreased allowance below zero"
            )
          })
        })
      })

      describe("Burn tokens", function () {
        beforeEach(async function () {
          await this.token.connect(this.owner).burn(this.owner.address, amount)
        })

        it("owner's balance decreased", async function () {
          expect(await this.token.balanceOf(this.owner.address)).to.equal(0)
        })

        it("total amount of tokens decreased", async function () {
          expect(await this.token.totalSupply()).to.equal(0)
        })

        it("reverts if ZERO_ADDRESS", async function () {
          await expect(this.token.connect(this.owner).burn(ZERO_ADDRESS, amount)).to.be.revertedWith("ERC20: burn from the zero address")
        })

        it("reverts if exceeds balance", async function () {
          await expect(this.token.connect(this.owner).burn(this.owner.address, amount)).to.be.revertedWith("ERC20: burn amount exceeds balance")
        })
      })
    })
  })
})
