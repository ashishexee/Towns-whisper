// In game/src/components/RewardChest.jsx

import React, { useState } from 'react';

const RewardChest = ({ onClaim, onClose }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleClaimClick = async () => {
    setIsLoading(true);
    await onClaim(); // Call the async function passed from App.jsx
    // The parent component will handle closing the modal after the API call.
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50">
      <div className="bg-gray-800 border-2 border-yellow-500 rounded-lg shadow-xl p-8 text-center max-w-sm mx-auto animate-fade-in-up">
        <h2 className="text-3xl font-cinzel text-yellow-300 mb-4">Victory!</h2>
        <p className="text-lg text-gray-200 mb-6">You've solved the mystery and earned a reward chest!</p>
        
        {/* You can replace this with a real chest image */}
        <div className="my-4">
          <img src="/assets/images/ui/conversation_box.png" alt="Reward Chest" className="w-32 h-32 mx-auto" />
        </div>

        <p className="text-sm text-gray-400 mb-6">Click 'Claim' to start a 30-minute timer. Your reward will be sent to your wallet after the timer ends.</p>

        <div className="flex gap-4">
          <button
            onClick={handleClaimClick}
            disabled={isLoading}
            className="flex-1 bg-yellow-500 text-gray-900 font-bold py-3 px-6 rounded-lg hover:bg-yellow-400 transition-transform transform hover:scale-105 disabled:bg-gray-600 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Claiming...' : 'Claim Reward'}
          </button>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 bg-gray-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-gray-500 disabled:opacity-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default RewardChest;