import Phaser from "phaser";
import { ethers } from "ethers";
import {
  GAME_ITEMS_ABI,
  CONTRACT_ADDRESSES,
} from "../../contracts_eth/config.js";

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
    this.scene.bringToTop();

    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Semi-transparent background overlay
    this.add
      .rectangle(0, 0, width, height, 0x000000, 0.8)
      .setOrigin(0)
      .setDepth(10);

    // --- Premium Panel ---
    const panelWidth = 500;
    const panelHeight = 350;
    const panelX = width / 2;
    const panelY = height / 2;
    const cornerRadius = 20;

    const panel = this.add.graphics({ x: panelX, y: panelY });
    panel.fillStyle(0x0a0a1a, 0.95); // Dark, sophisticated color
    panel.lineStyle(4, 0xd4af37, 1); // Gold border
    panel.fillRoundedRect( -panelWidth / 2, -panelHeight / 2, panelWidth, panelHeight, cornerRadius);
    panel.strokeRoundedRect( -panelWidth / 2, -panelHeight / 2, panelWidth, panelHeight, cornerRadius);
    panel.setDepth(11);

    // --- Content ---
    const contentY = panelY - panelHeight / 2;

    this.add
      .text(panelX, contentY + 80, "🔒", {
        fontSize: "64px",
      })
      .setOrigin(0.5)
      .setDepth(12);

    this.add
      .text(panelX, contentY + 150, "Item Required", {
        fontSize: "28px",
        color: "#ffffff",
        fontFamily: "Georgia, serif",
        align: "center",
        fontStyle: "bold",
        shadow: { offsetX: 2, offsetY: 2, color: "#000", blur: 4, fill: true },
      })
      .setOrigin(0.5)
      .setDepth(12);

    const itemDisplayName = this.villager.requiredItem.replace(/_/g, " ");
    this.add
      .text(panelX, contentY + 195, `${itemDisplayName}`, {
        fontSize: "24px",
        color: "#ffd700", // Brighter gold
        fontFamily: "Georgia, serif",
        align: "center",
        fontStyle: "italic",
      })
      .setOrigin(0.5)
      .setDepth(12);

    this.statusText = this.add
      .text(panelX, contentY + 240, "Do you wish to use this item?", {
        fontSize: "16px",
        color: "#cccccc",
        fontFamily: "Arial, sans-serif",
        align: "center",
        wordWrap: { width: panelWidth - 40 },
      })
      .setOrigin(0.5)
      .setDepth(12);

    // --- Button Creation ---
    const buttonY = panelY + panelHeight / 2 - 60;
    const buttonWidth = 180;
    const buttonHeight = 50;
    const buttonSpacing = 30;

    const createButton = (x, y, text, color, hoverColor) => {
      const button = this.add.graphics();
      button.fillStyle(color, 1);
      button.fillRoundedRect( -buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, 15);

      const buttonText = this.add.text(0, 0, text, {
          fontSize: "20px",
          color: "#ffffff",
          fontFamily: "Georgia, serif",
        })
        .setOrigin(0.5);

      const container = this.add.container(x, y, [button, buttonText]);
      container.setSize(buttonWidth, buttonHeight);
      container.setInteractive({ useHandCursor: true });
      container.setDepth(12);

      container.on("pointerover", () => {
        button.clear().fillStyle(hoverColor, 1).fillRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, 15);
      });

      container.on("pointerout", () => {
        button.clear().fillStyle(color, 1).fillRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, 15);
      });

      return container;
    };

    // Use Item Button
    this.tradeButton = createButton(
      panelX - buttonWidth / 2 - buttonSpacing / 2,
      buttonY,
      "Trade",
      0x006400, // Dark Green
      0x008000 // Brighter Green on hover
    );
    this.tradeButton.on("pointerdown", () => this.tradeInItem());

    // Cancel Button
    const cancelButton = createButton(
      panelX + buttonWidth / 2 + buttonSpacing / 2,
      buttonY,
      "Cancel",
      0x8B0000, // Dark Red
      0xB22222 // Brighter Red on hover
    );
    cancelButton.on("pointerdown", () => this.closeScene());

    console.log("ItemLockScene is active, called from:", this.callingScene);
  }

  async tradeInItem() {
    console.log(`Attempting to use item ${this.villager.requiredItem}`);
    if (!this.account) {
      this.statusText.setText("Wallet is not connected.");
      return;
    }

    if (typeof window.ethereum === "undefined") {
      this.statusText.setText("Please install a wallet like MetaMask.");
      return;
    }

    this.tradeButton.disableInteractive().setAlpha(0.5);
    this.statusText.setText("Checking your inventory...");

    try {
      const callingScene = this.scene.get(this.callingScene);
      const itemName = this.villager.requiredItem;
      const itemNameFormatted = itemName.replace(/_/g, " ");

      if (
        !callingScene ||
        !callingScene.playerInventory ||
        !callingScene.playerInventory.has(itemName)
      ) {
        this.statusText.setText(`You don't have a ${itemNameFormatted}.`);
        this.tradeButton.setInteractive().setAlpha(1);
        return;
      }

      const tokenId = callingScene.playerInventory.get(itemName);
      if (tokenId === null || tokenId === undefined) {
        this.statusText.setText(
          `Error: Could not find a valid Token ID for ${itemNameFormatted}.`
        );
        console.error(
          `Token ID for ${itemName} is null or undefined. Cannot trade in.`
        );
        this.tradeButton.setInteractive().setAlpha(1);
        return;
      }

      this.statusText.setText(`Preparing to trade ${itemNameFormatted}...`);

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const gameItemsContract = new ethers.Contract(
        CONTRACT_ADDRESSES.gameItems,
        GAME_ITEMS_ABI,
        signer
      );

      this.statusText.setText("Please confirm in your wallet...");

      const tx = await gameItemsContract.tradeInItem(tokenId);

      this.statusText.setText("Transaction sent. Waiting for confirmation...");
      const receipt = await tx.wait();

      console.log("Trade-in successful! Transaction:", receipt.hash);
      this.statusText.setText(`${itemNameFormatted} has been traded!`);

      callingScene.playerInventory.delete(itemName);

      callingScene.events.emit("villagerUnlocked", this.villager.name);

      this.time.delayedCall(2000, () => {
        this.closeScene();
      });
    } catch (error) {
      console.error("Trade/burn item failed:", error);
      let errorMessage = "Transaction failed. See console.";
      if (error.code === "ACTION_REJECTED") {
        errorMessage = "Transaction rejected.";
      } else if (error.reason) {
        errorMessage = `Error: ${error.reason}`;
      }
      this.statusText.setText(errorMessage);
      this.tradeButton.setInteractive().setAlpha(1);
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
