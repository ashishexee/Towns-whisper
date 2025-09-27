import React, { useState, useMemo } from 'react';

const ChallengeScreen = ({ onAccept, onDecline }) => {
  const [isStaking, setIsStaking] = useState(false);

  // State for "No Stake" mode
  const [difficulty, setDifficulty] = useState('Easy');
  const difficulties = ["Very Easy", "Easy", "Medium", "Hard"];

  // State for "Stake" mode
  const [time, setTime] = useState(12); // in minutes
  const MIN_TIME = 1;
  const MAX_TIME = 20;
  const MIN_STAKE = 0.01;
  const MAX_STAKE = 0.1;

  const [stakeAmount, setStakeAmount] = useState(MIN_STAKE);

  const rewardAmount = useMemo(() => {
    if (!isStaking) return 0;
    // normalizedTime is 1 for the shortest duration, 0 for the longest.
    const normalizedTime = (MAX_TIME - time) / (MAX_TIME - MIN_TIME); 
    const maxMultiplier = 2.5; // 2.5x reward for shortest time
    const minMultiplier = 1.5; // 1.5x reward for longest time
    const rewardMultiplier = minMultiplier + normalizedTime * (maxMultiplier - minMultiplier);
    const reward = stakeAmount * rewardMultiplier;
    return parseFloat(reward.toFixed(4));
  }, [time, stakeAmount, isStaking]);

  const handleAccept = () => {
    if (isStaking) {
      onAccept({
        difficulty: 'Medium', // Always pass Medium for staking mode
        isStaking: true,
        stakeAmount: `${stakeAmount.toFixed(4)} ETH`,
        rewardAmount: `${rewardAmount} ETH`,
        timeLimit: `${time} minutes`,
      });
    } else {
      onAccept({
        difficulty,
        isStaking: false,
        stakeAmount: "0 ETH",
        timeLimit: null, // No time limit for non-staked games
      });
    }
  };

  const handleAcceptChallenge = (challengeConfig) => {
    // In a real scenario, you would trigger a smart contract interaction here
    // if challengeConfig.isStaking is true.
    if (challengeConfig.isStaking) {
      console.log(`Staking ${challengeConfig.stakeAmount} for a ${challengeConfig.difficulty} challenge.`);
      // This is a placeholder. The actual transaction would need to resolve
      // before the game starts.
      alert(`Staking ${challengeConfig.stakeAmount} is a feature in development. Proceeding without an on-chain transaction for now.`);
    }

    setGameConfig({
      difficulty: challengeConfig.difficulty, // This will now be 'Medium' for staking mode
      isStaking: challengeConfig.isStaking,
      stakeAmount: challengeConfig.stakeAmount,
      timeLimit: challengeConfig.timeLimit,
      account: walletAddress,
      playerGender: 'Male' // Still a placeholder
    });
    setCurrentView('game');
    
    console.log("Game config set:", {
      difficulty: challengeConfig.difficulty,
      account: walletAddress,
      isStaking: challengeConfig.isStaking
    });
  };

  return (
    <div className="h-screen flex flex-col justify-center items-center text-center px-4 bg-gray-900/80 text-white">
      <div className="max-w-2xl w-full mx-auto p-8 border-2 border-teal-400/50 rounded-2xl shadow-lg shadow-teal-400/20 bg-gray-900">
        <h2 className="text-4xl font-cinzel text-teal-300 mb-4">The Elder's Challenge</h2>
        <p className="text-lg font-merriweather text-gray-300 mb-6">
          Choose your path. Play for honor, or raise the stakes for a greater reward. The choice is yours, but the clock is always ticking.
        </p>

        {/* Staking Option */}
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

        {/* Conditional UI based on staking choice */}
        {isStaking ? (
          // STAKING UI
          <div className="animate-fade-in">
            {/* Time Selection */}
            <div className="mb-8">
              <h3 className="text-2xl font-cinzel text-yellow-400 mb-4">Set Your Time</h3>
              <p className="font-merriweather text-gray-400 mb-4">A shorter time limit increases your risk and potential reward multiplier.</p>
              <div className="flex items-center justify-center gap-4">
                <span className="font-bold text-lg">{MIN_TIME} min</span>
                <input
                  type="range"
                  min={MIN_TIME}
                  max={MAX_TIME}
                  value={time}
                  onChange={(e) => setTime(parseInt(e.target.value, 10))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-yellow-400"
                />
                <span className="font-bold text-lg">{MAX_TIME} min</span>
              </div>
              <p className="text-2xl font-bold text-white mt-3">{time} Minutes</p>
            </div>

            {/* Stake Amount Selection */}
            <div className="mb-8">
              <h3 className="text-2xl font-cinzel text-yellow-400 mb-4">Set Your Stake</h3>
              <p className="font-merriweather text-gray-400 mb-4">Choose the amount of ETH you wish to wager.</p>
              <div className="flex items-center justify-center gap-4">
                <span className="font-bold text-lg">{MIN_STAKE} ETH</span>
                <input
                  type="range"
                  min={MIN_STAKE}
                  max={MAX_STAKE}
                  step={0.001}
                  value={stakeAmount}
                  onChange={(e) => setStakeAmount(parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-yellow-400"
                />
                <span className="font-bold text-lg">{MAX_STAKE} ETH</span>
              </div>
              <p className="text-2xl font-bold text-white mt-3">{stakeAmount.toFixed(4)} ETH</p>
            </div>

            {/* Wager Details */}
            <div className="mb-8 p-6 bg-gray-800/50 border border-yellow-400/30 rounded-lg">
                <h4 className="text-2xl font-cinzel text-yellow-300 mb-4">Wager Details</h4>
                <div className="grid grid-cols-2 gap-4 text-lg font-merriweather">
                    <div className="text-left">
                        <p className="text-gray-400">Time Limit:</p>
                        <p className="font-bold text-white text-xl">{time} minutes</p>
                    </div>
                    <div className="text-right">
                        <p className="text-gray-400">Your Stake:</p>
                        <p className="font-bold text-yellow-400 text-xl">{stakeAmount.toFixed(4)} ETH</p>
                    </div>
                    <div className="col-span-2 text-center mt-2">
                        <p className="text-gray-400">Potential Reward:</p>
                        <p className="font-bold text-green-400 text-xl">{rewardAmount} ETH</p>
                    </div>
                </div>
            </div>
          </div>
        ) : (
          // NO-STAKE UI
          <div className="mb-8 animate-fade-in">
            <h3 className="text-2xl font-cinzel text-teal-400 mb-3">Select Difficulty</h3>
            <div className="flex justify-center gap-4">
              {difficulties.map(d => (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  className={`px-6 py-2 font-bold rounded-lg transition-all duration-300 ${
                    difficulty === d
                      ? 'bg-teal-400 text-gray-900 shadow-lg shadow-teal-400/50'
                      : 'bg-gray-700 text-teal-200 hover:bg-gray-600'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-center gap-6">
          <button
            onClick={handleAccept}
            className={`px-8 py-3 text-white font-bold rounded-full transition-all duration-300 hover:scale-105 ${
                isStaking 
                ? 'bg-yellow-500 hover:shadow-2xl hover:shadow-yellow-500/50' 
                : 'bg-green-500 hover:shadow-2xl hover:shadow-green-500/50'
            }`}
          >
            {isStaking ? 'Accept & Stake' : 'Accept Challenge'}
          </button>
          <button
            onClick={onDecline}
            className="px-8 py-3 bg-red-600 text-white font-bold rounded-full transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-red-600/50"
          >
            Decline
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChallengeScreen;