import Phaser from "phaser";
import { getConversation, chooseLocation, setCurrentGameId,getTokenBalance } from "../api.js";

export class MultiplayerScene extends Phaser.Scene {
  constructor() {
    super({ key: "MultiplayerScene" });
    this.players = new Map();
    this.tileSize = 32;
    this.walkableGrid = [];
    this.occupiedGrid = [];
    this.villagers = null;
    this.nearbyVillager = null;
    this.interactionText = null;
    this.gameData = null;
    this.playerInventory = new Set();
    this.activeMintZone = null;
    this.mintText = null;
    this.gameWon = false;
    this.otherPlayers = new Map();
    this.worldInitialized = false;
    this.account = null;
    this.mintKey = null;
  }

  preload() {
    console.log("MultiplayerScene: Preloading assets...");
    this.load.image("player", "assets/images/characters/mc.png");
    this.load.image("player_up", "assets/images/characters/mc.png");
    this.load.image("player_down", "assets/images/characters/mc.png");
    this.load.image("player_left", "assets/images/characters/leftmc.png");
    this.load.image("player_right", "assets/images/characters/rightmc.png");

    this.load.image("villager01", "assets/images/characters/villager01.png");
    this.load.image("villager02", "assets/images/characters/villager02.png");
    this.load.image("villager03", "assets/images/characters/villager03.png");
    this.load.image("villager04", "assets/images/characters/villager04.png");

    this.load.image("background", "assets/images/world/background02.png");
    this.load.image("path", "assets/images/world/path.png");
    this.load.image("path_rounded", "assets/images/world/path_rounded.png");

    this.load.image("house01", "assets/images/world/house01.png");
    this.load.image("house02", "assets/images/world/house02.png");
    this.load.image("house05", "assets/images/world/house05.png");
    this.load.image("church01", "assets/images/world/church03.png");
    this.load.image("windmill", "assets/images/world/windmill.png");
    this.load.image("farmhouse", "assets/images/world/farmhouse.png");

    this.load.image("lake01", "assets/images/world/lake04.png");
    this.load.image("lake02", "assets/images/world/lake05.png");
    this.load.image("well01", "assets/images/world/well02.png");
    this.load.image("tree01", "assets/images/world/tree02.png");
    this.load.image("tree05", "assets/images/world/tree05.png");
    this.load.image("forest01", "assets/images/world/forest03.png");

    this.load.image("shop01", "assets/images/world/shop01.png");
    this.load.image("stove01", "assets/images/world/stove01.png");
    this.load.image("animals01", "assets/images/world/animals01.png");

    this.load.image("crop02", "assets/images/world/crop02.png");
    this.load.image("crop03", "assets/images/world/crop03.png");

    this.load.image("flower01", "assets/images/world/flowers01.png");
    this.load.image("flower02", "assets/images/world/flowers02.png");
    this.load.image("flower03", "assets/images/world/flowers03.png");
  }

  init(data) {
    console.log("MultiplayerScene: Initializing with data:", data);

    this.roomId = data.roomId;
    this.playerId = data.playerId;
    this.difficulty = data.difficulty || "medium";
    this.account = data.account || null;

    if (data.gameData) {
      console.log("Game data received in init:", data.gameData);
      this.gameData = data.gameData;
    }

    if (!this.roomId || !this.playerId) {
      console.error("Missing required data:", {
        roomId: this.roomId,
        playerId: this.playerId,
      });
      alert("Missing room or player information. Returning to home.");
      this.scene.start("HomeScene");
      return;
    }
  }

