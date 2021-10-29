require("dotenv/config")

require("@nomiclabs/hardhat-waffle")
require("hardhat-deploy")
require("hardhat-deploy-ethers")
require("solidity-coverage")

/**
 * @type import('hardhat/config').HardhatUserConfig
 */

const accounts = {
  mnemonic: process.env.MNEMONIC || "test test test test test test test test test test test junk",
}

module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.8.0",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: "0.8.6",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },

  namedAccounts: {
    deployer: 0,
    tester1: 1,
    tester2: 2,
  },

  networks: {
    localhost: {
      live: false,
      saveDeployments: true,
      tags: ["local"],
    },

    hardhat: {
      live: false,
      saveDeployments: true,
      tags: ["test", "local"],
    },

    rinkeby: {
      url: `https://rinkeby.infura.io/v3/${process.env.INFURA_API_KEY}`,
      accounts,
      chainId: 4,
      live: true,
      saveDeployments: true,
      tags: ["staging"],
    },

    mumbai: {
      url: "https://rpc-mumbai.maticvigil.com/",
      accounts,
      chainId: 80001,
      live: true,
      saveDeployments: true,
      tags: ["staging"],
    },
  },
}
