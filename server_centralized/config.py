# config.py
# This file contains the static, base data for the game world.
# It defines the characters that the LLM can use to build a mystery.

VILLAGER_ROSTER = [
    {
        "name": "Arthur Hobbs",
        "title": "An old man in the cottage to the northwest",
        "location": "Woodcutter's Cottage",
        "backstory": "Arthur is the closest thing the village has to an elder. He's lived here his whole life and found you by the wreck. He's genuinely kind and helpful, but his deep love for the community makes him protective of its peace, and he's often hesitant to speak on darker topics.",
        "personality_traits": {"truthfulness": 4, "verbosity": 3, "sarcasm": 1, "fearfulness": 3, "mystery": 3, "humor": 2, "helpfulness": 5}
    },
    {
        "name": "Sam",
        "title": "A young man near a grove of trees",
        "location": "Grove of Trees",
        "backstory": "Sam isn't fond of farm work and spends most of his days daydreaming under the trees. While some see him as lazy, his constant, quiet observation means he often notices small details that others are too busy to see. He's not very proactive, but he's a truthful witness if you can get him to focus.",
        "personality_traits": {"truthfulness": 5, "verbosity": 2, "sarcasm": 2, "fearfulness": 3, "mystery": 2, "humor": 3, "helpfulness": 2}
    },
    {
        "name": "Elias",
        "title": "An old man in a robe near the western fields",
        "location": "The Western Fields",
        "backstory": "Elias follows the 'old ways,' folk traditions tied to the harvest and the seasons that most of the village has forgotten. He's wise and sees the world in terms of signs and omens. The villagers respect him but also keep their distance, finding his beliefs unsettling.",
        "personality_traits": {"truthfulness": 3, "verbosity": 3, "sarcasm": 1, "fearfulness": 2, "mystery": 5, "humor": 1, "helpfulness": 3}
    },
    {
        "name": "Leo",
        "title": "A farmer working in the southern gardens",
        "location": "Southern Vegetable Gardens",
        "backstory": "Leo is a simple, hardworking farmer. He believes in what he can see and touch: the soil, his crops, and the weather. He's skeptical of gossip and ghost stories and will dismiss anything that can't be explained with practical logic. He's honest but not very imaginative.",
        "personality_traits": {"truthfulness": 5, "verbosity": 2, "sarcasm": 3, "fearfulness": 1, "mystery": 1, "humor": 2, "helpfulness": 3}
    },
    {
        "name": "Markus",
        "title": "A blond man standing by the stone house",
        "location": "Center of Town",
        "backstory": "As the village carpenter, Markus is proud of his work and his town. He's strong, dependable, and sees himself as a pillar of the community. He's friendly and helpful to a fault but has a blind spot for any negativity within the village, preferring to believe everything is perfect.",
        "personality_traits": {"truthfulness": 3, "verbosity": 4, "sarcasm": 1, "fearfulness": 2, "mystery": 2, "humor": 3, "helpfulness": 4}
    },
    {
        "name": "Edward Gable",
        "title": "A man standing at the entrance to his house",
        "location": "A Neat House on the Main Road",
        "backstory": "Edward is the retired village schoolmaster. He believes in order, discipline, and facts. He is very prim and proper, and dislikes emotional outbursts or lazy thinking. His mind is a library of village history, but he'll only share information if he deems you worthy of it.",
        "personality_traits": {"truthfulness": 5, "verbosity": 3, "sarcasm": 4, "fearfulness": 1, "mystery": 3, "humor": 1, "helpfulness": 2}
    },
    {
        "name": "Gavin",
        "title": "A man in an apron near the well",
        "location": "The Town Well",
        "backstory": "Gavin runs the local inn and the well is his main source of water and gossip. He's professionally cheerful and knows how to make people talk. He hears everything but volunteers nothing, seeing information as a commodity to be traded.",
        "personality_traits": {"truthfulness": 3, "verbosity": 4, "sarcasm": 2, "fearfulness": 2, "mystery": 4, "humor": 4, "helpfulness": 3}
    },
    {
        "name": "Father Thomas",
        "title": "A man in a grey robe beside the church",
        "location": "Outside the Old Church",
        "backstory": "Thomas is the village priest, but a crisis of faith has left him quiet and withdrawn. He performs his duties but is deeply troubled by the strange 'feeling' in the village, which seems to mock his beliefs. He speaks in thoughtful, hesitant sentences, afraid of both offending God and ignoring the truth.",
        "personality_traits": {"truthfulness": 2, "verbosity": 2, "sarcasm": 1, "fearfulness": 4, "mystery": 4, "humor": 1, "helpfulness": 2}
    }
]

FAMILIARITY_LEVELS = {0: "Unknown", 1: "Stranger", 2: "Acquaintance", 3: "Familiar Face", 4: "Ally", 5: "Confidant"}