import Phaser from "phaser";
import { getConversation, chooseLocation, setCurrentGameId,getTokenBalance } from "../api.js";

export class MultiplayerScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MultiplayerScene' });
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
        this.tokenBalanceElement = null;
        this.currentBalance = 0;
    }

    preload() {
        console.log('MultiplayerScene: Preloading assets...');
        
        // Player and character assets - Add directional sprites
        this.load.image('player', 'assets/images/characters/mc.png');
        this.load.image('player_up', 'assets/images/characters/mc.png');
        this.load.image('player_down', 'assets/images/characters/mc.png');
        this.load.image('player_left', 'assets/images/characters/leftmc.png');
        this.load.image('player_right', 'assets/images/characters/rightmc.png');
        
        this.load.image("villager01", "assets/images/characters/villager01.png");
        this.load.image("villager02", "assets/images/characters/villager02.png");
        this.load.image("villager03", "assets/images/characters/villager03.png");
        this.load.image("villager04", "assets/images/characters/villager04.png");
        
        // World base assets
        this.load.image("background", "assets/images/world/background02.png");
        this.load.image("path", "assets/images/world/path.png");
        this.load.image("path_rounded", "assets/images/world/path_rounded.png");
        
        // Building assets - make sure these match HomeScene exactly
        this.load.image("house01", "assets/images/world/house01.png");
        this.load.image("house02", "assets/images/world/house02.png");
        this.load.image("house05", "assets/images/world/house05.png");
        this.load.image("church01", "assets/images/world/church03.png"); // Note: church03 not church01
        this.load.image("windmill", "assets/images/world/windmill.png");
        this.load.image("farmhouse", "assets/images/world/farmhouse.png");
        
        // Water and nature assets
        this.load.image("lake01", "assets/images/world/lake04.png"); // Note: lake04 not lake01
        this.load.image("lake02", "assets/images/world/lake05.png"); // Note: lake05 not lake02
        this.load.image("well01", "assets/images/world/well02.png"); // Note: well02 not well01
        this.load.image("tree01", "assets/images/world/tree02.png");
        this.load.image("tree05", "assets/images/world/tree05.png");
        this.load.image("forest01", "assets/images/world/forest03.png"); // Note: forest03 not forest01
        
        // Shop and utility assets
        this.load.image("shop01", "assets/images/world/shop01.png");
        this.load.image("stove01", "assets/images/world/stove01.png");
        this.load.image("animals01", "assets/images/world/animals01.png");
        
        // Crop assets
        this.load.image("crop02", "assets/images/world/crop02.png");
        this.load.image("crop03", "assets/images/world/crop03.png");
        
        // Flower assets
        this.load.image("flower01", "assets/images/world/flowers01.png");
        this.load.image("flower02", "assets/images/world/flowers02.png");
        this.load.image("flower03", "assets/images/world/flowers03.png");
    }

    init(data) {
        console.log('MultiplayerScene: Initializing with data:', data);
        
        this.roomId = data.roomId;
        this.playerId = data.playerId;
        this.difficulty = data.difficulty || "medium";
        
        // If we have game data already, initialize immediately
        if (data.gameData) {
            console.log('Game data received in init:', data.gameData);
            this.gameData = data.gameData;
        }
        
        if (!this.roomId || !this.playerId) {
            console.error('Missing required data:', { roomId: this.roomId, playerId: this.playerId });
            alert('Missing room or player information. Returning to home.');
            this.scene.start('HomeScene');
            return;
        }
    }

    create() {
        console.log('MultiplayerScene: Creating scene...');
        
        if (!this.roomId || !this.playerId) {
            console.error('Cannot create WebSocket: missing roomId or playerId');
            this.scene.start('HomeScene');
            return;
        }

        this.createWorld();
        this.setupUI();
        
        // If we already have game data, initialize the world immediately
        if (this.gameData) {
            console.log('Initializing world with existing game data');
            this.initializeGameWorld();
        }
        
        this.connectToServer();
        
        // Add both cursor keys and WASD support
        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd = this.input.keyboard.addKeys("W,S,A,D");
        this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
        this.createSimpleTokenBalance();
    }
    createSimpleTokenBalance() {
    // Create simple balance display (top-right to avoid multiplayer UI)
    this.tokenBalanceElement = document.createElement('div');
    this.tokenBalanceElement.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: rgba(0, 0, 0, 0.8);
        border: 2px solid #fbbf24;
        border-radius: 10px;
        padding: 10px 15px;
        color: white;
        font-size: 14px;
        font-weight: bold;
        z-index: 1000;
        font-family: Arial, sans-serif;
        backdrop-filter: blur(5px);
    `;
    
    this.tokenBalanceElement.innerHTML = `
        <div style="display: flex; align-items: center;">
            <span style="margin-right: 8px;">💰</span>
            <span id="mp-balance-text" style="color: #fbbf24;">Loading...</span>
            <button id="mp-refresh-btn" style="margin-left: 8px; background: none; border: none; color: #9ca3af; cursor: pointer; font-size: 12px;" title="Refresh">🔄</button>
        </div>
    `;
    
    document.body.appendChild(this.tokenBalanceElement);
    
    // Add refresh functionality
    document.getElementById('mp-refresh-btn').onclick = () => this.updateTokenBalance();
    
    // Initial balance fetch
    this.updateTokenBalance();
    }  
    async updateTokenBalance() {
    if (!this.playerId) return; // Use playerId or account property
    
    try {
        const result = await getTokenBalance(this.playerId);
        if (result && result.status === 'success') {
            this.currentBalance = result.balance;
            const balanceElement = document.getElementById('mp-balance-text');
            if (balanceElement) {
                balanceElement.textContent = `${this.currentBalance.toLocaleString()} RN`;
            }
        }
    } catch (error) {
        console.error('Error fetching token balance in multiplayer:', error);
        const balanceElement = document.getElementById('mp-balance-text');
        if (balanceElement) {
            balanceElement.textContent = 'Error';
        }
    }
}

    setupUI() {
        // Create UI elements
        this.interactionText = this.add.text(0, 0, "Press ENTER to talk", {
            fontSize: '14px', color: '#ffffff',
            backgroundColor: 'rgba(0,0,0,0.7)', padding: { x: 8, y: 4 }
        }).setOrigin(0.5, 1).setDepth(30).setVisible(false);

        this.mintText = this.add.text(this.cameras.main.centerX, 50, "", {
            fontSize: '16px', color: '#ffffff',
            backgroundColor: 'rgba(0,0,0,0.7)', padding: { x: 8, y: 4 }
        }).setOrigin(0.5).setDepth(30).setScrollFactor(0).setVisible(false);

        // Winner announcement text
        this.winnerText = this.add.text(this.cameras.main.centerX, this.cameras.main.centerY, "", {
            fontSize: '32px', color: '#FFD700',
            backgroundColor: 'rgba(0,0,0,0.8)', padding: { x: 20, y: 10 }
        }).setOrigin(0.5).setDepth(100).setScrollFactor(0).setVisible(false);

        // Loading text for when waiting for game data
        this.loadingText = this.add.text(this.cameras.main.centerX, this.cameras.main.centerY, "Waiting for game to start...", {
            fontSize: '24px', color: '#ffffff',
            backgroundColor: 'rgba(0,0,0,0.8)', padding: { x: 20, y: 10 }
        }).setOrigin(0.5).setDepth(100).setScrollFactor(0).setVisible(!this.gameData);
    }

    connectToServer() {
        console.log(`Attempting to connect to: ws://localhost:8000/ws/${this.roomId}/${this.playerId}`);
        
        this.connectionTimeout = setTimeout(() => {
            if (this.ws && this.ws.readyState !== WebSocket.OPEN) {
                console.error('WebSocket connection timeout after 10 seconds');
                alert('Connection timeout. Please ensure the server is running on port 8000.');
                this.scene.start('HomeScene');
            }
        }, 10000);

        try {
            this.ws = new WebSocket(`ws://localhost:8000/ws/${this.roomId}/${this.playerId}`);
            
            this.ws.onopen = () => {
                console.log('✅ Connected to multiplayer server successfully');
                if (this.connectionTimeout) {
                    clearTimeout(this.connectionTimeout);
                    this.connectionTimeout = null;
                }
            };
            
            this.ws.onerror = (error) => {
                console.error('❌ WebSocket error:', error);
                if (this.connectionTimeout) {
                    clearTimeout(this.connectionTimeout);
                    this.connectionTimeout = null;
                }
                alert('Failed to connect to multiplayer server.');
                this.scene.start('HomeScene');
            };
            
            this.ws.onclose = (event) => {
                console.log('WebSocket connection closed:', event.code);
                if (this.connectionTimeout) {
                    clearTimeout(this.connectionTimeout);
                    this.connectionTimeout = null;
                }
                
                if (!this.gameWon && event.code !== 1000) {
                    alert('Lost connection to multiplayer server');
                    this.scene.start('HomeScene');
                }
            };
            
            this.ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                this.handleServerMessage(data);
            };

        } catch (error) {
            console.error('Failed to create WebSocket connection:', error);
            if (this.connectionTimeout) {
                clearTimeout(this.connectionTimeout);
                this.connectionTimeout = null;
            }
            alert('Unable to create WebSocket connection.');
            this.scene.start('HomeScene');
        }
    }

    handleServerMessage(data) {
        console.log('Received server message:', data);
        switch (data.type) {
            case 'room_joined':
                console.log('Joined room successfully');
                this.updatePlayerList(data.players);
                break;
                
            case 'player_moved':
                if (data.playerId !== this.playerId) {
                    this.updateOtherPlayer(data.playerId, data.x, data.y, data.direction);
                }
                break;
                
            case 'player_left':
                this.removeOtherPlayer(data.playerId);
                break;
                
            case 'game_started':
                console.log('Game started with shared state:', data.game_data);
                this.gameData = data.game_data;
                if (!this.worldInitialized) {
                    this.initializeGameWorld();
                }
                if (this.loadingText) {
                    this.loadingText.setVisible(false);
                }
                break;
                
            case 'game_ended':
                this.handleGameEnd(data.winner, data.winner_name);
                break;
        }
    }

    updateOtherPlayer(playerId, x, y) {
        let otherPlayer = this.otherPlayers.get(playerId);
        if (!otherPlayer) {
            otherPlayer = this.add.sprite(x, y, 'player');
            otherPlayer.setTint(0xff0000); // Red tint for other players
            otherPlayer.setDisplaySize(this.tileSize, this.tileSize);
            otherPlayer.setScale(0.08);
            // Remove Light2D pipeline for normal lighting
            this.otherPlayers.set(playerId, otherPlayer);
            
            // Add name label
            const nameLabel = this.add.text(x, y - 20, `Player ${playerId.slice(0, 8)}`, {
                fontSize: '12px', color: '#ffffff',
                backgroundColor: 'rgba(0,0,0,0.5)', padding: { x: 4, y: 2 }
            }).setOrigin(0.5).setDepth(31);
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
        console.log('Current players in room:', players);
    }

    initializeGameWorld() {
        if (this.worldInitialized) {
            console.log('World already initialized, skipping...');
            return;
        }

        console.log('Initializing game world with data:', this.gameData);
        
        // Set the current game ID for API calls
        if (this.gameData && this.gameData.game_id) {
            setCurrentGameId(this.gameData.game_id);
        }

        // Initialize villagers and game elements once game data is received
        this.villagers = this.physics.add.group({ immovable: true });
        
        // Create villagers based on shared game data
        const villagerSpriteMap = {
            "villager_1": { tileX: 7, tileY: 9.5, texture: "villager04", scale: 0.069 },
            "villager_5": { tileX: 15, tileY: 8, texture: "villager02", scale: 0.069 },
            "villager_2": { tileX: 11, tileY: 16, texture: "villager03", scale: 0.069 },
            "villager_3": { tileX: 17, tileY: 19.3, texture: "villager04", scale: 0.069 },
            "villager_0": { tileX: 5, tileY: 3, texture: "villager03", scale: 0.069 },
            "villager_4": { tileX: 21, tileY: 11.5, texture: "villager03", scale: 0.069 },
            "villager_6": { tileX: 24.8, tileY: 8.7, texture: "villager02", scale: 0.069 },
            "villager_7": { tileX: 26.2, tileY: 5, texture: "villager04", scale: 0.060 },
        };

        if (this.gameData && this.gameData.villagers) {
            console.log('Creating villagers:', this.gameData.villagers);
            this.gameData.villagers.forEach(villagerData => {
                const spriteInfo = villagerSpriteMap[villagerData.id];
                if (spriteInfo) {
                    console.log(`Creating villager ${villagerData.id} at position (${spriteInfo.tileX}, ${spriteInfo.tileY})`);
                    this.createVillager(
                        spriteInfo.tileX,
                        spriteInfo.tileY,
                        spriteInfo.texture,
                        spriteInfo.scale,
                        villagerData.id
                    );
                }
            });
        } else {
            console.error('No villager data available!');
        }

        // Create player sprite
        this.createPlayerSprite();
        
        // Create minting zones
        this.createMintingZones();

        this.worldInitialized = true;
        console.log('World initialization complete');
    }

    createMintingZones() {
        const ALL_MINT_ZONES = {
            'FISHING_ROD': { x: 6, y: 10, width: 80, height: 80 },
            'AXE': { x: 35.5, y: 15, width: 80, height: 80 },
            'SHOVEL': { x: 20, y: 20, width: 80, height: 80 },
            'LANTERN': { x: 40, y: 5, width: 80, height: 80 },
        };

        Object.entries(ALL_MINT_ZONES).forEach(([item, zone]) => {
            this.createMintingZone(zone.x * this.tileSize, zone.y * this.tileSize, zone.width, zone.height, item);
        });
    }

    createMintingZone(x, y, width, height, itemName) {
        const zone = this.add.zone(x, y, width, height).setOrigin(0);
        this.physics.world.enable(zone);
        zone.body.setAllowGravity(false);
        zone.body.moves = false;
        zone.itemName = itemName;

        this.physics.add.overlap(this.player, zone, () => {
            this.activeMintZone = zone;
            this.mintText.setStyle({ color: '#ffff00' });
            this.updateMintZoneText(itemName);
        });
    }

    updateMintZoneText(itemName) {
        const displayName = itemName.replace(/_/g, ' ');
        if (this.playerInventory.has(itemName)) {
            this.mintText.setText(`You already have: ${displayName}`).setVisible(true);
        } else {
            this.mintText.setText(`Press M to mint: ${displayName}`).setVisible(true);
        }
    }

    createVillager(tileX, tileY, texture, scaleSize, id) {
        console.log(`Creating villager at (${tileX * this.tileSize + 16}, ${tileY * this.tileSize + 16}) with texture ${texture}`);
        
        const villager = this.villagers.create(
            tileX * this.tileSize + 16,
            tileY * this.tileSize + 16,
            texture
        );
        villager
            .setOrigin(0.5)
            .setDisplaySize(32, 32)
            .setScale(scaleSize);
            // Remove Light2D pipeline for normal lighting

        villager.name = id;
        console.log(`Villager ${id} created successfully`);
    }

    createPlayerSprite() {
        console.log('Creating player sprite...');
        
        const pixelX = 1 * this.tileSize + this.tileSize / 2;
        const pixelY = 4.5 * this.tileSize + this.tileSize / 2;
        
        // Create player sprite starting with down-facing direction
        this.player = this.add.sprite(pixelX, pixelY, 'player_down');
        this.player.setTint(0x00ff00); // Green tint for current player
        this.player.setDisplaySize(this.tileSize, this.tileSize);
        this.player.setScale(0.08);
        
        // Add direction tracking
        this.player.currentDirection = 'down';
        this.player.lastDirection = 'down';
        
        this.cameras.main.startFollow(this.player);
        this.cameras.main.setFollowOffset(0, 0);
        this.cameras.main.setLerp(0.1, 0.1);
        this.cameras.main.setZoom(2.5);
        
        console.log('Player sprite created successfully with directional support');
    }

    // Update the handleInteraction method
    async handleInteraction() {
        if (this.nearbyVillager && !this.gameWon) {
            console.log(`Interacting with ${this.nearbyVillager.name}`);
            this.input.keyboard.enabled = false;
            this.interactionText.setText("...");
            
            try {
                const conversationData = await getConversation(this.nearbyVillager.name, "Hello", this.playerId);
                console.log('Received conversation data:', conversationData);
                
                if (conversationData && conversationData.npc_dialogue) {
                    console.log('Launching DialogueScene with data:', {
                        conversationData: conversationData,
                        newGameData: this.gameData,
                        villagerSpriteKey: this.nearbyVillager.texture.key,
                        playerId: this.playerId
                    });
                    
                    // Make sure the scene is properly paused and dialogue scene is launched
                    this.scene.pause('MultiplayerScene');
                    this.scene.launch('DialogueScene', {
                        conversationData: conversationData,
                        newGameData: this.gameData,
                        villagerSpriteKey: this.nearbyVillager.texture.key,
                        playerId: this.playerId,
                        callingScene: 'MultiplayerScene' // Add this to track which scene called it
                    });
                    
                    // Add a small delay to ensure the scene launches
                    this.time.delayedCall(100, () => {
                        const dialogueScene = this.scene.get('DialogueScene');
                        if (dialogueScene) {
                            dialogueScene.scene.bringToTop('DialogueScene');
                        }
                    });
                    
                } else {
                    console.error("Invalid conversation data received:", conversationData);
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
                
                // Notify server that this player won
                if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                    this.ws.send(JSON.stringify({
                        type: 'game_won',
                        location: location,
                        is_true_ending: result.is_true_ending
                    }));
                }
                
                // Show victory message
                this.winnerText.setText(`🎉 YOU WON! 🎉\n${result.message}`).setVisible(true);
            }
        } catch (error) {
            console.error("Error making guess:", error);
        }
    }

    handleGameEnd(winnerId, winnerName) {
        this.gameWon = true;
        
        if (winnerId === this.playerId) {
            this.winnerText.setText(`🎉 YOU WON! 🎉\nCongratulations!`).setVisible(true);
        } else {
            this.winnerText.setText(`🏆 ${winnerName} Won! 🏆\nBetter luck next time!`).setVisible(true);
        }
        
        // Return to home scene after 5 seconds
        this.time.delayedCall(5000, () => {
            this.scene.start('HomeScene');
        });
    }

    createWorld() {
        // Create a much larger world for better full-screen experience
        const worldTilesX = 60;
        const worldTilesY = 40;
        
        for (let y = 0; y < worldTilesY; y++) {
            this.walkableGrid[y] = [];
            this.occupiedGrid[y] = [];
            for (let x = 0; x < worldTilesX; x++) {
                // Initialize all tiles as NOT walkable (grass background)
                this.walkableGrid[y][x] = false;
                this.occupiedGrid[y][x] = false;
                this.add
                    .image(x * this.tileSize, y * this.tileSize, "background")
                    .setOrigin(0)
                    .setDisplaySize(this.tileSize, this.tileSize);
            }
        }

        // Create path tiles - ONLY these will be walkable
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

        // Apply path tiles - ONLY mark these as walkable
        pathTiles.forEach((path) => {
            for (let x = path.x; x < path.x + path.width; x++) {
                for (let y = path.y; y < path.y + path.height; y++) {
                    if (this.walkableGrid[y] && this.walkableGrid[y][x] !== undefined) {
                        this.walkableGrid[y][x] = true; // Mark path tiles as walkable
                        this.occupiedGrid[y][x] = true; // Mark as occupied for visual purposes
                    }
                }
            }
        });

        // Create path visuals
        for (let y = 0; y < worldTilesY; y++) {
            for (let x = 0; x < worldTilesX; x++) {
                if (this.walkableGrid[y][x]) {
                    const up = (this.walkableGrid[y - 1] && this.walkableGrid[y - 1][x]) || false;
                    const down = (this.walkableGrid[y + 1] && this.walkableGrid[y + 1][x]) || false;
                    const left = (this.walkableGrid[y] && this.walkableGrid[y][x - 1]) || false;
                    const right = (this.walkableGrid[y] && this.walkableGrid[y][x + 1]) || false;
                    const neighborCount = Number(up) + Number(down) + Number(left) + Number(right);

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

        // Buildings - these are visual only, no collision since paths are separate
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
        
        // Special buildings
        this.createObstacle(27.6, 1.2, "church01", 7, 7);
        this.createObstacle(36, 3.28, "windmill", 4.3, 4.3);
        this.createObstacle(41.3, 0.7, "farmhouse", 3, 3);
        this.createObstacle(44, 0.7, "farmhouse", 3, 3);
        
        // Water features
        this.createObstacle(37, 0, "lake02", 5, 4);
        this.createObstacle(5.5, 10.6, "lake01", 5, 4.5);
        this.createObstacle(26.5, 15.4, "lake01", 7, 7);
        this.createObstacle(23, 9.8, "well01", 4, 4);
        
        // Shops and utilities
        this.createObstacle(21.5, 13.7, "shop01", 4, 4);
        this.createObstacle(25, 13.7, "shop01", 4, 4);
        this.createObstacle(34, 16.4, "stove01", 4, 4);
        this.createObstacle(27, 10.7, "animals01", 8, 8);
        
        // Trees
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
        
        // Forests
        this.createObstacle(36, 14.56, "forest01", 2, 2);
        this.createObstacle(31, 14.56, "forest01", 2, 2);
        this.createObstacle(0.2, 14.56, "forest01", 2, 2);
        this.createObstacle(7, 16.3, "forest01", 2, 2);
        this.createObstacle(-1, 14, "forest01", 2, 2);
        this.createObstacle(37, 13, "forest01", 2, 2);
        
        // Crops
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
        
        // Farmhouse crops
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

        // Add flowers randomly on grass (non-walkable areas)
        const flowerTypes = ["flower01", "flower02", "flower03"];
        const greenSpaces = [];
        for (let y = 0; y < worldTilesY; y++) {
            for (let x = 0; x < worldTilesX; x++) {
                // Only place flowers on grass (non-walkable, non-occupied areas)
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

        // Set proper world bounds
        const worldWidth = worldTilesX * this.tileSize;
        const worldHeight = worldTilesY * this.tileSize;
        this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
    }

    createObstacle(tileX, tileY, texture, tileWidth, tileHeight) {
        const tileSize = this.tileSize;
        
        // Special handling for different asset types
        let effectiveTileWidth = tileWidth;
        let effectiveTileHeight = tileHeight;
        
        // Handle forest assets that need special scaling
        const isForest = texture === "forest01" || texture === "forest02";
        if (isForest) {
            effectiveTileWidth = tileWidth * 6;
            effectiveTileHeight = tileHeight * 6;
        }
        
        // Create the image with proper scaling
        this.add
            .image(tileX * tileSize, tileY * tileSize, texture)
            .setOrigin(0)
            .setDisplaySize(effectiveTileWidth * tileSize, effectiveTileHeight * tileSize);
    }

    isWalkableAt(worldX, worldY) {
        const worldTilesX = 60;
        const worldTilesY = 40;
        const tileX = Math.floor(worldX / this.tileSize);
        const tileY = Math.floor(worldY / this.tileSize);
        
        // Check if we're within world bounds first
        if (tileX < 0 || tileX >= worldTilesX || tileY < 0 || tileY >= worldTilesY) {
            return false; // Outside world bounds
        }
        
        // Check if the tile is walkable (only paths are walkable)
        if (this.walkableGrid[tileY] && this.walkableGrid[tileY][tileX]) {
            return true;
        }
        
        return false; // Not a walkable path tile
    }

    update() {
        if (!this.player || !this.ws || this.ws.readyState !== WebSocket.OPEN || this.gameWon) return;

        // Handle movement with directional animation
        const speed = 110;
        let velocityX = 0;
        let velocityY = 0;
        let newDirection = this.player.currentDirection;
        let moved = false;

        // Determine movement direction and update sprite
        if (this.cursors.left.isDown || this.wasd.A.isDown) {
            velocityX = -speed;
            newDirection = 'left';
            moved = true;
        } else if (this.cursors.right.isDown || this.wasd.D.isDown) {
            velocityX = speed;
            newDirection = 'right';
            moved = true;
        }
        
        if (this.cursors.up.isDown || this.wasd.W.isDown) {
            velocityY = -speed;
            newDirection = 'up';
            moved = true;
        } else if (this.cursors.down.isDown || this.wasd.S.isDown) {
            velocityY = speed;
            newDirection = 'down';
            moved = true;
        }

        // Handle diagonal movement - prioritize the most recent input
        if (velocityX !== 0 && velocityY !== 0) {
            // For diagonal movement, keep the last single direction pressed
            if (this.cursors.left.isDown || this.wasd.A.isDown) {
                if ((this.cursors.up.isDown || this.wasd.W.isDown) && this.player.lastDirection !== 'up') {
                    newDirection = 'left';
                } else if ((this.cursors.down.isDown || this.wasd.S.isDown) && this.player.lastDirection !== 'down') {
                    newDirection = 'left';
                }
            } else if (this.cursors.right.isDown || this.wasd.D.isDown) {
                if ((this.cursors.up.isDown || this.wasd.W.isDown) && this.player.lastDirection !== 'up') {
                    newDirection = 'right';
                } else if ((this.cursors.down.isDown || this.wasd.S.isDown) && this.player.lastDirection !== 'down') {
                    newDirection = 'right';
                }
            }
            
            // Normalize diagonal movement
            const magnitude = Math.sqrt(velocityX * velocityX + velocityY * velocityY);
            velocityX = (velocityX / magnitude) * speed;
            velocityY = (velocityY / magnitude) * speed;
        }

        // Update sprite texture if direction changed
        if (newDirection !== this.player.currentDirection) {
            this.player.setTexture(`player_${newDirection}`);
            this.player.lastDirection = this.player.currentDirection;
            this.player.currentDirection = newDirection;
        }

        // Apply movement
        if (moved) {
            const delta = this.game.loop.delta / 1000;
            const newX = this.player.x + velocityX * delta;
            const newY = this.player.y + velocityY * delta;

            if (this.isWalkableAt(newX, newY)) {
                this.player.x = newX;
                this.player.y = newY;
                
                // Send movement data to server
                this.ws.send(JSON.stringify({
                    type: 'move',
                    x: this.player.x,
                    y: this.player.y,
                    direction: newDirection // Also send direction for other players
                }));
            }
        }

        // Handle villager interactions
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

        // Handle minting zones
        if (!this.activeMintZone) {
            this.mintText.setVisible(false);
        }
        this.activeMintZone = null;

        // Handle input - with better debugging
        if (Phaser.Input.Keyboard.JustDown(this.enterKey) && this.nearbyVillager) {
            console.log('Enter key pressed, starting interaction with:', this.nearbyVillager.name);
            this.handleInteraction();
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
        if (this.tokenBalanceElement && this.tokenBalanceElement.parentNode) {
        this.tokenBalanceElement.parentNode.removeChild(this.tokenBalanceElement);
        this.tokenBalanceElement = null;
        }
    }
}
