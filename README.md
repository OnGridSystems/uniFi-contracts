# Smart contracts for UniFi

UniFi Ethereum contracts

![Solidity](https://img.shields.io/badge/solidity-v0.8-green)
![License](https://img.shields.io/github/license/OnGridSystems/unifi-contracts)
[![Build Status](https://img.shields.io/endpoint.svg?url=https%3A%2F%2Factions-badge.atrox.dev%2FOnGridSystems%2FUniFi_contracts%2Fbadge%3Fref%3Dmaster&style=flat)](https://actions-badge.atrox.dev/OnGridSystems/unifi_contracts/goto?ref=master)

Install node packages (hardhat)

`yarn install`
 
## Testing deploy

Create local environments

```
export MNEMONIC='<your MNEMONIC phrase>'
export INFURA_API_KEY=<your API key>
```

Run deploy

```
npx hardhat --network rinkeby deploy
npx hardhat --network rinkeby etherscan-verify --solc-input --api-key <Etherscan_API_Key>

npx hardhat --network mumbai deploy
npx hardhat --network mumbai etherscan-verify --solc-input --api-key <Etherscan_API_Key>
```
