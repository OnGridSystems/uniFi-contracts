// SPDX-License-Identifier: BSD-3-Clause

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract DAO1BridgedToken is ERC20, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    constructor() ERC20("DAO1", "DAO1") {
        _setupRole(MINTER_ROLE, msg.sender);
    }

    /**
     * @dev Mints a token to the given address
     * @param to the receiver
     * @param amount the number of tokens to be minted
     */
    function mint(address to, uint256 amount) public onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }

    /**
     * @dev Destroys a token from the msg.sender address
     * @param amount the number of tokens to be destroyed
     */
    function burn(uint256 amount) public {
        _burn(_msgSender(), amount);
    }
}
