// SPDX-License-Identifier: BSD-3-Clause
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";


contract Bridge {

    address public trustedDepositTokenAddress; 

    constructor(address _trustedDepositTokenAddress) {
        trustedDepositTokenAddress = _trustedDepositTokenAddress;
    }

    function deposit(uint256 amountToDeposit) external {

        require(amountToDeposit > 0, "Cannot deposit 0 Tokens");

        require(
            IERC20(trustedDepositTokenAddress).transferFrom(
                msg.sender,
                address(this),
                amountToDeposit
            ),
            "Insufficient Token Allowance"
        );
    }

}