# main.py
# This script runs the FastAPI server, exposing the game engine through API endpoints.

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, List
import uuid
import os
import traceback
import sys
from dotenv import load_dotenv
from datetime import datetime, timedelta
import json

# --- UPDATED IMPORTS ---
from schemas import *
from game_logic.engine import GameEngine
from game_logic.state_manager import GameState
# Import our new Hedera service
from hedera_service import hedera_service
# -------------------------

# Load environment variables from a .env file if it exists
load_dotenv()

# Initialize the FastAPI app and the Game Engine
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
API_KEY = os.environ.get("GOOGLE_API_KEY")
game_engine: GameEngine
active_games: Dict[str, GameState] = {}

# In-memory storage for user login tracking (in production, use a database)
user_login_history = {}

@app.on_event("startup")
async def startup_event():
    """Initializes the game engine on server startup."""
    global game_engine
    print("--- Server Startup ---")
    if not API_KEY or API_KEY == "YOUR_GOOGLE_API_KEY_HERE":
        print("!!! FATAL ERROR: API Key not found. Please set the GOOGLE_API_KEY environment variable. !!!")
        sys.exit("API Key is not configured. Shutting down.")
    
    print("API Key found. Initializing Game Engine...")
    game_engine = GameEngine(api_key=API_KEY)
    if not game_engine.llm_api.model:
        sys.exit("Failed to initialize Gemini Model. Please check your API key and network connection.")
    print("Game Engine initialized successfully.")

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
        frustration = {"friends": len([
            msg for msg in game_state.full_npc_memory.get(villager_name, [])
            if msg.get("content") and "friend" in msg.get("content").lower()
        ])}
        player_input = request.player_prompt if request.player_prompt is not None else "I'd like to talk."

        dialogue_data = game_engine.process_interaction_turn(game_state, villager_name, player_input, frustration)
        
        if not dialogue_data:
                raise HTTPException(status_code=500, detail="LLM failed to generate valid dialogue.")

        return InteractResponse(
            villager_id=request.villager_id,
            villager_name=villager_name,
            npc_dialogue=dialogue_data.get("npc_dialogue"),
            player_suggestions=dialogue_data.get("player_responses")
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
    
    key_clues = [node['node_id'] for node in game_state.quest_network.get('nodes', []) if node.get('key_clue')]
    discovered_key_clues = [node_id for node_id in game_state.player_state['discovered_nodes'] if node_id in key_clues]
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
        is_true_ending=is_true_ending
    )

# --- NEW ENDPOINTS FOR RUNE TOKEN SYSTEM ---

@app.get("/balance/{account_id}")
async def get_balance(account_id: str):
    """
    Get the Rune Token balance for a specific Hedera account
    """
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
    """
    Send 250 Rune tokens as a first-time login bonus
    """
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
    """
    Send daily login reward (50, 100, or 200 tokens) if 24 hours have passed
    """
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
    """
    Send victory reward (1000, 1500, or 2000 tokens) after winning a game
    """
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

@app.get("/ping")
async def ping():
    """Health check endpoint"""
    return {"message": "Server is running", "timestamp": datetime.now().isoformat()}
# Add these new classes and data structures
class Player:
    def __init__(self, id: str, name: str):
        self.id = id
        self.name = name
        self.position = {"x": 400, "y": 300}
        self.websocket = None

class GameRoom:
    def __init__(self, id: str):
        self.id = id
        self.players: Dict[str, Player] = {}
        self.started = False

    def add_player(self, player: Player) -> bool:
        if len(self.players) >= 5:
            return False
        self.players[player.id] = player
        return True

    def remove_player(self, player_id: str):
        self.players.pop(player_id, None)

    def get_player_list(self):
        return [{"id": p.id, "name": p.name} for p in self.players.values()]

# Add room management
rooms: Dict[str, GameRoom] = {}

# Add new endpoints
@app.post("/create_room")
async def create_room():
    room_id = str(uuid.uuid4())[:8]
    rooms[room_id] = GameRoom(room_id)
    return {"room_id": room_id}

@app.get("/rooms/{room_id}")
async def get_room(room_id: str):
    if room_id not in rooms:
        raise HTTPException(status_code=404, detail="Room not found")
    room = rooms[room_id]
    return {
        "id": room.id,
        "players": room.get_player_list(),
        "started": room.started
    }

@app.websocket("/ws/{room_id}/{player_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    room_id: str,
    player_id: str,
    player_name: str = "Player"
):
    await websocket.accept()
    
    if room_id not in rooms:
        await websocket.close(code=4000)
        return
        
    room = rooms[room_id]
    player = Player(player_id, player_name)
    player.websocket = websocket
    
    if not room.add_player(player):
        await websocket.close(code=4001)
        return
        
    try:
        # Broadcast player list to all players in room
        player_list = room.get_player_list()
        for p in room.players.values():
            await p.websocket.send_json({
                "type": "players_update",
                "players": player_list
            })
            
        while True:
            data = await websocket.receive_json()
            
            if data["type"] == "start_game":
                room.started = True
                # Notify all players to start game
                for p in room.players.values():
                    await p.websocket.send_json({"type": "game_started"})
                    
            elif data["type"] == "move":
                player.position = {"x": data["x"], "y": data["y"]}
                # Broadcast position to other players
                for p in room.players.values():
                    if p.id != player_id:
                        await p.websocket.send_json({
                            "type": "player_moved",
                            "playerId": player_id,
                            "x": data["x"],
                            "y": data["y"]
                        })
                        
    except WebSocketDisconnect:
        room.remove_player(player_id)
        if len(room.players) == 0:
            rooms.pop(room_id, None)
        else:
            # Notify remaining players
            for p in room.players.values():
                await p.websocket.send_json({
                    "type": "player_left",
                    "playerId": player_id,
                    "players": room.get_player_list()
                })
