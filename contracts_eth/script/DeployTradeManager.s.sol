pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {TradeManager} from "src/TradeManager.sol";

contract DeployTradeManager is Script {
    function run() external returns (TradeManager tradeManager) {
        uint256 deployerKey = vm.envUint("HEDERA_PRIVATE_KEY");
        address gameItems = vm.envAddress("GAME_ITEMS_ADDRESS");
        address runeCoin = vm.envAddress("RUNE_COIN_BRIDGE_ADDRESS");

        vm.startBroadcast(deployerKey);

        tradeManager = new TradeManager(gameItems, runeCoin);

        console2.log("TradeManager", address(tradeManager));
        console2.log("GameItems", gameItems);
        console2.log("RuneCoin", runeCoin);

        vm.stopBroadcast();
    }
}