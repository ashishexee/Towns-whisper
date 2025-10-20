import express from "express";
import cors from "cors";
import { StorageManager } from "./storageManager.js";

const app = express();
app.use(cors());
app.use(express.json());
const port = 3002;

const storageManager = new StorageManager();

app.get("/", (req, res) => {
  res.send("0G Storage Service is running!");
});

app.get("/dialogue/:walletAddress", async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const dialogue = await storageManager.getDialogue(walletAddress);

    if (dialogue && dialogue.dialogue_history.length > 0) {
      res.json(dialogue);
    } else {
      res.status(404).json({ message: "No dialogue history found." });
    }
  } catch (error) {
    console.error(`Error getting dialogue: ${error.message}`);
    res.status(500).json({ message: "Failed to retrieve dialogue history." });
  }
});

app.post("/dialogue/:walletAddress", async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const { newDialogue } = req.body;

    if (!newDialogue) {
      return res
        .status(400)
        .json({ message: "Missing 'newDialogue' in request body." });
    }

    const success = await storageManager.saveDialogue(
      walletAddress,
      JSON.stringify(newDialogue)
    );

    if (success) {
      res.status(200).json({ message: "Dialogue saved successfully." });
    } else {
      res.status(500).json({ message: "Failed to save dialogue." });
    }
  } catch (error) {
    console.error(`Error saving dialogue: ${error.message}`);
    res.status(500).json({ message: "Failed to save dialogue." });
  }
});

app.post("/dialogue/history/:walletAddress", async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const fullHistory = req.body;

    if (!fullHistory || !fullHistory.dialogue_history) {
      return res
        .status(400)
        .json({ message: "Missing 'dialogue_history' object in request body." });
    }

    const success = await storageManager.saveFullDialogueHistory(
      walletAddress,
      JSON.stringify(fullHistory)
    );

    if (success) {
      res.status(200).json({ message: "Full dialogue history saved successfully." });
    } else {
      res.status(500).json({ message: "Failed to save full dialogue history." });
    }
  } catch (error) {
    console.error(`Error saving full history: ${error.message}`);
    res.status(500).json({ message: "Failed to save full dialogue history." });
  }
});

// +++ NEW: Add an endpoint for 0g Data Availability +++
app.post("/da/disperse", async (req, res) => {
    try {
        const { data, description } = req.body;

        if (!data) {
            return res.status(400).json({ message: "Missing 'data' object in request body." });
        }

        const eventDescription = description || "Generic Game Event";
        console.log(`Received request to disperse data to 0g DA: ${eventDescription}`);

        const daResponse = await storageManager.makeDataAvailable(data, eventDescription);

        // +++ IMPROVEMENT: Check the result from the 0g client +++
        if (daResponse && daResponse.result === 'FAILURE') {
            // Return a "Bad Gateway" or "Service Unavailable" status
            return res.status(502).json({
                message: "Dispersal to 0g DA was rejected or failed.",
                ...daResponse
            });
        }

        res.status(200).json({
            message: "Data successfully sent for dispersal to 0g DA.",
            ...daResponse
        });

    } catch (error) {
        console.error(`Error dispersing data to 0g DA: ${error.message}`);
        res.status(500).json({ message: "Failed to disperse data." });
    }
});
app.get("/nft/:itemName", async (req, res) => {
  try {
    const { itemName } = req.params;
    const metadata = await storageManager.getNftMetadata(itemName.toUpperCase());
    if (metadata) {
      res.json(metadata);
    } else {
      res.status(404).json({ message: "NFT metadata not found." });
    }
  } catch (error) {
    console.error(`Error getting NFT metadata: ${error.message}`);
    res.status(500).json({ message: "Failed to retrieve NFT metadata." });
  }
});

app.listen(port, () => {
  console.log(`✅ 0G Storage Service listening at http://localhost:${port}`);
});
