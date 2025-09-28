import Phaser from "phaser";

export class ItemLockScene extends Phaser.Scene {
  constructor() {
    super({ key: "ItemLockScene" });
    this.villager = null;
    this.account = null;
    this.gameData = null;
    this.callingScene = null;
  }

  init(data) {
    console.log("ItemLockScene initialized with data:", data);
    this.villager = data.villager;
    this.account = data.account;
    this.gameData = data.gameData;
    this.callingScene = data.callingScene || "HomeScene";
    console.log(`Called from scene: ${this.callingScene}`);
  }

  create() {
    // Make sure we're on top of other scenes
    this.scene.bringToTop();

    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Add a semi-transparent background
    this.add
      .rectangle(0, 0, width, height, 0x000000, 0.7)
      .setOrigin(0)
      .setDepth(10);

    // Create panel
    const panelWidth = 400;
    const panelHeight = 250;
    const panelX = width / 2 - panelWidth / 2;
    const panelY = height / 2 - panelHeight / 2;

    const panel = this.add
      .rectangle(panelX, panelY, panelWidth, panelHeight, 0x1a1a2e, 0.95)
      .setOrigin(0)
      .setStrokeStyle(4, 0xd4af37)
      .setDepth(11);

    // Add lock icon
    const lockIcon = this.add
      .text(width / 2, panelY + 50, "🔒", {
        fontSize: "48px",
      })
      .setOrigin(0.5)
      .setDepth(12);

    // Add title text
    const titleText = this.add
      .text(width / 2, panelY + 110, "This villager requires an item", {
        fontSize: "22px",
        color: "#ffffff",
        fontFamily: "Arial",
        align: "center",
      })
      .setOrigin(0.5)
      .setDepth(12);

    // Add required item text
    const itemDisplayName = this.villager.requiredItem.replace(/_/g, " ");
    const itemText = this.add
      .text(width / 2, panelY + 140, `Required: ${itemDisplayName}`, {
        fontSize: "20px",
        color: "#d4af37",
        fontFamily: "Arial",
        align: "center",
      })
      .setOrigin(0.5)
      .setDepth(12);

    // Add status text
    this.statusText = this.add
      .text(width / 2, panelY + 170, "Do you want to use this item?", {
        fontSize: "18px",
        color: "#cccccc",
        fontFamily: "Arial",
        align: "center",
      })
      .setOrigin(0.5)
      .setDepth(12);

    // Add buttons
    const buttonWidth = 150;
    const buttonHeight = 40;
    const padding = 20;

    // Continue button (if player has the item)
    const continueButton = this.add
      .rectangle(
        width / 2 - buttonWidth - padding / 2,
        panelY + panelHeight - 50,
        buttonWidth,
        buttonHeight,
        0x4caf50
      )
      .setOrigin(0.5)
      .setDepth(12)
      .setInteractive({ useHandCursor: true });

    const continueText = this.add
      .text(continueButton.x, continueButton.y, "Use Item", {
        fontSize: "16px",
        color: "#ffffff",
      })
      .setOrigin(0.5)
      .setDepth(13);

    continueButton.on("pointerdown", () => {
      this.tradeAndBurnItem();
    });

    // Cancel button
    const cancelButton = this.add
      .rectangle(
        width / 2 + padding / 2 + buttonWidth / 2,
        panelY + panelHeight - 50,
        buttonWidth,
        buttonHeight,
        0x555555
      )
      .setOrigin(0.5)
      .setDepth(12)
      .setInteractive({ useHandCursor: true });

    const cancelText = this.add
      .text(cancelButton.x, cancelButton.y, "Cancel", {
        fontSize: "16px",
        color: "#ffffff",
      })
      .setOrigin(0.5)
      .setDepth(13);

    cancelButton.on("pointerdown", () => {
      this.closeScene();
    });

    // Debug info - Display calling scene name
    console.log("ItemLockScene is active, called from:", this.callingScene);
  }

  async tradeAndBurnItem() {
    console.log(`Attempting to use item ${this.villager.requiredItem}`);
    if (!this.account) {
      this.statusText.setText("Wallet is not connected.");
      return;
    }

    this.statusText.setText("Checking your inventory...");

    try {
      // Get the calling scene instance
      const callingScene = this.scene.get(this.callingScene);

      console.log(
        `Checking inventory in ${this.callingScene}:`,
        callingScene.playerInventory,
        "Looking for:",
        this.villager.requiredItem
      );

      if (
        callingScene &&
        callingScene.playerInventory &&
        callingScene.playerInventory.has(this.villager.requiredItem)
      ) {
        this.statusText.setText(
          `Using ${this.villager.requiredItem.replace(/_/g, " ")}...`
        );

        await new Promise((resolve) => setTimeout(resolve, 1500));

        // Remove the item from inventory
        callingScene.playerInventory.delete(this.villager.requiredItem);

        this.statusText.setText("Success! The villager will talk to you now.");

        // Wait a moment then close scene and unlock villager
        this.time.delayedCall(2000, () => {
          console.log(`Unlocking villager ${this.villager.name}`);
          callingScene.events.emit("villagerUnlocked", this.villager.name);
          this.scene.resume(this.callingScene);
          this.scene.stop();
        });
      } else {
        this.statusText.setText(
          `You don't have a ${this.villager.requiredItem.replace(/_/g, " ")}.`
        );

        // Auto-close after delay if no item
        this.time.delayedCall(2000, () => {
          this.closeScene();
        });
      }
    } catch (error) {
      console.error("Item use failed:", error);
      this.statusText.setText("Error occurred. See console for details.");
    }
  }

  closeScene() {
    console.log(`Closing ItemLockScene, resuming ${this.callingScene}`);
    this.scene.resume(this.callingScene);
    const targetScene = this.scene.get(this.callingScene);
    if (targetScene && targetScene.input && targetScene.input.keyboard) {
      targetScene.input.keyboard.enabled = true;
    }
    this.scene.stop();
  }
}
