module.exports = async function ({ getNamedAccounts, deployments }) {
  const { deploy, execute } = deployments
  const { deployer } = await getNamedAccounts()
  const DAO1 = await ethers.getContract("DAO1")
  const L2BridgedToken = await ethers.getContract("L2BridgedToken")
  const l1token = DAO1.address
  const l2token = L2BridgedToken.address

  await deploy("L2Bridge", {
    from: deployer,
    log: true,
    args: [l1token, l2token],
  })

  const bridge = await ethers.getContract("L2Bridge")
  const ORACLE_ROLE = await bridge.ORACLE_ROLE()

  await execute(
    "L2Bridge",
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

module.exports.tags = ["L2Bridge"]
module.exports.dependencies = ["L2BridgedToken","DAO1Token"]
