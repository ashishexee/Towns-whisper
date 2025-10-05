import GAME_ITEMS_ABI_JSON from '../game/abi/abi_game_items.json' assert { type: 'json' };
import STAKING_MANAGER_ABI_JSON from '../game/abi/abi_staking.json' assert { type: 'json' };
import TRADE_MANAGER_ABI_JSON from '../game/abi/abi_trading.json' assert { type: 'json' };
import ERC20_ABI_JSON from '../game/abi/abi_erc20.json' assert { type: 'json' }; // You'll need to create this file

// Define your contract addresses
const addresses = {
    gameItems: '0xf80c2f2ac5ed19f609071c06efd21eab686436f5',   // depoyed the conteract on 0g testnet
    stakingManager: '0x0d6c4d4046cdf8ca49ffaae4cf10b6bf7f1d7dc9', // sepolia Testnet Deployed Contract
    tradeManager: '0x79475AD66448E206F77467A8d0F0F0b23337eA31', 
    runeCoin: '0x0000000000000000000000000000000000697ded' 
};

// Export the ABIs and addresses
export const GAME_ITEMS_ABI = GAME_ITEMS_ABI_JSON.abi;
export const STAKING_MANAGER_ABI = STAKING_MANAGER_ABI_JSON.abi;
export const TRADE_MANAGER_ABI = TRADE_MANAGER_ABI_JSON.abi;
export const ERC20_ABI = ERC20_ABI_JSON.abi;
export const CONTRACT_ADDRESSES = addresses;
