const contractName = "FixedStaking90Days"

module.exports = async function ({ getNamedAccounts, deployments }) {
  const { deploy, execute } = deployments
  const { deployer } = await getNamedAccounts()

  const token = (await ethers.getContract("UniFi")).address
  const stakeDurationDays = 90
  const rewardRate = 1105
  const earlyUnstakeFee = 1105

  console.log("Deploying contract:", contractName)
  console.log("Deployer:", deployer)
  console.log("Arguments:", token, stakeDurationDays, rewardRate, earlyUnstakeFee)

  await deploy(contractName, {
    from: deployer,
    log: true,
    args: [token, stakeDurationDays, rewardRate, earlyUnstakeFee],
    contract: "FixedStaking",
  })

  await execute(contractName,
    {
      from: deployer,
      log: true
    },
    "start"
  )
}

module.exports.tags = [contractName]
module.exports.dependencies = ["UniFiToken"]
