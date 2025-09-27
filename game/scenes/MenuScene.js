import Phaser from "phaser";

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: "MenuScene" });
    this.walletAddress = null;
    this.scoreText = null;
    this.difficulties = ["Very Easy", "Easy", "Medium", "Hard"];
    this.difficultyIndex = 1; // Default to "Easy"
    this._difficultyOverlay = null;
    this.difficultyText = null;
    this.arrowKeys = null;
  }

  init(data) {
    if (data && data.account) {
      this.walletAddress = data.account;
    }

    console.log("MenuScene initialized with:", {
      walletAddress: this.walletAddress,
    });
  }

  preload() {
    this.load.video(
      "bg_video",
      "assets/cut-scene/bg04_animated.mp4",
      "loadeddata",
      false,
      true
    );
  }

  create() {
    const framePadding = 20;
    const frameWidth = this.cameras.main.width - framePadding * 2;
    const frameHeight = this.cameras.main.height - framePadding * 2;
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
    const { width, height } = this.scale;

    const bgVideo = this.add.video(width / 2, height / 2, "bg_video");
    bgVideo.play(true);
    const zoomOutFactor = 0.45;

    const scaleX = width / (bgVideo.width || width);
    const scaleY = height / (bgVideo.height || height);
    const scale = Math.min(scaleX, scaleY) * zoomOutFactor;
    bgVideo.setScale(scale).setScrollFactor(0).setOrigin(0.5);
    bgVideo.setVolume(15);
    bgVideo.setMute(false);
    bgVideo.setActive(true);

    this.input.once(
      "pointerdown",
      () => {
        bgVideo.setMute(false);
      },
      this
    );

    this.add.rectangle(0, 0, width, height, 0x000000, 0.7).setOrigin(0);

    const panelWidth = 600;
    const panelHeight = 500;
    this.add
      .graphics()
      .fillStyle(0x1a1a1a, 0.9)
      .fillRoundedRect(
        width / 2 - panelWidth / 2,
        height / 2 - panelHeight / 2,
        panelWidth,
        panelHeight,
        20
      )
      .lineStyle(2, 0xd4af37, 1)
      .strokeRoundedRect(
        width / 2 - panelWidth / 2,
        height / 2 - panelHeight / 2,
        panelWidth,
        panelHeight,
        20
      );

    this.add
      .text(width / 2, height / 2 - 160, "Towns Whisper", {
        fontFamily: "Georgia, serif",
        fontSize: "56px",
        color: "#ffffff",
        align: "center",
        shadow: {
          offsetX: 2,
          offsetY: 2,
          color: "#000",
          blur: 5,
          stroke: true,
          fill: true,
        },
      })
      .setOrigin(0.5);

    this.scoreText = this.add
      .text(width / 2, height / 2 - 80, "Score: Loading...", {
        fontFamily: "Georgia, serif",
        fontSize: "32px",
        color: "#ffffff",
        align: "center",
        shadow: { offsetX: 1, offsetY: 1, color: "#000", blur: 2 },
      })
      .setOrigin(0.5);

    this.fetchAndDisplayScore();

    this.enterButton = this.createButton(width / 2, height / 2, "Enter Game", () => {
      this.showGenderSelection();
    });

    this.leaderboardButton = this.createButton(
      width / 2,
      height / 2 + 90,
      "Leaderboard",
      () => {
        this.scene.start("LeaderboardScene", {
          suiClient: this.suiClient,
          account: this.walletAddress,
        });
      }
    );

    let footerText = "Not Connected";
    if (this.walletAddress) {
      const formattedAddress = `${this.walletAddress.substring(
        0,
        6
      )}...${this.walletAddress.substring(this.walletAddress.length - 4)}`;
      footerText = `Connected: ${formattedAddress}`;
    }
    this.add
      .text(width / 2, height / 2 + 210, footerText, {
        fontFamily: "Arial",
        fontSize: "14px",
        color: "#aaaaaa",
      })
      .setOrigin(0.5);
  }

  async fetchAndDisplayScore() {
    // HERE the integration of a function to fetch the player's score from an EVM contract is to be done.
    if (!this.walletAddress) {
      this.scoreText.setText("Score: N/A");
      return;
    }
    this.scoreText.setText("Score: 10000"); // Placeholder score
  }

  showGenderSelection() {
    if (this._genderOverlay) return;
    const { width, height } = this.scale;

    const blocker = this.add
      .rectangle(0, 0, width, height, 0x000000, 0.6)
      .setOrigin(0)
      .setInteractive();

    const panelW = 480;
    const panelH = 220;
    const panelX = width / 2 - panelW / 2;
    const panelY = height / 2 - panelH / 2;

    const panel = this.add.graphics();
    panel.fillStyle(0x1a1a1a, 0.98);
    panel.fillRoundedRect(panelX, panelY, panelW, panelH, 14);
    panel.lineStyle(2, 0xd4af37, 1);
    panel.strokeRoundedRect(panelX, panelY, panelW, panelH, 14);

    const title = this.add
      .text(width / 2, height / 2 - 50, "Select Gender", {
        fontFamily: "Georgia, serif",
        fontSize: "32px",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    const maleBtn = this.createButton(
      width / 2 - 110,
      height / 2 + 30,
      "Male",
      () => {
        this.playerGender = "Male";
        this.closeGenderSelectionAndShowDifficulty();
      }
    );

    const femaleBtn = this.createButton(
      width / 2 + 110,
      height / 2 + 30,
      "Female",
      () => {
        this.playerGender = "Female";
        this.closeGenderSelectionAndShowDifficulty();
      }
    );

    this._genderOverlay = this.add.container(0, 0, [
      blocker,
      panel,
      title,
      maleBtn,
      femaleBtn,
    ]);
    this._genderOverlay.setDepth(1000);

    if (this.enterButton) this.enterButton.alpha = 0.5;
    if (this.leaderboardButton) this.leaderboardButton.alpha = 0.5;
  }

  closeGenderSelectionAndShowDifficulty() {
    if (this._genderOverlay) {
      this._genderOverlay.destroy();
      this._genderOverlay = null;
    }
    this.showDifficultySelection();
  }
  showDifficultySelection() {
    if (this._difficultyOverlay) return;
    const { width, height } = this.scale;

    const blocker = this.add
      .rectangle(0, 0, width, height, 0x000000, 0.6)
      .setOrigin(0)
      .setInteractive();

    const panelW = 550;
    const panelH = 250;
    const panelX = width / 2 - panelW / 2;
    const panelY = height / 2 - panelH / 2;

    const panel = this.add
      .graphics()
      .fillStyle(0x1a1a1a, 0.98)
      .fillRoundedRect(panelX, panelY, panelW, panelH, 14);
    panel.lineStyle(2, 0xd4af37, 1).strokeRoundedRect(panelX, panelY, panelW, panelH, 14);
    const title = this.add
      .text(width / 2, height / 2 - 70, "Select Difficulty", {
        fontFamily: "Georgia, serif",
        fontSize: "32px",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    // Difficulty Text Display
    this.difficultyText = this.add
      .text(width / 2, height / 2, this.difficulties[this.difficultyIndex], {
        fontFamily: "Arial",
        fontSize: "36px",
        color: "#ffffff",
        align: "center",
      })
      .setOrigin(0.5);
    // Arrow Buttons
    const leftArrow = this.createArrowButton(
      width / 2 - 150,
      height / 2,
      "left",
      () => this.changeDifficulty(-1)
    );
    const rightArrow = this.createArrowButton(
      width / 2 + 150,
      height / 2,
      "right",
      () => this.changeDifficulty(1)
    );

    // Start Game Button
    const startBtn = this.createButton(
      width / 2,
      height / 2 + 80,
      "Start Game",
      () => {
        this.closeDifficultyAndStart();
      }
    );

    this._difficultyOverlay = this.add.container(0, 0, [
      blocker,
      panel,
      title,
      this.difficultyText,
      leftArrow,
      rightArrow,
      startBtn,
    ]);
    this._difficultyOverlay.setDepth(1000);

    // Keyboard input for arrows
    this.arrowKeys = this.input.keyboard.createCursorKeys();
    this.input.keyboard.on("keydown-LEFT", () => this.changeDifficulty(-1));
    this.input.keyboard.on("keydown-RIGHT", () => this.changeDifficulty(1));
  }
  changeDifficulty(direction) {
    const oldText = this.difficultyText;
    const { width } = this.scale;

    // Animate old text out
    this.tweens.add({
      targets: oldText,
      x: oldText.x - 100 * direction,
      alpha: 0,
      duration: 200,
      ease: "Sine.easeIn",
      onComplete: () => {
        oldText.destroy();
      },
    });
    this.difficultyIndex += direction;
    if (this.difficultyIndex < 0) this.difficultyIndex = this.difficulties.length - 1;
    if (this.difficultyIndex >= this.difficulties.length) this.difficultyIndex = 0;

    // Create and animate new text in
    this.difficultyText = this.add
      .text(width / 2 + 100 * direction, this.difficultyText.y, this.difficulties[this.difficultyIndex], oldText.style)
      .setOrigin(0.5)
      .setAlpha(0);
    this._difficultyOverlay.add(this.difficultyText);

    this.tweens.add({
      targets: this.difficultyText,
      x: width / 2,
      alpha: 1,
      duration: 200,
      ease: "Sine.easeOut",
    });
  }

  createArrowButton(x, y, direction, callback) {
    const arrow = this.add
      .text(x, y, direction === "left" ? "◀" : "▶", {
        fontSize: "48px",
        color: "#d4af37",
      })
      .setOrigin(0.5);
    arrow.setInteractive({ useHandCursor: true });
    arrow.on("pointerdown", callback);
    arrow.on("pointerover", () => arrow.setColor("#fffa8e"));
    arrow.on("pointerout", () => arrow.setColor("#d4af37"));
    return arrow;
  }
  closeDifficultyAndStart() {
    if (this._difficultyOverlay) {
      this._difficultyOverlay.destroy();
      this._difficultyOverlay = null;
    }
    // Cleanup keyboard listeners
    this.input.keyboard.off("keydown-LEFT");
    this.input.keyboard.off("keydown-RIGHT");
    this.arrowKeys = null;

    if (this.enterButton) this.enterButton.alpha = 1;
    if (this.leaderboardButton) this.leaderboardButton.alpha = 1;
    this.scene.start("LoadingScene", {
      playerGender: this.playerGender,
      difficulty: this.difficulties[this.difficultyIndex], // Pass the selected difficulty
      nextScene: "VideoScene",
      account: this.walletAddress,
      suiClient: this.suiClient,
    });
  }

  createButton(x, y, text, callback) {
    const buttonWidth = 280;
    const buttonHeight = 60;

    const button = this.add.container(x, y);

    const background = this.add
      .graphics()
      .fillStyle(0x333333, 1)
      .fillRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, 15);

    const border = this.add
      .graphics()
      .lineStyle(2, 0xd4af37, 1)
      .strokeRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, 15);

    const buttonText = this.add
      .text(0, 0, text, {
        fontFamily: "Arial",
        fontSize: "24px",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    button.add([background, border, buttonText]);
    button.setSize(buttonWidth, buttonHeight);
    button.setInteractive({ useHandCursor: true });

    button.on("pointerover", () => {
      background
        .clear()
        .fillStyle(0x444444, 1)
        .fillRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, 15);
      border
        .clear()
        .lineStyle(2, 0xffe74a, 1)
        .strokeRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, 15);
      this.tweens.add({
        targets: button,
        scale: 1.05,
        duration: 150,
        ease: "Sine.easeInOut",
      });
    });

    button.on("pointerout", () => {
      background
        .clear()
        .fillStyle(0x333333, 1)
        .fillRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, 15);
      border
        .clear()
        .lineStyle(2, 0xd4af37, 1)
        .strokeRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, 15);
      this.tweens.add({
        targets: button,
        scale: 1,
        duration: 150,
        ease: "Sine.easeInOut",
      });
    });

    button.on("pointerdown", callback);

    return button;
  }
}