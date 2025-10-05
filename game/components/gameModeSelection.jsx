import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';

const SinglePlayerIcon = () => (
    <svg className="w-8 h-8 text-teal-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
);

const CreateRoomIcon = () => (
    <svg className="w-8 h-8 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
    </svg>
);

const JoinRoomIcon = () => (
    <svg className="w-8 h-8 text-yellow-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
);

const GameModeCard = ({ title, description, buttonText, onButtonClick, icon, borderColor, buttonColor }) => (
    <div className={`bg-gray-900/70 border-2 ${borderColor} rounded-2xl shadow-lg p-6 text-center flex flex-col justify-between transform transition-transform hover:scale-105`}>
        <div>
            <div className="w-16 h-16 bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-6">
                {icon}
            </div>
            <h3 className="text-2xl font-cinzel text-green-400 mb-2" style={{ textShadow: '0 0 8px rgba(72, 187, 120, 0.7)' }}>
                {title}
            </h3>
            <p className="text-gray-300 font-merriweather mb-6">
                {description}
            </p>
        </div>
        <button
            onClick={onButtonClick}
            className={`w-full px-6 py-3 ${buttonColor} text-gray-900 font-bold rounded-lg transition-all duration-300 hover:shadow-2xl`}
        >
            {buttonText}
        </button>
    </div>
);

const GameModeSelection = ({ onPlaySingle, onCreateRoom, onJoinRoom, username, walletAddress, userRegistryService }) => {
    const [balance, setBalance] = useState('0.00');
    const [isLoadingBalance, setIsLoadingBalance] = useState(true);

    useEffect(() => {
        const fetchBalance = async () => {
            if (!walletAddress || !userRegistryService) {
                setBalance('0.00');
                setIsLoadingBalance(false);
                return;
            }

            try {
                setIsLoadingBalance(true);
                // Get ETH balance
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
    }, [walletAddress, userRegistryService]);

    return (
        <div className="h-screen flex flex-col justify-center items-center text-center px-4 bg-gray-900/80 text-white relative">
            {/* Rune Token Balance Overlay - Top Left */}
            

            {/* Top Bar with Balance and Username */}
            <div className="absolute top-0 left-0 right-0 flex justify-between items-center p-6 bg-black/30 backdrop-blur-sm border-b border-teal-400/20">
                {/* Balance - Top Left (moved right to avoid overlap) */}
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span className="text-sm text-gray-400">0G Balance:</span>
                    <span className="font-bold text-teal-300">
                        {isLoadingBalance ? (
                            <span className="animate-pulse">Loading...</span>
                        ) : (
                            `${balance} 0G`
                        )}
                    </span>
                </div>

                {/* Username - Top Center */}
                <div className="absolute left-1/2 transform -translate-x-1/2">
                    <div className="flex items-center gap-2 bg-gray-800/50 px-4 py-2 rounded-full border border-teal-400/30">
                        <div className="w-8 h-8 bg-teal-400 rounded-full flex items-center justify-center">
                            <span className="text-gray-900 font-bold text-sm">
                                {username ? username.charAt(0).toUpperCase() : 'U'}
                            </span>
                        </div>
                        <span className="font-semibold text-white">
                            {username || 'Unknown User'}
                        </span>
                    </div>
                </div>

                {/* Spacer for balance on right side */}
                <div className="w-32"></div>
            </div>

            {/* Main Content */}
            <div className="max-w-6xl w-full mx-auto mt-20">
                <h1 className="text-5xl font-cinzel text-teal-300 mb-4">Choose Your Path</h1>
                <p className="text-xl text-gray-300 mb-12 font-merriweather">
                    How would you like to uncover the mystery?
                </p>

                <div className="grid grid-cols-1 md:grid-cols-1 gap-8 max-w-md mx-auto">
                    <GameModeCard
                        title="Single Player"
                        description="Uncover the village's secrets on your own and solve the mystery."
                        buttonText="Start Investigation"
                        onButtonClick={onPlaySingle}
                        icon={<SinglePlayerIcon />}
                        borderColor="border-teal-400/50 hover:border-teal-400/60"
                        buttonColor="bg-teal-400 hover:bg-teal-300 hover:shadow-teal-300/50"
                    />
                </div>
            </div>
        </div>
    );
};

export default GameModeSelection;
