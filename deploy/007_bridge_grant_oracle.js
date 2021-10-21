module.exports = async function ({ getNamedAccounts, deployments }) {
  const { deploy, execute } = deployments
  const { deployer } = await getNamedAccounts()

  const bridge = await ethers.getContract("L1Bridge")
  const ORACLE_ROLE = await bridge.ORACLE_ROLE()

  await execute(
    "L1Bridge",
    {
      from: deployer,
      log: true,
    },
    "grantRole",
    ORACLE_ROLE,
    deployer
  )

  if (await bridge.hasRole(ORACLE_ROLE, deployer)) {
    console.log("deployer has ORACLE_ROLE assigned")
  } else {
    console.log("ERROR: deployer hasn't ORACLE_ROLE")
  }
}

module.exports.tags = ["L1BridgeConfig"]
module.exports.dependencies = ["L1Bridge"]
