# schemas.py
# This file defines the Pydantic models for API request and response validation.
# It ensures that data flowing in and out of the API is well-structured.

from pydantic import BaseModel
from typing import List, Dict, Optional

class NewGameRequest(BaseModel):
    difficulty: str = "medium"
    num_inaccessible_locations: int = 5

class NewGameResponse(BaseModel):
    game_id: str
    status: str
    inaccessible_locations: List[str]
    villagers: List[Dict]

class InteractRequest(BaseModel):
    villager_id: str
    player_prompt: Optional[str] = None

class InteractResponse(BaseModel):
    villager_id: str
    villager_name: str
    npc_dialogue: str
    player_suggestions: List[str]

class GuessRequest(BaseModel):
    location_name: str

class GuessResponse(BaseModel):
    is_correct: bool
    is_true_ending: bool
    message: str