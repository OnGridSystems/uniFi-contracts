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
        uint256 totalYield;
        uint256 harvestedYield;
        uint256 lastHarvestTime;
    }

    bool public stakesOpen;

    IERC20 public token;

    mapping(address => StakeInfo[]) public stakes;

    uint256 public totalStaked;

    // The position locking period in seconds.
    // Counted from the moment of stake deposit and expires after `stakeDuration` seconds.
    uint256 public stakeDurationDays;

    // Fee for early unstake in basis points (1/10000)
    // If the user withdraws before stake expiration, he pays `earlyUnstakeFee`
    uint256 public earlyUnstakeFee;

    // Sum of rewards that staker will receive for his stake
    // nominated in basis points (1/10000) of staked amount
    uint256 public rewardRate;

    event Stake(address indexed user, uint256 indexed stakeId, uint256 amount, uint256 startTime, uint256 endTime);

    event Unstake(address indexed user, uint256 indexed stakeId, uint256 amount, uint256 startTime, uint256 endTime);

    event EmergencyWithdraw(address indexed user, uint256 indexed stakeId, uint256 amount);

    constructor(
        IERC20 _token,
        uint256 _stakeDurationDays,
        uint256 _rewardRate,
        uint256 _earlyUnstakeFee
    ) {
        token = _token;
        stakeDurationDays = _stakeDurationDays;
        rewardRate = _rewardRate;
        earlyUnstakeFee = _earlyUnstakeFee;
    }

    function getStakesLength(address _userAddress) public view returns (uint256) {
        return stakes[_userAddress].length;
    }

    function getStake(address _userAddress, uint256 _stakeId)
        public
        view
        returns (
            bool active,
            uint256 stakedAmount,
            uint256 startTime,
            uint256 endTime,
            uint256 totalYield, // Entire yield for the stake (totally released on endTime)
            uint256 harvestedYield, // The part of yield user harvested already
            uint256 lastHarvestTime, // The time of last harvest event
            uint256 harvestableYield // The unlocked part of yield available for harvesting
        )
    {
        StakeInfo memory _stake = stakes[_userAddress][_stakeId];
        active = _stake.active;
        stakedAmount = _stake.stakedAmount;
        startTime = _stake.startTime;
        endTime = _stake.endTime;
        totalYield = _stake.totalYield;
        harvestedYield = _stake.harvestedYield;
        lastHarvestTime = _stake.lastHarvestTime;
        harvestableYield = 0; // todo: dynamically calculate in DAO-42
    }

    function start() public onlyOwner {
        stakesOpen = true;
    }

    function stop() public onlyOwner {
        stakesOpen = false;
    }

    // Deposit user's stake
    function stake(uint256 _amount) public {
        // todo: add DAO1.transferFrom DAO-44
        stakes[msg.sender].push(
            StakeInfo({
                active: true,
                stakedAmount: _amount,
                startTime: _now(),
                endTime: _now().add(stakeDurationDays.mul(1 days)),
                totalYield: 0, // todo DAO-41
                harvestedYield: 0, // todo will be mutated by harvest() DAO-42
                lastHarvestTime: _now() //todo will be mutated by harvest() DAO-42
            })
        );
        emit Stake(msg.sender, 0, _amount, 0, 0);
    }

    // Withdraw user's stake
    function unstake(uint256 _stakeId) public {
        // require the stake is active DAO-43
        // require the stake is expired DAO-43
        // if stake is not expired: early unstake and pay fines DAO-45
        // todo: add DAO1.transfer DAO-44
        stakes[msg.sender][_stakeId].active = false;
        emit Unstake(msg.sender, _stakeId, 0, 0, 0);
    }

    function harvest(uint256 _stakeId) public {
        // todo: DAO-42
        // todo: add DAO1.transfer DAO-44
        // mutate stake
        // emit event
    }

    // Withdraw without caring about rewards. EMERGENCY ONLY.
    function emergencyWithdraw(uint256 _stakeId) public {
        emit EmergencyWithdraw(msg.sender, _stakeId, 0);
    }

    // Returns block.timestamp, overridable for test purposes.
    function _now() internal view virtual returns (uint256) {
        return block.timestamp;
    }
}
