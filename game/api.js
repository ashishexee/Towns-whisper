const API_BASE_URL = "http://127.0.0.1:8000";
let currentGameId = null;

/**
 * Starts a new game session by calling the backend.
 * @param {string} difficulty The difficulty level ('easy', 'medium', 'hard').
 * @returns {Promise<string|null>} The new game ID, or null if it fails.
 */
async function startNewGame(difficulty) {
  try {
    console.log("Difficulty level - ",difficulty);
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
        player_prompt: playerMessage, // CHANGED: was player_message
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
    const response = await fetch(`${API_BASE_URL}/ping/`);
    if (!response.ok) {
      throw new Error(`Ping failed with status: ${response.status}`);
    }
    const data =  await response.json();
    console.log("Server responded to ping:", data.message);
  } catch (error) {
    // This is not a critical error, so we just warn about it.
    console.warn("Server ping failed (this is not critical):", error);
  }
}

// Export the functions to be used in your game scenes
export { startNewGame, getConversation, chooseLocation, pingServer };
