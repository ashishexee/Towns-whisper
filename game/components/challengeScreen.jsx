import React, { useState, useMemo } from 'react';
import { ethers } from 'ethers';
  //import { TokenAllowanceApproveTransaction, AccountId, TokenId } from '@hashgraph/sdk';
// Import your centralized contract config
import {
  STAKING_MANAGER_ABI,
  ERC20_ABI,
  CONTRACT_ADDRESSES
} from '../../contracts_eth/config.js'; // Adjust path if you moved config.js

const ChallengeScreen = ({ onAccept, onDecline, walletAddress }) => {
  const [isStaking, setIsStaking] = useState(false);
  // New states to provide feedback to the user
  const [txStatus, setTxStatus] = useState('');
  const [txError, setTxError] = useState('');

  // Existing states for UI controls
  const [difficulty, setDifficulty] = useState('Easy');
  const difficulties = ["Very Easy", "Easy", "Medium", "Hard"];
  const [time, setTime] = useState(12);
  const [stakeAmount, setStakeAmount] = useState(0.01);
  const MIN_TIME = 1, MAX_TIME = 20, MIN_STAKE = 0.01, MAX_STAKE = 0.1;

  const rewardAmount = useMemo(() => {
    if (!isStaking) return 0;
    const normalizedTime = (MAX_TIME - time) / (MAX_TIME - MIN_TIME);
    const rewardMultiplier = 1.5 + normalizedTime * 1.0; // 1.5x to 2.5x
    return parseFloat((stakeAmount * rewardMultiplier).toFixed(4));
  }, [time, stakeAmount, isStaking]);



  const handleAccept = async () => {
    setTxStatus('');
    setTxError('');

    if (isStaking) {
      if (!walletAddress || typeof window.ethereum === 'undefined') {
        setTxError("Please connect your wallet first.");
        return;
      }

      try {
        // Convert amounts to Hedera-compatible format
        const stakeAmountInSmallestUnit = Math.floor(stakeAmount * Math.pow(10, 8)); // 8 decimals
        const targetDurationSeconds = time * 60;

        // Use Hedera SDK for approval instead of ethers
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();

        // Create Hedera client using the wallet's private key (you'll need to adapt this)
        const client = Client.forTestnet();
        // Note: You'll need to get the user's Hedera account ID and private key
        
        setTxStatus("1/2: Approving token allowance via Hedera...");
        
        const tokenId = TokenId.fromString("0.0.6913517"); // Your token ID
        const ownerId = AccountId.fromEvmAddress(0, 0, walletAddress);
        const spenderId = AccountId.fromEvmAddress(0, 0, CONTRACT_ADDRESSES.stakingManager);

        const approveTx = new TokenAllowanceApproveTransaction()
          .approveTokenAllowance(tokenId, ownerId, spenderId, stakeAmountInSmallestUnit)
          .freezeWith(client);

        const approveSubmit = await approveTx.execute(client);
        await approveSubmit.getReceipt(client);

        setTxStatus("2/2: Staking tokens for the game...");
        
        // Now call the staking contract
        const stakingManagerContract = new ethers.Contract(
          CONTRACT_ADDRESSES.stakingManager, 
          STAKING_MANAGER_ABI, 
          signer
        );
        
        const stakeTx = await stakingManagerContract.stakeForSinglePlayer(
          stakeAmountInSmallestUnit, 
          targetDurationSeconds
        );
        await stakeTx.wait();

        setTxStatus("Stake successful! Starting game...");

      } catch (err) {
        console.error("Staking transaction failed:", err);
        setTxError(err.reason || "Transaction failed. Check console.");
        setTxStatus('');
        return;
      }
    }

    // Continue with game logic...
    onAccept({
      difficulty: isStaking ? 'Medium' : difficulty,
      isStaking: isStaking,
      stakeAmount: isStaking ? `${stakeAmount.toFixed(4)} Rune` : "0 Rune",
      rewardAmount: isStaking ? `${rewardAmount} Rune` : "0 Rune",
      timeLimit: isStaking ? `${time} minutes` : null,
    });
  };

  return (
    <div className="h-screen flex flex-col justify-center items-center text-center px-4 bg-gray-900/80 text-white">
      <div className="max-w-2xl w-full mx-auto p-8 border-2 border-teal-400/50 rounded-2xl shadow-lg shadow-teal-400/20 bg-gray-900">
        <h2 className="text-4xl font-cinzel text-teal-300 mb-4">The Elder's Challenge</h2>
        <p className="text-lg font-merriweather text-gray-300 mb-6">
          Choose your path. Play for honor, or raise the stakes for a greater reward. The choice is yours, but the clock is always ticking.
        </p>

        {/* Staking Mode Toggle */}
        <div className="mb-8">
            <h3 className="text-2xl font-cinzel text-teal-400 mb-3">Choose Your Path</h3>
            <div className="flex justify-center gap-4">
                <button
                    onClick={() => setIsStaking(false)}
                    className={`px-6 py-2 w-40 font-bold rounded-lg transition-all duration-300 ${
                        !isStaking ? 'bg-teal-400 text-gray-900 shadow-lg shadow-teal-400/50' : 'bg-gray-700 text-teal-200 hover:bg-gray-600'
                    }`}
                >
                    No Stake
                </button>
                <button
                    onClick={() => setIsStaking(true)}
                    className={`px-6 py-2 w-40 font-bold rounded-lg transition-all duration-300 ${
                        isStaking ? 'bg-yellow-400 text-gray-900 shadow-lg shadow-yellow-400/50' : 'bg-gray-700 text-yellow-200 hover:bg-gray-600'
                    }`}
                >
                    Stake
                </button>
            </div>
        </div>

        {/* Conditional UI */}
        {isStaking ? (
          <div className="animate-fade-in">
            {/* Time Slider */}
            <div className="mb-8">
              <h3 className="text-2xl font-cinzel text-yellow-400 mb-4">Set Your Time</h3>
              <p className="font-merriweather text-gray-400 mb-4">A shorter time limit increases your risk and potential reward multiplier.</p>
              <div className="flex items-center justify-center gap-4">
                <span className="font-bold text-lg">{MIN_TIME} min</span>
                <input
                  type="range" min={MIN_TIME} max={MAX_TIME} value={time}
                  onChange={(e) => setTime(parseInt(e.target.value, 10))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-yellow-400"
                />
                <span className="font-bold text-lg">{MAX_TIME} min</span>
              </div>
              <p className="text-2xl font-bold text-white mt-3">{time} Minutes</p>
            </div>

            {/* Stake Amount Slider */}
            <div className="mb-8">
              <h3 className="text-2xl font-cinzel text-yellow-400 mb-4">Set Your Stake</h3>
              <p className="font-merriweather text-gray-400 mb-4">Choose the amount of Rune Coin you wish to wager.</p>
              <div className="flex items-center justify-center gap-4">
                <span className="font-bold text-lg">{MIN_STAKE}</span>
                <input
                  type="range" min={MIN_STAKE} max={MAX_STAKE} step={0.001} value={stakeAmount}
                  onChange={(e) => setStakeAmount(parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-yellow-400"
                />
                <span className="font-bold text-lg">{MAX_STAKE}</span>
              </div>
              <p className="text-2xl font-bold text-white mt-3">{stakeAmount.toFixed(4)} Rune</p>
            </div>

            {/* Wager Details */}
            <div className="mb-8 p-6 bg-gray-800/50 border border-yellow-400/30 rounded-lg">
                <h4 className="text-2xl font-cinzel text-yellow-300 mb-4">Wager Details</h4>
                <div className="grid grid-cols-2 gap-4 text-lg font-merriweather">
                    <div className="text-left"><p className="text-gray-400">Time Limit:</p><p className="font-bold text-white text-xl">{time} minutes</p></div>
                    <div className="text-right"><p className="text-gray-400">Your Stake:</p><p className="font-bold text-yellow-400 text-xl">{stakeAmount.toFixed(4)} Rune</p></div>
                    <div className="col-span-2 text-center mt-2"><p className="text-gray-400">Potential Reward:</p><p className="font-bold text-green-400 text-xl">{rewardAmount} Rune</p></div>
                </div>
            </div>
          </div>
        ) : (
          <div className="mb-8 animate-fade-in">
            <h3 className="text-2xl font-cinzel text-teal-400 mb-3">Select Difficulty</h3>
            <div className="flex justify-center gap-4">
              {difficulties.map(d => (
                <button key={d} onClick={() => setDifficulty(d)}
                  className={`px-6 py-2 font-bold rounded-lg transition-all duration-300 ${
                    difficulty === d ? 'bg-teal-400 text-gray-900 shadow-lg shadow-teal-400/50' : 'bg-gray-700 text-teal-200 hover:bg-gray-600'
                  }`}
                >{d}</button>
              ))}
            </div>
          </div>
        )}

        {/* Transaction Status/Error Display */}
        <div className="h-8 my-4">
          {txStatus && <p className="text-green-400 animate-pulse">{txStatus}</p>}
          {txError && <p className="text-red-500">{txError}</p>}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center gap-6">
          <button
            onClick={handleAccept}
            disabled={!!txStatus && !txError}
            className={`px-8 py-3 text-white font-bold rounded-full transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed ${
                isStaking ? 'bg-yellow-500 hover:shadow-2xl hover:shadow-yellow-500/50' : 'bg-green-500 hover:shadow-2xl hover:shadow-green-500/50'
            }`}
          >
            {txStatus ? 'Processing...' : (isStaking ? 'Accept & Stake' : 'Accept Challenge')}
          </button>
          <button
            onClick={onDecline}
            disabled={!!txStatus && !txError}
            className="px-8 py-3 bg-red-600 text-white font-bold rounded-full transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-red-600/50 disabled:opacity-50"
          >
            Decline
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChallengeScreen;