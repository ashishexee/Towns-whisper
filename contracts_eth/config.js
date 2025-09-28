import GAME_ITEMS_ABI_JSON from '../game/abi/abi_game_items.json' assert { type: 'json' };
import STAKING_MANAGER_ABI_JSON from '../game/abi/abi_staking.json' assert { type: 'json' };
import TRADE_MANAGER_ABI_JSON from '../game/abi/abi_trading.json' assert { type: 'json' };
import ERC20_ABI_JSON from '../game/abi/abi_erc20.json' assert { type: 'json' }; // You'll need to create this file

// Define your contract addresses
const addresses = {
    gameItems: '0xbb7Fa14530376c15701ea3c603e9a19a38Fc15Ab',
    stakingManager: '0xB6fE57065a91EE055200E20F521F07b329A74623',
    tradeManager: '0x79475AD66448E206F77467A8d0F0F0b23337eA31', // <-- FIX THIS ADDRESS
    runeCoin: '0x0000000000000000000000000000000000697ded' // <-- ADD YOUR TOKEN ADDRESS
};

// Export the ABIs and addresses
export const GAME_ITEMS_ABI = GAME_ITEMS_ABI_JSON.abi;
export const STAKING_MANAGER_ABI = STAKING_MANAGER_ABI_JSON.abi;
export const TRADE_MANAGER_ABI = TRADE_MANAGER_ABI_JSON.abi;
export const ERC20_ABI = ERC20_ABI_JSON.abi;
export const CONTRACT_ADDRESSES = addresses;