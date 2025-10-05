import React, { useState, useMemo } from 'react';
import { ethers } from 'ethers';
// Import your centralized contract config
import {
  STAKING_MANAGER_ABI,
  ERC20_ABI,
  CONTRACT_ADDRESSES
} from '../../contracts_eth/config.js';

const ChallengeScreen = ({ onAccept, onDecline, walletAddress }) => {
  const [isStaking, setIsStaking] = useState(false);
  const [txStatus, setTxStatus] = useState('');
  const [txError, setTxError] = useState('');

  // Existing states for UI controls
  const [difficulty, setDifficulty] = useState('Easy');
  const difficulties = ["Very Easy", "Easy", "Medium", "Hard"];
  const [time, setTime] = useState(12);
  const [stakeAmount, setStakeAmount] = useState(0.01);
  const MIN_TIME = 1, MAX_TIME = 20, MIN_STAKE = 0.001, MAX_STAKE = 0.01;

  const rewardAmount = useMemo(() => {
    if (!isStaking) return 0;

    const minMultiplier = 2.0; // At MIN_TIME (1 min)
    const maxMultiplier = 1.2; // At MAX_TIME (20 mins)

    // Clamp time to the defined min/max
    const clampedTime = Math.max(MIN_TIME, Math.min(time, MAX_TIME));

    const rewardMultiplier = maxMultiplier + 
      ((clampedTime - MAX_TIME) / (MIN_TIME - MAX_TIME)) * (minMultiplier - maxMultiplier);

    return parseFloat((stakeAmount * rewardMultiplier).toFixed(4));
  }, [stakeAmount, isStaking, time]);

  const handleAccept = async () => {
    setTxStatus('');
    setTxError('');

    if (isStaking) {
      // Validation checks
      if (!CONTRACT_ADDRESSES) {
        setTxError("Contract configuration not found. Please check config.js");
        return;
      }

      if (!CONTRACT_ADDRESSES.stakingManager) {
        setTxError("Staking contract address not configured");
        return;
      }

      if (!STAKING_MANAGER_ABI || STAKING_MANAGER_ABI.length === 0) {
        setTxError("Staking contract ABI not found or empty");
        return;
      }

      if (!walletAddress || typeof window.ethereum === 'undefined') {
        setTxError("Please connect your wallet first.");
        return;
      }

      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        console.log(signer);

        console.log('Contract Address:', CONTRACT_ADDRESSES.stakingManager);
        console.log('ABI length:', STAKING_MANAGER_ABI.length);

        const contractCode = await provider.getCode(CONTRACT_ADDRESSES.stakingManager);
        if (contractCode === '0x') {
          setTxError("No contract found at the specified address. Make sure the contract is deployed.");
          return;
        }

        const stakeAmountInWei = ethers.parseEther(stakeAmount.toString());
        const targetDurationSeconds = time * 60;

        console.log('Stake Amount (Wei):', stakeAmountInWei.toString());
        console.log('Duration (seconds):', targetDurationSeconds);

        const stakingManagerContract = new ethers.Contract(
          CONTRACT_ADDRESSES.stakingManager,
          STAKING_MANAGER_ABI,
          signer
        );

        setTxStatus("Preparing transaction...");

        // Check account balance first
        const balance = await provider.getBalance(await signer.getAddress());
        console.log('Account balance:', ethers.formatEther(balance), 'ETH');
        
        if (balance < stakeAmountInWei) {
          setTxError("Insufficient balance for stake + gas.");
          setTxStatus('');
          return;
        }

        try {
          setTxStatus("Executing transaction...");
          
          const stakeTx = await stakingManagerContract.stakeForSinglePlayer(
            targetDurationSeconds,
            { 
              value: stakeAmountInWei,
              gasLimit: 500000 // A generous gas limit can prevent estimation errors
            }
          );
          
          setTxStatus("Transaction sent, waiting for confirmation...");
          const receipt = await stakeTx.wait();
          
          console.log('Transaction receipt:', receipt);
          setTxStatus("Stake successful! Starting game...");
        } catch (txError) {
          // Handle transaction errors
          console.error('Transaction failed:', txError);
          
          let errorMessage = "Transaction failed";
          
          if (txError.reason) {
            errorMessage = `Contract error: ${txError.reason}`;
          } else if (txError.message) {
            if (txError.message.includes('execution reverted')) {
              errorMessage = "Contract rejected the transaction. Check your inputs.";
            } else if (txError.message.includes('insufficient funds')) {
              errorMessage = "Insufficient funds for transaction + gas";
            } else {
              errorMessage = txError.message;
            }
          }
          
          setTxError(errorMessage);
          setTxStatus('');
          
          console.log("Proceeding with game without stake due to transaction failure");
          onAccept({
            difficulty: difficulty,
            isStaking: false, 
            stakeAmount: "0 Rune",
            rewardAmount: "0 Rune",
            timeLimit: null,
          });
          return;
        }

      } catch (err) {
        console.error("Staking transaction failed:", err);
        
        let errorMessage = "Transaction failed";
        
        if (err.code === 'CALL_EXCEPTION') {
          errorMessage = "Contract call failed. The function may not exist or requirements are not met.";
        } else if (err.reason) {
          errorMessage = err.reason;
        } else if (err.message) {
          if (err.message.includes('user rejected')) {
            errorMessage = "Transaction was rejected by user";
          } else if (err.message.includes('insufficient funds')) {
            errorMessage = "Insufficient funds for transaction";
          } else {
            errorMessage = err.message;
          }
        }
        
        setTxError(errorMessage);
        setTxStatus('');
        
        // Instead of returning, show error but continue with no-stake mode
        console.log("Proceeding with game without stake due to transaction failure");
        onAccept({
          difficulty: difficulty,
          isStaking: false, // Fall back to no-stake mode
          stakeAmount: "0 Rune",
          rewardAmount: "0 Rune",
          timeLimit: null,
        });
        return;
      }
    }

    // Continue with game logic...
    onAccept({
      difficulty,
      isStaking,
      stakeAmount: isStaking ? stakeAmount : 0,
      timeLimit: isStaking ? time * 60 : null, // Convert minutes to seconds
    });
  };

  return (
    <div className="h-screen flex flex-col justify-center items-center text-center px-4 bg-gray-900/80 text-white">
      <div className="max-w-2xl w-full mx-auto p-8 border-2 border-teal-400/50 rounded-2xl shadow-lg shadow-teal-400/20 bg-gray-900">
        <h2 className="text-4xl font-cinzel text-teal-300 mb-4">The Elder's Challenge</h2>
        <p className="text-lg font-merriweather text-gray-300 mb-6">
          Choose your path. Play for honor, or raise the stakes for a greater reward. The choice is yours, but the clock is always ticking.
        </p>

        {/* Configuration Status */}
        {(!CONTRACT_ADDRESSES || !CONTRACT_ADDRESSES.stakingManager || !STAKING_MANAGER_ABI) && (
          <div className="mb-4 p-4 bg-red-900/50 border border-red-500 rounded-lg">
            <p className="text-red-300">⚠️ Contract configuration issue detected. Staking may not work.</p>
          </div>
        )}

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
                    disabled={!CONTRACT_ADDRESSES || !CONTRACT_ADDRESSES.stakingManager || !STAKING_MANAGER_ABI}
                    className={`px-6 py-2 w-40 font-bold rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${
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
              <p className="font-merriweather text-gray-400 mb-4">You must complete the challenge within this time to win the reward.</p>
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
              <p className="font-merriweather text-gray-400 mb-4">Choose the amount of 0G you wish to wager.</p>
              <div className="flex items-center justify-center gap-4">
                <span className="font-bold text-lg">{MIN_STAKE}</span>
                <input
                  type="range" min={MIN_STAKE} max={MAX_STAKE} step={0.001} value={stakeAmount}
                  onChange={(e) => setStakeAmount(parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-yellow-400"
                />
                <span className="font-bold text-lg">{MAX_STAKE}</span>
              </div>
              <p className="text-2xl font-bold text-white mt-3">{stakeAmount.toFixed(4)} 0G</p>
            </div>

            {/* Wager Details */}
            <div className="mb-8 p-6 bg-gray-800/50 border border-yellow-400/30 rounded-lg">
                <h4 className="text-2xl font-cinzel text-yellow-300 mb-4">Wager Details</h4>
                <div className="grid grid-cols-2 gap-4 text-lg font-merriweather">
                    <div className="text-left"><p className="text-gray-400">Time Limit:</p><p className="font-bold text-white text-xl">{time} minutes</p></div>
                    <div className="text-right"><p className="text-gray-400">Your Stake:</p><p className="font-bold text-yellow-400 text-xl">{stakeAmount.toFixed(4)} 0G</p></div>
                    <div className="col-span-2 text-center mt-2"><p className="text-gray-400">Potential Reward:</p><p className="font-bold text-green-400 text-xl">{rewardAmount} 0G</p></div>
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
