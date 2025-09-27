pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {GameItems} from "src/GameItems.sol";

contract DeployGameItems is Script {
    function run() external returns (GameItems gameItems) {
        uint256 deployerKey = vm.envUint("HEDERA_PRIVATE_KEY");

        vm.startBroadcast(deployerKey);

        gameItems = new GameItems();

        console2.log("GameItems deployed to:", address(gameItems));

        vm.stopBroadcast();
    }
}