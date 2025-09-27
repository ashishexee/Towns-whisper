# test_game.py
# A command-line script to test and play the game by interacting with the FastAPI server.

import requests
import json
import os

BASE_URL = "http://127.0.0.1:8000"

def start_new_game(difficulty):
    """Starts a new game with the chosen difficulty."""
    print("Starting a new game...")
    try:
        response = requests.post(f"{BASE_URL}/game/new", json={"difficulty": difficulty, "num_inaccessible_locations": 3})
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error starting game: {e}")
        print("Is the FastAPI server running? Run 'uvicorn main:app --reload' in another terminal.")
        return None

def start_conversation_loop(game_id, villager_id, villager_name):
    """Manages a continuous, interactive conversation with an NPC via API calls."""
    print(f"\n\n================= CONVERSATION WITH {villager_name.upper()} =================")
    
    player_input = "This is the starting prompt of the conversation."
    
    while True:
        interact_payload = {"villager_id": villager_id}
        if player_input is not None:
            interact_payload["player_prompt"] = player_input
        
        try:
            response = requests.post(f"{BASE_URL}/game/{game_id}/interact", json=interact_payload)
            response.raise_for_status()
            dialogue_turn = response.json()
        except requests.exceptions.RequestException as e:
            print(f"Error during interaction: {e}")
            break

        npc_response = dialogue_turn.get("npc_dialogue", "(The villager stays silent.)")
        player_options = dialogue_turn.get("player_suggestions", [])
        
        print(f"\n{dialogue_turn.get('villager_name', villager_name)}: {npc_response}")
        print("---------------------------------------------")
        
        leave_option = "I should go now. Goodbye."
        final_options = player_options
        final_options.append(leave_option)
        final_options.append("(Type your own response)")

        for i, option in enumerate(final_options): 
            print(f"  {i + 1}. {option}")

        choice = input(f"\nYour choice (1-{len(final_options)}): ").strip()
        
        try:
            choice_idx = int(choice)
            if 1 <= choice_idx < len(final_options):
                player_input = final_options[choice_idx - 1]
            elif choice_idx == len(final_options):
                player_input = input("Your response: ").strip()
            else:
                player_input = "..."
        except ValueError:
            player_input = "..."
        
        if player_input == leave_option:
            print(f"\nYou take your leave from {villager_name}.")
            break

def main():
    """The main interactive game loop for the command-line client."""
    difficulty_choice = ""
    while difficulty_choice not in ['1', '2', '3']:
        print("Choose a difficulty:")
        print("  1. Very Easy")
        print("  2. Easy")
        print("  3. Medium")
        print("  4. Hard")
        difficulty_choice = input("Your choice (1-4): ").strip()
        
    difficulty_map = {'1': 'very_easy', '2': 'easy', '3': 'medium', '4': 'hard'}
    
    game_data = start_new_game(difficulty_map[difficulty_choice])
    if not game_data:
        return

    game_id = game_data["game_id"]
    villagers = game_data["villagers"]
    
    print(f"\nNew game started with ID: {game_id}")
    
    while True:
        print("\n\n====================== THE VILLAGE SQUARE ======================")
        print("--------------------------------------------------------------")
        print("Talk to a villager:")
        for i, villager in enumerate(villagers): 
            print(f"  {i + 1}. {villager['title']}")
        
        print("\nOther Actions:")
        print("  q. Quit Game")
        choice = input("\nEnter your choice (number or 'q'): ").strip().lower()

        if choice == 'q': 
            print("You leave the village to its secrets. Goodbye.")
            break
        
        try:
            choice_index = int(choice) - 1
            if 0 <= choice_index < len(villagers):
                villager_to_talk_to = villagers[choice_index]
                # In a real client, you'd update the villager list with their revealed name
                start_conversation_loop(game_id, villager_to_talk_to['id'], villager_to_talk_to['title'])
            else: 
                print("Invalid number.")
        except ValueError: 
            print("Invalid input.")


if __name__ == "__main__":
    main()