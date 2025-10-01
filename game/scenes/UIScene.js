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
  }

  init(data) {
    if (data && data.inaccessibleLocations) {
      this.inaccessibleLocations = data.inaccessibleLocations;
      this.account = data.account;
      this.difficulty = data.difficulty || "Easy";
    }
  }

  create() {
    this.elapsedSeconds = this.registry.get("elapsedTime") || 0;

    // Create UI buttons
    this.createInventoryButton();
    this.createTimerText();

    if (this.inaccessibleLocations && this.inaccessibleLocations.length > 0) {
      this.createLocationButton();
    }
    
    this.createResetHintText();

    console.log("UIScene created");
  }
  
  createTimerText() {
    this.timerText = this.add
      .text(0, 0, this.formatTime(this.elapsedSeconds), {
        fontFamily: "Arial",
        fontSize: "24px",
        color: "#d4af37",
        stroke: "#000000",
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(2000);
    
    this.updateTimerPosition();
  }

 createLocationButton() {
    this.locationButton = this.add
      .text(0, 0, "Choose Location", {
        fontFamily: "Arial",
        fontSize: "20px",
        color: this.locationButtonEnabled ? "#000000" : "#ffffff", // White text when disabled
        backgroundColor: this.locationButtonEnabled ? "#d4af37" : "#666666", // Lighter grey for disabled
        padding: { x: 12, y: 6 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .setScrollFactor(0)
      .setDepth(3000); // Increased depth to render on top of everything

    this.locationButton.on("pointerdown", () => {
      if (this.locationButtonEnabled) {
        this.locationButton.setBackgroundColor("#d4af37");
      } else {
        this.locationButton.setBackgroundColor("#666666"); // Keep disabled color on pointer out
      }
    });

    this.updateLocationButtonPosition();
  }

  createInventoryButton() {
    this.inventoryButton = this.add
      .text(0, 0, "Inventory", {
        fontFamily: "Arial",
        fontSize: "20px",
        color: "#000000",
        backgroundColor: "#d4af37",
        padding: { x: 12, y: 6 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .setScrollFactor(0)
      .setDepth(2000);

    this.inventoryButton.on("pointerdown", () => {
      const homeScene = this.scene.get("HomeScene");
      if (homeScene && homeScene.scene.isActive()) {
        homeScene.scene.pause();
        this.scene.launch("InventoryScene", {
          inventory: Array.from(homeScene.playerInventory),
        });
      }
    });

    this.inventoryButton.on("pointerover", () => this.inventoryButton.setBackgroundColor("#f5d56b"));
    this.inventoryButton.on("pointerout", () => this.inventoryButton.setBackgroundColor("#d4af37"));

    this.updateInventoryButtonPosition();
  }

  createResetHintText() {
    this.resetHintText = this.add
      .text(0, 0, "Hold [R] if your character is stuck", {
        fontFamily: "Arial",
        fontSize: "14px",
        color: "#aaaaaa",
        backgroundColor: "rgba(0,0,0,0.7)",
        padding: { x: 8, y: 4 },
      })
      .setOrigin(1, 1)
      .setDepth(2000)
      .setScrollFactor(0);

    this.updateResetHintPosition();
  }

  // Update positions based on camera view
  updateTimerPosition() {
    if (this.timerText) {
      const camera = this.cameras.main;
      this.timerText.setPosition(
        camera.scrollX + camera.width / 2,
        camera.scrollY + 30 // Move to top of the screen
      );
    }
  }

  updateLocationButtonPosition() {
    if (this.locationButton) {
      const camera = this.cameras.main;
      this.locationButton.setPosition(
        camera.scrollX + 150,
        camera.scrollY + camera.height - 40 // Position at bottom-left
      );
    }
  }

  updateInventoryButtonPosition() {
    if (this.inventoryButton) {
      const camera = this.cameras.main;
      this.inventoryButton.setPosition(
        camera.scrollX + camera.width - 150,
        camera.scrollY + camera.height - 40 // Position at bottom-right
      );
    }
  }

  updateResetHintPosition() {
    if (this.resetHintText) {
      const camera = this.cameras.main;
      this.resetHintText.setPosition(
        camera.scrollX + camera.width - 16,
        camera.scrollY + camera.height - 8
      );
    }
  }

  // Call this method every frame to update UI positions
  updateUIPositions() {
    this.updateTimerPosition();
    this.updateLocationButtonPosition();
    this.updateInventoryButtonPosition();
    this.updateResetHintPosition();
  }

  showDisabledLocationMessage() {
    const remainingSeconds = 120 - this.elapsedSeconds;
    const message = `Available in ${remainingSeconds} seconds.`;
    const camera = this.cameras.main;

    const feedbackText = this.add
      .text(
        camera.scrollX + camera.width / 2,
        camera.scrollY + camera.height / 2 - 50,
        message,
        {
          fontFamily: "Arial",
          fontSize: "18px",
          color: "#ffdddd",
          backgroundColor: "rgba(0,0,0,0.7)",
          padding: { x: 10, y: 5 },
        }
      )
      .setOrigin(0.5)
      .setDepth(2001)
      .setScrollFactor(0);

    this.time.delayedCall(1500, () => {
      feedbackText.destroy();
    });
  }

  showLocationChoices() {
    if (this._locationOverlay) return;

    const camera = this.cameras.main;
    const width = camera.width;
    const height = camera.height;

    const blocker = this.add
      .rectangle(
        camera.scrollX,
        camera.scrollY,
        width,
        height,
        0x000000,
        0.7
      )
      .setOrigin(0)
      .setInteractive()
      .setScrollFactor(0);

    const panelHeight = 80 + this.inaccessibleLocations.length * 70;
    const panelWidth = 400;
    const panelX = camera.scrollX + width / 2 - panelWidth / 2;
    const panelY = camera.scrollY + height / 2 - panelHeight / 2;

    const panel = this.add
      .graphics()
      .fillStyle(0x1a1a1a, 0.95)
      .fillRoundedRect(panelX, panelY, panelWidth, panelHeight, 15)
      .lineStyle(2, 0xd4af37, 1)
      .strokeRoundedRect(panelX, panelY, panelWidth, panelHeight, 15)
      .setScrollFactor(0);

    const title = this.add
      .text(
        camera.scrollX + width / 2,
        panelY + 40,
        "Choose a Location to Investigate",
        {
          fontFamily: "Georgia, serif",
          fontSize: "24px",
          color: "#ffffff",
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0);

    const locationButtons = this.inaccessibleLocations.map(
      (location, index) => {
        const buttonY = panelY + 90 + index * 60;
        const button = this.add
          .text(camera.scrollX + width / 2, buttonY, location, {
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
      .text(
        camera.scrollX + width / 2,
        panelY + panelHeight - 18,
        "Press Enter to close",
        {
          fontFamily: "Arial",
          fontSize: "14px",
          color: "#cccccc",
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0);

    this._locationOverlay = this.add.container(0, 0, [
      blocker,
      panel,
      title,
      ...locationButtons,
      hintText,
    ]);
    this._locationOverlay.setDepth(2500);
    this._locationOverlay.setScrollFactor(0);

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
        camera.scrollX + camera.width / 2,
        camera.scrollY + camera.height / 2,
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

    const result = await chooseLocation(location);
    if (!result) {
      feedbackText.setText("Error: Game session not found.");
      this.time.delayedCall(2000, () => {
        this.scene.stop("HomeScene");
        this.scene.start("MenuScene");
      });
      return;
    }

    if (result.is_correct) {
      feedbackText.setText(`Investigation successful!`);

      this.time.delayedCall(1500, async () => {
        const homeScene = this.scene.get("HomeScene");

        let baseScore = 0;

        const difficultyMultipliers = {
          "Very Easy": 0.5,
          Easy: 1,
          Medium: 1.5,
          Hard: 2,
        };
        const difficultyMultiplier = difficultyMultipliers[this.difficulty] || 1;
        const timeBonus = Math.max(0, 600 - this.elapsedSeconds) * 10 * difficultyMultiplier;
        const guessPenalty = homeScene.guessCount * 500 * difficultyMultiplier;
        const nftBonus = homeScene.nftCount * 2000 * difficultyMultiplier;
        const finalScore = baseScore + timeBonus - guessPenalty + nftBonus;

        this.scene.stop("HomeScene");
        this.scene.start("EndScene", {
          score: Math.round(finalScore),
          time: this.formatTime(this.elapsedSeconds),
          guesses: homeScene.guessCount,
          nfts: homeScene.nftCount,
          account: this.account,
          story: result.story,
        });
      });
    } else {
      feedbackText.setText(`Nothing found at ${location}. Try again.`);
      const homeScene = this.scene.get("HomeScene");
      homeScene.guessCount++;
      this.time.delayedCall(2000, () => {
        feedbackText.destroy();
      });
    }
  }

  // Add an update method to continuously update UI positions
  update() {
    this.updateUIPositions();
  }

  updateTimer() {
    this.elapsedSeconds++;
    this.registry.set("elapsedTime", this.elapsedSeconds);
    this.timerText.setText(this.formatTime(this.elapsedSeconds));

    if (
      !this.locationButtonEnabled &&
      this.elapsedSeconds >= 5 &&
      this.locationButton
    ) {
      this.locationButtonEnabled = true;
      this.locationButton.setBackgroundColor("#d4af37");
      this.locationButton.setColor("#000000");
    }
  }

  formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  }
}
