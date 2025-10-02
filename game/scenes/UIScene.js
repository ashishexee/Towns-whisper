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
  }

  init(data) {
    if (data && data.inaccessibleLocations) {
      this.inaccessibleLocations = data.inaccessibleLocations;
      this.account = data.account;
      this.difficulty = data.difficulty || "Easy";
    }
    this.homeScene = this.scene.get("HomeScene");
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

    this.createLocationButton();
    this.createInventoryButton();
    this.createGiveUpButton();

    this.time.addEvent({
      delay: 1000,
      callback: this.updateTimer,
      callbackScope: this,
      loop: true,
    });

    this.updateLocationButtonState();
  }

  createLocationButton() {
    const button = this.add
      .text(150, this.cameras.main.height - 80, "Choose Location", {
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

      if (this.homeScene.isStaking && this.homeScene.guessMade) {
        const success = await this.homeScene.payGuessPenalty();
        if (success) {
          this.homeScene.guessMade = false;
          this.updateLocationButtonState();
          this.showLocationChoices();
        }
      } else if (this.homeScene.wrongLocationChosen) {
        const success = await this.homeScene.payGuessPenalty(); // Assuming the same penalty logic
        if (success) {
          this.homeScene.wrongLocationChosen = false;
          this.updateLocationButtonState();
          this.showLocationChoices();
        }
      } else {
        this.showLocationChoices();
      }
    });

    button.on("pointerover", () => {
      if (this.locationButtonEnabled && !this.homeScene.wrongLocationChosen) {
        button.setBackgroundColor("#f5d56b");
      }
    });
    button.on("pointerout", () => {
      if (this.locationButtonEnabled && !this.homeScene.wrongLocationChosen) {
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
      const homeScene = this.scene.get("HomeScene");
      if (homeScene && homeScene.scene.isActive()) {
        homeScene.scene.pause();
        this.scene.launch("InventoryScene", {
          inventory: Array.from(homeScene.playerInventory),
        });
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
      giveUpTimer = this.time.delayedCall(3000, () => {
        window.location.reload();
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

    // Lock location choices if a penalty is due in a staking game.
    if (this.homeScene.isStaking && this.homeScene.guessMade) {
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
        this.scene.stop("UIScene");
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
      this.homeScene.guessCount++;
      if (this.homeScene.isStaking) {
        this.homeScene.guessMade = true;
      } else {
        // Lock location button and change text for non-staking wrong guess
        this.homeScene.wrongLocationChosen = true;
      }
      this.updateLocationButtonState();
      this.time.delayedCall(2000, () => {
        feedbackText.destroy();
      });
    }
  }

  update() {
    if (this.elapsedSeconds >= 5 && !this.locationButtonEnabled) {
      this.locationButtonEnabled = true;
      this.locationButton.setBackgroundColor("#d4af37");
      this.locationButton.setColor("#000000");
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

    if (this.homeScene.isStaking && this.homeScene.guessMade) {
      this.locationButton.setText("Pay 0.01 ETH to Guess Again");
      this.locationButton.setBackgroundColor("#992222");
      this.locationButton.setColor("#ffffff");
    } else if (this.homeScene.wrongLocationChosen) {
      this.locationButton.setText("Deposit 0.01 ETH");
      this.locationButton.setBackgroundColor("#992222"); // Red color for penalty
      this.locationButton.setColor("#ffffff");
      this.locationButtonEnabled = true; // Keep button interactive for deposit
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
