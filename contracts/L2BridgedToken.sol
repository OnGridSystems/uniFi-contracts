// SPDX-License-Identifier: BSD-3-Clause

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title Layer 2 token contract (twin of Layer1 token locked on mainnet's bridge)
 * @dev This contract deployed on secondary network and minted and burnt by L2 bridge
 * @author DAO1
 **/
contract L2BridgedToken is ERC20, AccessControl {
    bytes32 public constant BRIDGE_ROLE = keccak256("BRIDGE_ROLE");

    /**
     * @dev Sets the values for {name} and {symbol}.
     *
     */
    constructor(string memory _name, string memory _symbol) ERC20(_name, _symbol) {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /**
     * @dev Mints a token to the given address
     * @param to the receiver
     * @param amount the number of tokens to be minted
     */
    function mint(address to, uint256 amount) public onlyRole(BRIDGE_ROLE) {
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