  create() {
    console.log("MultiplayerScene: Creating scene...");

    if (!this.roomId || !this.playerId) {
      console.error("Cannot create WebSocket: missing roomId or playerId");
      this.scene.start("HomeScene");
      return;
    }

    this.createWorld();
    this.setupUI();

    this.physics.world.setBounds(0, 0, 60 * this.tileSize, 40 * this.tileSize);

    if (this.gameData) {
      console.log("Initializing world with existing game data");
      this.initializeGameWorld();
    }

    this.connectToServer();

    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys("W,S,A,D");
    this.enterKey = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.ENTER
    );
    this.mintKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.M);

    this.events.on("villagerUnlocked", this.unlockVillager, this);

    if (this.scene.get("ItemLockScene")) {
      this.scene
        .get("ItemLockScene")
        .events.on("villagerUnlocked", this.unlockVillager, this);
    }
  }

  unlockVillager(villagerName) {
    const villager = this.villagers
      .getChildren()
      .find((v) => v.name === villagerName);
    if (villager) {
      console.log(`Unlocking villager: ${villagerName}`);
      villager.requiredItem = null;
      if (villager.lockIcon) {
        villager.lockIcon.destroy();
        villager.lockIcon = null;
      }
    }
  }

  async mintItem(itemName) {
    if (!this.account) {
      console.error("Wallet not connected, cannot mint.");
      return;
    }

    this.input.keyboard.enabled = false;
    const mintingStatusText = this.add
      .text(
        this.cameras.main.centerX,
        this.cameras.main.centerY,
        `Minting ${itemName}...`,
        {
          fontSize: "24px",
          color: "#d4af37",
          backgroundColor: "rgba(0,0,0,0.8)",
          padding: { x: 20, y: 10 },
        }
      )
      .setOrigin(0.5)
      .setDepth(101)
      .setScrollFactor(0);

    try {
      console.log(`Simulating mint for: ${itemName}`);
      await new Promise((resolve) => setTimeout(resolve, 1500));

      console.log("Mint successful!");
      mintingStatusText.setText(`${itemName} minted successfully!`);

      this.playerInventory.add(itemName);

      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(
          JSON.stringify({
            type: "item_minted",
            itemName: itemName,
          })
        );
      }

      this.villagers.getChildren().forEach((villager) => {
        if (villager.lockIcon && villager.requiredItem === itemName) {
          villager.lockIcon.setVisible(false);
        }
      });
    } catch (error) {
      console.error("Minting failed:", error);
      mintingStatusText.setText(`Minting failed. See console for details.`);
    } finally {
      this.time.delayedCall(2000, () => {
        mintingStatusText.destroy();
        this.input.keyboard.enabled = true;
      });
    }
  }

  setupUI() {
    this.interactionText = this.add
      .text(0, 0, "Press ENTER to talk", {
        fontSize: "14px",
        color: "#ffffff",
        backgroundColor: "rgba(0,0,0,0.7)",
        padding: { x: 8, y: 4 },
      })
      .setOrigin(0.5, 1)
      .setDepth(30)
      .setVisible(false);

    this.mintText = this.add
      .text(0, 0, "", {
        fontSize: "16px",
        color: "#ffffff",
        backgroundColor: "rgba(0,0,0,0.7)",
        padding: { x: 8, y: 4 },
      })
      .setOrigin(0.5)
      .setDepth(30)
      .setVisible(false);

    this.winnerText = this.add
      .text(this.cameras.main.centerX, this.cameras.main.centerY, "", {
        fontSize: "32px",
        color: "#FFD700",
        backgroundColor: "rgba(0,0,0,0.8)",
        padding: { x: 20, y: 10 },
      })
      .setOrigin(0.5)
      .setDepth(100)
      .setScrollFactor(0)
      .setVisible(false);

    this.loadingText = this.add
      .text(
        this.cameras.main.centerX,
        this.cameras.main.centerY,
        "Waiting for game to start...",
        {
          fontSize: "24px",
          color: "#ffffff",
          backgroundColor: "rgba(0,0,0,0.8)",
          padding: { x: 20, y: 10 },
        }
      )
      .setOrigin(0.5)
      .setDepth(100)
      .setScrollFactor(0)
      .setVisible(!this.gameData);
  }

  connectToServer() {
    console.log(
      `Attempting to connect to: ws://localhost:8000/ws/${this.roomId}/${this.playerId}`
    );

    this.connectionTimeout = setTimeout(() => {
      if (this.ws && this.ws.readyState !== WebSocket.OPEN) {
        console.error("WebSocket connection timeout after 10 seconds");
        alert(
          "Connection timeout. Please ensure the server is running on port 8000."
        );
        this.scene.start("HomeScene");
      }
    }, 10000);

    try {
      this.ws = new WebSocket(
        `ws://localhost:8000/ws/${this.roomId}/${this.playerId}`
      );

      this.ws.onopen = () => {
        console.log("✅ Connected to multiplayer server successfully");
        if (this.connectionTimeout) {
          clearTimeout(this.connectionTimeout);
          this.connectionTimeout = null;
        }
      };

      this.ws.onerror = (error) => {
        console.error("❌ WebSocket error:", error);
        if (this.connectionTimeout) {
          clearTimeout(this.connectionTimeout);
          this.connectionTimeout = null;
        }
        alert("Failed to connect to multiplayer server.");
        this.scene.start("HomeScene");
      };

      this.ws.onclose = (event) => {
        console.log("WebSocket connection closed:", event.code);
        if (this.connectionTimeout) {
          clearTimeout(this.connectionTimeout);
          this.connectionTimeout = null;
        }

        if (!this.gameWon && event.code !== 1000) {
          alert("Lost connection to multiplayer server");
          this.scene.start("HomeScene");
        }
      };

      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        this.handleServerMessage(data);
      };
    } catch (error) {
      console.error("Failed to create WebSocket connection:", error);
      if (this.connectionTimeout) {
        clearTimeout(this.connectionTimeout);
        this.connectionTimeout = null;
      }
      alert("Unable to create WebSocket connection.");
      this.scene.start("HomeScene");
    }
  }

  handleServerMessage(data) {
    console.log("Received server message:", data);
    switch (data.type) {
      case "room_joined":
        console.log("Joined room successfully");
        this.updatePlayerList(data.players);
        break;

      case "player_moved":
        if (data.playerId !== this.playerId) {
          this.updateOtherPlayer(data.playerId, data.x, data.y, data.direction);
        }
        break;

      case "player_left":
        this.removeOtherPlayer(data.playerId);
        break;

      case "game_started":
        console.log("Game started with shared state:", data.game_data);
        this.gameData = data.game_data;
        if (!this.worldInitialized) {
          this.initializeGameWorld();
        }
        if (this.loadingText) {
          this.loadingText.setVisible(false);
        }
        break;

      case "game_ended":
        this.handleGameEnd(data.winner, data.winner_name);
        break;
    }
  }

  updateOtherPlayer(playerId, x, y) {
    let otherPlayer = this.otherPlayers.get(playerId);
    if (!otherPlayer) {
      otherPlayer = this.add.sprite(x, y, "player");
      otherPlayer.setTint(0xff0000);
      otherPlayer.setDisplaySize(this.tileSize, this.tileSize);
      otherPlayer.setScale(0.08);
      this.otherPlayers.set(playerId, otherPlayer);
      const nameLabel = this.add
        .text(x, y - 20, `Player ${playerId.slice(0, 8)}`, {
          fontSize: "12px",
          color: "#ffffff",
          backgroundColor: "rgba(0,0,0,0.5)",
          padding: { x: 4, y: 2 },
        })
        .setOrigin(0.5)
        .setDepth(31);
      otherPlayer.nameLabel = nameLabel;
    }

    otherPlayer.x = x;
    otherPlayer.y = y;
    if (otherPlayer.nameLabel) {
      otherPlayer.nameLabel.x = x;
      otherPlayer.nameLabel.y = y - 20;
    }
  }

  removeOtherPlayer(playerId) {
    const otherPlayer = this.otherPlayers.get(playerId);
    if (otherPlayer) {
      if (otherPlayer.nameLabel) {
        otherPlayer.nameLabel.destroy();
      }
      otherPlayer.destroy();
      this.otherPlayers.delete(playerId);
    }
  }

  updatePlayerList(players) {
    console.log("Current players in room:", players);
  }

  initializeGameWorld() {
    if (this.worldInitialized) {
      console.log("World already initialized, skipping...");
      return;
    }

    console.log("Initializing game world with data:", this.gameData);

    if (this.gameData && this.gameData.game_id) {
      setCurrentGameId(this.gameData.game_id);
    }

    this.villagers = this.physics.add.group({ immovable: true });

    const villagerSpriteMap = {
      villager_1: { tileX: 7, tileY: 9.5, texture: "villager04", scale: 0.069 },
      villager_5: { tileX: 15, tileY: 8, texture: "villager02", scale: 0.069 },
      villager_2: { tileX: 11, tileY: 16, texture: "villager03", scale: 0.069 },
      villager_3: {
        tileX: 17,
        tileY: 19.3,
        texture: "villager04",
        scale: 0.069,
      },
      villager_0: { tileX: 5, tileY: 3, texture: "villager03", scale: 0.069 },
      villager_4: {
        tileX: 21,
        tileY: 11.5,
        texture: "villager03",
        scale: 0.069,
      },
      villager_6: {
        tileX: 24.8,
        tileY: 8.7,
        texture: "villager02",
        scale: 0.069,
      },
      villager_7: { tileX: 26.2, tileY: 5, texture: "villager04", scale: 0.06 },
    };

    const ALL_POSSIBLE_ITEMS = [
      "FISHING_ROD",
      "AXE",
      "SHOVEL",
      "LANTERN",
      "PICKAXE",
      "HAMMER",
      "BUCKET",
      "SCYTHE",
    ];

    Phaser.Utils.Array.Shuffle(ALL_POSSIBLE_ITEMS);
    const currentGameItems = ALL_POSSIBLE_ITEMS.slice(0, 4);
    console.log("Items for this game session:", currentGameItems);

    if (this.gameData && this.gameData.villagers) {
      console.log("Creating villagers:", this.gameData.villagers);

      const availableIds = this.gameData.villagers.map((v) => v.id);
      Phaser.Utils.Array.Shuffle(availableIds);

      const countToLock = Math.min(
        4,
        availableIds.length,
        currentGameItems.length
      );
      const villagersToLock = availableIds.slice(0, countToLock);

      this.gameData.villagers.forEach((villagerData) => {
        const lockIndex = villagersToLock.indexOf(villagerData.id);
        villagerData.required_item =
          lockIndex !== -1 ? currentGameItems[lockIndex] : null;

        const spriteInfo = villagerSpriteMap[villagerData.id];
        if (spriteInfo) {
          console.log(
            `Creating villager ${villagerData.id} at position (${spriteInfo.tileX}, ${spriteInfo.tileY})`
          );
          this.createVillager(
            spriteInfo.tileX,
            spriteInfo.tileY,
            spriteInfo.texture,
            spriteInfo.scale,
            villagerData.id,
            villagerData.required_item
          );
        }
      });
    } else {
      console.error("No villager data available!");
    }

    this.createPlayerSprite();
    this.createMintingZones(currentGameItems);

    this.worldInitialized = true;
    console.log("World initialization complete");
  }

  createMintingZones(currentGameItems = []) {
    const ALL_MINT_ZONES = {
      FISHING_ROD: { x: 6, y: 10, width: 80, height: 80 },
      AXE: { x: 35.5, y: 15, width: 80, height: 80 },
      SHOVEL: { x: 23, y: 9, width: 80, height: 80 },
      LANTERN: { x: 28, y: 6, width: 80, height: 80 },
      PICKAXE: { x: 33, y: 16.5, width: 80, height: 80 },
      HAMMER: { x: 37, y: 4, width: 80, height: 80 },
      BUCKET: { x: 21, y: 13, width: 80, height: 80 },
      SCYTHE: { x: 40.5, y: 4, width: 80, height: 80 },
    };

    const itemsToUse =
      currentGameItems.length > 0
        ? currentGameItems
        : Object.keys(ALL_MINT_ZONES);

    itemsToUse.forEach((itemName) => {
      const zoneData = ALL_MINT_ZONES[itemName];
      if (zoneData) {
        this.createMintingZone(
          zoneData.x * this.tileSize,
          zoneData.y * this.tileSize,
          zoneData.width,
          zoneData.height,
          itemName
        );
      }
    });
  }

  createMintingZone(x, y, width, height, itemName) {
    const pixelX = x;
    const pixelY = y;

    const zone = this.add.zone(pixelX, pixelY, width, height).setOrigin(0);
    this.physics.world.enable(zone);
    zone.body.setImmovable(true);
    zone.body.moves = false;
    zone.itemName = itemName;

    this.physics.add.overlap(this.player, zone, () => {
      if (this.activeMintZone !== zone) {
        this.activeMintZone = zone;
        console.log(`Entering mint zone for ${itemName}`);
        this.updateMintZoneText(itemName);
      }
    });

    console.log(`Created mint zone for ${itemName} at (${pixelX}, ${pixelY})`);
  }

  updateMintZoneText(itemName) {
    if (!this.player) return;
    
    const displayName = itemName.replace(/_/g, " ");
    
    if (this.playerInventory.has(itemName)) {
      this.mintText
        .setText(`You already have: ${displayName}`)
        .setStyle({ color: "#888888" })
        .setVisible(true);
    } else {
      this.mintText
        .setText(`Press M to mint ${displayName}`)
        .setStyle({ color: "#ffff00" })
        .setVisible(true);
    }

    this.mintText.setPosition(this.player.x, this.player.y - 50);
  }

  createVillager(tileX, tileY, texture, scaleSize, id, requiredItem = null) {
    console.log(
      `Creating villager at (${tileX * this.tileSize + 16}, ${
        tileY * this.tileSize + 16
      }) with texture ${texture}`
    );

    const villager = this.villagers.create(
      tileX * this.tileSize + 16,
      tileY * this.tileSize + 16,
      texture
    );
    villager.setOrigin(0.5).setDisplaySize(32, 32).setScale(scaleSize);

    villager.name = id;
    villager.requiredItem = requiredItem;

    if (requiredItem) {
      const lockIcon = this.add
        .text(villager.x, villager.y - 25, "🔒", {
          fontSize: "18px",
        })
        .setOrigin(0.5)
        .setDepth(31);
      villager.lockIcon = lockIcon;
      lockIcon.setVisible(!this.playerInventory.has(requiredItem));
    } else {
      villager.lockIcon = null;
    }

    console.log(
      `Villager ${id} created successfully${
        requiredItem ? ` (locked, requires ${requiredItem})` : ""
      }`
    );
  }

  createPlayerSprite() {
    console.log("Creating player sprite...");

    const pixelX = 1 * this.tileSize + this.tileSize / 2;
    const pixelY = 4.5 * this.tileSize + this.tileSize / 2;

    this.player = this.physics.add.sprite(pixelX, pixelY, "player_down");
    this.player.setTint(0x00ff00);
    this.player.setDisplaySize(this.tileSize, this.tileSize);
    this.player.setScale(0.08);
    this.player.setCollideWorldBounds(true);

    this.player.currentDirection = "down";
    this.player.lastDirection = "down";

    this.cameras.main.startFollow(this.player);
    this.cameras.main.setFollowOffset(0, 0);
    this.cameras.main.setLerp(0.1, 0.1);
    this.cameras.main.setZoom(2.5);

    console.log("Player sprite created successfully with physics");
  }

  async handleInteraction() {
    if (this.nearbyVillager && !this.gameWon) {
      console.log(`Interacting with ${this.nearbyVillager.name}`);
      this.input.keyboard.enabled = false;
      this.interactionText.setText("...");

      if (this.nearbyVillager.requiredItem) {
        console.log(
          `Villager ${this.nearbyVillager.name} requires item: ${this.nearbyVillager.requiredItem}`
        );
        this.scene.pause();
        this.scene.launch("ItemLockScene", {
          villager: this.nearbyVillager,
          account: this.account,
          gameData: this.gameData,
          callingScene: "MultiplayerScene",
        });
        return;
      }

      try {
        const conversationData = await getConversation(
          this.nearbyVillager.name,
          "Hello",
          this.playerId
        );
        console.log("Received conversation data:", conversationData);

        if (conversationData && conversationData.npc_dialogue) {
          console.log("Launching DialogueScene with data:", {
            conversationData: conversationData,
            newGameData: this.gameData,
            villagerSpriteKey: this.nearbyVillager.texture.key,
            playerId: this.playerId,
          });

          this.scene.pause("MultiplayerScene");
          this.scene.launch("DialogueScene", {
            conversationData: conversationData,
            newGameData: this.gameData,
            villagerSpriteKey: this.nearbyVillager.texture.key,
            playerId: this.playerId,
            callingScene: "MultiplayerScene",
          });

          this.time.delayedCall(100, () => {
            const dialogueScene = this.scene.get("DialogueScene");
            if (dialogueScene) {
              dialogueScene.scene.bringToTop("DialogueScene");
            }
          });
        } else {
          console.error(
            "Invalid conversation data received:",
            conversationData
          );
          this.interactionText.setText("No response from villager");
          setTimeout(() => {
            this.interactionText.setText("Press ENTER to talk");
            this.input.keyboard.enabled = true;
          }, 2000);
        }
      } catch (error) {
        console.error("Error in interaction:", error);
        this.interactionText.setText("Conversation failed");
        setTimeout(() => {
          this.interactionText.setText("Press ENTER to talk");
          this.input.keyboard.enabled = true;
        }, 2000);
      }
    }
  }

  async handleGuess(location) {
    if (this.gameWon) return;

    try {
      const result = await chooseLocation(location, this.playerId);
      if (result && result.is_correct) {
        this.gameWon = true;

        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(
            JSON.stringify({
              type: "game_won",
              location: location,
              is_true_ending: result.is_true_ending,
            })
          );
        }

        this.winnerText
          .setText(`🎉 YOU WON! 🎉\n${result.message}`)
          .setVisible(true);
      }
    } catch (error) {
      console.error("Error making guess:", error);
    }
  }

  handleGameEnd(winnerId, winnerName) {
    this.gameWon = true;

    if (winnerId === this.playerId) {
      this.winnerText
        .setText(`🎉 YOU WON! 🎉\nCongratulations!`)
        .setVisible(true);
    } else {
      this.winnerText
        .setText(`🏆 ${winnerName} Won! 🏆\nBetter luck next time!`)
        .setVisible(true);
    }

    this.time.delayedCall(5000, () => {
      this.scene.start("HomeScene");
    });
  }

  createWorld() {
    const worldTilesX = 60;
    const worldTilesY = 40;

    for (let y = 0; y < worldTilesY; y++) {
      this.walkableGrid[y] = [];
      this.occupiedGrid[y] = [];
      for (let x = 0; x < worldTilesX; x++) {
        this.walkableGrid[y][x] = false;
        this.occupiedGrid[y][x] = false;
        this.add
          .image(x * this.tileSize, y * this.tileSize, "background")
          .setOrigin(0)
          .setDisplaySize(this.tileSize, this.tileSize);
      }
    }

    const pathTiles = [
      { x: 1, y: 9, width: 1, height: 3 },
      { x: 10, y: 12, width: 1, height: 9 },
      { x: 4, y: 0, width: 1, height: 6 },
      { x: 9, y: 1, width: 1, height: 4 },
      { x: 9, y: 1, width: 4, height: 1 },
      { x: 1, y: 8, width: 1, height: 1 },
      { x: 1, y: 7, width: 1, height: 1 },
      { x: 1, y: 6, width: 1, height: 1 },
      { x: 1, y: 5, width: 1, height: 1 },
      { x: 2, y: 5, width: 15, height: 1 },
      { x: 16, y: 8, width: 24, height: 1 },
      { x: 22, y: 8, width: 1, height: 6 },
      { x: 27, y: 6, width: 1, height: 6 },
      { x: 34, y: 8, width: 1, height: 9 },
      { x: 34, y: 16, width: 14, height: 1 },
      { x: 40, y: 3, width: 1, height: 11 },
      { x: 38, y: 3, width: 3, height: 1 },
      { x: 16, y: 5, width: 1, height: 15.2 },
      { x: 1, y: 11, width: 16, height: 1 },
    ];

    pathTiles.forEach((path) => {
      for (let x = path.x; x < path.x + path.width; x++) {
        for (let y = path.y; y < path.y + path.height; y++) {
          if (this.walkableGrid[y] && this.walkableGrid[y][x] !== undefined) {
            this.walkableGrid[y][x] = true;
            this.occupiedGrid[y][x] = true;
          }
        }
      }
    });

    for (let y = 0; y < worldTilesY; y++) {
      for (let x = 0; x < worldTilesX; x++) {
        if (this.walkableGrid[y][x]) {
          const up =
            (this.walkableGrid[y - 1] && this.walkableGrid[y - 1][x]) || false;
          const down =
            (this.walkableGrid[y + 1] && this.walkableGrid[y + 1][x]) || false;
          const left =
            (this.walkableGrid[y] && this.walkableGrid[y][x - 1]) || false;
          const right =
            (this.walkableGrid[y] && this.walkableGrid[y][x + 1]) || false;
          const neighborCount =
            Number(up) + Number(down) + Number(left) + Number(right);

          const pixelX = x * this.tileSize + this.tileSize / 2;
          const pixelY = y * this.tileSize + this.tileSize / 2;
          let tileTexture = "path";
          let angle = 0;

          if (neighborCount <= 1) {
            tileTexture = "path_rounded";
            if (up) angle = 180;
            else if (left) angle = -90;
            else if (right) angle = 90;
          } else if (neighborCount === 2) {
            if (up && down) {
              angle = 90;
            } else if (!(left && right)) {
              tileTexture = "path";
              if (down && right) angle = 0;
              else if (down && left) angle = 90;
              else if (up && left) angle = 180;
              else if (up && right) angle = -90;
            }
          }

          this.add
            .image(pixelX, pixelY, tileTexture)
            .setOrigin(0.5)
            .setDisplaySize(this.tileSize, this.tileSize)
            .setAngle(angle);
        }
      }
    }

    this.createObstacle(0.5, 0.7, "house01", 4, 4);
    this.createObstacle(7.2, 7.2, "house02", 4, 4);
    this.createObstacle(12.1, 12.7, "house05", 4, 4);
    this.createObstacle(2, 6.5, "house01", 4, 4);
    this.createObstacle(17, 9, "house02", 5, 5);
    this.createObstacle(10.4, 10.5, "house05", 6, 6);
    this.createObstacle(11, 6, "house02", 5, 5);
    this.createObstacle(28, 9, "house05", 4, 4);
    this.createObstacle(30.6, 9, "house01", 4, 4);
    this.createObstacle(35.7, 11.2, "house01", 4, 4);
    this.createObstacle(19.85, 3.2, "house01", 4.5, 4.5);

    this.createObstacle(27.6, 1.2, "church01", 7, 7);
    this.createObstacle(36, 3.28, "windmill", 4.3, 4.3);
    this.createObstacle(41.3, 0.7, "farmhouse", 3, 3);
    this.createObstacle(44, 0.7, "farmhouse", 3, 3);

    this.createObstacle(37, 0, "lake02", 5, 4);
    this.createObstacle(5.5, 10.6, "lake01", 5, 4.5);
    this.createObstacle(26.5, 15.4, "lake01", 7, 7);
    this.createObstacle(23, 9.8, "well01", 4, 4);

    this.createObstacle(21.5, 13.7, "shop01", 4, 4);
    this.createObstacle(25, 13.7, "shop01", 4, 4);
    this.createObstacle(34, 16.4, "stove01", 4, 4);
    this.createObstacle(27, 10.7, "animals01", 8, 8);

    this.createObstacle(5.3, 6.5, "tree01", 4, 4);
    this.createObstacle(6.8, 6.5, "tree01", 4, 4);
    this.createObstacle(8.3, 6.5, "tree01", 4, 4);
    this.createObstacle(35.5, 8, "tree01", 4, 4);
    this.createObstacle(11.2, 1.58, "tree05", 2, 3);
    this.createObstacle(12.4, 1.8, "tree05", 2, 3);
    this.createObstacle(10, 1.8, "tree05", 2, 3);
    this.createObstacle(26.4, 3, "tree05", 2, 3);
    this.createObstacle(26.4, 0.6, "tree05", 2, 3);
    this.createObstacle(28.4, 0.6, "tree05", 2, 3);
    this.createObstacle(31.5, 0.6, "tree05", 2, 3);
    this.createObstacle(33.5, 0.6, "tree05", 2, 3);
    this.createObstacle(33.5, 3, "tree05", 2, 3);

    this.createObstacle(36, 14.56, "forest01", 2, 2);
    this.createObstacle(31, 14.56, "forest01", 2, 2);
    this.createObstacle(0.2, 14.56, "forest01", 2, 2);
    this.createObstacle(7, 16.3, "forest01", 2, 2);
    this.createObstacle(-1, 14, "forest01", 2, 2);
    this.createObstacle(37, 13, "forest01", 2, 2);

    this.createObstacle(12.2, 16, "crop02", 2.5, 2);
    this.createObstacle(12.2, 18.3, "crop03", 2.5, 2);
    this.createObstacle(18.2, 18.3, "crop03", 2.5, 2);
    this.createObstacle(18.2, 20.5, "crop02", 2.5, 2);
    this.createObstacle(18.2, 16, "crop02", 2.5, 2);
    this.createObstacle(21.2, 18.3, "crop02", 2.5, 2);
    this.createObstacle(21.2, 20.5, "crop03", 2.5, 2);
    this.createObstacle(24.2, 20.5, "crop02", 2.5, 2);
    this.createObstacle(24.2, 18.3, "crop03", 2.5, 2);
    this.createObstacle(27.2, 20.5, "crop03", 2.5, 2);
    this.createObstacle(18.2, 13.7, "crop03", 2.5, 2);
    this.createObstacle(1.5, 16.15, "crop02", 2.3, 2);
    this.createObstacle(4.1, 16.15, "crop03", 2.2, 2);
    this.createObstacle(4.1, 14, "crop02", 2.2, 2);
    this.createObstacle(1.5, 14, "crop03", 2.2, 2);
    this.createObstacle(18.1, 3.4, "crop03", 2, 2);
    this.createObstacle(18.1, 5.65, "crop02", 2, 2);
    this.createObstacle(24.15, 3.4, "crop02", 2, 2);
    this.createObstacle(24.15, 5.65, "crop03", 2, 2);
    this.createObstacle(18.15, 1.2, "crop02", 2, 2);
    this.createObstacle(20.15, 1.2, "crop03", 2, 2);
    this.createObstacle(22.15, 1.2, "crop02", 2, 2);
    this.createObstacle(24.15, 1.2, "crop03", 2, 2);

    this.createObstacle(41.75, 3.6, "crop02", 2, 2);
    this.createObstacle(41.75, 5.6, "crop03", 2, 2);
    this.createObstacle(41.75, 7.6, "crop02", 2, 2);
    this.createObstacle(41.75, 9.6, "crop03", 2, 2);
    this.createObstacle(41.75, 11.6, "crop02", 2, 2);
    this.createObstacle(41.75, 13.6, "crop02", 2, 2);
    this.createObstacle(44.5, 3.6, "crop03", 2, 2);
    this.createObstacle(44.5, 5.6, "crop02", 2, 2);
    this.createObstacle(44.5, 7.6, "crop03", 2, 2);
    this.createObstacle(44.5, 9.6, "crop02", 2, 2);
    this.createObstacle(44.5, 11.6, "crop03", 2, 2);
    this.createObstacle(44.5, 13.6, "crop02", 2, 2);

    const flowerTypes = ["flower01", "flower02", "flower03"];
    const greenSpaces = [];
    for (let y = 0; y < worldTilesY; y++) {
      for (let x = 0; x < worldTilesX; x++) {
        if (!this.walkableGrid[y][x] && !this.occupiedGrid[y][x]) {
          greenSpaces.push({ x, y });
        }
      }
    }

    const numberOfFlowers = 50;
    for (let i = 0; i < numberOfFlowers; i++) {
      if (greenSpaces.length > 0) {
        const randomIndex = Phaser.Math.Between(0, greenSpaces.length - 1);
        const position = greenSpaces.splice(randomIndex, 1)[0];
        const flowerType = Phaser.Math.RND.pick(flowerTypes);
        this.createObstacle(position.x, position.y, flowerType, 1, 1);
      }
    }

    const worldWidth = worldTilesX * this.tileSize;
    const worldHeight = worldTilesY * this.tileSize;
    this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
  }

  createObstacle(tileX, tileY, texture, tileWidth, tileHeight) {
    const tileSize = this.tileSize;

    let effectiveTileWidth = tileWidth;
    let effectiveTileHeight = tileHeight;

    const isForest = texture === "forest01" || texture === "forest02";
    if (isForest) {
      effectiveTileWidth = tileWidth * 6;
      effectiveTileHeight = tileHeight * 6;
    }

    this.add
      .image(tileX * tileSize, tileY * tileSize, texture)
      .setOrigin(0)
      .setDisplaySize(
        effectiveTileWidth * tileSize,
        effectiveTileHeight * tileSize
      );
  }

  isWalkableAt(worldX, worldY) {
    const worldTilesX = 60;
    const worldTilesY = 40;
    const tileX = Math.floor(worldX / this.tileSize);
    const tileY = Math.floor(worldY / this.tileSize);

    if (
      tileX < 0 ||
      tileX >= worldTilesX ||
      tileY < 0 ||
      tileY >= worldTilesY
    ) {
      return false;
    }

    if (this.walkableGrid[tileY] && this.walkableGrid[tileY][tileX]) {
      return true;
    }

    return false;
  }

  update() {
    if (this.activeMintZone) {
      if (!this.player) {
        this.mintText.setVisible(false);
        this.activeMintZone = null;
        return;
      }

      const playerBounds = this.player.getBounds();
      const zoneBounds = this.activeMintZone.getBounds();
      
      if (!Phaser.Geom.Intersects.RectangleToRectangle(playerBounds, zoneBounds)) {
        this.mintText.setVisible(false);
        this.activeMintZone = null;
        console.log("Left mint zone");
      } else {
        this.updateMintZoneText(this.activeMintZone.itemName);
      }
    }

    if (
      !this.player ||
      !this.ws ||
      this.ws.readyState !== WebSocket.OPEN ||
      this.gameWon
    )
      return;

    const speed = 110;
    let velocityX = 0;
    let velocityY = 0;
    let newDirection = this.player.currentDirection;
    let moved = false;

    if (this.cursors.left.isDown || this.wasd.A.isDown) {
      velocityX = -speed;
      newDirection = "left";
      moved = true;
    } else if (this.cursors.right.isDown || this.wasd.D.isDown) {
      velocityX = speed;
      newDirection = "right";
      moved = true;
    }

    if (this.cursors.up.isDown || this.wasd.W.isDown) {
      velocityY = -speed;
      newDirection = "up";
      moved = true;
    } else if (this.cursors.down.isDown || this.wasd.S.isDown) {
      velocityY = speed;
      newDirection = "down";
      moved = true;
    }

    if (velocityX !== 0 && velocityY !== 0) {
      const magnitude = Math.sqrt(velocityX * velocityX + velocityY * velocityY);
      velocityX = (velocityX / magnitude) * speed;
      velocityY = (velocityY / magnitude) * speed;
    }

    if (newDirection !== this.player.currentDirection) {
      this.player.setTexture(`player_${newDirection}`);
      this.player.lastDirection = this.player.currentDirection;
      this.player.currentDirection = newDirection;
    }

    if (moved) {
      const delta = this.game.loop.delta / 1000;
      const newX = this.player.x + velocityX * delta;
      const newY = this.player.y + velocityY * delta;

      if (this.isWalkableAt(newX, newY)) {
        this.player.x = newX;
        this.player.y = newY;

        this.ws.send(
          JSON.stringify({
            type: "move",
            x: this.player.x,
            y: this.player.y,
            direction: newDirection,
          })
        );
      }
    }

    if (this.villagers) {
      this.villagers.getChildren().forEach((villager) => {
        if (villager.lockIcon) {
          villager.lockIcon.setPosition(villager.x, villager.y - 25);
          villager.lockIcon.setVisible(
            villager.requiredItem &&
              !this.playerInventory.has(villager.requiredItem)
          );
        }
      });
    }

    if (this.villagers) {
      this.nearbyVillager = null;
      let minDistance = 50;

      this.villagers.getChildren().forEach((villager) => {
        const distance = Phaser.Math.Distance.Between(
          this.player.x,
          this.player.y,
          villager.x,
          villager.y
        );
        if (distance < minDistance) {
          minDistance = distance;
          this.nearbyVillager = villager;
        }
      });

      if (this.nearbyVillager) {
        this.interactionText.setText("Press ENTER to talk");
        this.interactionText.setPosition(
          this.nearbyVillager.x,
          this.nearbyVillager.y - 40
        );
        this.interactionText.setVisible(true);
      } else {
        this.interactionText.setVisible(false);
      }
    }

    if (Phaser.Input.Keyboard.JustDown(this.enterKey) && this.nearbyVillager) {
      this.handleInteraction();
    }

    if (
      Phaser.Input.Keyboard.JustDown(this.mintKey) &&
      this.activeMintZone &&
      !this.playerInventory.has(this.activeMintZone.itemName)
    ) {
      console.log(`Attempting to mint: ${this.activeMintZone.itemName}`);
      this.mintItem(this.activeMintZone.itemName);
    }
  }

  shutdown() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
  }
}
