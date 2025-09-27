const API_BASE_URL = "http://127.0.0.1:8000";
let currentGameId = null;

/**
 * Starts a new game session by calling the backend.
 * @param {string} difficulty The difficulty level ('easy', 'medium', 'hard').
 * @returns {Promise<string|null>} The new game ID, or null if it fails.
 */
async function startNewGame(difficulty) {
  try {
    console.log("Difficulty level - ", difficulty);
    const response = await fetch(`${API_BASE_URL}/game/new`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        difficulty: difficulty,
        num_inaccessible_locations: 5,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    currentGameId = data.game_id; // Store the game ID
    console.log(`New game started with ID: ${currentGameId}`);
    console.log(data);
    
    return data;

  } catch (error) {
    console.error("Error starting new game:", error);
    return null;
  }
}

/**
 * Fetches the next part of a conversation from the backend.
 * @param {string} villagerId The ID of the villager being spoken to.
 * @param {string} playerMessage The message or suggestion chosen by the player.
 * @returns {Promise<object|null>} The conversation data, or null if it fails.
 */
async function getConversation(villagerId, playerMessage) {
  if (!currentGameId) {
    console.error("Cannot get conversation: no active game ID.");
    return null;
  }
  try {
    const response = await fetch(`${API_BASE_URL}/game/${currentGameId}/interact`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        villager_id: villagerId,
        player_message: playerMessage,
      }),
    });
    console.log(response);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error getting conversation:", error);
    return null;
  }
}

/**
 * Sends the player's chosen location to the backend.
 * @param {string} location The name of the location chosen by the player.
 * @returns {Promise<object|null>} The server's response, or null if it fails.
 */
async function chooseLocation(location) {
  if (!currentGameId) {
    console.error("Cannot choose location: no active game ID.");
    return null;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/game/${currentGameId}/guess`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        location_name: location,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;

  } catch (error) {
    console.error("Error choosing location:", error);
    return null;
  }
}

/**
 * Pings the server to wake it up if it's on a free hosting service.
 */
async function pingServer() {
  try {
    console.log("Pinging server to wake it up...");
    const response = await fetch(`${API_BASE_URL}/ping`);
    if (!response.ok) {
      throw new Error(`Ping failed with status: ${response.status}`);
    }
    const data = await response.json();
    console.log("Server responded to ping:", data.message);
  } catch (error) {
    // This is not a critical error, so we just warn about it.
    console.warn("Server ping failed (this is not critical):", error);
  }
}

/**
 * Calls the backend to schedule a victory reward chest for the player.
 * @param {string} hederaAccountId The player's Hedera account ID (e.g., "0.0.12345").
 * @returns {Promise<object|null>} The server's response, or null if it fails.
 */
async function openRewardChest(hederaAccountId) {
  try {
    const response = await fetch(`${API_BASE_URL}/chest/open`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        player_account_id: hederaAccountId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`HTTP error! status: ${response.status} - ${errorData.detail}`);
    }

    return await response.json();

  } catch (error) {
    console.error("Error opening reward chest:", error);
    return null;
  }
}

/**
 * Get the Rune Token balance for a player's Hedera account.
 * @param {string} hederaAccountId The player's Hedera account ID (e.g., "0.0.12345").
 * @returns {Promise<object|null>} The balance data, or null if it fails.
 */
async function getTokenBalance(hederaAccountId) {
  try {
    console.log(`Getting token balance for account: ${hederaAccountId}`);
    const response = await fetch(`${API_BASE_URL}/balance/${hederaAccountId}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("Token balance retrieved:", data);
    return data;

  } catch (error) {
    console.error("Error getting token balance:", error);
    return null;
  }
}

/**
 * Claim welcome bonus (250 Rune tokens) for first-time users.
 * @param {string} hederaAccountId The player's Hedera account ID (e.g., "0.0.12345").
 * @returns {Promise<object|null>} The server's response, or null if it fails.
 */
async function claimWelcomeBonus(hederaAccountId) {
  try {
    console.log(`Claiming welcome bonus for account: ${hederaAccountId}`);
    const response = await fetch(`${API_BASE_URL}/chest/welcome`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        player_account_id: hederaAccountId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`HTTP error! status: ${response.status} - ${errorData.detail}`);
    }

    const data = await response.json();
    console.log("Welcome bonus claimed:", data);
    return data;

  } catch (error) {
    console.error("Error claiming welcome bonus:", error);
    return null;
  }
}

/**
 * Claim daily login reward (50-200 Rune tokens) if 24 hours have passed.
 * @param {string} hederaAccountId The player's Hedera account ID (e.g., "0.0.12345").
 * @returns {Promise<object|null>} The server's response, or null if it fails.
 */
async function claimDailyReward(hederaAccountId) {
  try {
    console.log(`Claiming daily reward for account: ${hederaAccountId}`);
    const response = await fetch(`${API_BASE_URL}/chest/daily`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        player_account_id: hederaAccountId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`HTTP error! status: ${response.status} - ${errorData.detail}`);
    }

    const data = await response.json();
    console.log("Daily reward claimed:", data);
    return data;

  } catch (error) {
    console.error("Error claiming daily reward:", error);
    return null;
  }
}

/**
 * Check if the player is eligible for welcome bonus (hasn't claimed it yet).
 * @param {string} hederaAccountId The player's Hedera account ID.
 * @returns {Promise<boolean>} True if eligible, false otherwise.
 */
async function isEligibleForWelcomeBonus(hederaAccountId) {
  try {
    // Try to claim welcome bonus - if it fails due to already claimed, return false
    const result = await claimWelcomeBonus(hederaAccountId);
    return result && result.status === 'success';
  } catch (error) {
    // If error contains "already claimed", return false
    if (error.message.includes('already claimed')) {
      return false;
    }
    console.error("Error checking welcome bonus eligibility:", error);
    return false;
  }
}

/**
 * Check if the player is eligible for daily reward (24 hours have passed).
 * @param {string} hederaAccountId The player's Hedera account ID.
 * @returns {Promise<boolean>} True if eligible, false otherwise.
 */
async function isEligibleForDailyReward(hederaAccountId) {
  try {
    // Try to claim daily reward - if it fails due to cooldown, return false
    const result = await claimDailyReward(hederaAccountId);
    return result && result.status === 'success';
  } catch (error) {
    // If error contains "already claimed" or "Try again in", return false
    if (error.message.includes('already claimed') || error.message.includes('Try again in')) {
      return false;
    }
    console.error("Error checking daily reward eligibility:", error);
    return false;
  }
}

// Export all functions
export { 
  startNewGame, 
  getConversation, 
  chooseLocation, 
  pingServer, 
  openRewardChest,
  getTokenBalance,
  claimWelcomeBonus,
  claimDailyReward,
  isEligibleForWelcomeBonus,
  isEligibleForDailyReward
};
