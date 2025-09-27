// In game/src/components/BalanceDisplay.jsx

import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';

// This is the EVM address for your HTS-backed Rune Token
const RUNE_TOKEN_ADDRESS = '0x0000000000000000000000000000000000697ded';

// This is the standard ERC-20 ABI for the `balanceOf` function
const RUNE_TOKEN_ABI = [
  {
    "constant": true,
    "inputs": [{ "name": "_owner", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "name": "balance", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

const BalanceDisplay = ({ provider, walletAddress }) => {
  const [balance, setBalance] = useState('...');

  useEffect(() => {
    const fetchBalance = async () => {
      if (!provider || !walletAddress) {
        return; // Don't run if we don't have a wallet connection
      }

      try {
        // Create an instance of the contract to interact with
        const runeTokenContract = new ethers.Contract(RUNE_TOKEN_ADDRESS, RUNE_TOKEN_ABI, provider);

        // Call the balanceOf function from the smart contract
        const rawBalance = await runeTokenContract.balanceOf(walletAddress);

        // Your token has 8 decimals, so we format the raw balance
        // The result is a human-readable string (e.g., "250.0")
        const formattedBalance = ethers.formatUnits(rawBalance, 8);
        
        setBalance(formattedBalance);

      } catch (error) {
        console.error("Failed to fetch Rune Token balance:", error);
        setBalance('Error');
      }
    };

    fetchBalance();

    // Re-fetch balance every 30 seconds
    const interval = setInterval(fetchBalance, 30000);

    // Cleanup interval on component unmount
    return () => clearInterval(interval);

  }, [provider, walletAddress]); // Rerun this effect if the provider or wallet address changes

  // Don't render anything if the wallet is not connected
  if (!walletAddress) {
    return null;
  }

  return (
    <div 
      className="absolute top-4 left-4 bg-black bg-opacity-60 text-white p-3 rounded-lg shadow-lg flex items-center z-50"
      style={{ fontFamily: 'Cinzel, serif' }}
    >
      <span className="text-yellow-400 text-2xl mr-3">🪙</span>
      <div className="text-xl font-bold">
        {balance} <span className="text-sm font-normal text-gray-300">RN</span>
      </div>
    </div>
  );
};

export default BalanceDisplay;