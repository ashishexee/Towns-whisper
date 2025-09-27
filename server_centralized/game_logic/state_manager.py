# game_logic/state_manager.py
# Defines the GameState class, which holds all dynamic data for a single playthrough.

class GameState:
    def __init__(self, game_id: str, difficulty: str):
        self.game_id = game_id
        self.difficulty = difficulty
        self.correct_location = ""
        self.story_theme = ""
        self.inaccessible_locations = []
        self.quest_network = {"nodes": []}
        self.villagers = [] # Each game session will store its own list of villagers
        self.player_state = {
            "discovered_nodes": [],
            "knowledge_summary": "You've just woken up in a cozy cottage...",
            "familiarity": {},
            "unproductive_turns": {} # Tracks turns since last clue for each villager
        }
        self.full_npc_memory = {}