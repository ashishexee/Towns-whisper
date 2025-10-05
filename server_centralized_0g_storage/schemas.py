# schemas.py
# This file defines the Pydantic models for API request and response validation.
# It ensures that data flowing in and out of the API is well-structured.

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
    player_id: Optional[str] = None  # New field for multiplayer

class InteractResponse(BaseModel):
    villager_id: str
    villager_name: str
    npc_dialogue: str
    player_suggestions: List[str]

class GuessRequest(BaseModel):
    location_name: str
    player_id: Optional[str] = None  # New field for multiplayer

class GuessResponse(BaseModel):
    is_correct: bool
    is_true_ending: bool
    message: str
    story: Optional[str] = None

# Rune Token / Chest system schemas
class OpenChestRequest(BaseModel):
    """The request from the game client when a player opens a chest."""
    player_account_id: str

class OpenChestResponse(BaseModel):
    """The response sent back after attempting to schedule the reward."""
    status: str
    message: str
    schedule_id: Optional[str] = None

class BalanceResponse(BaseModel):
    """Response for token balance queries."""
    status: str
    account_id: str
    balance: int
    token_symbol: str
    token_name: str

class ChestRewardResponse(BaseModel):
    """Response for all chest reward endpoints (welcome, daily, victory)."""
    status: str
    message: str
    amount: int
    schedule_id: str
    execution_time: str
