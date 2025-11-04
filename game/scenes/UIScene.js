import Phaser from "phaser";
import { chooseLocation } from "../api";

export class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: "UIScene" });
    this.timerText = null;
    this.elapsedSeconds = 0;
    this.inaccessibleLocations = [];
    this.account = null;
    this.difficulty = "Easy";
    this._locationOverlay = null;
    this.locationButton = null;
    this.locationButtonEnabled = false;
    this.resetHintText = null;
    this.inventoryButton = null;
    this.homeScene = null;
    this.gameScene = null;
  }

  init(data) {
    if (data) {
      this.inaccessibleLocations = data.inaccessibleLocations || [];
      this.account = data.account;
      this.difficulty = data.difficulty || "Easy";
      this.callingScene = data.callingScene || "HomeScene";
    } else {
      this.inaccessibleLocations = [];
      this.callingScene = "HomeScene";
    }
  }

  create() {
    this.elapsedSeconds = this.registry.get("elapsedTime") || 0;

    this.timerText = this.add
      .text(
        this.cameras.main.width / 2,
        this.cameras.main.height - 80,
        this.formatTime(this.elapsedSeconds),
        {
          fontFamily: "Arial",
          fontSize: "24px",
          color: "#d4af37",
          stroke: "#000000",
          strokeThickness: 4,
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(0);

    this.createInventoryButton();
    this.createLocationButton();

    if (this.callingScene === "HomeScene") {
      this.homeScene = this.scene.get("HomeScene");
      this.createGiveUpButton();
    }

    this.updateLocationButtonState();

    this.time.addEvent({
      delay: 1000,
      callback: this.updateTimer,
      callbackScope: this,
      loop: true,
    });
  }

  createLocationButton() {
    const button = this.add
      .text(170, this.cameras.main.height - 80, "Choose Location", {
        fontFamily: "Arial",
        fontSize: "24px",
        color: "#A9A9A9",
        backgroundColor: "#555555",
        padding: { x: 15, y: 8 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .setScrollFactor(0)
      .setDepth(300);

    button.on("pointerdown", async () => {
      if (!this.locationButtonEnabled) {
        this.showDisabledLocationMessage();
        return;
      }

      const gameScene = this.scene.get(this.callingScene);

      if (gameScene && gameScene.wrongLocationChosen) {
        const success = await gameScene.payGuessPenalty();
        if (success) {
          gameScene.wrongLocationChosen = false;
          this.updateLocationButtonState();
          this.showLocationChoices();
        }
      } else {
        this.showLocationChoices();
      }
    });

    button.on("pointerover", () => {
      const gameScene = this.scene.get(this.callingScene);
      const isWrongChoice = gameScene && gameScene.wrongLocationChosen;
      if (this.locationButtonEnabled && !isWrongChoice) {
        button.setBackgroundColor("#f5d56b");
      }
    });
    button.on("pointerout", () => {
      const gameScene = this.scene.get(this.callingScene);
      const isWrongChoice = gameScene && gameScene.wrongLocationChosen;
      if (this.locationButtonEnabled && !isWrongChoice) {
        button.setBackgroundColor("#d4af37");
      }
    });
    this.locationButton = button;
  }

  createInventoryButton() {
    const button = this.add
      .text(
        this.cameras.main.width - 150,
        this.cameras.main.height - 80,
        "Inventory",
        {
          fontFamily: "Arial",
          fontSize: "24px",
          color: "#000000",
          backgroundColor: "#d4af37",
          padding: { x: 15, y: 8 },
        }
      )
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .setScrollFactor(0)
      .setDepth(300);

    button.on("pointerdown", () => {
      console.log("[UIScene] Inventory button clicked.");
      console.log(`[UIScene] Calling scene: ${this.callingScene}`);

      const sourceScene = this.scene.get(this.callingScene);
      if (sourceScene) {
        console.log(`[UIScene] Found source scene: ${this.callingScene}`);
        if (sourceScene.playerInventory) {
          console.log(
            "[UIScene] Player inventory found:",
            sourceScene.playerInventory
          );

          let pausedByInventory = false;
          if (
            this.scene.isActive(this.callingScene) &&
            !sourceScene.sys.isPaused()
          ) {
            console.log(
              `[UIScene] Pausing active scene: ${this.callingScene}`
            );
            this.scene.pause(this.callingScene);
            pausedByInventory = true;
          } else {
            console.log(
              `[UIScene] Scene ${this.callingScene} is not active or already paused, not pausing.`
            );
          }

          this.scene.launch("InventoryScene", {
            inventory: sourceScene.playerInventory,
            callingScene: this.callingScene,
            account: this.account,
            pausedByInventory: pausedByInventory,
          });
        } else {
          console.error(
            `[UIScene] Player inventory not found in scene: ${this.callingScene}`
          );
        }
      } else {
        console.error(
          `[UIScene] Could not find source scene: ${this.callingScene}`
        );
      }
    });

    button.on("pointerover", () => button.setBackgroundColor("#f5d56b"));
    button.on("pointerout", () => button.setBackgroundColor("#d4af37"));
    this.inventoryButton = button;
  }

  createGiveUpButton() {
    const button = this.add
      .text(this.cameras.main.width - 100, 40, "Give Up", {
        fontFamily: "Arial",
        fontSize: "24px",
        color: "#ffffff",
        backgroundColor: "#992222",
        padding: { x: 15, y: 8 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .setScrollFactor(0)
      .setDepth(300);

    let giveUpTimer = null;

    button.on("pointerdown", () => {
      button.setText("Hold...");
      giveUpTimer = this.time.delayedCall(1500, () => {
        this.scene.stop("HomeScene");
        this.scene.stop("UIScene");
        this.scene.start("EndScene", {
          score: 0,
          time: this.formatTime(this.elapsedSeconds),
          guesses: this.homeScene.guessCount,
          nfts: this.homeScene.nftCount,
          account: this.account,
          story: "You have given up on the quest.",
          isCorrect: false, // This triggers the failure/forfeit scenario
          isStaking: this.homeScene.isStaking,
          elapsedTime: this.elapsedSeconds,
          timeLimit: this.homeScene.timeLimit,
        });
      });
    });

    button.on("pointerup", () => {
      if (giveUpTimer) {
        giveUpTimer.remove(false);
      }
      button.setText("Give Up");
    });

    button.on("pointerout", () => {
      if (giveUpTimer) {
        giveUpTimer.remove(false);
      }
      button.setText("Give Up");
      button.setBackgroundColor("#992222");
    });

    button.on("pointerover", () => {
      button.setBackgroundColor("#cc3333");
    });

    this.giveUpButton = button;
  }

  showDisabledLocationMessage() {
    const remainingSeconds = 5 - this.elapsedSeconds;
    const message = `Available in ${remainingSeconds} seconds.`;

    const feedbackText = this.add
      .text(this.locationButton.x, this.locationButton.y - 50, message, {
        fontFamily: "Arial",
        fontSize: "18px",
        color: "#ffdddd",
        backgroundColor: "rgba(0,0,0,0.7)",
        padding: { x: 10, y: 5 },
      })
      .setOrigin(0.5)
      .setDepth(201)
      .setScrollFactor(0);

    this.time.delayedCall(1500, () => {
      feedbackText.destroy();
    });
  }

  showLocationChoices() {
    if (this._locationOverlay) return;

    if (
      this.callingScene === "HomeScene" &&
      this.homeScene.isStaking &&
      this.homeScene.guessMade
    ) {
      return;
    }

    const { width, height } = this.cameras.main;

    const blocker = this.add
      .rectangle(0, 0, width, height, 0x000000, 0.7)
      .setOrigin(0)
      .setInteractive()
      .setScrollFactor(0);

    const panelHeight = 80 + this.inaccessibleLocations.length * 70;
    const panelWidth = 400;
    const panelX = width / 2 - panelWidth / 2;
    const panelY = height / 2 - panelHeight / 2;

    const panel = this.add
      .graphics()
      .fillStyle(0x1a1a1a, 0.95)
      .fillRoundedRect(panelX, panelY, panelWidth, panelHeight, 15)
      .lineStyle(2, 0xd4af37, 1)
      .strokeRoundedRect(panelX, panelY, panelWidth, panelHeight, 15)
      .setScrollFactor(0);

    const title = this.add
      .text(width / 2, panelY + 40, "Choose a Location to Investigate", {
        fontFamily: "Georgia, serif",
        fontSize: "24px",
        color: "#ffffff",
      })
      .setOrigin(0.5)
      .setScrollFactor(0);

    const locationButtons = this.inaccessibleLocations.map(
      (location, index) => {
        const buttonY = panelY + 90 + index * 60;
        const button = this.add
          .text(width / 2, buttonY, location, {
            fontFamily: "Arial",
            fontSize: "20px",
            color: "#000000",
            backgroundColor: "#d4af37",
            padding: { x: 20, y: 10 },
            align: "center",
            fixedWidth: 300,
          })
          .setOrigin(0.5)
          .setInteractive({ useHandCursor: true })
          .setScrollFactor(0);

        button.on("pointerdown", () => this.selectLocation(location));
        button.on("pointerover", () => button.setBackgroundColor("#f5d56b"));
        button.on("pointerout", () => button.setBackgroundColor("#d4af37"));
        return button;
      }
    );

    const hintText = this.add
      .text(width / 2, panelY + panelHeight - 18, "Press Enter to close", {
        fontFamily: "Arial",
        fontSize: "14px",
        color: "#cccccc",
      })
      .setOrigin(0.5)
      .setScrollFactor(0);

    this._locationOverlay = this.add.container(0, 0, [
      blocker,
      panel,
      title,
      ...locationButtons,
      hintText,
    ]);
    this._locationOverlay.setDepth(5000).setScrollFactor(0);

    const closeOverlay = () => {
      if (this._locationOverlay) {
        this._locationOverlay.destroy();
        this._locationOverlay = null;
      }
    };

    blocker.on("pointerdown", () => closeOverlay());

    const onEnter = () => closeOverlay();
    this.input.keyboard.on("keydown-ENTER", onEnter);

    this._locationOverlay.once("destroy", () => {
      this.input.keyboard.off("keydown-ENTER", onEnter);
    });
  }


  async selectLocation(location) {
    if (this._locationOverlay) {
      this._locationOverlay.destroy();
      this._locationOverlay = null;
    }

    const camera = this.cameras.main;
    const feedbackText = this.add
      .text(
        camera.width / 2,
        camera.height / 2,
        `Investigating ${location}...`,
        {
          fontFamily: "Arial",
          fontSize: "28px",
          color: "#ffffff",
          backgroundColor: "rgba(0,0,0,0.8)",
          padding: { x: 20, y: 10 },
        }
      )
      .setOrigin(0.5)
      .setDepth(2501)
      .setScrollFactor(0);

    // --- THIS IS THE UNIFIED LOGIC ---
    const gameScene = this.scene.get(this.callingScene);
    const result = await chooseLocation(location, gameScene.playerId || gameScene.account);

    if (!result) {
      feedbackText.setText("Error: Game session not found.");
      this.time.delayedCall(2000, () => {
        gameScene.scene.stop(this.callingScene);
        gameScene.scene.start("MenuScene");
      });
      return;
    }

    if (result.is_correct) {
      feedbackText.setText(`Investigation successful!`);
      // For multiplayer, emit the 'game_won' event
      if (this.callingScene === "MultiplayerScene" && gameScene.ws && gameScene.ws.readyState === WebSocket.OPEN) {
        console.log("Correct guess! Notifying server that game is won.");
        gameScene.ws.send(JSON.stringify({ type: "game_won" }));
      } else {
        // Handle single-player win logic (which transitions to EndScene)
        this.time.delayedCall(1500, () => {
          // ... (existing single-player score calculation and scene transition) ...
          const difficultyMultipliers = { "Very Easy": 0.5, Easy: 1, Medium: 1.5, Hard: 2 };
          const difficultyMultiplier = difficultyMultipliers[this.difficulty] || 1;
          const timeBonus = Math.max(0, 600 - this.elapsedSeconds) * 10 * difficultyMultiplier;
          const guessPenalty = gameScene.guessCount * 500 * difficultyMultiplier;
          const nftBonus = gameScene.nftCount * 2000 * difficultyMultiplier;
          const finalScore = timeBonus - guessPenalty + nftBonus;

          this.scene.stop("HomeScene");
          this.scene.stop("UIScene");
          this.scene.start("EndScene", {
            score: Math.round(finalScore),
            time: this.formatTime(this.elapsedSeconds),
            guesses: gameScene.guessCount,
            nfts: gameScene.nftCount,
            account: this.account,
            story: result.story,
            isCorrect: true,
            isStaking: gameScene.isStaking,
            elapsedTime: this.elapsedSeconds,
            timeLimit: gameScene.timeLimit,
            playerId: this.account,
          });
        });
      }
    } else {
      // This block now handles incorrect guesses for BOTH modes
      feedbackText.setText(`Nothing found at ${location}. Try again.`);
      gameScene.guessCount = (gameScene.guessCount || 0) + 1;
      gameScene.wrongLocationChosen = true;
      
      this.updateLocationButtonState(); // Explicitly update the UI
      
      this.time.delayedCall(2000, () => {
        feedbackText.destroy();
      });
    }
  }

  update() {
    if (this.elapsedSeconds >= 5 && !this.locationButtonEnabled) {
      this.locationButtonEnabled = true;
      this.updateLocationButtonState();
    }
  }

  updateTimer() {
    this.elapsedSeconds++;
    this.registry.set("elapsedTime", this.elapsedSeconds);
    this.timerText.setText(this.formatTime(this.elapsedSeconds));
  }

  formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const partInSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${partInSeconds
      .toString()
      .padStart(2, "0")}`;
  }

  updateLocationButtonState() {
    if (!this.locationButton) return;

    const gameScene = this.scene.get(this.callingScene);

    if (gameScene && gameScene.wrongLocationChosen) {
      this.locationButton.setText("Deposit 0.001 G");
      this.locationButton.setBackgroundColor("#992222");
      this.locationButton.setColor("#ffffff");
      this.locationButtonEnabled = true;
    } else {
      this.locationButton.setText("Choose Location");
      if (this.locationButtonEnabled) {
        this.locationButton.setBackgroundColor("#d4af37");
        this.locationButton.setColor("#000000");
      } else {
        this.locationButton.setBackgroundColor("#555555");
        this.locationButton.setColor("#A9A9A9");
      }
    }
  }
}
