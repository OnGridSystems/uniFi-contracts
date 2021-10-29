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

    // penalties for early withdraw stake
    uint256 public penalties;

    // Sum of rewards that staker will receive for his stake
    // nominated in basis points (1/10000) of staked amount
    uint256 public rewardRate;

    event Stake(address indexed user, uint256 indexed stakeId, uint256 amount, uint256 startTime, uint256 endTime);

    event Unstake(address indexed user, uint256 indexed stakeId, uint256 amount, uint256 startTime, uint256 endTime);

    event EmergencyWithdraw(address indexed user, uint256 indexed stakeId, uint256 amount);

    event Harvest(address indexed user, uint256 indexed stakeId, uint256 amount, uint256 harvestTime);

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
        harvestableYield = calculateHarvestableYield(
            _stake.totalYield,
            _stake.startTime,
            _stake.endTime,
            _stake.lastHarvestTime,
            _stake.harvestedYield
        );
    }

    function calculateHarvestableYield(
        uint256 totalYield,
        uint256 startTime,
        uint256 endTime,
        uint256 lastHarvestTime,
        uint256 harvestedYield
    ) private view returns (uint256) {
        uint256 harvestableYield;
        if (_now() > endTime) {
            harvestableYield = totalYield.sub(harvestedYield);
        } else {
            harvestableYield = totalYield.mul(_now().sub(lastHarvestTime)).div(endTime.sub(startTime));
        }
        return harvestableYield;
    }

    function activeStake(address _userAddress) public view returns (bool[] memory) {
        uint256 length = getStakesLength(_userAddress);
        bool[] memory activeStakePos = new bool[](length);
        for (uint256 i = 0; i < length; i = i.add(1)) {
            if (stakes[_userAddress][i].active == true) {
                activeStakePos[i] = true;
            }
        }
        return activeStakePos;
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
        uint256 startTime = _now();
        uint256 endTime = _now().add(stakeDurationDays.mul(1 days));
        stakes[msg.sender].push(
            StakeInfo({
                active: true,
                stakedAmount: _amount,
                startTime: startTime,
                endTime: endTime,
                totalYield: _amount.mul(rewardRate).div(10000),
                harvestedYield: 0,
                lastHarvestTime: startTime
            })
        );
        totalStaked = totalStaked.add(_amount);
        emit Stake(msg.sender, getStakesLength(msg.sender), _amount, startTime, endTime);
    }

    // Withdraw user's stake
    function unstake(uint256 _stakeId) public {
        StakeInfo memory _stake = stakes[msg.sender][_stakeId];
        require(_stake.active == true, "Stake is not active!");
        require(_now() > _stake.endTime, "Deadline for unstake has not passed!");
        // todo: add DAO1.transfer amount DAO-44
        stakes[msg.sender][_stakeId].active = false;
        totalStaked = totalStaked.sub(_stake.stakedAmount);
        emit Unstake(msg.sender, _stakeId, _stake.stakedAmount, _stake.startTime, _stake.endTime);
    }

    // early withdraw user's stake with payment of a fine
    function earlyUnstake(uint256 _stakeId) public {
        StakeInfo memory _stake = stakes[msg.sender][_stakeId];
        require(_stake.active == true, "Stake is not active!");
        // todo: add DAO1.transfer amount-amount*earlyUnstakeFee DAO-44
        uint256 harvestableYield = calculateHarvestableYield(
            _stake.totalYield,
            _stake.startTime,
            _stake.endTime,
            _stake.lastHarvestTime,
            _stake.harvestedYield
        );
        stakes[msg.sender][_stakeId].active = false;
        stakes[msg.sender][_stakeId].endTime = _now();
        stakes[msg.sender][_stakeId].totalYield = _stake.harvestedYield.add(harvestableYield);
        totalStaked = totalStaked.sub(_stake.stakedAmount);
        penalties = penalties.add(_stake.stakedAmount.mul(earlyUnstakeFee).div(10000));
        emit Unstake(msg.sender, _stakeId, _stake.stakedAmount, _stake.startTime, _stake.endTime);
    }

    function harvest(uint256 _stakeId) public {
        StakeInfo memory _stake = stakes[msg.sender][_stakeId];
        uint256 harvestableYield = calculateHarvestableYield(
            _stake.totalYield,
            _stake.startTime,
            _stake.endTime,
            _stake.lastHarvestTime,
            _stake.harvestedYield
        );
        // todo: add DAO1.transfer DAO-44
        stakes[msg.sender][_stakeId].harvestedYield = stakes[msg.sender][_stakeId].harvestedYield.add(harvestableYield);
        stakes[msg.sender][_stakeId].lastHarvestTime = _now();
        emit Harvest(msg.sender, _stakeId, harvestableYield, _now());
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
