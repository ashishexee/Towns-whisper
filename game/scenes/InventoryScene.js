import Phaser from "phaser";

export class InventoryScene extends Phaser.Scene {
  constructor() {
    super({ key: "InventoryScene" });
    this.account = null;
    this.playerInventory = new Map();
    
    // Item to image mapping - using available assets as placeholders
    this.itemImageMap = {
      'FISHING_ROD': 'FISHING_ROD',
      'AXE': 'AXE',
      'SHOVEL': 'SHOVEL',
      'LANTERN': 'LANTERN',
      'PICKAXE': 'PICKAXE',
      'HAMMER': 'HAMMER',
      'BUCKET': 'BUCKET',
      'SCYTHE': 'SCYTHE',
    };
  }

  init(data) {
    this.account = data ? data.account : null;
    if (data && data.playerInventory) {
      this.playerInventory = data.playerInventory;
    }
  }

  create() {
    // Create dark overlay background
    const overlay = this.add
      .rectangle(0, 0, this.cameras.main.width, this.cameras.main.height, 0x000000, 0.8)
      .setOrigin(0)
      .setDepth(0);

    // Create main inventory panel
    const panelWidth = 600;
    const panelHeight = 500;
    const panelX = this.cameras.main.centerX - panelWidth / 2;
    const panelY = this.cameras.main.centerY - panelHeight / 2;

    // Panel background with border
    const panel = this.add.graphics();
    panel.fillStyle(0x1a1a2e, 0.95);
    panel.fillRoundedRect(panelX, panelY, panelWidth, panelHeight, 20);
    panel.lineStyle(3, 0xd4af37, 1);
    panel.strokeRoundedRect(panelX, panelY, panelWidth, panelHeight, 20);
    panel.setDepth(1);

    // Title
    this.add
      .text(this.cameras.main.centerX, panelY + 40, "Your Inventory", {
        fontFamily: "Georgia, serif",
        fontSize: "32px",
        color: "#d4af37",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(2);

    // Get inventory items from the calling scene
    const homeScene = this.scene.get('HomeScene');
    if (homeScene && homeScene.playerInventory) {
      this.playerInventory = homeScene.playerInventory;
    }

    // Display inventory items
    this.displayInventoryItems(panelX, panelY, panelWidth, panelHeight);

    // Close instruction
    this.add
      .text(this.cameras.main.centerX, panelY + panelHeight - 30, "Press ESC or I to close", {
        fontFamily: "Arial",
        fontSize: "16px",
        color: "#cccccc",
      })
      .setOrigin(0.5)
      .setDepth(2);

    // Setup controls
    this.setupControls();
  }

  displayInventoryItems(panelX, panelY, panelWidth, panelHeight) {
    const itemsArray = Array.from(this.playerInventory.entries());
    
    if (itemsArray.length === 0) {
      // Show empty inventory message
      this.add
        .text(this.cameras.main.centerX, this.cameras.main.centerY, "Your inventory is empty", {
          fontFamily: "Arial",
          fontSize: "24px",
          color: "#888888",
        })
        .setOrigin(0.5)
        .setDepth(2);
      return;
    }

    // Calculate grid layout
    const itemsPerRow = 3;
    const itemWidth = 150;
    const itemHeight = 120;
    const itemSpacing = 20;
    const startX = panelX + (panelWidth - (itemsPerRow * itemWidth + (itemsPerRow - 1) * itemSpacing)) / 2;
    const startY = panelY + 80;

    itemsArray.forEach(([itemName, tokenId], index) => {
      const row = Math.floor(index / itemsPerRow);
      const col = index % itemsPerRow;
      
      const itemX = startX + col * (itemWidth + itemSpacing);
      const itemY = startY + row * (itemHeight + itemSpacing);

      this.createInventoryItemBox(itemX, itemY, itemWidth, itemHeight, itemName, tokenId);
    });
  }

  createInventoryItemBox(x, y, width, height, itemName, tokenId) {
    // Create item box background
    const itemBox = this.add.graphics();
    itemBox.fillStyle(0x2c2c54, 0.9);
    itemBox.fillRoundedRect(x, y, width, height, 10);
    itemBox.lineStyle(2, 0x666699, 1);
    itemBox.strokeRoundedRect(x, y, width, height, 10);
    itemBox.setDepth(1);

    // Get item image texture
    const imageTexture = this.itemImageMap[itemName] || 'crop02'; // fallback to crop02
    
    // Create item image
    const itemImage = this.add
      .image(x + width / 2, y + 35, imageTexture)
      .setOrigin(0.5)
      .setDisplaySize(50, 50)
      .setDepth(2);

    // Create item name text
    const displayName = itemName.replace(/_/g, ' ');
    const nameText = this.add
      .text(x + width / 2, y + height - 35, displayName, {
        fontFamily: "Arial",
        fontSize: "14px",
        color: "#ffffff",
        align: "center",
        wordWrap: { width: width - 10 },
      })
      .setOrigin(0.5)
      .setDepth(2);

    // Create interactive zone for hover effects
    const interactiveZone = this.add
      .rectangle(x + width / 2, y + height / 2, width, height, 0x000000, 0)
      .setDepth(3)
      .setInteractive();

    // Add click effect for future use
    interactiveZone.on('pointerdown', () => {
      console.log(`Clicked on ${itemName} (Token ID: ${tokenId})`);
      
      // Add click animation
      this.tweens.add({
        targets: [itemImage, nameText],
        scaleX: 0.95,
        scaleY: 0.95,
        duration: 100,
        yoyo: true,
        ease: 'Power2'
      });
    });
  }

  setupControls() {
    // ESC key to close
    const escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    const iKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.I);

    escKey.on('down', () => {
      this.closeInventory();
    });

    iKey.on('down', () => {
      this.closeInventory();
    });

    // Click outside to close
    this.input.on('pointerdown', (pointer, currentlyOver) => {
      if (currentlyOver.length === 0) {
        this.closeInventory();
      }
    });
  }

  closeInventory() {
    // Resume the home scene
    this.scene.resume('HomeScene');
    this.scene.stop();
  }
}
