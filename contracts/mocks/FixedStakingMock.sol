// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "../FixedStaking.sol";

contract FixedStakingMock is FixedStaking {
    using SafeMath for uint256;
    uint256 private currentTime;

    constructor(
        address _token,
        uint256 _stakeDurationDays,
        uint256 _rewardRate,
        uint256 _earlyUnstakeFee
    ) FixedStaking(_token, _stakeDurationDays, _rewardRate, _earlyUnstakeFee) {}

    function setCurrentTime(uint256 _currentTime) public {
        currentTime = _currentTime;
    }

    function increaseCurrentTime(uint256 _timeDelta) public {
        currentTime = currentTime.add(_timeDelta);
    }

    function _now() internal view override returns (uint256) {
        return currentTime;
    }
}
