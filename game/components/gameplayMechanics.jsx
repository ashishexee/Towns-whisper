import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';

const GameModeSelectionCard = ({ 
  onPlayClick, 
  onPlaySingle, 
  onCreateRoom, 
  onJoinRoom, 
  username, 
  walletAddress, 
  userRegistryService 
}) => {
  const [balance, setBalance] = useState('0.00');
  const [isLoadingBalance, setIsLoadingBalance] = useState(true);

  useEffect(() => {
    const fetchBalance = async () => {
      if (!walletAddress) {
        setBalance('0.00');
        setIsLoadingBalance(false);
        return;
      }

      try {
        setIsLoadingBalance(true);
        const provider = userRegistryService.provider;
        const balanceWei = await provider.getBalance(walletAddress);
        const balanceEth = parseFloat(ethers.formatEther(balanceWei)).toFixed(4);
        setBalance(balanceEth);
      } catch (error) {
        console.error("Error fetching balance:", error);
        setBalance('0.00');
      } finally {
        setIsLoadingBalance(false);
      }
    };

    fetchBalance();

    const interval = setInterval(fetchBalance, 30000);
    return () => clearInterval(interval);
  }, [walletAddress, userRegistryService]);

  const handlePlaySingle = () => {
    if (!walletAddress) {
      alert('Please connect your wallet first!');
      return;
    }
    if (onPlaySingle) {
      onPlaySingle();
    }
  };

  const handleCreateRoom = () => {
    if (!walletAddress) {
      alert('Please connect your wallet first!');
      return;
    }
    if (onCreateRoom) {
      onCreateRoom();
    }
  };

  const handleJoinRoom = () => {
    if (!walletAddress) {
      alert('Please connect your wallet first!');
      return;
    }
    if (onJoinRoom) {
      onJoinRoom();
    }
  };

  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-center px-4 py-16 bg-gradient-to-b from-black/60 to-black/80"
      style={{ position: 'relative', zIndex: 100 }}
    >
      <div className="max-w-6xl w-full">
        {/* Header Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-cinzel text-teal-300 mb-4">
            Choose Your Adventure
          </h1>
          {walletAddress && (
            <div className="bg-gray-800/50 rounded-lg p-4 max-w-md mx-auto mb-6">
              <p className="text-teal-400 font-semibold">Welcome, {username || 'Player'}!</p>
              <p className="text-gray-300 text-sm mt-1">
                Address: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
              </p>
              <p className="text-gray-300 text-sm">
                Balance: {isLoadingBalance ? 'Loading...' : `${balance} ETH`}
              </p>
            </div>
          )}
        </div>

        {/* Game Mode Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {/* Single Player Card */}
          <div className="bg-gray-800/50 p-8 rounded-xl border-2 border-teal-400/30 hover:border-teal-400/60 transition-all duration-300 hover:scale-105">
            <div className="w-16 h-16 bg-teal-400/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-teal-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h3 className="text-2xl font-cinzel text-teal-300 mb-4">Single Player</h3>
            <p className="text-gray-400 mb-6 font-merriweather">
              Uncover the village's secrets on your own and solve the mystery.
            </p>
            <button
              onClick={handlePlaySingle}
              className="w-full py-3 bg-teal-400 text-gray-900 font-bold rounded-lg hover:bg-teal-300 transition-all duration-300"
            >
              Start Investigation
            </button>
          </div>

          {/* Create Room Card */}
          <div className="bg-gray-800/50 p-8 rounded-xl border-2 border-purple-400/30 hover:border-purple-400/60 transition-all duration-300 hover:scale-105">
            <div className="w-16 h-16 bg-purple-400/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <h3 className="text-2xl font-cinzel text-purple-300 mb-4">Create Room</h3>
            <p className="text-gray-400 mb-6 font-merriweather">
              Create a new multiplayer room and invite your friends to join.
            </p>
            <button
              onClick={handleCreateRoom}
              className="w-full py-3 bg-purple-400 text-gray-900 font-bold rounded-lg hover:bg-purple-300 transition-all duration-300"
            >
              Create Room
            </button>
          </div>

          {/* Join Room Card */}
          <div className="bg-gray-800/50 p-8 rounded-xl border-2 border-yellow-400/30 hover:border-yellow-400/60 transition-all duration-300 hover:scale-105">
            <div className="w-16 h-16 bg-yellow-400/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-yellow-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </div>
            <h3 className="text-2xl font-cinzel text-yellow-300 mb-4">Join Room</h3>
            <p className="text-gray-400 mb-6 font-merriweather">
              Join an existing room with a room code to play with others.
            </p>
            <button
              onClick={handleJoinRoom}
              className="w-full py-3 bg-yellow-400 text-gray-900 font-bold rounded-lg hover:bg-yellow-300 transition-all duration-300"
            >
              Join Room
            </button>
          </div>
        </div>

        {/* Connection Status */}
        {!walletAddress && (
          <div className="text-center">
            <p className="text-gray-400 mb-4">Connect your wallet to start playing!</p>
            <button
              onClick={onPlayClick}
              className="px-8 py-3 bg-teal-400 text-gray-900 font-bold rounded-full hover:bg-teal-300 transition-all duration-300"
            >
              Connect Wallet
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default GameModeSelectionCard;
