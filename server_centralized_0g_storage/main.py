# main.py
# This script runs the FastAPI server, exposing the game engine through API endpoints.

import os
import traceback
from typing import Dict, List, Optional
import uuid
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests # Ensure requests is imported
import json
from schemas import *
from datetime import datetime
from game_logic.engine import GameEngine
from game_logic.state_manager import GameState
# Import our new Hedera service function
from hedera_service import hedera_service
from mirror_node_service import mirror_service
# --- MODIFIED IMPORT ---
from storage_client import get_dialogue_history, save_full_dialogue_history
# -------------------------
from dotenv import load_dotenv
load_dotenv() 

app = FastAPI()

# Add CORS middleware to allow requests from your frontend
origins = [
    "http://localhost",
    "http://localhost:5173", # Adjust if your frontend runs on a different port
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- NEW SCHEMA ---
class EndGameRequest(BaseModel):
    game_id: str
    player_id: str
# ------------------

game_engine = None

# In-memory storage for user login tracking
user_login_history = {}

STORAGE_SERVICE_URL = "http://localhost:3002"

# --- NEW HELPER FUNCTION ---
async def get_dialogue_history(player_id: str) -> Optional[Dict]:
    """Fetches dialogue history from the 0G storage service with a long timeout."""
    print(f"Attempting to load persistent dialogue history for {player_id}...")
    try:
        # The core fix: Add a 60-second timeout to handle slow 0G downloads
        response = requests.get(f"{STORAGE_SERVICE_URL}/dialogue/{player_id}", timeout=60)
        response.raise_for_status()
        return response.json()
    except (requests.exceptions.RequestException, json.JSONDecodeError) as e:
        print(f"An unexpected error occurred while fetching dialogue history:\n{e}")
        return None
# --- END NEW HELPER FUNCTION ---

@app.on_event("startup")
async def startup_event():
    global game_engine
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise RuntimeError("GOOGLE_API_KEY environment variable is required")
    game_engine = GameEngine(api_key)

# Store active games and rooms
active_games: Dict[str, any] = {}
multiplayer_rooms: Dict[str, dict] = {}

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[dict]] = {}
        self.player_to_room: Dict[str, str] = {}  # Track which room each player is in

    async def connect(self, websocket: WebSocket, room_id: str, player_id: str, player_name: str):
        await websocket.accept()
        
        # Check if player is already connected to a room
        if player_id in self.player_to_room:
            old_room_id = self.player_to_room[player_id]
            if old_room_id != room_id:
                # Disconnect from old room first
                await self.disconnect_player_from_room(player_id, old_room_id)
        
        if room_id not in self.active_connections:
            self.active_connections[room_id] = []
        
        # Remove any existing connections for this player in this room
        self.active_connections[room_id] = [
            conn for conn in self.active_connections[room_id] 
            if conn["player_id"] != player_id
        ]
        
        connection_info = {
            "websocket": websocket,
            "player_id": player_id,
            "player_name": player_name,
            "position": {"x": 1 * 32 + 16, "y": 4.5 * 32 + 16}
        }
        self.active_connections[room_id].append(connection_info)
        self.player_to_room[player_id] = room_id
        
        print(f"Player {player_name} ({player_id}) connected to room {room_id}")

    async def disconnect_player_from_room(self, player_id: str, room_id: str):
        """Disconnect a specific player from a specific room"""
        if room_id in self.active_connections:
            # Find and close the player's websocket connection
            for conn in self.active_connections[room_id]:
                if conn["player_id"] == player_id:
                    try:
                        await conn["websocket"].close()
                    except:
                        pass
                    break
            
            # Remove the player from the room
            self.active_connections[room_id] = [
                conn for conn in self.active_connections[room_id] 
                if conn["player_id"] != player_id
            ]
            
            # Update player-to-room mapping
            if self.player_to_room.get(player_id) == room_id:
                del self.player_to_room[player_id]

    def disconnect(self, websocket: WebSocket, room_id: str, player_id: str):
        if room_id in self.active_connections:
            self.active_connections[room_id] = [
                conn for conn in self.active_connections[room_id] 
                if conn["websocket"] != websocket
            ]
            
            # Update player-to-room mapping
            if self.player_to_room.get(player_id) == room_id:
                del self.player_to_room[player_id]
                
            print(f"Player {player_id} disconnected from room {room_id}")

    async def broadcast_to_room(self, message: dict, room_id: str, exclude_websocket: WebSocket = None):
        if room_id not in self.active_connections:
            return
        
        disconnected = []
        for connection in self.active_connections[room_id]:
            if connection["websocket"] != exclude_websocket:
                try:
                    await connection["websocket"].send_text(json.dumps(message))
                except:
                    disconnected.append(connection)
        
        # Remove disconnected connections
        for conn in disconnected:
            self.active_connections[room_id].remove(conn)
            if self.player_to_room.get(conn["player_id"]) == room_id:
                del self.player_to_room[conn["player_id"]]

    def get_room_players(self, room_id: str) -> List[dict]:
        if room_id not in self.active_connections:
            return []
        
        # Use a set to ensure unique players
        unique_players = {}
        for conn in self.active_connections[room_id]:
            player_id = conn["player_id"]
            if player_id not in unique_players:
                unique_players[player_id] = {
                    "id": player_id,
                    "name": conn["player_name"],
                    "position": conn["position"]
                }
        
        return list(unique_players.values())

    def update_player_position(self, room_id: str, player_id: str, x: float, y: float):
        if room_id in self.active_connections:
            for conn in self.active_connections[room_id]:
                if conn["player_id"] == player_id:
                    conn["position"] = {"x": x, "y": y}
                    break

