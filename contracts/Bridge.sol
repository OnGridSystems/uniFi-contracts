// SPDX-License-Identifier: BSD-3-Clause
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract Bridge {
    using SafeMath for uint256;
    address public trustedDepositTokenAddress;

    mapping(address => uint256) public depositedTokens;

    constructor(address _trustedDepositTokenAddress) {
        trustedDepositTokenAddress = _trustedDepositTokenAddress;
    }

    function deposit(uint256 amountToDeposit) external {
        require(amountToDeposit > 0, "Cannot deposit 0 Tokens");

        require(IERC20(trustedDepositTokenAddress).transferFrom(msg.sender, address(this), amountToDeposit), "Insufficient Token Allowance");

        depositedTokens[msg.sender] = depositedTokens[msg.sender].add(amountToDeposit);
    }

    function withdraw(uint256 amountToWithdraw) external {
        require(amountToWithdraw > 0, "Cannot withdraw 0 Tokens!");

        require(depositedTokens[msg.sender] >= amountToWithdraw, "Invalid amount to withdraw");

        require(IERC20(trustedDepositTokenAddress).transfer(msg.sender, amountToWithdraw), "Could not transfer tokens.");

        depositedTokens[msg.sender] = depositedTokens[msg.sender].sub(amountToWithdraw);
    }
}
