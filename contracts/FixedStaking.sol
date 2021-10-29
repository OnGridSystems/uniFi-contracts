// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract FixedStaking is Ownable {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    struct StakeInfo {
        bool active;
        uint256 stakedAmount;
        uint256 startTime;
        uint256 endTime;
        uint256 claimed;
        uint256 lastClaimTime;
    }

    bool public active;

    IERC20 public token;

    mapping(address => StakeInfo[]) public stakes;

    uint256 public totalStaked;

    // The position locking period in seconds.
    // Counted from the moment of stake deposit and expires after `stakeDuration` seconds.
    uint256 public stakeDuration;

    // Fee for early unstake in basis points (1/10000)
    // If the user withdraws before stake expiration, he pays `earlyUnstakeFee`
    uint256 public earlyUnstakeFee;

    // Sum of rewards that staker will receive for his stake
    // nominated in basis points (1/10000) of staked amount
    uint256 public rewardRate;

    event Stake(
        address indexed user,
        uint256 indexed stakeId,
        uint256 amount,
        uint256 startTime,
        uint256 endTime
    );

    event Unstake(
        address indexed user,
        uint256 indexed stakeId,
        uint256 amount,
        uint256 startTime,
        uint256 endTime
    );

    event EmergencyWithdraw(
        address indexed user,
        uint256 indexed stakeId,
        uint256 amount
    );

    constructor(
        IERC20 _token,
        uint256 _stakeDuration,
        uint256 _rewardRate,
        uint256 _earlyUnstakeFee
    ) {
        token = _token;
        stakeDuration = _stakeDuration;
        rewardRate = _rewardRate;
        earlyUnstakeFee = _earlyUnstakeFee;
    }

    function getStakesLength(address _userAddress)
        public
        view
        returns (uint256)
    {
        return stakes[_userAddress].length;
    }

    function start() public onlyOwner {
        active = true;
    }

    function stop() public onlyOwner {
        active = false;
    }

    // Deposit user's stake
    function stake(uint256 _amount) public {
        stakes[msg.sender].push(
            StakeInfo({
                active: true,
                stakedAmount: _amount,
                startTime: block.timestamp,
                endTime: block.timestamp.add(stakeDuration),
                claimed: 0,
                lastClaimTime: block.timestamp
            })
        );
        emit Stake(msg.sender, 0, _amount, 0, 0);
    }

    // Withdraw user's stake
    function unstake(uint256 _stakeId) public {
        stakes[msg.sender][_stakeId].active = false;
        emit Unstake(msg.sender, _stakeId, 0, 0, 0);
    }

    // Withdraw without caring about rewards. EMERGENCY ONLY.
    function emergencyWithdraw(uint256 _stakeId) public {
        emit EmergencyWithdraw(msg.sender, _stakeId, 0);
    }
}
