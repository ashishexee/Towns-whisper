import GAME_ITEMS_ABI_JSON from '../game/abi/abi_game_items.json' assert { type: 'json' };
import STAKING_MANAGER_ABI_JSON from '../game/abi/abi_staking.json' assert { type: 'json' };
import TRADE_MANAGER_ABI_JSON from '../game/abi/abi_trading.json' assert { type: 'json' };
import ERC20_ABI_JSON from '../game/abi/abi_erc20.json' assert { type: 'json' }; // You'll need to create this file

// Define your contract addresses
const addresses = {
    gameItems: '0x5b2970c664ed9f62b10c674e796a4e602491c0fb',   // sepolia Testnet Deployed Contract
    stakingManager: '0x26226e2d34a8754e33afb2dd7c03fa21155fc222', // sepolia Testnet Deployed Contract
    tradeManager: '0x79475AD66448E206F77467A8d0F0F0b23337eA31', // <-- FIX THIS ADDRESS
    runeCoin: '0x0000000000000000000000000000000000697ded' // <-- ADD YOUR TOKEN ADDRESS
};

// Export the ABIs and addresses
export const GAME_ITEMS_ABI = GAME_ITEMS_ABI_JSON.abi;
export const STAKING_MANAGER_ABI = STAKING_MANAGER_ABI_JSON.abi;
export const TRADE_MANAGER_ABI = TRADE_MANAGER_ABI_JSON.abi;
export const ERC20_ABI = ERC20_ABI_JSON.abi;
export const CONTRACT_ADDRESSES = addresses;
