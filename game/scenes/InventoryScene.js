import Phaser from "phaser";

export class InventoryScene extends Phaser.Scene {
    constructor() {
        super({ key: "InventoryScene" });
        this.inventory = [];
        this.inventoryTextObjects = []; // To keep track of text objects to redraw them
    }

    init(data) {
        const homeScene = this.scene.get('HomeScene');
        if (homeScene && homeScene.playerInventory) {
            this.inventory = Array.from(homeScene.playerInventory);
        } else {
            this.inventory = data.inventory || [];
        }
    }

    create() {
        this.scene.bringToTop();
        this.add.rectangle(0, 0, this.cameras.main.width, this.cameras.main.height, 0x000000, 0.7).setOrigin(0);

        const panelWidth = this.cameras.main.width * 0.6;
        const panelHeight = this.cameras.main.height * 0.7;
        this.panelX = this.cameras.main.centerX;
        this.panelY = this.cameras.main.centerY;

        this.add.graphics()
            .fillStyle(0x1a1a1a, 1)
            .fillRoundedRect(this.panelX - panelWidth / 2, this.panelY - panelHeight / 2, panelWidth, panelHeight, 16)
            .lineStyle(2, 0xd4af37, 1)
            .strokeRoundedRect(this.panelX - panelWidth / 2, this.panelY - panelHeight / 2, panelWidth, panelHeight, 16);

        this.add.text(this.panelX, this.panelY - panelHeight / 2 + 50, 'Your Inventory', {
            fontFamily: 'Georgia, serif', fontSize: '32px', color: '#ffffff', align: 'center'
        }).setOrigin(0.5);

        this.emptyText = this.add.text(this.panelX, this.panelY, 'Your inventory is empty.', {
            fontFamily: 'Arial', fontSize: '20px', color: '#dddddd', align: 'center'
        }).setOrigin(0.5);

        this.renderInventory();

        const homeScene = this.scene.get('HomeScene');
        if (homeScene) {
            homeScene.events.on('inventoryUpdated', this.refreshInventory, this);
        }

        this.events.on('shutdown', () => {
            if (homeScene) {
                homeScene.events.off('inventoryUpdated', this.refreshInventory, this);
            }
        });

        const closeButton = this.add.text(this.panelX + panelWidth / 2 - 30, this.panelY - panelHeight / 2 + 30, 'X', {
            fontFamily: 'Arial', fontSize: '24px', color: '#d4af37', backgroundColor: '#1a1a1a', padding: { x: 8, y: 4 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        closeButton.on('pointerdown', () => {
            if (homeScene) {
                homeScene.scene.resume();
            }
            this.scene.stop();
        });
    }

    refreshInventory() {
        const homeScene = this.scene.get('HomeScene');
        if (homeScene && homeScene.playerInventory) {
            this.inventory = Array.from(homeScene.playerInventory);
            this.renderInventory();
        }
    }

    renderInventory() {
        this.inventoryTextObjects.forEach(text => text.destroy());
        this.inventoryTextObjects = [];

        const panelHeight = this.cameras.main.height * 0.7;

        if (this.inventory.length === 0) {
            this.emptyText.setVisible(true);
        } else {
            this.emptyText.setVisible(false);
            this.inventory.forEach(([itemName, tokenId], index) => {
                const formattedItemName = itemName.replace(/_/g, ' ');
                const itemText = this.add.text(this.panelX, this.panelY - panelHeight / 2 + 120 + (index * 40), `• ${formattedItemName}`, {
                    fontFamily: 'Arial', fontSize: '24px', color: '#ffffff'
                }).setOrigin(0.5);
                this.inventoryTextObjects.push(itemText);
            });
        }
    }
}
