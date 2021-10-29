// SPDX-License-Identifier: BSD-3-Clause
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "./DAO1BridgedToken.sol";

/**
 * @title Bridge Layer 2 contract
 * @dev This contract deployed on secondary network with Bridged token contract
 * - upon `finalizeInboundTransfer` call from oracle, it mints corresponding amount of tokens on Layer 2 network
 * - upon `outboundTransfer` call from token holder it withdraws and burns L2 the requested token
 * @author DAO1
 **/
contract L2Bridge is AccessControl {
    using SafeMath for uint256;

    // L2 mintable + burnable token that acts as a twin of L2 asset
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

    /**
     * @notice Finalizes a deposit from L1 to L2; callable only by ORACLE_ROLE
     * @param _to L2 address of destination
     * @param _amount Token amount being deposited
     * @param _tx Tx hash of `L1Bridge.outboundTransfer` on L1 side
     */
    function finalizeInboundTransfer(
        address _to,
        uint256 _amount,
        string memory _tx
    ) external onlyRole(ORACLE_ROLE) {
        require(_amount > 0, "Cannot mint 0 Tokens");
        require(_to != address(0), "Token cannot be the zero address");

        balances[_to] = balances[_to].add(_amount);

        require(DAO1BridgedToken(token).mint(_to, _amount), "Mint failed");
        emit Mint(_to, _amount);
    }


    /**
     * @notice Initiates a withdrawal from L2 to L1; callable by any tokenholder.
     * @param _to L1 address of destination
     * @param _amount Token amount being withdrawn
     */
    function outboundTransfer(address _to, uint256 _amount) external {
        require(_amount > 0, "Cannot burn 0 Tokens");
        require(balances[msg.sender] >= _amount, "Invalid amount to burn");

        balances[msg.sender] = balances[msg.sender].sub(_amount);

        require(DAO1BridgedToken(token).burn(msg.sender, _amount), "Burn failed");
        emit Burn(msg.sender, _amount);
    }
}
