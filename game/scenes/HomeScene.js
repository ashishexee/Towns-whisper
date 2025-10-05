import Phaser from "phaser";
import { startNewGame, getConversation} from "../api";
import { GAME_ITEMS_ABI, CONTRACT_ADDRESSES, STAKING_MANAGER_ABI } from '../../contracts_eth/config.js';
import { ethers } from 'ethers';

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
    this.initialPlayerPos = { x: 1, y: 4.5 };
    this.resetFeedbackText = null;
    this.account = null;
    this.playerInventory = new Map();
    this.mintKey = null;
    this.activeMintZone = null;
    this.mintText = null;
    this.startTime = 0;
    this.guessCount = 0;
    this.guessMade = false;
    this.nftCount = 0;
    this.tokenBalanceElement = null;
    this.currentBalance = 0;
    this.playerAccountId = null;
    this.wrongLocationChosen = false;
    this.timeLimit = null;
  }

  init(data) {
    if (data && data.existingGameData) {
      this.gameData = data.existingGameData;
      console.log("Existing game data loaded:", this.gameData);
    }
    this.account = data ? data.account : null;
    this.difficulty = data ? data.difficulty || "Easy" : "Easy";
    this.isStaking = data ? data.isStaking || false : false;
    this.timeLimit = data ? data.timeLimit : null;
  }
  createTokenBalanceUI() {
    this.tokenBalanceElement = document.createElement('div');
    this.tokenBalanceElement.style.cssText = `
        position: fixed;
        top: 20px;
        left: 20px;
        background: rgba(0, 0, 0, 0.9);
        border: 2px solid #fbbf24;
        border-radius: 15px;
        padding: 15px;
        color: white;
        font-size: 16px;
        font-weight: bold;
        z-index: 1000;
        min-width: 200px;
        font-family: Arial, sans-serif;
        backdrop-filter: blur(10px);
    `;
    
    this.tokenBalanceElement.innerHTML = `
        <div style="display: flex; align-items: center; margin-bottom: 10px;">
            <span id="balance-text" style="color: #fbbf24; line-height: 1.5;">[C] - Choose Location<br>[I] - Inventory</span>
        </div>
    `;
    
    document.body.appendChild(this.tokenBalanceElement);
}

  async create() {
    this.scene.bringToTop("UIScene");
    this.startTime = this.time.now;
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    const overlay = this.add
      .rectangle(0, 0, width, height, 0x000000, 0.9)
      .setOrigin(0)
      .setDepth(200);

    const panelWidth = 600;
    const panelHeight = 300;
    const panelX = width / 2 - panelWidth / 2;
    const panelY = height / 2 - panelHeight / 2;

    const loadingPanel = this.add.graphics().setDepth(201);

    loadingPanel.fillStyle(0x1a1a2e, 0.95);
    loadingPanel.fillRoundedRect(panelX, panelY, panelWidth, panelHeight, 25);

    loadingPanel.lineStyle(4, 0xd4af37, 1);
    loadingPanel.strokeRoundedRect(panelX, panelY, panelWidth, panelHeight, 25);

    loadingPanel.lineStyle(2, 0xffd700, 0.6);
    loadingPanel.strokeRoundedRect(
      panelX + 2,
      panelY + 2,
      panelWidth - 4,
      panelHeight - 4,
      23
    );

    const gameTitle = this.add
      .text(width / 2, panelY + 60, "Towns Whisper", {
        fontFamily: "Georgia, serif",
        fontSize: "36px",
        color: "#d4af37",
        align: "center",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(202);

    const loadingSubtitle = this.add
      .text(width / 2, panelY + 100, "Creating a New Mystery...", {
        fontFamily: "Arial",
        fontSize: "22px",
        color: "#ffffff",
        align: "center",
      })
      .setOrigin(0.5)
      .setDepth(202);

    const progressBarWidth = 450;
    const progressBarHeight = 25;
    const progressBarX = width / 2 - progressBarWidth / 2;
    const progressBarY = panelY + 160;

    const progressBox = this.add.graphics().setDepth(202);
    progressBox.fillStyle(0x2c2c54, 0.8);
    progressBox.fillRoundedRect(
      progressBarX,
      progressBarY,
      progressBarWidth,
      progressBarHeight,
      12
    );
    progressBox.lineStyle(2, 0x666699, 1);
    progressBox.strokeRoundedRect(
      progressBarX,
      progressBarY,
      progressBarWidth,
      progressBarHeight,
      12
    );

    const progressBar = this.add.graphics().setDepth(203);

    const percentText = this.add
      .text(width / 2, progressBarY + progressBarHeight / 2, "0%", {
        fontFamily: "Arial",
        fontSize: "16px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(204);

    const statusText = this.add
      .text(width / 2, panelY + 220, "Initializing...", {
        fontFamily: "Arial",
        fontSize: "18px",
        color: "#cccccc",
        align: "center",
      })
      .setOrigin(0.5)
      .setDepth(202);

    const loadingDots = this.add
      .text(width / 2, panelY + 250, "", {
        fontFamily: "Arial",
        fontSize: "24px",
        color: "#d4af37",
      })
      .setOrigin(0.5)
      .setDepth(202);

    let dotCount = 0;
    const dotsTimer = this.time.addEvent({
      delay: 500,
      callback: () => {
        dotCount = (dotCount + 1) % 4;
        loadingDots.setText(".".repeat(dotCount));
      },
      loop: true,
    });

    let progress = 0;
    const progressTimer = this.time.addEvent({
      delay: 50,
      callback: () => {
        progress += 0.005;
        if (progress > 1) progress = 1;

        progressBar.clear();

        progressBar.fillGradientStyle(
          0x4caf50,
          0x2e7d32,
          0x81c784,
          0x66bb6a,
          1
        );
        const padding = 3;
        const progressWidth = (progressBarWidth - padding * 2) * progress;
        progressBar.fillRoundedRect(
          progressBarX + padding,
          progressBarY + padding,
          progressWidth,
          progressBarHeight - padding * 2,
          10
        );

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

        percentText.setText(Math.floor(progress * 100) + "%");

        if (progress < 0.2) {
          statusText.setText("Connecting to server...");
        } else if (progress < 0.4) {
          statusText.setText("Generating mystery storyline...");
        } else if (progress < 0.6) {
          statusText.setText("Creating village layout...");
        } else if (progress < 0.8) {
          statusText.setText("Placing villagers and items...");
        } else if (progress < 0.95) {
          statusText.setText("Finalizing game world...");
        } else {
          statusText.setText("Almost ready...");
        }
      },
      loop: true,
    });

    console.log("diffulty - ", this.difficulty);

    const { game_id, inaccessible_locations, villagers } = await startNewGame(
      this.difficulty
    );

    progressTimer.destroy();
    dotsTimer.destroy();

    progress = 1;
    progressBar.clear();
    progressBar.fillGradientStyle(0x4caf50, 0x2e7d32, 0x81c784, 0x66bb6a, 1);
    const padding = 3;
    const progressWidth = (progressBarWidth - padding * 2) * progress;
    progressBar.fillRoundedRect(
      progressBarX + padding,
      progressBarY + padding,
      progressWidth,
      progressBarHeight - padding * 2,
      10
    );

    progressBar.fillStyle(0xffffff, 0.3);
    progressBar.fillRoundedRect(
      progressBarX + padding,
      progressBarY + padding + 2,
      progressWidth,
      4,
      2
    );

    percentText.setText("100%");
    statusText.setText("Complete!");
    loadingDots.setText("✓");
    loadingDots.setStyle({ color: "#4CAF50", fontSize: "32px" });

    this.time.delayedCall(800, () => {
      this.tweens.add({
        targets: [
          overlay,
          loadingPanel,
          gameTitle,
          loadingSubtitle,
          progressBox,
          progressBar,
          percentText,
          statusText,
          loadingDots,
        ],
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
        },
      });
    });

    if (!game_id) {
      this.add
        .text(
          this.cameras.main.width / 2,
          this.cameras.main.height / 2,
          "Error: Could not start a new game.\nPlease check the server and refresh.",
          { fontSize: "24px", fill: "#ff0000", align: "center" }
        )
        .setOrigin(0.5);
      return;
    }
    this.gameData = { game_id, inaccessible_locations, villagers };
    console.log("Game data initialized:", this.gameData);

    this.events.on("villagerUnlocked", this.unlockVillager, this);

    if (this.scene.get("ItemLockScene")) {
      this.scene
        .get("ItemLockScene")
        .events.on("villagerUnlocked", this.unlockVillager, this);
    }

    if (this.account) {
      await this.updateInventory();
    }

    // const framePadding = 25;
    // const extraBottomSpace = 110;
    // const frameWidth = this.cameras.main.width - framePadding * 2;
    // const frameHeight =
    //   this.cameras.main.height - framePadding * 2 - extraBottomSpace;
    // const cornerRadius = 30;

    // const maskShape = this.make.graphics();
    // maskShape.fillStyle(0xffff00);
    // maskShape.fillRoundedRect(
    //   framePadding,
    //   framePadding,
    //   frameWidth,
    //   frameHeight,
    //   cornerRadius
    // );
    // this.cameras.main.setMask(maskShape.createGeometryMask());

    // const frame = this.add.graphics();
    // frame.lineStyle(10, 0xd4af37, 1);
    // frame.strokeRoundedRect(
    //   framePadding,
    //   framePadding,
    //   frameWidth,
    //   frameHeight,
    //   cornerRadius
    // );
    // frame.setDepth(100);
    // frame.setScrollFactor(0);

    if (
      !this.sound.get("background_music") ||
      !this.sound.get("background_music").isPlaying
    ) {
      this.sound.play("background_music", { loop: true, volume: 0.2 });
    }

    if (!this.scene.isActive("UIScene")) {
      this.scene.launch("UIScene", {
        account: this.account,
        inaccessibleLocations: this.gameData.inaccessible_locations,
        difficulty: this.difficulty,
      });
    }

    this.lights.enable();
    this.lights.setAmbientColor(0x101020);

    const tilesX = Math.ceil(width / this.tileSize);
    const tilesY = Math.floor(height / this.tileSize);

    for (let y = 0; y < tilesY; y++) {
      this.walkableGrid[y] = [];
      this.occupiedGrid[y] = [];
      for (let x = 0; x < tilesX; x++) {
        this.walkableGrid[y][x] = false;
        this.occupiedGrid[y][x] = false;
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

    this.createObstacle(41.3, 0.7, "farmhouse", 3, 3);
    this.createObstacle(44, 0.7, "farmhouse", 3, 3);

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
    this.createObstacle(4.1, 16.15, "crop03", 2.2, 2);
    this.createObstacle(4.1, 14, "crop02", 2.2, 2);
    this.createObstacle(1.5, 14, "crop03", 2.2, 2);
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

    this.createObstacle(19.85, 3.2, "house01", 4.5, 4.5);

    this.createObstacle(18.1, 3.4, "crop03", 2, 2);
    this.createObstacle(18.1, 5.65, "crop02", 2, 2);
    this.createObstacle(24.15, 3.4, "crop02", 2, 2);
    this.createObstacle(24.15, 5.65, "crop03", 2, 2);
    this.createObstacle(18.15, 1.2, "crop02", 2, 2);
    this.createObstacle(20.15, 1.2, "crop03", 2, 2);
    this.createObstacle(22.15, 1.2, "crop02", 2, 2);
    this.createObstacle(24.15, 1.2, "crop03", 2, 2);
    const flowerTypes = ["flower01", "flower02", "flower03"];
    const greenSpaces = [];
    for (let y = 0; y < tilesY; y++) {
      for (let x = 0; x < tilesX; x++) {
        if (!this.occupiedGrid[y][x]) {
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

    this.villagers = this.physics.add.group({ immovable: true });

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

    (function assignLocks(gameData, spriteMap, unlockItems) {
      const availableIds = gameData.villagers
        .map((v) => v.id)
        .filter((id) => !!spriteMap[id]);

      Phaser.Utils.Array.Shuffle(availableIds);

      const countToLock = Math.min(4, availableIds.length, unlockItems.length);
      const villagersToLock = availableIds.slice(0, countToLock);

      gameData.villagers.forEach((villager) => {
        const lockIndex = villagersToLock.indexOf(villager.id);
        villager.required_item =
          lockIndex !== -1 ? unlockItems[lockIndex] : null;
      });

      console.log(
        "Locked villagers (id -> required_item):",
        gameData.villagers
          .filter((v) => v.required_item)
          .map((v) => ({ id: v.id, required_item: v.required_item }))
      );
    })(this.gameData, villagerSpriteMap, currentGameItems);

    this.gameData.villagers.forEach((villagerData) => {
      const spriteInfo = villagerSpriteMap[villagerData.id];
      if (spriteInfo) {
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

    this.createObstacle(6, 0.3, "crop03", 2, 2);

    this.createPlayer(1, 4.5);

    this.cameras.main.startFollow(this.player);
    this.cameras.main.setFollowOffset(0, 0);
    this.cameras.main.setLerp(0.1, 0.1);
    this.cameras.main.setZoom(1);

    const worldWidth =
      Math.ceil(this.cameras.main.width / this.tileSize) * this.tileSize;
    const worldHeight =
      Math.floor(this.cameras.main.height / this.tileSize) * this.tileSize;
    this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys("W,S,A,D");

    this.enterKey = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.ENTER
    );
    this.interactionText = this.add
      .text(0, 0, "Press ENTER to talk", {
        fontFamily: "Arial",
        fontSize: "16px",
        color: "#ffffff",
        backgroundColor: "rgba(0,0,0,0.7)",
        padding: { x: 8, y: 4 },
      })
      .setOrigin(0.5, 1)
      .setDepth(30)
      .setVisible(false);

    this.mintKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.M);

    this.inventoryKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.I);
    this.chooseLocationKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.C);

    this.mintText = this.add
      .text(0, 0, "Press M to mint", {
        fontFamily: "Arial",
        fontSize: "16px",
        color: "#ffffff",
        backgroundColor: "rgba(0,0,0,0.7)",
        padding: { x: 8, y: 4 },
      })
      .setOrigin(0.5, 1)
      .setDepth(30)
      .setVisible(false);

    this.events.on("resume", () => {
      if (this.input && this.input.keyboard) {
        this.input.keyboard.enabled = true;
      }
    });

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

    currentGameItems.forEach((itemName) => {
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

    this.setupResetPlayer();
  }

  isWalkableAt(worldX, worldY) {
    const tileX = Math.floor(worldX / this.tileSize);
    const tileY = Math.floor(worldY / this.tileSize);
    if (this.walkableGrid[tileY] && this.walkableGrid[tileY][tileX]) {
      return true;
    }
    return false;
  }

  createBuilding(tileX, tileY, texture, tileWidth = 4, tileHeight = 4) {
    const pixelX = tileX * this.tileSize;
    const pixelY = tileY * this.tileSize;
    this.add
      .image(pixelX, pixelY, texture)
      .setOrigin(0)
      .setDisplaySize(tileWidth * this.tileSize, tileHeight * this.tileSize);
    for (let y = Math.floor(tileY); y < Math.floor(tileY + tileHeight); y++) {
      for (let x = Math.floor(tileX); x < Math.floor(tileX + tileWidth); x++) {
        if (this.walkableGrid[y]) {
          this.walkableGrid[y][x] = false;
        }
        if (this.occupiedGrid[y]) {
          this.occupiedGrid[y][x] = true;
        }
      }
    }
  }

  createObstacle(tileX, tileY, texture, tileWidth, tileHeight) {
    const isForest = texture === "forest01" || texture === "forest02";
    const tileSize = this.tileSize;

    const effectiveTileWidth = isForest ? tileWidth * 6 : tileWidth;
    const effectiveTileHeight = isForest ? tileHeight * 6 : tileHeight;

    this.add
      .image(tileX * tileSize, tileY * tileSize, texture)
      .setOrigin(0)
      .setDisplaySize(
        effectiveTileWidth * tileSize,
        effectiveTileHeight * tileSize
      )
      .setPipeline("Light2D");

    for (
      let y = Math.floor(tileY);
      y < Math.floor(tileY + effectiveTileHeight);
      y++
    ) {
      for (
        let x = Math.floor(tileX);
        x < Math.floor(tileX + effectiveTileWidth);
        x++
      ) {
        if (this.occupiedGrid[y]) {
          this.occupiedGrid[y][x] = true;
        }
      }
    }
  }

  createLake(tileX, tileY, texture, tileWidth = 10, tileHeight = 10) {
    this.createObstacle(tileX, tileY, texture, tileWidth, tileHeight);
  }

  createVillager(tileX, tileY, texture, scaleSize, id, requiredItem = null) {
    const villager = this.villagers.create(
      tileX * this.tileSize + 16,
      tileY * this.tileSize + 16,
      texture
    );
    villager
      .setOrigin(0.5)
      .setDisplaySize(32, 32)
      .setScale(scaleSize)
      .setPipeline("Light2D");

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
  }

  createPlayer(tileX, tileY) {
    const pixelX = tileX * this.tileSize + this.tileSize / 2;
    const pixelY = tileY * this.tileSize + this.tileSize / 2;
    this.initialPlayerPos = { x: pixelX, y: pixelY };

    this.player = this.physics.add
      .sprite(pixelX, pixelY, "player_down")
      .setOrigin(0.5)
      .setDisplaySize(this.tileSize, this.tileSize)
      .setScale(0.08);
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(10);

    this.player.currentDirection = "down";
    this.player.lastDirection = "down";

    this.playerLight = this.lights
      .addLight(pixelX, pixelY, 100)
      .setColor(0xaaccff)
      .setIntensity(1.0);

    const worldWidth =
      Math.ceil(this.cameras.main.width / this.tileSize) * this.tileSize;
    const worldHeight =
      Math.floor(this.cameras.main.height / this.tileSize) * this.tileSize;
    this.physics.world.setBounds(0, 0, worldWidth, worldHeight);
  }

  setupResetPlayer() {
    this.resetKey = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.R
    );

    this.resetFeedbackText = this.add
      .text(this.cameras.main.centerX, 50, "", {
        fontFamily: "Arial",
        fontSize: "20px",
        color: "#d4af37",
        backgroundColor: "rgba(0,0,0,0.7)",
        padding: { x: 10, y: 5 },
      })
      .setOrigin(0.5)
      .setDepth(100)
      .setVisible(false);

    this.resetKey.on("down", () => {
      this.resetFeedbackText
        .setText("Hold [R] for 1.5s to reset position...")
        .setVisible(true);
      this.resetTimer = this.time.delayedCall(1500, () => {
        this.player.setPosition(
          this.initialPlayerPos.x,
          this.initialPlayerPos.y
        );
        this.resetFeedbackText.setText("Position has been reset!");
        this.time.delayedCall(1000, () => {
          this.resetFeedbackText.setVisible(false);
        });
      });
    });

    this.resetKey.on("up", () => {
      if (this.resetTimer && this.resetTimer.getProgress() < 1) {
        this.resetTimer.remove(false);
        this.resetFeedbackText.setVisible(false);
      }
    });
  }

  handleInteraction() {
    let closestVillager = null;
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
        closestVillager = villager;
      }
    });

    this.nearbyVillager = closestVillager;

    if (this.nearbyVillager) {
      if (
        this.nearbyVillager.requiredItem &&
        !this.playerInventory.has(this.nearbyVillager.requiredItem)
      ) {
        const itemName = this.nearbyVillager.requiredItem.replace(/_/g, " ");
        this.interactionText.setText(`Requires: ${itemName}`);
      } else {
        this.interactionText.setText("Press ENTER to talk");
      }
      this.interactionText.setVisible(true);
      this.interactionText.setPosition(
        this.nearbyVillager.x,
        this.nearbyVillager.y - this.nearbyVillager.displayHeight / 2
      );
    } else {
      this.interactionText.setVisible(false);
    }

    if (Phaser.Input.Keyboard.JustDown(this.enterKey) && this.nearbyVillager) {
      if (this.nearbyVillager.requiredItem) {
        this.scene.pause();
        this.scene.launch("ItemLockScene", {
          villager: this.nearbyVillager,
          suiClient: this.suiClient,
          account: this.account,
          gameData: this.gameData,
        });
        return;
      }
      this.initiateConversation(this.nearbyVillager);
    }
  }

  async initiateConversation(villager) {
    this.input.keyboard.enabled = false;
    this.player.setVelocity(0, 0);

    this.interactionText.setText("...");
    this.sound.play("villager_accept", { volume: 6 });
    console.log(villager.name);

    const conversationData = await getConversation(villager.name, "Hello");

    this.input.keyboard.enabled = true;
    this.interactionText.setText("Press ENTER to talk");

    if (conversationData) {
      this.scene.pause();
      this.scene.launch("DialogueScene", {
        conversationData: conversationData,
        newGameData: this.gameData,
        villagerSpriteKey: villager.texture.key,
      });
    } else {
      console.error(
        "Could not fetch conversation for villager:",
        villager.name
      );
    }
  }

  update() {
    if (!this.player) return;
    
    // Add stuck detection
    const currentPos = { x: this.player.x, y: this.player.y };

    
    if (this.activeMintZone) {
      const playerBounds = this.player.getBounds();
      const zoneBounds = this.activeMintZone.getBounds();
      if (
        !Phaser.Geom.Intersects.RectangleToRectangle(playerBounds, zoneBounds)
      ) {
        this.mintText.setVisible(false);
        this.activeMintZone = null;
      } else {
        this.mintText.setPosition(this.player.x, this.player.y - 30);
        this.mintText.setVisible(true);
        this.updateMintZoneText(this.activeMintZone.itemName);
      }
    }

    if (Phaser.Input.Keyboard.JustDown(this.mintKey) && this.activeMintZone) {
      if (!this.playerInventory.has(this.activeMintZone.itemName)) {
        this.mintItem(this.activeMintZone.itemName);
      }
    }

    if (Phaser.Input.Keyboard.JustDown(this.inventoryKey)) {
      this.scene.launch("InventoryScene", { account: this.account });
      this.scene.pause();
    }

    if (Phaser.Input.Keyboard.JustDown(this.chooseLocationKey)) {
      this.scene.launch("UIScene", {
        account: this.account,
        inaccessibleLocations: this.gameData.inaccessible_locations,
        difficulty: this.difficulty,
      });
      this.scene.bringToTop("UIScene");
    }

    if (this.playerLight) {
      this.playerLight.x = this.player.x;
      this.playerLight.y = this.player.y;
    }

    const speed = 110;
    let velocityX = 0;
    let velocityY = 0;
    let newDirection = this.player.currentDirection;

    if (this.cursors.left.isDown || this.wasd.A.isDown) {
      velocityX = -speed;
      newDirection = "left";
    } else if (this.cursors.right.isDown || this.wasd.D.isDown) {
      velocityX = speed;
      newDirection = "right";
    }

    if (this.cursors.up.isDown || this.wasd.W.isDown) {
      velocityY = -speed;
      newDirection = "up";
    } else if (this.cursors.down.isDown || this.wasd.S.isDown) {
      velocityY = speed;
      newDirection = "down";
    }

    if (velocityX !== 0 && velocityY !== 0) {
      if (this.cursors.left.isDown || this.wasd.A.isDown) {
        if (
          (this.cursors.up.isDown || this.wasd.W.isDown) &&
          this.player.lastDirection !== "up"
        ) {
          newDirection = "left";
        } else if (
          (this.cursors.down.isDown || this.wasd.S.isDown) &&
          this.player.lastDirection !== "down"
        ) {
          newDirection = "left";
        }
      } else if (this.cursors.right.isDown || this.wasd.D.isDown) {
        if (
          (this.cursors.up.isDown || this.wasd.W.isDown) &&
          this.player.lastDirection !== "up"
        ) {
          newDirection = "right";
        } else if (
          (this.cursors.down.isDown || this.wasd.S.isDown) &&
          this.player.lastDirection !== "down"
        ) {
          newDirection = "right";
        }
      }

      const magnitude = Math.sqrt(
        velocityX * velocityX + velocityY * velocityY
      );
      velocityX = (velocityX / magnitude) * speed;
      velocityY = (velocityY / magnitude) * speed;
    }

    if (newDirection !== this.player.currentDirection) {
      this.player.setTexture(`player_${newDirection}`);
      this.player.lastDirection = this.player.currentDirection;
      this.player.currentDirection = newDirection;
    }

    const delta = this.game.loop.delta / 1000;
    const nextX = this.player.x + velocityX * delta;
    const nextY = this.player.y + velocityY * delta;
    if (velocityX !== 0 || velocityY !== 0) {
      if (this.isWalkableAt(nextX, nextY)) {
        this.player.setVelocity(velocityX, velocityY);
        // record actual movement time only when we set a non-zero velocity
        this.lastMoveTime = this.time.now;
      } else {
        this.player.setVelocity(0, 0);
      }
    } else {
      this.player.setVelocity(0, 0);
    }

    // update lastPlayerPos for the next frame (now that velocity vars exist)
    this.lastPlayerPos = currentPos;

    this.villagers.getChildren().forEach((villager) => {
      if (villager.lockIcon) {
        villager.lockIcon.setPosition(villager.x, villager.y - 25);
        villager.lockIcon.setVisible(!!villager.requiredItem);
      }
    });

    this.nearbyVillager = null;
    this.villagers.getChildren().forEach((villager) => {
      const distance = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        villager.x,
        villager.y
      );
      if (distance < 50) {
        this.nearbyVillager = villager;
      }
    });

    if (this.nearbyVillager) {
      if (this.nearbyVillager.requiredItem) {
        const itemName = this.nearbyVillager.requiredItem.replace(/_/g, ' ');
        if (this.playerInventory.has(this.nearbyVillager.requiredItem)) {
          this.interactionText.setText(`Press ENTER to use ${itemName}`);
        } else {
          this.interactionText.setText(`Requires: ${itemName}`);
        }
      } else {
        this.interactionText.setText("Press ENTER to talk");
      }
      this.interactionText.setVisible(true);
      this.interactionText.setPosition(
        this.nearbyVillager.x,
        this.nearbyVillager.y - 40
      );
    } else {
      this.interactionText.setVisible(false);
    }

    if (Phaser.Input.Keyboard.JustDown(this.enterKey) && this.nearbyVillager) {
      this.startConversation();
    }
  }

  startConversation() {
    if (!this.nearbyVillager) return;

    if (this.nearbyVillager.requiredItem) {
      this.scene.pause();
      this.scene.launch('ItemLockScene', {
        villager: this.nearbyVillager,
        account: this.account,
        gameData: this.gameData,
        callingScene: 'HomeScene'
      });
      return;
    }

    console.log(`Starting conversation with villager: ${this.nearbyVillager.name}`);
    
    this.input.keyboard.enabled = false;
    this.player.setVelocity(0, 0);
    
    getConversation(this.nearbyVillager.name, "I'd like to talk.")
      .then(conversationData => {
        console.log("Conversation data received:", conversationData);
        
        if (conversationData && conversationData.npc_dialogue) {
          this.scene.launch("DialogueScene", {
            conversationData: conversationData,
            villagerSpriteKey: this.nearbyVillager.texture.key,
            newGameData: this.gameData
          });
          this.scene.pause();
        } else {
          console.error("Invalid conversation data:", conversationData);
          this.showErrorMessage("Unable to start conversation. Please try again.");
          this.input.keyboard.enabled = true;
        }
      })
      .catch(error => {
        console.error("Error getting conversation:", error);
        this.showErrorMessage("Network error. Please try again.");
        this.input.keyboard.enabled = true;
      });
  }

  /**
   * Finalizes a staked game on the smart contract to transfer bonuses.
   * This should be called from the EndScene when the game is won.
   * NOTE: The connected account must be the owner of the StakingManager contract.
   * @param {number} elapsedTime The total time taken to finish the game in seconds.
   */
  async finalizeStakedGame(elapsedTime) {
    if (!this.isStaking) {
      console.log("Not a staking game, no finalization needed.");
      return;
    }
    if (!this.account) {
      console.error("Wallet not connected, cannot finalize game.");
      return;
    }

    console.log(`Finalizing staked game. Time: ${elapsedTime}s`);
    const statusText = this.add.text(
      this.cameras.main.centerX, this.cameras.main.centerY,
      "Finalizing game on-chain...",
      { fontSize: "24px", color: "#2ecc71", backgroundColor: "rgba(0,0,0,0.8)", padding: { x: 20, y: 10 } }
    ).setOrigin(0.5).setDepth(5000).setScrollFactor(0);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const stakingContract = new ethers.Contract(CONTRACT_ADDRESSES.stakingManager, STAKING_MANAGER_ABI, signer);

      statusText.setText("Please confirm in wallet...");
      // The contract requires the owner to settle the game.
      const tx = await stakingContract.settleSinglePlayerGame(this.account, Math.round(elapsedTime));

      statusText.setText("Settling game... Waiting for confirmation...");
      await tx.wait();

      statusText.setText("Game settled! Rewards are on their way.");
    } catch (error) {
      console.error("Failed to settle game:", error);
      statusText.setText("Error settling game. See console.");
    } finally {
      this.time.delayedCall(4000, () => statusText.destroy());
    }
  }

  async mintItem(itemName) {
    if (!this.account) {
      console.error("Wallet not connected, cannot mint.");
      return;
    }

    if (typeof window.ethereum === 'undefined') {
        console.error("MetaMask or a compatible wallet is not installed.");
        this.showErrorMessage("Please install a wallet like MetaMask.");
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
      .setDepth(101);

    try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        
        const gameItemsContract = new ethers.Contract(CONTRACT_ADDRESSES.gameItems, GAME_ITEMS_ABI, signer);

        const itemNameFormatted = itemName.replace(/_/g, ' ');
        const tokenURI = `https://your-metadata-server.com/items/${itemName.toLowerCase()}.json`; 
        const description = `A trusty ${itemNameFormatted} for your adventures.`;

        mintingStatusText.setText("Please confirm in wallet...");

        const tx = await gameItemsContract.mintItemTo(
            this.account,
            tokenURI,
            itemNameFormatted,
            description
        );

        mintingStatusText.setText("Transaction sent. Waiting for confirmation...");
        const receipt = await tx.wait();

        console.log("Mint successful! Transaction:", receipt.hash);
        
        let tokenId = null;
        const transferEvent = receipt.logs
            .map(log => {
                try {
                    return gameItemsContract.interface.parseLog(log);
                } catch (e) {
                    return null;
                }
            })
            .find(event => 
                event && 
                event.name === 'Transfer' && 
                event.args.to.toLowerCase() === this.account.toLowerCase()
            );

        if (transferEvent) {
            tokenId = transferEvent.args.tokenId.toString();
            console.log(`Parsed tokenId: ${tokenId} for item: ${itemName}`);
            mintingStatusText.setText(`${itemNameFormatted} minted successfully!`);
            
            this.playerInventory.set(itemName, tokenId);
            await this.updateInventory();
        } else {
            console.error("Could not find a valid 'Transfer' event to parse the tokenId.");
            mintingStatusText.setText(`Minted, but item verification failed.`);
        }
        
        if (this.activeMintZone && this.activeMintZone.itemName === itemName) {
            this.updateMintZoneText(itemName);
        }

    } catch (error) {
        console.error("Minting failed:", error);
        let errorMessage = "Minting failed. See console.";
        if (error.code === 'ACTION_REJECTED') {
            errorMessage = "Transaction rejected.";
        } else if (error.reason) {
            errorMessage = `Minting failed: ${error.reason}`;
        }
        mintingStatusText.setText(errorMessage);
    } finally {
        this.time.delayedCall(3000, () => {
            mintingStatusText.destroy();
            this.input.keyboard.enabled = true;
        });
    }
  }

  /**
   * Handles the 0.01 ETH penalty for an incorrect guess in a staked game.
   * This function should be called from another scene (e.g., UIScene) when a player guesses incorrectly.
   * @returns {Promise<boolean>} True if the penalty was paid successfully, otherwise false.
   */
  async payGuessPenalty() {
    if (!this.isStaking && !this.wrongLocationChosen) {
      console.log("No penalty required.");
      return true;
    }
    if (!this.account) {
      this.showErrorMessage("Wallet not connected.");
      return false;
    }

    this.input.keyboard.enabled = false;
    const statusText = this.add.text(
      this.cameras.main.centerX, this.cameras.main.centerY,
      "Submitting 0.01 ETH penalty...",
      { fontSize: "24px", color: "#d4af37", backgroundColor: "rgba(0,0,0,0.8)", padding: { x: 20, y: 10 } }
    ).setOrigin(0.5).setDepth(101).setScrollFactor(0);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const stakingContract = new ethers.Contract(CONTRACT_ADDRESSES.stakingManager, STAKING_MANAGER_ABI, signer);

      statusText.setText("Please confirm in wallet...");
      const penaltyAmount = ethers.parseEther("0.01");
      
      const tx = await stakingContract.depositFundsForHint({ value: penaltyAmount });

      statusText.setText("Transaction sent. Waiting...");
      await tx.wait();

      statusText.setText("Penalty paid successfully!");
      return true;
    } catch (error) {
      console.error("Penalty payment failed:", error);
      let errorMessage = "Penalty payment failed.";
      if (error.code === 'ACTION_REJECTED') {
        errorMessage = "Transaction rejected.";
      }
      statusText.setText(errorMessage);
      return false;
    } finally {
      this.time.delayedCall(3000, () => {
        statusText.destroy();
        this.input.keyboard.enabled = true;
      });
    }
  }

  unlockVillager(villagerName) {
    const villager = this.villagers
      .getChildren()
      .find((v) => v.name === villagerName);
    if (villager) {
      console.log(`Unlocking villager: ${villagerName}`);
      villager.requiredItem = null;
      this.updateInventory();
    }
  }

  createMintingZone(x, y, width, height, itemName) {
    const zone = this.add.zone(x, y, width, height).setOrigin(0);
    this.physics.world.enable(zone);
    zone.body.setAllowGravity(false);
    zone.body.moves = false;
    zone.itemName = itemName;

    this.physics.add.overlap(this.player, zone, () => {
      this.activeMintZone = zone;
      console.log(`Creating mint zone for ${itemName} at (${x}, ${y})`);
      this.mintText.setStyle({ color: "#ffff00" });
      this.updateMintZoneText(itemName);
    });
  }

  updateMintZoneText(itemName) {
    if (this.playerInventory.has(itemName)) {
      this.mintText.setText(
        `You already own the ${itemName.replace(/_/g, " ")}`
      );
      this.mintText.setStyle({ color: "#888888" });
    } else {
      this.mintText.setText(`Press M to mint ${itemName.replace(/_/g, " ")}`);
      this.mintText.setStyle({ color: "#ffff00" });
    }
  }
  async updateInventory() {
    if (!this.account || typeof window.ethereum === 'undefined') {
        console.log("Wallet not connected, skipping inventory update.");
        return;
    }

    try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const gameItemsContract = new ethers.Contract(CONTRACT_ADDRESSES.gameItems, GAME_ITEMS_ABI, provider);

        const transferToFilter = gameItemsContract.filters.Transfer(null, this.account);
        const transferFromFilter = gameItemsContract.filters.Transfer(this.account, null);

        const transferToEvents = await gameItemsContract.queryFilter(transferToFilter, 0, 'latest');
        const transferFromEvents = await gameItemsContract.queryFilter(transferFromFilter, 0, 'latest');

        const ownedTokenIds = new Map();

        for (const event of transferToEvents) {
            const tokenId = event.args.tokenId.toString();
            ownedTokenIds.set(tokenId, true);
        }

        for (const event of transferFromEvents) {
            const tokenId = event.args.tokenId.toString();
            ownedTokenIds.set(tokenId, false);
        }

        this.playerInventory.clear();

        for (const [tokenId, isOwned] of ownedTokenIds.entries()) {
            if (isOwned) {
                try {
                    const [name] = await gameItemsContract.getItem(tokenId);
                    const itemName = name.replace(/ /g, '_').toUpperCase();
                    this.playerInventory.set(itemName, tokenId);
                } catch (e) {
                    console.warn(`Could not fetch details for token ID ${tokenId}. It might have been traded in.`, e);
                }
            }
        }

        console.log("Player inventory updated from blockchain:", Array.from(this.playerInventory.entries()));

    } catch (error) {
        console.error("Failed to update inventory from blockchain:", error);
        this.showErrorMessage("Could not load your items.");
    }
  }

  handleVillagerInteraction(villagerSprite) {
    const villagerId = villagerSprite.getData("villagerId");
    console.log(`Interacting with villager: ${villagerId}`);
    
    getConversation(villagerId, "I'd like to talk.").then(conversationData => {
      console.log("Raw conversation response:", conversationData);
      
      if (conversationData && conversationData.npc_dialogue) {
        console.log("Conversation data received:", conversationData);
        
        this.scene.launch("DialogueScene", {
          conversationData: conversationData,
          villagerSpriteKey: villagerSprite.texture.key,
          newGameData: this.newGameData
        });
        this.scene.pause();
      } else {
        console.error("Failed to get conversation data or missing npc_dialogue:", conversationData);
        const errorText = this.add.text(
          this.cameras.main.centerX, 
          this.cameras.main.centerY, 
          "Unable to start conversation. Please try again.", 
          { fontSize: '24px', color: '#ff4444' }
        ).setOrigin(0.5);
        
        this.time.delayedCall(2000, () => {
          errorText.destroy();
        });
      }
    }).catch(error => {
      console.error("Error getting conversation:", error);
      const errorText = this.add.text(
        this.cameras.main.centerX, 
        this.cameras.main.centerY, 
        "Network error. Please try again.", 
        { fontSize: '24px', color: '#ff4444' }
      ).setOrigin(0.5);
      
      this.time.delayedCall(2000, () => {
        errorText.destroy();
      });
    });
  }
  shutdown() {
    if (this.tokenBalanceElement && this.tokenBalanceElement.parentNode) {
        this.tokenBalanceElement.parentNode.removeChild(this.tokenBalanceElement);
    }
    
  }

}
