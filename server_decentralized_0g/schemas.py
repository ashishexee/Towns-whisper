# schemas.py
# This file defines the Pydantic models for API request and response validation.

from pydantic import BaseModel
from typing import List, Dict, Optional

# Game-related schemas
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

# Chest/Reward system schemas
class OpenChestRequest(BaseModel):
    """Request for opening any type of chest"""
    player_account_id: str

class ChestResponse(BaseModel):
    """Response for chest operations"""
    status: str
    message: str
    amount: Optional[int] = None
    schedule_id: Optional[str] = None
    execution_time: Optional[str] = None
