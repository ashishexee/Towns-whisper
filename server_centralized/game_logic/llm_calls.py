# game_logic/llm_calls.py
# Contains the GeminiAPI class and all prompt engineering logic.

import json
import google.generativeai as genai

class GeminiAPI:
    def __init__(self, api_key):
        try:
            genai.configure(api_key=api_key)
            self.model = genai.GenerativeModel('gemini-2.5-flash-lite')
            print("✅ Gemini API configured successfully.")
        except Exception as e:
            print(f"❌ Error configuring Gemini API: {e}")
            self.model = None

    def _clean_json_response(self, text_response):
        text_response = text_response.strip()
        if text_response.startswith("```json"):
            text_response = text_response[7:]
        if text_response.endswith("```"):
            text_response = text_response[:-3]
        return text_response.strip()

    def generate_content(self, prompt_type, context):
        if not self.model: return "{}"
        print(f"\n--- 🤖 Live Gemini API Call ({prompt_type}) ---")
        
        prompts = {
            "StoryGenerator": self._create_story_generator_prompt,
            "WorldBuilder": self._create_world_builder_prompt,
            "Interaction": self._create_interaction_prompt,
        }
        prompt = prompts.get(prompt_type, lambda _: "")(context)
        if not prompt: 
            print(f"--- ERROR: No prompt found for type '{prompt_type}' ---")
            return "{}"

        print("--- Sending Prompt to Gemini... (This may take a moment) ---")
        try:
            response = self.model.generate_content(prompt, generation_config={"response_mime_type": "application/json"})
            return self._clean_json_response(response.text)
        except Exception as e:
            print(f"❌ An error occurred during the API call: {e}")
            return "{}"

    def _create_story_generator_prompt(self, context):
        return f"""
        You are a master storyteller and mystery writer for the game "Village of Echoes".

        **The Fixed Premise:**
        The player's story ALWAYS begins this way: Their car crashes in a mysterious forest after a tree falls. They awaken in the cottage of a kind old man, Arthur Hobbs lives northwest of the village. He tells them he found them unconscious but saw no sign of their friends. During their unconsciousness, the player heard a desperate, psychic cry from their friends: 'Help us... find us...' The game begins as the player steps outside to search the village.

        **Your Task:**
        Your job is to generate the secret, underlying mystery of the village that the player will uncover. You must create a unique reason for the friends' disappearance that fits the dark, psychological mystery theme of the game.

        **10 Story Theme Examples for Inspiration:**
        1. A sentient, ancient tree in the woods caused the crash to lure people in for a seasonal ritual.
        2. The friends stumbled upon a hidden, Cold War-era government experiment in an old mine.
        3. A parasitic fungus that creates a hive-mind has infected the village.
        4. The village is trapped in a time loop, and the friends were taken by entities that maintain it.
        5. The villagers are all ghosts, re-enacting their final days and want the friends to join them.
        6. The village is a cult that worships a "founder" who promised them eternal life.
        7. A rare, hallucinogenic flower in the valley traps the villagers in a collective delusion.
        8. The psychic cry the player heard was a trap, created by a predatory entity that feeds on hope.
        9. The villagers "harvest" memories from outsiders to keep their own fading memories alive.
        10. There are no villagers. They are all constructs created by a single, powerful psychic child (Nia).

        **Your Goal:**
        Based on this premise and the examples, generate a NEW, unique JSON object with three keys:
        1.  `story_theme`: A string describing the core secret of the village for this playthrough.
        2.  `inaccessible_locations`: A list of {context['num_inaccessible_locations']} unique, thematic location names you invented that tie into your new story theme, the names shouldn't absurd of fancy ones, generate the simple ones only.
        3.  `correct_location`: A string containing one of the names from your `inaccessible_locations` list where the friends are actually being held.

        Output ONLY the raw JSON object.
        """

    def _create_world_builder_prompt(self, context):
        difficulty = context.get('difficulty', 'Medium')
        if difficulty == 'Very Easy':
            node_count = "8"
            key_clue_count = 2
            final_clue_instruction = "The final clue must be extremely direct and explicitly state where to go."
            difficulty_instructions = "Clues must be direct and obvious. Avoid riddles or metaphors."
            type_instruction = "Generate **exactly 2 nodes** of type 'TalkToVillager' to guide the player. The rest should be 'Information'."
        elif difficulty == 'Easy':
            node_count = "15-20"
            key_clue_count = 3
            final_clue_instruction = "The final clue should be a strong hint, making the answer clear."
            difficulty_instructions = "Clues should be mostly straightforward."
            type_instruction = "You may use a mix of 'Information' and 'TalkToVillager' nodes."
        elif difficulty == 'Hard':
            node_count = "35-40"
            key_clue_count = 6
            final_clue_instruction = "The final clue must be extremely cryptic, requiring significant deduction."
            difficulty_instructions = "Clues must be cryptic and often misleading. Use riddles and metaphors."
            type_instruction = "Create a complex web using many 'TalkToVillager' nodes to interconnect clues."
        else: # Medium
            node_count = "25-30"
            key_clue_count = 4
            final_clue_instruction = "The final clue must be cryptic. Do not state the answer directly."
            difficulty_instructions = "Clues should require some thought and interpretation."
            type_instruction = "Create a web-like structure with a good mix of 'Information' and 'TalkToVillager' nodes."

        return f"""
        You are a world-class narrative designer generating a "Quest Network" for the game "Village of Echoes".

        The correct location is: **{context['correctLocation']}**.
        The difficulty is: **{difficulty.upper()}**.
        The core secret of the village is: **{context['story_theme']}**

        **Guiding Principles:**
        - **Clarity of Content is Paramount:** The `content` field must be written to be as clear as possible for the player.
            - If `type` is `Information`, the `content` is a direct clue the player learns with complete brief of clue history, direction and reason.
            - If `type` is `TalkToVillager`, the `content` **MUST** explicitly name the villager to talk to and give a clear reason and also where they will be found/ are. **Bad example:** 'The river holds many secrets.' **Good example:** 'You should go speak with Old Mara by the river; she knows things about the recent disappearances.'
        - **Character-Driven:** Clues must originate from the villager's personality and their role in the secret.
        - **Difficulty:** {difficulty_instructions}

        **Node Structure:**
        -   `node_id`: A simple, unique, sequential string, like "node1", "node2", "node3", etc.
        -   `villager_name`: Who provides this node.
        -   `content`: The core information or clue, written according to the Clarity of Content principle.
        -   `type`: "Information" or "TalkToVillager".
        -   `priority`: Importance order (1=Minor, 5=Major), higher the priority it should be given considered first for the story.
        -   `key_clue`: A boolean (true/false).
        -   `preconditions`: List of `node_id` strings required.
        -   `required_familiarity`: An integer from 1-5, or `null`.

        **Generation Requirements ({difficulty.upper()}):**
        -   Generate a network of **{node_count} nodes**.
        -   Designate **exactly {key_clue_count} nodes** as `key_clue: true`.
        -   {type_instruction}
        -   **{final_clue_instruction}**

        **Game Data for Context:**
        -   Villagers: {json.dumps(context['villagers'], indent=2)}

        Output ONLY the raw JSON object containing the "nodes" list.
        """

     # ================= INTERACTION ================= #
    def _create_interaction_prompt(self, context):
        conversational_status = context.get('conversational_status')
        context_node = context.get('context_node')
        turn_objective = ""
        
        json_task_instruction = "Generate a JSON object with: npc_dialogue (string), player_responses (list of 1–3 options), node_revealed_id (string or null), new_familiarity_level (0–5)."

        if conversational_status == "PERMANENTLY_EXHAUSTED":
            turn_objective = "You can no longer provide new clues. Deliver a final, reflective farewell."
            json_task_instruction = "Generate a JSON object with: npc_dialogue (string), player_responses (EXACTLY ONE polite closing option), node_revealed_id (null), new_familiarity_level (0–5)."
        elif conversational_status == "HAS_LOCKED_CLUES":
            turn_objective = "You cannot yet reveal a clue. Hint gently why (trust, timing, secrecy) and end politely."
            json_task_instruction = "Generate a JSON object with: npc_dialogue (string), player_responses (EXACTLY ONE polite closing option), node_revealed_id (null), new_familiarity_level (0–5)."
        elif conversational_status == "CAN_REVEAL":
            turn_objective = "MANDATORY: Reveal the current clue NOW. Integrate the content naturally into your dialogue, and set node_revealed_id. This is not optional."

        return f"""
        You are both a **villager actor** and a **game director** in the horror game "Village of Echoes".  
        Your goal: deliver immersive dialogue that feels authentic *while progressing the game*.  

        --- DIRECTOR'S RULES (Unbreakable) ---
        1. Roleplay naturally as {context['villagerProfile']['name']}.  
        2. Stay immersive: Do NOT break character or mention the "game system."  
        3. Never mention the player's "friends" unless the player explicitly brings them up.  
        4. Keep responses smooth and natural: ~2 sentences, with tone matching the villager.  
        5. Adjust tone based on familiarity level: {context['familiarity_level']} ({context['familiarity_description']}).  
           - If "Unknown", introduce yourself naturally.  
        6. Do not repeat information the player already knows: `{context['player_knowledge_summary']}`.  
        7. If a clue is revealed, weave it in *naturally with flavor*, not as a raw fact dump.

        **NOTE: Whenver mentioned this is the staring prompt of the conversation, then just introduce yourself if familarity:Unknown or talk about the recent thing that you discoverd with that villager from the knowledges-summary**

        --- HOW TO REPLY (Concrete patterns and expectations) ---
        Follow these reply patterns exactly — they describe *how* your npc_dialogue, suggestions, and player_responses should be structured:

        1) VOICE + LENGTH
           - Speak *in-character* and briefly (1–2 sentences). Use contractions and small quirks that match the villager's profile.
           - Never narrate like an omniscient storyteller (avoid "The moss is important because..."). Use personal observations, gossip, or memory instead.
           Example: "That moss chills me—I've seen children staring at it at dusk, eyes half-closed, like they heard a lullaby."

        2) UNKNOWN FAMILIARITY
           - If familiarity == "Unknown", begin with a short introduction: name + relation to village + one-line signal of trust or suspicion.
           Example: "I'm Arthur, I cut wood here. I don't like to meddle, but you'll want to hear this."

        3) CLUE TONE & CONTENT (Hints)
           - When hinting (not fully revealing), include:
             a) A sensory detail (smell, sound, sight) or small scene,
             b) Why it matters for the story,
             c) One concrete next action (who to talk to OR where to search).
           Example pattern: "<sensory detail>. It suggests <why it matters>. You should <next action>."

        4) CLUE REVELATION (CAN_REVEAL rule)
           - MUST integrate the exact `content` from the `context_node` naturally into npc_dialogue (do not paste raw JSON).
           - After revealing, give **1–2 concrete next actions** (specific villager names or locations) the player can take to follow up.
           - Provide 1–3 player_responses that map directly to those actions (or to a polite closing).
           Example: "\"That torn ribbon in the chapel—I've seen it on the tailor's counter.\" → Next actions: ask the tailor / search the chapel loft."

        5) GUIDANCE WHEN STUCK
           - If the player seems stuck, offer prioritized options (2–3), with a short reason for each (ranked by usefulness).
           - Use phrasing like: "If you're unsure, first X (because...), otherwise Y."

        6) HOSTILITY / BRIBES / EMOTIONAL STATES
           - Hostile player: de-escalate, offer a guarded hint or refuse to help. Offer responses that let the player back down or press.
           - Bribe/plea: consult `villagerProfile` morality/traits and act accordingly (accept with consequences, or refuse and give a hint).
           - Frightened player: reassure and give a safe next step (e.g., "Find the doctor; he'll come with you.").

        7) REPETITION & CLARIFICATION
           - If the player repeats or asks for confirmation, restate only the new, useful piece of info (do NOT rehash everything).
           - If asked "Where are my friends?" respond per status: reveal if allowed; otherwise give the best directional hint + next action.

        8) EXHAUSTION / LOCKED CLUES
           - PERMANENTLY_EXHAUSTED: provide a short, reflective farewell and EXACTLY ONE polite closing player option.
           - HAS_LOCKED_CLUES: explain briefly why a clue can't be revealed (trust, danger, ritual), and provide EXACTLY ONE polite closing option.

        9) FORMAT & FOLLOW-UP
           - Always include 1–3 realistic `player_responses` (e.g., "Ask Old Mara by the river.", "Search the Ossified Grove.", "Goodbye.").
           - Ensure any suggested action is actionable within the game (name a villager or a specific place/thing).
           - If you suggest a search, indicate *what to look for* (e.g., "check under the millstones for footprints").
    

        --- BACKGROUND KNOWLEDGE ---
        Current clue node (if any): {json.dumps(context_node)}

        --- CONVERSATION HISTORY ---
        {json.dumps(context['chatHistory'], indent=2)}

        --- THIS TURN ---
        - Objective: {turn_objective}  
        - The player’s last line: "{context['player_last_response']}"

        --- OUTPUT ---
        {json_task_instruction}  

        Respond ONLY with the raw JSON object.
        """
