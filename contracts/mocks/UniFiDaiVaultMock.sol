// SPDX-License-Identifier: MIT

pragma solidity 0.8.0;

import "../UniFiDaiVault.sol";

contract UniFiDaiVaultMock is UniFiDaiVault {
    constructor(address deposit, address reward) {
        trustedDepositTokenAddress = deposit;
        trustedRewardTokenAddress = reward;
    }
}
