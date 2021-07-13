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

    event Unstake(address indexed user, uint256 indexed stakeId, uint256 amount, uint256 startTime, uint256 endTime, bool early);

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
        if (_now() > endTime) {
            harvestableYield = totalYield.sub(harvestedYield);
        } else {
            harvestableYield = totalYield.mul(_now().sub(lastHarvestTime)).div(endTime.sub(startTime));
        }
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
        (bool active, uint256 stakedAmount, uint256 startTime, uint256 endTime, , uint256 harvestedYield, , uint256 harvestableYield) = getStake(
            msg.sender,
            _stakeId
        );
        bool early;
        require(active, "Stake is not active!");
        if (_now() > endTime) {
            // todo: add DAO1.transfer amount DAO-44
            stakes[msg.sender][_stakeId].active = false;
            totalStaked = totalStaked.sub(stakedAmount);
            early = false;
        } else {
            // todo: add DAO1.transfer amount-amount*earlyUnstakeFee DAO-44
            stakes[msg.sender][_stakeId].active = false;
            stakes[msg.sender][_stakeId].endTime = _now();
            stakes[msg.sender][_stakeId].totalYield = harvestedYield.add(harvestableYield);
            totalStaked = totalStaked.sub(stakedAmount);
            penalties = penalties.add(stakedAmount.mul(earlyUnstakeFee).div(10000));
            early = true;
        }

        emit Unstake(msg.sender, _stakeId, stakedAmount, startTime, endTime, early);
    }

    function harvest(uint256 _stakeId) public {
        (, , , , , uint256 harvestedYield, , uint256 harvestableYield) = getStake(msg.sender, _stakeId);
        // todo: add DAO1.transfer DAO-44
        stakes[msg.sender][_stakeId].harvestedYield = harvestedYield.add(harvestableYield);
        stakes[msg.sender][_stakeId].lastHarvestTime = _now();
        emit Harvest(msg.sender, _stakeId, harvestableYield, _now());
    }

    function withdrawalPenalties(address _to, uint256 amount) public onlyOwner {
        require(penalties > amount, "Amount is more than there are penalties");
        // todo: add DAO1.transfer DAO-44
        penalties = penalties.sub(amount);
    }

    // Returns block.timestamp, overridable for test purposes.
    function _now() internal view virtual returns (uint256) {
        return block.timestamp;
    }
}
