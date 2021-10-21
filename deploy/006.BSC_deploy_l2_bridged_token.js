module.exports = async function ({ getNamedAccounts, deployments }) {
  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()

  const name = "DAO1"
  const symbol = "DAO1"

  await deploy("L2BridgedToken", {
    from: deployer,
    log: true,
    args: [name, symbol],
  })

}

module.exports.tags = ["L2BridgedToken"]
