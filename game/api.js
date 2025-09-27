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
        num_inaccessible_locations: 5
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
async function getConversation(villagerId, playerMessage, playerId = null) {
  if (!currentGameId) {
    console.error("Cannot get conversation: no active game ID.");
    return null;
  }
  
  try {
    const requestBody = {
      villager_id: villagerId,
      player_prompt: playerMessage,
    };
    
    if (playerId) {
      requestBody.player_id = playerId;
    }
    
    console.log('Sending conversation request:', requestBody);
    
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
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Received conversation response:', data);
    
    // Validate the response structure
    if (!data.npc_dialogue) {
      console.error('Invalid response structure - missing npc_dialogue:', data);
      return null;
    }
    
    return data;
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
async function chooseLocation(location, playerId = null) {
  if (!currentGameId) {
    console.error("Cannot choose location: no active game ID.");
    return null;
  }

  try {
    const requestBody = {
      location_name: location,
    };
    
    if (playerId) {
      requestBody.player_id = playerId;
    }
    
    const response = await fetch(`${API_BASE_URL}/game/${currentGameId}/guess`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
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
 * Sets the current game ID.
 * @param {string} gameId The game ID to set as current.
 */
function setCurrentGameId(gameId) {
  currentGameId = gameId;
}

/**
 * Pings the server to check if it's reachable.
 * @returns {Promise<boolean>} True if the server is reachable, false otherwise.
 */
async function pingServer() {
  try {
    const response = await fetch(`${API_BASE_URL}/`);
    return response.ok;
  } catch (error) {
    console.error("Error pinging server:", error);
    return false;
  }
}

// Export the functions to be used in your game scenes
export { startNewGame, getConversation, chooseLocation, setCurrentGameId, pingServer };
