// SPDX-License-Identifier: BSD-3-Clause
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "./DAO1MintableToken.sol";

contract L2Bridge is AccessControl, DAO1MintableToken {
    using SafeMath for uint256;
    address public token;

    mapping(address => uint256) public balances;

    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");

    event Burn(address owner, uint256 amount);
    event Mint(address account, uint256 amount);

    constructor(address _token) {
        require(_token != address(0), "Token cannot be the zero address");
        token = _token;
        _setupRole(ORACLE_ROLE, msg.sender);
    }

    function finalizeInboundTransfer(
        address _to,
        uint256 _amount,
        string memory _l1_tx_hash
    ) external onlyRole(ORACLE_ROLE) {
        require(_amount > 0, "Cannot mint 0 Tokens");
        require(_to != address(0), "Token cannot be the zero address");

        balances[_to] = balances[_to].add(_amount);

        require(DAO1MintableToken(token).mint(_to, _amount), "Mint failed");
        emit Mint(_to, _amount);
    }

    function outboundTransfer(uint256 _amount) external {
        require(_amount > 0, "Cannot burn 0 Tokens");
        require(balances[msg.sender] >= _amount, "Invalid amount to burn");

        balances[msg.sender] = balances[msg.sender].sub(_amount);

        require(DAO1MintableToken(token).burn(msg.sender, _amount), "Burn failed");
        emit Burn(msg.sender, _amount);
    }
}
