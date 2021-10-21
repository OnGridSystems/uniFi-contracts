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
}

module.exports.tags = ["L1Bridge"]
module.exports.dependencies = ["DAO1Token"]
