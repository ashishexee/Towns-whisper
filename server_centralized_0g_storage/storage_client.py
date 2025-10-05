import httpx
import os
from typing import Dict, Any, Optional

STORAGE_SERVICE_URL = os.getenv("STORAGE_SERVICE_URL", "http://localhost:3002")

async def get_dialogue_history(wallet_address: str) -> Optional[Dict[str, Any]]:
    """Fetches the entire dialogue history for a given wallet address from 0G Storage."""
    if not wallet_address:
        return None
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{STORAGE_SERVICE_URL}/dialogue/{wallet_address}", timeout=10.0)
            response.raise_for_status()
            return response.json()
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 404:
            print(f"No persistent history found for {wallet_address}. A new one will be created.")
            return None
        print(f"Error fetching dialogue history for {wallet_address}: {e}")
        return None
    except Exception as e:
        print(f"An unexpected error occurred while fetching dialogue history: {e}")
        return None

async def save_dialogue(wallet_address: str, new_dialogue: Dict[str, str]) -> bool:
    """Saves a new dialogue turn for a given wallet address to 0G Storage."""
    if not wallet_address:
        return False
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{STORAGE_SERVICE_URL}/dialogue/{wallet_address}",
                json={"newDialogue": new_dialogue},
                timeout=20.0
            )
            response.raise_for_status()
            print(f"Successfully saved dialogue for {wallet_address} to 0G Storage.")
            return True
    except Exception as e:
        print(f"Error saving dialogue to 0G Storage for {wallet_address}: {e}")
        return False

async def save_full_dialogue_history(wallet_address: str, history: Dict[str, Any]) -> bool:
    """Saves the entire dialogue history for a wallet address, overwriting existing data."""
    if not wallet_address:
        return False
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{STORAGE_SERVICE_URL}/dialogue/history/{wallet_address}",
                json=history,
                timeout=40.0  # Increased timeout for potentially larger payload
            )
            response.raise_for_status()
            print(f"Successfully saved full dialogue history for {wallet_address} to 0G Storage.")
            return True
    except Exception as e:
        print(f"Error saving full dialogue history to 0G Storage for {wallet_address}: {e}")
        return False