module.exports = async function ({ getNamedAccounts, deployments }) {
    const { deploy } = deployments
    const { deployer } = await getNamedAccounts()

    const DAO1 = await ethers.getContract("DAO1")
    const token = DAO1.address

    await deploy("Bridge", {
      from: deployer,
      log: true,
      args: [token],
    })
  }
  
  module.exports.tags = ["Bridge"]
  module.exports.dependencies = ["DAO1Token"]
