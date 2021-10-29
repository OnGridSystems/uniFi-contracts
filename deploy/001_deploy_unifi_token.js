module.exports = async function ({ getNamedAccounts, deployments }) {
  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()

  const name = "UniFi"
  const symbol = "UniFi"
  const toAddress = deployer

  await deploy("UniFi", {
    from: deployer,
    log: true,
    args: [name, symbol, toAddress],
  })
}

module.exports.tags = ["UniFiToken"]