manager = ConnectionManager()

@app.post("/game/new", response_model=NewGameResponse)
async def create_new_game(request: NewGameRequest):
    game_id = str(uuid.uuid4())
    try:
        game_state = game_engine.start_new_game(
            game_id=game_id,
            num_inaccessible_locations=request.num_inaccessible_locations,
            difficulty=request.difficulty
        )
        active_games[game_id] = game_state
        
        initial_villagers = [
            {"id": f"villager_{i}", "title": v["title"]} 
            for i, v in enumerate(game_state.villagers)
        ]

        return NewGameResponse(
            game_id=game_id,
            status="success",
            inaccessible_locations=game_state.inaccessible_locations,
            villagers=initial_villagers
        )
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to generate new game: {e}")

@app.post("/game/{game_id}/interact", response_model=InteractResponse)
async def interact(game_id: str, request: InteractRequest):
    if game_id not in active_games:
        raise HTTPException(status_code=404, detail="Game not found")
    
    game_state = active_games[game_id]
    
    try:
        villager_index = int(request.villager_id.split('_')[1])
        if not (0 <= villager_index < len(game_state.villagers)):
            raise HTTPException(status_code=400, detail="Invalid villager ID.")
            
        villager_name = game_state.villagers[villager_index]["name"]
        
        player_key = request.player_id if hasattr(request, 'player_id') and request.player_id else "single_player"
        
        if not hasattr(game_state, 'multiplayer_states'):
            game_state.multiplayer_states = {}
        
        if player_key not in game_state.multiplayer_states:
            game_state.multiplayer_states[player_key] = {
                "discovered_nodes": [],
                "knowledge_summary": "You've just woken up in a cozy cottage...",
                "familiarity": {v["name"]: 0 for v in game_state.villagers},
                "unproductive_turns": {v["name"]: 0 for v in game_state.villagers}
            }
        
        if not hasattr(game_state, 'multiplayer_memories'):
            game_state.multiplayer_memories = {}
        
        # --- MODIFIED LOGIC TO LOAD HISTORY ---
        # Check if memory is uninitialized (i.e., first interaction for this player in this session)
        if player_key not in game_state.multiplayer_memories or not any(game_state.multiplayer_memories[player_key].values()):
            history_data = await get_dialogue_history(player_key)
            
            reconstructed_memory = {v["name"]: [] for v in game_state.villagers}
            if history_data and history_data.get("dialogue_history"):
                print(f"✅ Successfully loaded {len(history_data['dialogue_history'])} dialogue entries for {player_key}.")
                for entry in history_data["dialogue_history"]:
                    villager = entry.get("villager_name")
                    if villager in reconstructed_memory:
                        reconstructed_memory[villager].append({"role": "player", "content": entry.get("player_prompt")})
                        reconstructed_memory[villager].append({"role": "npc", "content": entry.get("npc_dialogue")})
            else:
                print(f"ℹ️ No persistent history found for {player_key}, or service is unavailable. Starting with a fresh session.")
            
            game_state.multiplayer_memories[player_key] = reconstructed_memory
        # --- END MODIFIED LOGIC ---

        player_state = game_state.multiplayer_states[player_key]
        player_memory = game_state.multiplayer_memories[player_key]
        
        frustration = {"friends": len([
            msg for msg in player_memory.get(villager_name, [])
            if msg.get("content") and "friend" in msg.get("content").lower()
        ])}
        
        player_input = request.player_prompt if request.player_prompt is not None else "I'd like to talk."
        
        # Temporarily replace game_state's player_state and full_npc_memory for this interaction
        original_player_state = game_state.player_state
        original_memory = game_state.full_npc_memory
        
        game_state.player_state = player_state
        game_state.full_npc_memory = player_memory
        
        try:
            dialogue_data = game_engine.process_interaction_turn(
                game_state, villager_name, player_input, frustration
            )
            
            # --- 0G STORAGE INTEGRATION: SAVE HISTORY (REMOVED) ---
            # The dialogue is no longer saved on every turn.
            # It will be saved in a batch at the end of the game.
            # ----------------------------------------------------

            # Update the player-specific states
            game_state.multiplayer_states[player_key] = game_state.player_state
            game_state.multiplayer_memories[player_key] = game_state.full_npc_memory
            
        finally:
            # Restore original states
            game_state.player_state = original_player_state
            game_state.full_npc_memory = original_memory
        
        return InteractResponse(
            villager_id=request.villager_id,
            villager_name=villager_name,
            npc_dialogue=dialogue_data["npc_dialogue"],
            player_suggestions=dialogue_data["player_responses"]
        )
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Interaction failed: {e}")

