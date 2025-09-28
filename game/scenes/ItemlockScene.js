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
    this.tradeButton = this.add
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
      .text(this.tradeButton.x, this.tradeButton.y, "Use Item", {
        fontSize: "16px",
        color: "#ffffff",
      })
      .setOrigin(0.5)
      .setDepth(13);

    this.tradeButton.on("pointerdown", () => {
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
          `Token ID for ${itemName} is null or undefined. Cannot burn.`
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

      // Assuming a standard ERC721 burn function that takes the tokenId
      const tx = await gameItemsContract.burn(tokenId);

      this.statusText.setText("Transaction sent. Waiting for confirmation...");
      const receipt = await tx.wait();

      console.log("Burn successful! Transaction:", receipt.hash);
      this.statusText.setText(`${itemNameFormatted} has been traded!`);

      // Update inventory in the calling scene
      callingScene.playerInventory.delete(itemName);

      // Emit event to unlock the villager
      callingScene.events.emit("villagerUnlocked", this.villager.name);

      this.time.delayedCall(2000, () => {
        this.scene.stop();
        callingScene.scene.resume();
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
