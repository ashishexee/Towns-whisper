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