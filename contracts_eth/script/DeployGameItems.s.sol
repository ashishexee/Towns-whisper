pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {GameItems} from "src/GameItems.sol";

contract DeployGameItems is Script {
    function run() external returns (GameItems gameItems) {
        uint256 deployerKey = vm.envUint("HEDERA_PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);
        address initialMinter;

        try vm.envAddress("INITIAL_MINTER") returns (address value) {
            initialMinter = value;
        } catch {
            initialMinter = deployer;
        }

        vm.startBroadcast(deployerKey);

        gameItems = new GameItems();

        if (initialMinter != deployer) {
            gameItems.grantRole(gameItems.MINTER_ROLE(), initialMinter);
        }

        console2.log("GameItems", address(gameItems));
        console2.log("Initial minter", initialMinter);

        vm.stopBroadcast();
    }
}