@app.post("/game/{game_id}/guess", response_model=GuessResponse)
async def guess(game_id: str, request: GuessRequest):
    if game_id not in active_games:
        raise HTTPException(status_code=404, detail="Game not found")
    
    game_state = active_games[game_id]
    is_correct = request.location_name == game_state.correct_location
    
    # Use player-specific state for ending calculation
    player_key = request.player_id if hasattr(request, 'player_id') and request.player_id else "single_player"
    player_state = game_state.multiplayer_states.get(player_key, game_state.player_state)
    
    key_clues = [node['node_id'] for node in game_state.quest_network.get('nodes', []) if node.get('key_clue')]
    discovered_key_clues = [node_id for node_id in player_state['discovered_nodes'] if node_id in key_clues]
    is_true_ending = len(discovered_key_clues) == len(key_clues)

    message = ""
    if is_correct:
        message += f"You head towards {request.location_name} and find your friends, alive. "
        if is_true_ending:
            message += "You understand the full, dark truth of the village. CONGRATULATIONS, TRUE ENDING!"
        else:
            message += "You never fully understood why they were taken. YOU WIN, BUT THE MYSTERY REMAINS..."
    else:
        message = f"You find nothing but silence and dust at {request.location_name}. Your friends are gone forever. The correct location was {game_state.correct_location}. GAME OVER."

    return GuessResponse(
        message=message,
        is_correct=is_correct,
        is_true_ending=is_true_ending,
        story=message
    )

# --- NEW ENDPOINT TO SAVE DIALOGUE AT GAME END ---
@app.post("/game/end")
async def end_game(request: EndGameRequest):
    """
    Called when a game session ends. This endpoint processes the final
    dialogue history and saves it to 0G Storage in a single batch.
    """
    game_id = request.game_id
    player_id = request.player_id

    if game_id not in active_games:
        # It's possible the game was already cleaned up, which is not an error.
        return {"status": "success", "message": "Game session not found or already ended."}

    game_state = active_games[game_id]
    player_memory = game_state.multiplayer_memories.get(player_id)

    if not player_memory:
        # No memory to save, so we can just clean up.
        del active_games[game_id]
        return {"status": "success", "message": "No dialogue history to save."}

    # Reconstruct the dialogue history from the session memory
    dialogue_history_list = []
    for villager, turns in player_memory.items():
        # Each turn consists of a player message and an NPC response
        for i in range(0, len(turns), 2):
            if i + 1 < len(turns) and turns[i]['role'] == 'player' and turns[i+1]['role'] == 'npc':
                dialogue_history_list.append({
                    "villager": villager,
                    "player": turns[i]['content'],
                    "npc": turns[i+1]['content'],
                    "timestamp": datetime.now().isoformat() # Add timestamp at save time
                })
    
    if dialogue_history_list:
        # Fetch the old history to append the new session's history
        # This ensures we don't lose history from previous games
        existing_history = await get_dialogue_history(player_id)
        if existing_history and "dialogue_history" in existing_history:
            full_history = existing_history["dialogue_history"] + dialogue_history_list
        else:
            full_history = dialogue_history_list
            
        final_payload = {"dialogue_history": full_history}
        
        print(f"Saving {len(dialogue_history_list)} new dialogue entries for player {player_id}...")
        await save_full_dialogue_history(player_id, final_payload)

    # Clean up the completed game from memory
    del active_games[game_id]
    
    return {"status": "success", "message": "Dialogue history saved and game session ended."}
# ----------------------------------------------------

# --- CHEST ENDPOINTS FOR RUNE TOKEN SYSTEM ---

@app.get("/balance/{account_id}")
async def get_balance(account_id: str):
    """Get the Rune Token balance for a specific Hedera account"""
    try:
        balance = await hedera_service.get_token_balance(account_id)
        return {
            "status": "success",
            "account_id": account_id,
            "balance": balance,
            "token_symbol": "RN",
            "token_name": "Rune Token"
        }
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to get balance: {e}")

@app.post("/chest/welcome")
async def welcome_chest(request: OpenChestRequest):
    """Send 250 Rune tokens as a first-time login bonus"""
    try:
        # Check if user has already received welcome bonus
        if request.player_account_id in user_login_history:
            if user_login_history[request.player_account_id].get('welcome_bonus_claimed', False):
                raise HTTPException(status_code=400, detail="Welcome bonus already claimed")
        else:
            user_login_history[request.player_account_id] = {}
        
        result = await hedera_service.send_welcome_bonus(request.player_account_id)
        
        if result['status'] == 'success':
            # Mark welcome bonus as claimed
            user_login_history[request.player_account_id]['welcome_bonus_claimed'] = True
            user_login_history[request.player_account_id]['first_login'] = datetime.now()
            
            return {
                "status": "success",
                "message": "Welcome bonus scheduled! You'll receive 250 Rune tokens in 1 minute.",
                "amount": 250,
                "schedule_id": result['schedule_id'],
                "execution_time": result['execution_time']
            }
        else:
            raise HTTPException(status_code=500, detail=result['message'])
            
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to process welcome bonus: {e}")

@app.post("/chest/daily")
async def daily_chest(request: OpenChestRequest):
    """Send daily login reward (50, 100, or 200 tokens) if 24 hours have passed"""
    try:
        current_time = datetime.now()
        
        # Check if user exists in login history
        if request.player_account_id not in user_login_history:
            user_login_history[request.player_account_id] = {}
        
        user_data = user_login_history[request.player_account_id]
        last_daily = user_data.get('last_daily_claim')
        
        # Check if 24 hours have passed since last daily reward
        if last_daily:
            time_since_last = current_time - last_daily
            if time_since_last < timedelta(hours=24):
                hours_remaining = 24 - time_since_last.total_seconds() / 3600
                raise HTTPException(
                    status_code=400, 
                    detail=f"Daily chest already claimed. Try again in {hours_remaining:.1f} hours."
                )
        
        result = await hedera_service.send_daily_login_reward(request.player_account_id)
        
        if result['status'] == 'success':
            # Update last daily claim time
            user_login_history[request.player_account_id]['last_daily_claim'] = current_time
            
            return {
                "status": "success",
                "message": f"Daily reward scheduled! You'll receive {result['amount']} Rune tokens in 5 minutes.",
                "amount": result['amount'],
                "schedule_id": result['schedule_id'],
                "execution_time": result['execution_time']
            }
        else:
            raise HTTPException(status_code=500, detail=result['message'])
            
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to process daily reward: {e}")

@app.post("/chest/open")
async def victory_chest(request: OpenChestRequest):
    """Send victory reward (1000, 1500, or 2000 tokens) after winning a game"""
    try:
        result = await hedera_service.send_victory_reward(request.player_account_id)
        
        if result['status'] == 'success':
            return {
                "status": "success",
                "message": f"Victory reward scheduled! You'll receive {result['amount']} Rune tokens in 30 minutes.",
                "amount": result['amount'],
                "schedule_id": result['schedule_id'],
                "execution_time": result['execution_time']
            }
        else:
            raise HTTPException(status_code=500, detail=result['message'])
            
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to process victory reward: {e}")

# --- NEW MIRROR NODE ANALYTICS ENDPOINTS ---

@app.get("/analytics/account/{account_id}")
async def get_account_analytics(account_id: str):
    """Get comprehensive account analytics from Mirror Node"""
    try:
        # Get account info and transaction history in parallel
        account_info = await mirror_service.get_account_info(account_id)
        token_transactions = await mirror_service.get_token_transactions(account_id)
        
        if not account_info:
            raise HTTPException(status_code=404, detail="Account not found")
        
        # Calculate analytics
        total_received = sum(tx['amount'] for tx in token_transactions if tx['type'] == 'received')
        total_sent = sum(abs(tx['amount']) for tx in token_transactions if tx['type'] == 'sent')
        transaction_count = len(token_transactions)
        
        # Recent activity (last 7 days)
        week_ago = datetime.now() - timedelta(days=7)
        recent_transactions = [
            tx for tx in token_transactions 
            if datetime.fromtimestamp(int(tx['timestamp']) / 1_000_000_000) > week_ago
        ]
        
        return {
            "status": "success",
            "account_id": account_id,
            "account_info": {
                "balance": account_info.get("balance", {}).get("balance", 0),
                "created_timestamp": account_info.get("created_timestamp"),
                "auto_renew_period": account_info.get("auto_renew_period")
            },
            "rune_token_analytics": {
                "total_received": total_received,
                "total_sent": total_sent,
                "net_balance": total_received - total_sent,
                "transaction_count": transaction_count,
                "recent_activity_count": len(recent_transactions)
            },
            "recent_transactions": token_transactions[:10]  # Last 10 transactions
        }
        
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to get analytics: {e}")

@app.get("/analytics/transactions/{account_id}")
async def get_transaction_history(account_id: str, limit: int = 25):
    """Get detailed Rune token transaction history"""
    try:
        transactions = await mirror_service.get_token_transactions(account_id, limit=limit)
        
        # Format transactions for frontend
        formatted_transactions = []
        for tx in transactions:
            # Convert timestamp to readable format
            timestamp_seconds = int(tx['timestamp']) / 1_000_000_000
            readable_time = datetime.fromtimestamp(timestamp_seconds).isoformat()
            
            formatted_transactions.append({
                "transaction_id": tx['transaction_id'],
                "timestamp": readable_time,
                "amount": tx['amount'],
                "type": tx['type'],
                "status": tx['result'],
                "description": get_transaction_description(tx['amount'], tx['type'])
            })
        
        return {
            "status": "success",
            "account_id": account_id,
            "transaction_count": len(formatted_transactions),
            "transactions": formatted_transactions
        }
        
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to get transaction history: {e}")

@app.get("/analytics/network")
async def get_network_analytics():
    """Get network-wide game statistics"""
    try:
        network_stats = await mirror_service.get_network_stats()
        
        # Calculate game-specific metrics
        current_time = datetime.now()
        
        # Mock game statistics (in production, store these in database)
        game_stats = {
            "active_players_today": len(user_login_history),
            "total_games_played": sum(1 for user_data in user_login_history.values() 
                                    if user_data.get('games_played', 0) > 0),
            "total_rewards_distributed": calculate_total_rewards_distributed(),
            "average_session_time": "25.3 minutes",  # Mock data
            "top_performing_players": get_top_players()  # Mock data
        }
        
        return {
            "status": "success",
            "timestamp": current_time.isoformat(),
            "network_stats": network_stats,
            "game_stats": game_stats,
            "mirror_node_health": "operational"
        }
        
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to get network analytics: {e}")

# --- HELPER FUNCTIONS FOR ANALYTICS ---

def get_transaction_description(amount: int, tx_type: str) -> str:
    """Generate human-readable transaction descriptions"""
    if tx_type == "received":
        if amount == 250:
            return "Welcome Bonus - First time reward"
        elif 50 <= amount <= 200:
            return "Daily Login Reward"
        elif 1000 <= amount <= 2000:
            return "Victory Chest Reward"
        else:
            return f"Received {amount} Rune Tokens"
    else:
        return f"Sent {abs(amount)} Rune Tokens"

def calculate_total_rewards_distributed() -> int:
    """Calculate total rewards distributed (mock implementation)"""
    # In production, query Mirror Node for all Rune token distributions
    return sum(
        (250 if user_data.get('welcome_bonus_claimed') else 0) +
        (user_data.get('daily_rewards_claimed', 0) * 125) +  # Average daily reward
        (user_data.get('victory_rewards_claimed', 0) * 1500)  # Average victory reward
        for user_data in user_login_history.values()
    )

def get_top_players() -> list:
    """Get top performing players (mock implementation)"""
    # In production, query database for actual player statistics
    return [
        {"account_id": "0.0.123456", "score": 2500, "games_won": 15},
        {"account_id": "0.0.789012", "score": 2200, "games_won": 12},
        {"account_id": "0.0.345678", "score": 1800, "games_won": 9}
    ]

# --- EXISTING MULTIPLAYER ENDPOINTS ---

# Add this import at the top with your other imports


# Add these new HCS endpoints after your analytics endpoints

# --- HCS CONSENSUS ENDPOINTS ---

@app.post("/consensus/create-topics")
async def create_consensus_topics():
    """Initialize HCS topics for consensus mechanisms"""
    try:
        topics = await hcs_service.create_consensus_topics()
        
        if topics:
            return {
                "status": "success",
                "message": "HCS topics created successfully",
                "topics": topics,
                "demo_mode": hcs_service.demo_mode
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to create HCS topics")
            
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to create consensus topics: {e}")

@app.post("/consensus/dialogue")
async def submit_dialogue_consensus(request: dict):
    """Submit LLM dialogue for consensus validation - REVOLUTIONARY FEATURE!"""
    try:
        required_fields = ['game_id', 'player_id', 'villager_name', 'player_input', 'llm_response']
        for field in required_fields:
            if field not in request:
                raise HTTPException(status_code=400, detail=f"Missing required field: {field}")
        
        result = await hcs_service.submit_dialogue_for_consensus(
            game_id=request['game_id'],
            player_id=request['player_id'],
            villager_name=request['villager_name'],
            player_input=request['player_input'],
            llm_response=request['llm_response']
        )
        
        if result['status'] == 'success':
            return {
                "status": "success",
                "message": "🚀 LLM dialogue submitted for consensus validation!",
                "consensus_id": result['consensus_id'],
                "topic_id": result.get('topic_id'),
                "innovation": "First-ever LLM dialogue consensus in Web3 gaming",
                "demo_mode": result.get('demo_mode', False)
            }
        else:
            raise HTTPException(status_code=500, detail=result['message'])
            
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to submit dialogue consensus: {e}")

@app.post("/consensus/victory")
async def submit_victory_consensus(request: dict):
    """Submit victory claim for consensus validation"""
    try:
        required_fields = ['game_id', 'player_id', 'victory_claim']
        for field in required_fields:
            if field not in request:
                raise HTTPException(status_code=400, detail=f"Missing required field: {field}")
        
        result = await hcs_service.submit_victory_consensus(
            game_id=request['game_id'],
            player_id=request['player_id'],
            victory_claim=request['victory_claim']
        )
        
        if result['status'] == 'success':
            return {
                "status": "success",
                "message": "Victory claim submitted for consensus validation",
                "consensus_id": result['consensus_id'],
                "topic_id": result.get('topic_id'),
                "demo_mode": result.get('demo_mode', False)
            }
        else:
            raise HTTPException(status_code=500, detail=result['message'])
            
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to submit victory consensus: {e}")

@app.post("/consensus/game-event")
async def submit_game_event_consensus(request: dict):
    """Submit general game events for consensus logging"""
    try:
        required_fields = ['event_type', 'game_id', 'event_data']
        for field in required_fields:
            if field not in request:
                raise HTTPException(status_code=400, detail=f"Missing required field: {field}")
        
        result = await hcs_service.submit_game_session_event(
            event_type=request['event_type'],
            game_id=request['game_id'],
            event_data=request['event_data']
        )
        
        if result['status'] == 'success':
            return {
                "status": "success",
                "message": f"{request['event_type']} event logged to consensus",
                "topic_id": result.get('topic_id'),
                "demo_mode": result.get('demo_mode', False)
            }
        else:
            raise HTTPException(status_code=500, detail=result['message'])
            
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to submit game event consensus: {e}")

@app.get("/consensus/status/{consensus_id}")
async def get_consensus_status(consensus_id: str):
    """Get the current status of a consensus validation"""
    try:
        status = await hcs_service.get_consensus_status(consensus_id)
        
        return {
            "status": "success",
            "consensus_data": status,
            "message": "Consensus status retrieved successfully"
        }
        
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to get consensus status: {e}")

@app.get("/consensus/topics")
async def get_consensus_topics():
    """Get list of all HCS topics used for consensus"""
    try:
        return {
            "status": "success",
            "topics": hcs_service.topics,
            "descriptions": {
                "game_sessions": "Game session events and player actions",
                "dialogue_validation": "🚀 LLM dialogue consensus validation (REVOLUTIONARY!)",
                "victory_validation": "Victory condition consensus verification",
                "leaderboard": "Player achievement and ranking updates"
            },
            "demo_mode": hcs_service.demo_mode
        }
        
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to get consensus topics: {e}")

@app.get("/ping")
async def ping():
    """Health check endpoint"""
    return {"message": "Server is running", "timestamp": datetime.now().isoformat()}

@app.post("/create_room")
async def create_room():
    room_id = str(uuid.uuid4())[:8]
    multiplayer_rooms[room_id] = {
        "id": room_id,
        "players": [],
        "game_id": None,
        "started": False,
        "winner": None
    }
    return {"room_id": room_id, "status": "created"}

@app.get("/rooms/{room_id}")
async def get_room(room_id: str):
    if room_id not in multiplayer_rooms:
        raise HTTPException(status_code=404, detail="Room not found")
    
    room = multiplayer_rooms[room_id]
    players = manager.get_room_players(room_id)
    
    return {
        "id": room["id"],
        "players": players,
        "started": room["started"],
        "game_id": room.get("game_id"),
        "winner": room.get("winner")
    }

@app.websocket("/ws/{room_id}/{player_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str, player_id: str):
    player_name = f"Player_{player_id[:8]}"
    await manager.connect(websocket, room_id, player_id, player_name)
    
    # Update the room's player list with unique players only
    if room_id in multiplayer_rooms:
        room = multiplayer_rooms[room_id]
        # Remove any existing entries for this player
        room["players"] = [p for p in room["players"] if p["id"] != player_id]
        # Add the player once
        room["players"].append({"id": player_id, "name": player_name})
    
    try:
        # Send initial room state
        await websocket.send_text(json.dumps({
            "type": "room_joined",
            "players": manager.get_room_players(room_id),
            "room": multiplayer_rooms.get(room_id, {})
        }))
        
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            if message["type"] == "move":
                manager.update_player_position(room_id, player_id, message["x"], message["y"])
                # Broadcast movement to other players in the room
                await manager.broadcast_to_room({
                    "type": "player_moved",
                    "playerId": player_id,
                    "x": message["x"],
                    "y": message["y"]
                }, room_id, exclude_websocket=websocket)
                
            elif message["type"] == "start_game":
                if room_id in multiplayer_rooms and not multiplayer_rooms[room_id]["started"]:
                    # Check if we have at least 2 unique players
                    unique_players = manager.get_room_players(room_id)
                    if len(unique_players) < 2:
                        await websocket.send_text(json.dumps({
                            "type": "error",
                            "message": "Need at least 2 players to start the game"
                        }))
                        continue
                    
                    # Create a shared game for all players in the room
                    game_response = await create_new_game(NewGameRequest(difficulty="medium"))
                    game_id = game_response.game_id
                    
                    multiplayer_rooms[room_id]["game_id"] = game_id
                    multiplayer_rooms[room_id]["started"] = True
                    
                    # Notify all players in the room to start the game
                    await manager.broadcast_to_room({
                        "type": "game_started",
                        "game_id": game_id,
                        "game_data": {
                            "game_id": game_id,
                            "inaccessible_locations": game_response.inaccessible_locations,
                            "villagers": game_response.villagers
                        }
                    }, room_id)
            
            elif message["type"] == "game_won":
                if room_id in multiplayer_rooms and not multiplayer_rooms[room_id].get("winner"):
                    multiplayer_rooms[room_id]["winner"] = player_id
                    
                    # Notify all players about the winner
                    await manager.broadcast_to_room({
                        "type": "game_ended",
                        "winner": player_id,
                        "winner_name": player_name
                    }, room_id)
                
    except WebSocketDisconnect:
        manager.disconnect(websocket, room_id, player_id)
        
        # Remove player from room
        if room_id in multiplayer_rooms:
            room = multiplayer_rooms[room_id]
            room["players"] = [p for p in room["players"] if p["id"] != player_id]
        
        # Notify other players that this player left
        await manager.broadcast_to_room({
            "type": "player_left",
            "playerId": player_id,
            "players": manager.get_room_players(room_id)
        }, room_id)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
