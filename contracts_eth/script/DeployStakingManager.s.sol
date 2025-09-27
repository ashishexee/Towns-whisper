pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {StakingManager} from "src/StakingManager.sol";

contract DeployStakingManager is Script {
    function run() external returns (StakingManager stakingManager) {
        uint256 deployerKey = vm.envUint("HEDERA_PRIVATE_KEY");
        address runeCoin = vm.envAddress("RUNE_COIN_BRIDGE_ADDRESS");

        vm.startBroadcast(deployerKey);

        stakingManager = new StakingManager(runeCoin);

        console2.log("StakingManager", address(stakingManager));
        console2.log("RuneCoin", runeCoin);

        vm.stopBroadcast();
    }
}