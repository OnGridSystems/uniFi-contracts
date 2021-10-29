module.exports = async function ({ getNamedAccounts, deployments }) {
  const { deploy, execute } = deployments
  const { deployer } = await getNamedAccounts()

  const UniFi = await ethers.getContract("UniFi")
  const token = UniFi.address
  const stakeDurationDays = 1
  const rewardRate = 155
  const earlyUnstakeFee = 155

  await deploy("FixedStaking1Day", {
    from: deployer,
    log: true,
    args: [token, stakeDurationDays, rewardRate, earlyUnstakeFee],
    contract: "FixedStaking",
  })

  await execute("FixedStaking1Day",
    {
      from: deployer,
      log: true
    },
    "start"
  )

}

module.exports.tags = ["FixedStaking1Day"]
module.exports.dependencies = ["UniFiToken"]
