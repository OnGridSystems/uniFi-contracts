// SPDX-License-Identifier: BSD-3-Clause
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract Bridge {
    using SafeMath for uint256;
    address public token;

    mapping(address => uint256) public balances;

    event Deposit(address owner, uint256 amount);
    event Withdraw(address owner, uint256 amount);

    constructor(address _token) {
        require(_token != address(0), "Token cannot be the zero address");
        token = _token;
    }

    /**
     * @dev Deposit the "quantity" of DAO1 tokens to the reserve, increasing the balance of tokens
     * on the contract for further use it by the contract.
     * @param _amount Deposit amount
     * Requirements:
     *
     * - amount cannot be zero.
     * - the caller must have a balance of at least `amount`.
     * - the caller must have an allowance to the address of the contract at least `amount`.
     */

    function deposit(uint256 _amount) external payable {
        require(_amount > 0, "Cannot deposit 0 Tokens");

        balances[msg.sender] = balances[msg.sender].add(_amount);

        require(IERC20(token).transferFrom(msg.sender, address(this), _amount), "Insufficient Token Allowance");
        emit Deposit(msg.sender, _amount);
    }

    /**
     * @dev Withdraw the "quantity" of reserved DAO1 tokens, reducing the balance of tokens on the contract.
     * @param _amount Withdraw amount
     * Requirements:
     *
     * - amount cannot be zero.
     * - the caller must have a balance on contract of at least `amount`.
     */

    function withdraw(uint256 _amount) public payable {
        require(_amount > 0, "Cannot withdraw 0 Tokens!");

        require(balances[msg.sender] >= _amount, "Invalid amount to withdraw");

        balances[msg.sender] = balances[msg.sender].sub(_amount);

        require(IERC20(token).transfer(msg.sender, _amount), "Could not transfer tokens.");
        emit Withdraw(msg.sender, _amount);
    }
}
