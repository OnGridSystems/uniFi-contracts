const contractName = "FixedStaking60Days"
const UniFiAddress = process.env.UniFiAddress

module.exports = async function ({ getNamedAccounts, deployments }) {
  const { deploy, execute } = deployments
  const { deployer } = await getNamedAccounts()

  const token = UniFiAddress || (await ethers.getContract("UniFi")).address
  const stakeDurationDays = 60
  const rewardRate = 450
  const earlyUnstakeFee = 450

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
if (!UniFiAddress) {
  module.exports.dependencies = ["UniFiToken"]
}
