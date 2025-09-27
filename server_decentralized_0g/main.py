# main.py
# This script runs the FastAPI server, exposing the game engine through API endpoints.

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, List
import uuid
import os
import traceback
import sys
import json

from schemas import *
from game_logic.engine import GameEngine
from game_logic.state_manager import GameState

try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    # dotenv not available; rely on actual environment variables
    pass

# Initialize the FastAPI app and the Game Engine
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# REMOVED: This is no longer needed as we are not using the Gemini API directly.
# API_KEY = os.environ.get("GOOGLE_API_KEY")
game_engine: GameEngine
active_games: Dict[str, GameState] = {}

@app.on_event("startup")
async def startup_event():
    """Initializes the game engine on server startup."""
    global game_engine
    print("--- Server Startup ---")
    
    # MODIFIED: Removed the check for the GOOGLE_API_KEY.
    # We now initialize the GameEngine directly without a real key.
    print("Initializing Game Engine for 0G Compute Bridge...")
    game_engine = GameEngine(api_key="0g_bridge_is_used") # Pass a dummy key
    
    # REMOVED: This check was specific to the Gemini model and is no longer relevant.
    # if not game_engine.llm_api.model:
    #     sys.exit("Failed to initialize Gemini Model. Please check your API key and network connection.")
    
    print("Game Engine initialized successfully.")

@app.post("/game/new", response_model=NewGameResponse)
async def create_new_game(request: NewGameRequest):
    game_id = str(uuid.uuid4())
    try:
        # num_villagers is no longer needed as the engine uses the full roster
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

# ... (the rest of the endpoints remain the same) ...
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
        # FIX: Add a check to ensure msg.get('content') is not None before calling .lower()
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