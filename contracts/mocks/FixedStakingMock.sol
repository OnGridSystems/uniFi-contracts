// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "../FixedStaking.sol";

contract FixedStakingMock is FixedStaking {
    uint256 private currentTime;

    constructor(
        IERC20 _token,
        uint256 _stakeDurationDays,
        uint256 _rewardRate,
        uint256 _earlyUnstakeFee
    ) FixedStaking(_token, _stakeDurationDays, _rewardRate, _earlyUnstakeFee) {}

    function setCurrentTime(uint256 _currentTime) public {
        currentTime = _currentTime;
    }

    function _now() internal view override returns (uint256) {
        return currentTime;
    }
}
