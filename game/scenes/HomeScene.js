import Phaser from "phaser";
import { startNewGame, getConversation } from "../api";

export class HomeScene extends Phaser.Scene {
  constructor() {
    super({ key: "HomeScene" });
    this.player = null;
    this.playerLight = null;
    this.cursors = null;
    this.wasd = null;
    this.walkableGrid = [];
    this.occupiedGrid = [];
    this.tileSize = 32;
    this.villagers = null;
    this.nearbyVillager = null;
    this.enterKey = null;
    this.interactionText = null;
    this.gameData = null;
    this.resetKey = null;
    this.resetTimer = null;
    this.initialPlayerPos = { x: 1, y: 4.5};
    this.resetFeedbackText = null;
    // this.chainClient = null; // PREVIOUS CHAIN INTEGRATION REMOVED
    this.account = null;
    this.playerInventory = new Set();
    this.mintKey = null;
    this.activeMintZone = null;
    this.mintText = null;
    this.startTime = 0;
    this.guessCount = 0;
    this.nftCount = 0;
  }

  init(data) {
    if (data && data.existingGameData) {
      this.gameData = data.existingGameData;
      console.log("Existing game data loaded:", this.gameData); 

    }
    // this.chainClient = data ? data.chainClient : null; // PREVIOUS CHAIN INTEGRATION REMOVED
    this.account = data ? data.account : null;
    this.difficulty = data ? data.difficulty || "Easy" : "Easy";
  }

  async create() {
    this.startTime = this.time.now;
    // Create loading UI matching LoadingScene style
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Add background overlay
    const overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.9).setOrigin(0).setDepth(200);

    // Create main loading panel with better styling
    const panelWidth = 600;
    const panelHeight = 300;
    const panelX = width / 2 - panelWidth / 2;
    const panelY = height / 2 - panelHeight / 2;

    // Create graphics for the panel with gradient effect
    const loadingPanel = this.add.graphics().setDepth(201);
    
    // Main panel background
    loadingPanel.fillStyle(0x1a1a2e, 0.95);
    loadingPanel.fillRoundedRect(panelX, panelY, panelWidth, panelHeight, 25);
    
    // Golden border
    loadingPanel.lineStyle(4, 0xd4af37, 1);
    loadingPanel.strokeRoundedRect(panelX, panelY, panelWidth, panelHeight, 25);
    
    // Inner glow effect
    loadingPanel.lineStyle(2, 0xffd700, 0.6);
    loadingPanel.strokeRoundedRect(panelX + 2, panelY + 2, panelWidth - 4, panelHeight - 4, 23);

