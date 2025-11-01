import express from "express";
import cors from "cors";
import { StorageManager } from "./storageManager.js";
import { INFTManager } from './INFTManager.js';

const app = express();
app.use(cors());
app.use(express.json());
const port = process.env.PORT || 3002;
const storageManager = new StorageManager();
const inftManager = new INFTManager();

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
    console.log(`\n📝 ========== /dialogue/history ENDPOINT HIT ==========`);
    console.log(`👤 Wallet: ${walletAddress}`);
    console.log(`🔎 Payload size: ${JSON.stringify(req.body).length} bytes`);
    console.log(`📦 Dialogue entries received: ${req.body.dialogue_history?.length || 0}`);
    
    if (req.body.dialogue_history && req.body.dialogue_history.length > 0) {
      console.log(`🗨️  First dialogue:`, JSON.stringify(req.body.dialogue_history[0], null, 2));
    }

    const success = await storageManager.saveFullDialogueHistory(walletAddress, req.body);
    
    if (success) {
      console.log(`✅ Successfully saved full history for ${walletAddress}`);
      console.log(`========== END /dialogue/history ==========\n`);
      return res.status(200).json({ 
        status: "ok",
        message: "Dialogue history saved successfully",
        entriesReceived: req.body.dialogue_history?.length || 0
      });
    } else {
      console.error(`❌ Failed to save for ${walletAddress}`);
      console.log(`========== END /dialogue/history (FAILED) ==========\n`);
      return res.status(500).json({ 
        status: "error", 
        message: "save failed" 
      });
    }
  } catch (error) {
    console.error("Error in /dialogue/history:", error);
    console.log(`========== END /dialogue/history (ERROR) ==========\n`);
    return res.status(500).json({ 
      status: "error", 
      message: error?.message || String(error) 
    });
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

// Create new Game INFT
app.post('/inft/create', async (req, res) => {
    try {
        const { playerAddress, gameMode, difficulty, ownerPublicKey } = req.body;

        if (!ownerPublicKey) {
            return res.status(400).json({
                success: false,
                error: 'ownerPublicKey is required for encryption'
            });
        }

        const result = await inftManager.createGameINFT(
            playerAddress,
            gameMode,
            difficulty,
            ownerPublicKey
        );

        res.json({
            success: true,
            tokenId: result.tokenId,
            ipfsHash: result.ipfsHash,
            metadataHash: result.metadataHash,
            metadata: result.metadata
        });
    } catch (error) {
        console.error('INFT creation failed:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Evolve existing INFT
app.post('/inft/evolve', async (req, res) => {
    try {
        const { tokenId, gameProgressData, ownerPublicKey, oracleProof } = req.body;

        if (!ownerPublicKey) {
            return res.status(400).json({
                success: false,
                error: 'ownerPublicKey is required'
            });
        }

        const result = await inftManager.evolveINFT(
            tokenId,
            gameProgressData,
            ownerPublicKey,
            oracleProof
        );

        res.json({
            success: true,
            newStage: result.newStage,
            ipfsHash: result.newIpfsHash,
            metadataHash: result.newMetadataHash
        });
    } catch (error) {
        console.error('INFT evolution failed:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Initiate secure transfer
app.post('/inft/initiate-transfer', async (req, res) => {
    try {
        const { tokenId, currentOwner, newOwner, transferProof } = req.body;

        const result = await inftManager.initiateSecureTransfer(
            tokenId,
            currentOwner,
            newOwner,
            transferProof
        );

        res.json({
            success: true,
            ...result
        });
    } catch (error) {
        console.error('INFT transfer initiation failed:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Complete secure transfer
app.post('/inft/complete-transfer', async (req, res) => {
    try {
        const { tokenId, newOwner, newOwnerPublicKey, newSealedKey } = req.body;

        if (!newOwnerPublicKey) {
            return res.status(400).json({
                success: false,
                error: 'newOwnerPublicKey is required'
            });
        }

        const result = await inftManager.completeSecureTransfer(
            tokenId,
            newOwner,
            newOwnerPublicKey,
            newSealedKey
        );

        res.json({
            success: true,
            ...result
        });
    } catch (error) {
        console.error('INFT transfer completion failed:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get INFT details
app.get('/inft/:tokenId', async (req, res) => {
    try {
        const { tokenId } = req.params;

        const metadata = await inftManager.inftContract.getCurrentMetadata(tokenId);
        const history = await inftManager.inftContract.getMetadataHistory(tokenId);

        res.json({
            success: true,
            metadata,
            history
        });
    } catch (error) {
        console.error('Failed to fetch INFT details:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get player's INFTs
app.get('/inft/player/:address', async (req, res) => {
    try {
        const { address } = req.params;

        const inftTokens = await inftManager.inftContract.getPlayerINFTs(address);

        res.json({
            success: true,
            infts: inftTokens
        });
    } catch (error) {
        console.error('Failed to fetch player INFTs:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.listen(port, () => {
  console.log(`✅ 0G Storage Service listening at http://localhost:${port}`);
});
