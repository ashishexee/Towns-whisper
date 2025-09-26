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