    // Game title
    const gameTitle = this.add.text(width / 2, panelY + 60, 'Echoes of the Village', {
      fontFamily: 'Georgia, serif',
      fontSize: '36px',
      color: '#d4af37',
      align: 'center',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(202);

    // Loading subtitle
    const loadingSubtitle = this.add.text(width / 2, panelY + 100, 'Creating a New Mystery...', {
      fontFamily: 'Arial',
      fontSize: '22px',
      color: '#ffffff',
      align: 'center'
    }).setOrigin(0.5).setDepth(202);

    // Progress bar setup with better styling
    const progressBarWidth = 450;
    const progressBarHeight = 25;
    const progressBarX = width / 2 - progressBarWidth / 2;
    const progressBarY = panelY + 160;

    // Progress bar background
    const progressBox = this.add.graphics().setDepth(202);
    progressBox.fillStyle(0x2c2c54, 0.8);
    progressBox.fillRoundedRect(progressBarX, progressBarY, progressBarWidth, progressBarHeight, 12);
    progressBox.lineStyle(2, 0x666699, 1);
    progressBox.strokeRoundedRect(progressBarX, progressBarY, progressBarWidth, progressBarHeight, 12);

    const progressBar = this.add.graphics().setDepth(203);

    // Percentage text
    const percentText = this.add.text(width / 2, progressBarY + progressBarHeight / 2, '0%', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(204);

    // Status text
    const statusText = this.add.text(width / 2, panelY + 220, 'Initializing...', {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#cccccc',
      align: 'center'
    }).setOrigin(0.5).setDepth(202);

    // Loading dots animation
    const loadingDots = this.add.text(width / 2, panelY + 250, '', {
      fontFamily: 'Arial',
      fontSize: '24px',
      color: '#d4af37'
    }).setOrigin(0.5).setDepth(202);

    let dotCount = 0;
    const dotsTimer = this.time.addEvent({
      delay: 500,
      callback: () => {
        dotCount = (dotCount + 1) % 4;
        loadingDots.setText('.'.repeat(dotCount));
      },
      loop: true
    });

    // Extended progress bar animation (3 seconds instead of 2)
    let progress = 0;
    const progressTimer = this.time.addEvent({
      delay: 50, // Smoother animation with smaller intervals
      callback: () => {
        progress += 0.005; // Slower increment for 3-second duration
        if (progress > 1) progress = 1;

        // Create gradient progress bar
        progressBar.clear();
        
        // Main progress bar with gradient effect
        progressBar.fillGradientStyle(0x4CAF50, 0x2E7D32, 0x81C784, 0x66BB6A, 1);
        const padding = 3;
        const progressWidth = (progressBarWidth - padding * 2) * progress;
        progressBar.fillRoundedRect(
          progressBarX + padding,
          progressBarY + padding,
          progressWidth,
          progressBarHeight - padding * 2,
          10
        );

        // Add shine effect
        if (progress > 0.1) {
          progressBar.fillStyle(0xffffff, 0.3);
          progressBar.fillRoundedRect(
            progressBarX + padding,
            progressBarY + padding + 2,
            progressWidth,
            4,
            2
          );
        }

        percentText.setText(Math.floor(progress * 100) + '%');

        // Update status text based on progress with more stages
        if (progress < 0.2) {
          statusText.setText('Connecting to server...');
        } else if (progress < 0.4) {
          statusText.setText('Generating mystery storyline...');
        } else if (progress < 0.6) {
          statusText.setText('Creating village layout...');
        } else if (progress < 0.8) {
          statusText.setText('Placing villagers and items...');
        } else if (progress < 0.95) {
          statusText.setText('Finalizing game world...');
        } else {
          statusText.setText('Almost ready...');
        }
      },
      loop: true
    });

    console.log("diffulty - ", this.difficulty);
    
    const { game_id, inaccessible_locations, villagers } = await startNewGame(this.difficulty);
    
    // Complete the progress bar with final animation
    progressTimer.destroy();
    dotsTimer.destroy();
    
    // Set progress to 100% immediately instead of animating
    progress = 1;
    progressBar.clear();
    progressBar.fillGradientStyle(0x4CAF50, 0x2E7D32, 0x81C784, 0x66BB6A, 1);
    const padding = 3;
    const progressWidth = (progressBarWidth - padding * 2) * progress;
    progressBar.fillRoundedRect(
      progressBarX + padding,
      progressBarY + padding,
      progressWidth,
      progressBarHeight - padding * 2,
      10
    );
    
    // Shine effect
    progressBar.fillStyle(0xffffff, 0.3);
    progressBar.fillRoundedRect(
      progressBarX + padding,
      progressBarY + padding + 2,
      progressWidth,
      4,
      2
    );
    
    percentText.setText('100%');
    statusText.setText('Complete!');
    loadingDots.setText('✓');
    loadingDots.setStyle({ color: '#4CAF50', fontSize: '32px' });

    // Clean up loading UI with fade out effect
    this.time.delayedCall(800, () => {
      this.tweens.add({
        targets: [overlay, loadingPanel, gameTitle, loadingSubtitle, progressBox, progressBar, percentText, statusText, loadingDots],
        alpha: 0,
        duration: 500,
        onComplete: () => {
          overlay.destroy();
          loadingPanel.destroy();
          gameTitle.destroy();
          loadingSubtitle.destroy();
          progressBox.destroy();
          progressBar.destroy();
          percentText.destroy();
          statusText.destroy();
          loadingDots.destroy();
        }
      });
    });

    if (!game_id) {
      this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 2, 'Error: Could not start a new game.\nPlease check the server and refresh.', { fontSize: '24px', fill: '#ff0000', align: 'center' }).setOrigin(0.5);
      return;
    }
    this.gameData = { game_id, inaccessible_locations, villagers };
    console.log("Game data initialized:", this.gameData);

    // Set up event listener for ItemLockScene
    this.events.on('villagerUnlocked', this.unlockVillager, this);

    if (this.scene.get('ItemLockScene')) {
        this.scene.get('ItemLockScene').events.on('villagerUnlocked', this.unlockVillager, this);
    }

    if (this.account && this.suiClient) {
        await this.updateInventory();
    }

    const framePadding = 25;
    const extraBottomSpace = 110;
    const frameWidth = this.cameras.main.width - framePadding * 2;
    const frameHeight =
      this.cameras.main.height - framePadding * 2 - extraBottomSpace;
    const cornerRadius = 30;

    const maskShape = this.make.graphics();
    maskShape.fillStyle(0xffff00);
    maskShape.fillRoundedRect(
      framePadding,
      framePadding,
      frameWidth,
      frameHeight,
      cornerRadius
    );
    this.cameras.main.setMask(maskShape.createGeometryMask());

    const frame = this.add.graphics();
    frame.lineStyle(10, 0xd4af37, 1);
    frame.strokeRoundedRect(
      framePadding,
      framePadding,
      frameWidth,
      frameHeight,
      cornerRadius
    );
    frame.setDepth(100);
    if (
      !this.sound.get("background_music") ||
      !this.sound.get("background_music").isPlaying
    ) {
      this.sound.play("background_music", { loop: true, volume: 0.2 });
    }

    if (!this.scene.isActive('UIScene')) {
        this.scene.launch('UIScene', {
            account: this.account, 
            // chainClient: this.chainClient, // PREVIOUS CHAIN INTEGRATION REMOVED
            inaccessibleLocations: this.gameData.inaccessible_locations,
            difficulty: this.difficulty 
        });
    }

    this.lights.enable();
    this.lights.setAmbientColor(0x101020);

    const tilesX = Math.ceil(width / this.tileSize);
    const tilesY = Math.floor(height / this.tileSize);

    for (let y = 0; y < tilesY; y++) {
      this.walkableGrid[y] = [];
      this.occupiedGrid[y] = []; // Initialize occupied grid
      for (let x = 0; x < tilesX; x++) {
        this.walkableGrid[y][x] = false;
        this.occupiedGrid[y][x] = false; // All tiles are initially unoccupied
        this.add
          .image(x * this.tileSize, y * this.tileSize, "background")
          .setOrigin(0)
          .setDisplaySize(this.tileSize, this.tileSize)
          .setPipeline("Light2D");
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

    for (let y = 0; y < tilesY; y++) {
      for (let x = 0; x < tilesX; x++) {
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
            .setAngle(angle)
            .setPipeline("Light2D");
        }
      }
    }

    // Buildings
    this.createObstacle(0.5, 0.7, "house01", 4, 4);
    this.createObstacle(5.5, 13.7, "house01", 5, 5);
    this.createObstacle(14, 0.8, "house01", 4.5, 4.5);
    this.createObstacle(2, 6.5, "house01", 4, 4);
    this.createObstacle(17, 9, "house02", 5, 5);
    this.createObstacle(10.4, 10.5, "house05", 6, 6);
    this.createObstacle(11, 6, "house02", 5, 5);
    this.createObstacle(28, 9, "house05", 4, 4);
    this.createObstacle(30.6, 9, "house01", 4, 4);
    this.createObstacle(35.7, 11.2, "house01", 4, 4);
    this.createObstacle(27.6, 1.2, "church01", 7, 7);
    this.createObstacle(36, 3.28, "windmill", 4.3, 4.3);
    this.createObstacle(37, 0, "lake02", 5, 4);
    this.createObstacle(23, 9.8, "well01", 4, 4);
    this.createObstacle(21.5, 13.7, "shop01", 4, 4);
    this.createObstacle(25, 13.7, "shop01", 4, 4);
    this.createObstacle(34, 16.4, "stove01", 4, 4);
    this.createObstacle(27, 10.7, "animals01", 8, 8);
    this.createObstacle(36, 14.56, "forest01", 2, 2);
    this.createObstacle(31, 14.56, "forest01", 2, 2);
    this.createObstacle(0.2, 14.56, "forest01", 2, 2);
    this.createObstacle(7, 16.3, "forest01", 2, 2);
    this.createObstacle(-1, 14, "forest01", 2, 2);
    this.createObstacle(37, 13, "forest01", 2, 2);
    this.createObstacle(5.5, 10.6, "lake01", 5, 4.5);
    this.createObstacle(26.5, 15.4, "lake01", 7, 7);

    // Trees
    this.createObstacle(5.3, 6.5, "tree01", 4, 4);
    this.createObstacle(6.8, 6.5, "tree01", 4, 4);
    this.createObstacle(8.3, 6.5, "tree01", 4, 4);
    this.createObstacle(11.2, 1.58, "tree05", 2, 3);
    this.createObstacle(12.4, 1.8, "tree05", 2, 3);
    this.createObstacle(10, 1.8, "tree05", 2, 3);
    this.createObstacle(26.4, 3, "tree05", 2, 3);
    this.createObstacle(26.4, 0.6, "tree05", 2, 3);
    this.createObstacle(28.4, 0.6, "tree05", 2, 3);
    this.createObstacle(31.5, 0.6, "tree05", 2, 3);
    this.createObstacle(33.5, 0.6, "tree05", 2, 3);
    this.createObstacle(33.5, 3, "tree05", 2, 3);
    this.createObstacle(35.5, 8, "tree01", 4, 4);

    //Farmhouse
    this.createObstacle(41.3, 0.7, "farmhouse", 3, 3);
    this.createObstacle(44, 0.7, "farmhouse", 3, 3);

    //Crops
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
    this.createObstacle(41.75, 3.6, "crop02", 2, 2);
    this.createObstacle(1.5, 16.15, "crop02", 2.3, 2);
    this.createObstacle(4.1, 16.15, "crop03", 2.2 , 2);
    this.createObstacle(4.1, 14, "crop02", 2.2 , 2);
    this.createObstacle(1.5, 14, "crop03", 2.2 , 2);
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

    // Forests
    this.createObstacle(19.85, 3.2, "house01", 4.5, 4.5);


    this.createObstacle(18.1, 3.4, "crop03", 2, 2);
    this.createObstacle(18.1, 5.65, "crop02", 2, 2);
    this.createObstacle(24.15, 3.4, "crop02", 2, 2);
    this.createObstacle(24.15, 5.65, "crop03", 2, 2);
    this.createObstacle(18.15, 1.2, "crop02", 2, 2);
    this.createObstacle(20.15, 1.2, "crop03", 2, 2);
    this.createObstacle(22.15, 1.2, "crop02", 2, 2);
    this.createObstacle(24.15, 1.2, "crop03", 2, 2);
    // Randomly place flowers on green spaces
    const flowerTypes = ["flower01", "flower02", "flower03"];
    const greenSpaces = [];
    for (let y = 0; y < tilesY; y++) {
      for (let x = 0; x < tilesX; x++) {
        if (!this.occupiedGrid[y][x]) {
          greenSpaces.push({ x, y });
        }
      }
    }

    const numberOfFlowers = 50; // Adjust this number as needed
    for (let i = 0; i < numberOfFlowers; i++) {
      if (greenSpaces.length > 0) {
        const randomIndex = Phaser.Math.Between(0, greenSpaces.length - 1);
        const position = greenSpaces.splice(randomIndex, 1)[0];
        const flowerType = Phaser.Math.RND.pick(flowerTypes);
        this.createObstacle(position.x, position.y, flowerType, 1, 1);
      }
    }