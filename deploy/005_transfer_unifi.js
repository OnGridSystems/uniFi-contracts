module.exports = async function ({ getNamedAccounts, deployments }) {

  const { deployer, tester1, tester2 } = await getNamedAccounts()

  const UniFi = await ethers.getContract("UniFi")
  const FixedStaking1Day = await ethers.getContract("FixedStaking1Day")
  const FixedStaking2Days = await ethers.getContract("FixedStaking2Days")
  const FixedStaking3Days = await ethers.getContract("FixedStaking3Days")

  let amount = ethers.utils.parseUnits("900000", 18)
  await (await UniFi.transfer(FixedStaking1Day.address, amount)).wait()
  await (await UniFi.transfer(FixedStaking2Days.address, amount)).wait()
  await (await UniFi.transfer(FixedStaking3Days.address, amount)).wait()

  let balance = await UniFi.balanceOf(FixedStaking1Day.address)
  console.log("Balance (FixedStaking1Day):",
    FixedStaking1Day.address,
    ethers.utils.formatEther(balance, 18)
  )

  balance = await UniFi.balanceOf(FixedStaking2Days.address)
  console.log("Balance (FixedStaking2Days):",
    FixedStaking2Days.address,
    ethers.utils.formatEther(balance, 18)
  )

  balance = await UniFi.balanceOf(FixedStaking3Days.address)
  console.log("Balance (FixedStaking3Days):",
    FixedStaking3Days.address,
    ethers.utils.formatEther(balance, 18)
  )

  amount = ethers.utils.parseUnits("100000", 18)
  await (await UniFi.transfer(tester1, amount)).wait()
  await (await UniFi.transfer(tester2, amount)).wait()

  balance = await UniFi.balanceOf(deployer)
  console.log("Balance (Deployer):",
    deployer,
    ethers.utils.formatEther(balance, 18)
  )

  balance = await UniFi.balanceOf(tester1)
  console.log("Balance (Tester1):",
    tester1,
    ethers.utils.formatEther(balance, 18)
  )

  balance = await UniFi.balanceOf(tester2)
  console.log("Balance (Tester2):",
    tester2,
    ethers.utils.formatEther(balance, 18)
  )
}

module.exports.tags = ["TransferUniFi"]
module.exports.dependencies = ["UniFiToken", "FixedStaking1Day", "FixedStaking2Days", "FixedStaking3Days"]
