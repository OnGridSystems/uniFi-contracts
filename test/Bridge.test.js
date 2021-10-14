const { expect } = require("chai");
const { parseEther } = ethers.utils;

describe("Bridge", function () {

    beforeEach(async function () {
        this.signers = await ethers.getSigners()
        this.owner = this.signers[0]
        this.account1 = this.signers[1]


        this.tokenFactory = await ethers.getContractFactory("DAO1")
        this.depositToken = await this.tokenFactory.deploy("DAO1", "DAO1", this.owner.address)
        this.contractFactory = await ethers.getContractFactory("Bridge")
        this.contract = await this.contractFactory.deploy(this.depositToken.address)
      })


    it("should be deployed", async function () {
        expect(await this.contract.deployed(), true)
        expect(await this.depositToken.deployed(), true)
    });

    it("should have correct state variables", async function () {
        expect(await this.depositToken.owner()).to.equal(this.owner.address)
    })

    it("impossible to deposit zero tokens", async function () {
        expect(this.contract.deposit(0)).to.be.revertedWith("Cannot deposit 0 Tokens")
    })

    it("impossible to deposit without allowance", async function () {
        await expect(this.contract.deposit(1)).to.be.revertedWith("ERC20: transfer amount exceeds allowance")
    })

    it("possible to deposit with allowance", async function () {
        await this.depositToken.approve(this.contract.address, parseEther("1200000"))
        expect(await this.contract.deposit(parseEther("500000")), true)
        let depositBalance = await this.depositToken.balanceOf(this.contract.address)
        expect(depositBalance).to.equal(parseEther("500000"))
        let ownerBalance = await this.depositToken.balanceOf(this.owner.address)
        expect(ownerBalance).to.equal(parseEther("3100000"))
        expect(await this.contract.deposit(parseEther("700000")), true)
        ownerBalance = await this.depositToken.balanceOf(this.owner.address)
        expect(ownerBalance).to.equal(parseEther("2400000"))
        depositBalance = await this.depositToken.balanceOf(this.contract.address)
        expect(depositBalance).to.equal(parseEther("1200000"))
    })

    it("impossible to deposit more than allowance", async function () {
        await this.depositToken.approve(this.contract.address, "12")
        await expect(this.contract.deposit(15)).to.be.revertedWith("ERC20: transfer amount exceeds allowance")
    })

    it("impossible to deposit more than available balance", async function () {
        await this.depositToken.connect(this.account1).approve(this.contract.address, "12")
        await expect(this.contract.connect(this.account1).deposit(5)).to.be.revertedWith("ERC20: transfer amount exceeds balance")
    })
  });