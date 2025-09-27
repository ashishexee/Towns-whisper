// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "forge-std/Script.sol";
import {UserRegistry} from "src/UserRegistry.sol";

contract DeployUserRegistry is Script {
    function run() external returns (UserRegistry userRegistry) {
        // Get the private key from your .env file
        uint256 deployerKey = vm.envUint("HEDERA_PRIVATE_KEY");

        // Start broadcasting transactions
        vm.startBroadcast(deployerKey);

        // Deploy the contract
        userRegistry = new UserRegistry();

        // Log the deployed address for easy access
        console2.log("UserRegistry deployed to:", address(userRegistry));

        // Stop broadcasting
        vm.stopBroadcast();
    }
}