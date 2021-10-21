module.exports = async function ({ getNamedAccounts, deployments }) {
  const { deploy, execute } = deployments
  const { deployer } = await getNamedAccounts()

  const DAO1 = await ethers.getContract("DAO1")
  const l1token = DAO1.address
  const l2token = "0xdeadbeef00000000000000000000000000000000"

  await deploy("L1Bridge", {
    from: deployer,
    log: true,
    args: [l1token, l2token],
  })

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

module.exports.tags = ["L1Bridge"]
module.exports.dependencies = ["DAO1Token"]
