module.exports = async function ({ getNamedAccounts, deployments }) {
  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()

  const UniFi = await ethers.getContract("UniFi")
  const token = UniFi.address
  const stakeDurationDays = 3
  const rewardRate = 1105
  const earlyUnstakeFee = 1105

  await deploy("FixedStaking3Days", {
    from: deployer,
    log: true,
    args: [token, stakeDurationDays, rewardRate, earlyUnstakeFee],
    contract: "FixedStaking",
  })
}

module.exports.tags = ["FixedStaking3Days"]
module.exports.dependencies = ["UniFiToken"]
