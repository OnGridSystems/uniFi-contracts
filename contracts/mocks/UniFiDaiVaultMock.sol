
// SPDX-License-Identifier: MIT

pragma solidity 0.8.0;

import "../UniFiDaiVault.sol";

contract UniFiDaiVaultMock is UniFiDaiVault {

   function ChangeDepositToken(address newToken) public{
       trustedDepositTokenAddress = newToken;
    }

   function ChangeRewardToken(address newToken) public{
        trustedRewardTokenAddress = newToken;
    }
}
