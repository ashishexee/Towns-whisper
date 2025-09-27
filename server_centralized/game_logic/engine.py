# game_logic/engine.py
# The core GameEngine that manages the entire game lifecycle.

import json
import traceback
from .state_manager import GameState
from .llm_calls import GeminiAPI
from config import VILLAGER_ROSTER, FAMILIARITY_LEVELS

class GameEngine:
    def __init__(self, api_key: str):
        self.llm_api = GeminiAPI(api_key)

    def start_new_game(self, game_id: str, num_inaccessible_locations: int, difficulty: str) -> GameState:
        game_state = GameState(game_id, difficulty)
        
        # 1. Generate the core story idea
        try:
            print("Attempting to generate story idea...")
            story_context = {"num_inaccessible_locations": num_inaccessible_locations}
            story_idea_json = self.llm_api.generate_content("StoryGenerator", story_context)
            story_idea = json.loads(story_idea_json)
            print("Story idea generated successfully.")
        except (json.JSONDecodeError, ValueError, KeyError) as e:
            print(f"--- CRITICAL ERROR: Failed to generate or parse story idea. Error: {e} ---")
            traceback.print_exc()
            raise Exception("Could not initialize game story.") from e

        game_state.story_theme = story_idea.get("story_theme")
        game_state.inaccessible_locations = story_idea.get("inaccessible_locations", [])
        game_state.correct_location = story_idea.get("correct_location")
        
        game_state.player_state["knowledge_summary"] = "You've just woken up in a cozy cottage. A kind old man named Arthur tells you he found you unconscious by a car wreck on the edge of the woods. He says he searched the area but saw no sign of your friends. As he speaks, you remember a faint, desperate call in your mind: 'Help us... find us...' You've just thanked him and stepped outside into the village square to begin your search."
        
        game_state.villagers = VILLAGER_ROSTER
        
        # Initialize state for all villagers
        for v in game_state.villagers:
            game_state.full_npc_memory[v["name"]] = []
            game_state.player_state["familiarity"][v["name"]] = 0
            # BUG FIX: Re-added initialization for unproductive_turns
            game_state.player_state["unproductive_turns"][v["name"]] = 0

        # 2. Build the detailed Quest Network
        try:
            print("Attempting to generate quest network...")
            world_context = {
                "correctLocation": game_state.correct_location,
                "villagers": game_state.villagers,
                "difficulty": difficulty,
                "story_theme": game_state.story_theme
            }
            quest_network_json = self.llm_api.generate_content("WorldBuilder", world_context)
            game_state.quest_network = json.loads(quest_network_json)
            if not game_state.quest_network.get("nodes"):
                 raise ValueError("Generated quest network is missing the 'nodes' list.")
            print("Quest network generated successfully.")
            
            print("\n\n" + "="*20 + " GENERATED QUEST NETWORK (SPOILERS) " + "="*20)
            print(json.dumps(game_state.quest_network, indent=2))
            print("="*70 + "\n\n")

        except (json.JSONDecodeError, ValueError, KeyError) as e:
            print(f"--- CRITICAL ERROR: Failed to generate or parse quest network. Error: {e} ---")
            traceback.print_exc()
            raise Exception("Could not initialize game world.") from e

        return game_state
    
    def get_villager_clue_status(self, game_state: GameState, npc_name: str):
        undiscovered_nodes = [
            node for node in game_state.quest_network.get("nodes", [])
            if node["villager_name"] == npc_name and node["node_id"] not in game_state.player_state["discovered_nodes"]
        ]

        if not undiscovered_nodes:
            return "PERMANENTLY_EXHAUSTED", None

        sorted_nodes = sorted(undiscovered_nodes, key=lambda x: x.get('priority', 0), reverse=True)

        for node in sorted_nodes:
            preconditions_met = all(p in game_state.player_state["discovered_nodes"] for p in node.get("preconditions", []))
            current_familiarity = game_state.player_state["familiarity"].get(npc_name, 0)
            required_familiarity = node.get("required_familiarity")
            familiarity_met = required_familiarity is None or current_familiarity >= required_familiarity

            if preconditions_met and familiarity_met:
                return "CAN_REVEAL", node

        return "HAS_LOCKED_CLUES", sorted_nodes[0]

    def process_interaction_turn(self, game_state: GameState, npc_name: str, player_input: str, frustration: dict):
        clue_status, context_node = self.get_villager_clue_status(game_state, npc_name)

        villager_profile = next((v for v in game_state.villagers if v["name"] == npc_name), None)
        
        familiarity = game_state.player_state["familiarity"].get(npc_name, 0)
        
        dialogue_turn = self.llm_api.generate_content("Interaction", {
            "villagerProfile": villager_profile,
            "chatHistory": game_state.full_npc_memory.get(npc_name, []),
            "player_last_response": player_input,
            "conversational_status": clue_status,
            "context_node": context_node,
            "frustration": frustration,
            "player_knowledge_summary": game_state.player_state["knowledge_summary"],
            "familiarity_level": familiarity,
            "familiarity_description": FAMILIARITY_LEVELS.get(familiarity, "Unknown"),
        })
        
        dialogue_data = json.loads(dialogue_turn)
        
        game_state.full_npc_memory[npc_name].append({"role": "player", "content": player_input})
        game_state.full_npc_memory[npc_name].append({"role": "npc", "content": dialogue_data.get("npc_dialogue")})
        
        # LOGIC FIX: Enforce the "+1" familiarity rule in the engine
        new_familiarity = dialogue_data.get("new_familiarity_level")
        if new_familiarity is not None:
            old_familiarity = game_state.player_state["familiarity"].get(npc_name, 0)
            # Cap the increase at a maximum of 1
            if new_familiarity > old_familiarity + 1:
                new_familiarity = old_familiarity + 1
            game_state.player_state["familiarity"][npc_name] = new_familiarity

        revealed_node_id = dialogue_data.get("node_revealed_id")
        if revealed_node_id and revealed_node_id not in game_state.player_state["discovered_nodes"]:
            game_state.player_state["discovered_nodes"].append(revealed_node_id)
            all_discovered_content = [node['content'] for node in game_state.quest_network.get('nodes', []) if node['node_id'] in game_state.player_state['discovered_nodes']]
            game_state.player_state["knowledge_summary"] = "Key points discovered so far: " + "; ".join(all_discovered_content)

        print("\n\n" + "-"*20 + " CURRENT PLAYER STATE " + "-"*20)
        print(json.dumps(game_state.player_state, indent=2, default=str))
        print("-"*60 + "\n\n")

        return dialogue_data