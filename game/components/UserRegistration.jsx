import React, { useState } from 'react';

const UserRegistration = ({ onRegister, onCancel, userRegistryService }) => {
  const [username, setUsername] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState(null);
  const [error, setError] = useState('');

  const checkUsernameAvailability = async (usernameToCheck) => {
    if (usernameToCheck.length < 3) {
      setUsernameAvailable(null);
      return;
    }

    setIsChecking(true);
    setError('');

    try {
      const available = await userRegistryService.isUsernameAvailable(usernameToCheck);
      setUsernameAvailable(available);
    } catch (error) {
      setError('Error checking username availability');
      console.error(error);
    } finally {
      setIsChecking(false);
    }
  };

  const handleUsernameChange = (e) => {
    const newUsername = e.target.value;
    setUsername(newUsername);
    
    // Debounce the availability check
    setTimeout(() => {
      if (newUsername === username) {
        checkUsernameAvailability(newUsername);
      }
    }, 500);
  };

  const handleRegister = async () => {
    if (!username || username.length < 3) {
      setError('Username must be at least 3 characters long');
      return;
    }

    setIsRegistering(true);
    setError('');

    try {
      const result = await userRegistryService.registerUser(username);
      
      if (result.success) {
        onRegister(username);
      } else {
        setError(result.error || 'Registration failed');
      }
    } catch (error) {
      setError('Registration failed. Please try again.');
      console.error(error);
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="h-screen flex flex-col justify-center items-center text-center px-4 bg-gray-900/95 text-white">
      <div className="max-w-md w-full mx-auto p-8 border-2 border-teal-400/50 rounded-2xl shadow-lg shadow-teal-400/20 bg-gray-900">
        <h2 className="text-3xl font-cinzel text-teal-300 mb-4">Welcome to Towns Whisper</h2>
        <p className="text-lg font-merriweather text-gray-300 mb-6">
          Choose a username to begin your journey
        </p>

        <div className="mb-6">
          <input
            type="text"
            value={username}
            onChange={handleUsernameChange}
            placeholder="Enter your username"
            className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-teal-400 focus:outline-none"
            maxLength={20}
            disabled={isRegistering}
          />
          
          {/* Username validation feedback */}
          <div className="mt-2 text-sm">
            {isChecking && (
              <p className="text-yellow-400">Checking availability...</p>
            )}
            {usernameAvailable === true && !isChecking && (
              <p className="text-green-400">✓ Username available</p>
            )}
            {usernameAvailable === false && !isChecking && (
              <p className="text-red-400">✗ Username already taken</p>
            )}
            {username.length > 0 && username.length < 3 && (
              <p className="text-red-400">Username must be at least 3 characters</p>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-500 rounded-lg">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        <div className="flex gap-4">
          <button
            onClick={handleRegister}
            disabled={!username || username.length < 3 || isRegistering}
            className={`flex-1 px-6 py-3 font-bold rounded-lg transition-all duration-300 ${
                username && username.length >= 3 && !isRegistering
                    ? 'bg-teal-400 text-gray-900 hover:bg-teal-300 hover:scale-105'
                    : 'bg-gray-600 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isRegistering ? 'Registering...' : 'Register'}
          </button>
          
          <button
            onClick={onCancel}
            disabled={isRegistering}
            className="px-6 py-3 bg-gray-600 text-white font-bold rounded-lg transition-all duration-300 hover:bg-gray-500 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>

        <p className="mt-4 text-xs text-gray-500">
          This will create a transaction on the blockchain to register your username.
        </p>
      </div>
    </div>
  );
};

export default UserRegistration;