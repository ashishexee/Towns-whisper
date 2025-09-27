# main.py
# This script runs the FastAPI server, exposing the game engine through API endpoints.

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from schemas import *
import traceback
import uuid
import json
from typing import Dict, List
from game_logic.engine import GameEngine
import os

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize the game engine
game_engine = None

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
        
        # Create individual player state key for multiplayer
        player_key = request.player_id if hasattr(request, 'player_id') and request.player_id else "single_player"
        
        # Initialize player-specific states if they don't exist
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
        
        if player_key not in game_state.multiplayer_memories:
            game_state.multiplayer_memories[player_key] = {v["name"]: [] for v in game_state.villagers}
        
        # Use player-specific state for interaction
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
        raise HTTPException(status_code=500, detail=f"Error processing interaction: {e}")

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