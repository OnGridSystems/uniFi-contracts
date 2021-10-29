
// SPDX-License-Identifier: MIT

pragma solidity 0.8.0;

import "../DAO1DaiVault.sol";

contract DAO1DaiVaultMock is DAO1DaiVault {

   function ChangeDepositToken(address newToken) public{
       trustedDepositTokenAddress = newToken;
    }

   function ChangeRewardToken(address newToken) public{
        trustedRewardTokenAddress = newToken;
    }
}