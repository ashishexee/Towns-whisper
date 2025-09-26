import Phaser from "phaser";

export class InventoryScene extends Phaser.Scene {
    constructor() {
        super({ key: "InventoryScene" });
        this.inventory = [];
    }

    init(data) {
        // Always get fresh inventory data from HomeScene
        const homeScene = this.scene.get('HomeScene');
        if (homeScene && homeScene.playerInventory) {
            this.inventory = Array.from(homeScene.playerInventory);
        } else {
            this.inventory = data.inventory || [];
        }
    }

    create() {
        this.add.rectangle(0, 0, this.cameras.main.width, this.cameras.main.height, 0x000000, 0.7).setOrigin(0);

        const panelWidth = this.cameras.main.width * 0.6;
        const panelHeight = this.cameras.main.height * 0.7;
        const panelX = this.cameras.main.centerX;
        const panelY = this.cameras.main.centerY;

        this.add.graphics()
            .fillStyle(0x1a1a1a, 1)
            .fillRoundedRect(panelX - panelWidth / 2, panelY - panelHeight / 2, panelWidth, panelHeight, 16)
            .lineStyle(2, 0xd4af37, 1)
            .strokeRoundedRect(panelX - panelWidth / 2, panelY - panelHeight / 2, panelWidth, panelHeight, 16);

        this.add.text(panelX, panelY - panelHeight / 2 + 50, 'Your Inventory', {
            fontFamily: 'Georgia, serif', fontSize: '32px', color: '#ffffff', align: 'center'
        }).setOrigin(0.5);

        if (this.inventory.length === 0) {
            this.add.text(panelX, panelY, 'Your inventory is empty.', {
                fontFamily: 'Arial', fontSize: '20px', color: '#dddddd', align: 'center'
            }).setOrigin(0.5);
        } else {
            this.inventory.forEach((item, index) => {
                const itemName = item.replace(/_/g, ' ');
                this.add.text(panelX, panelY - panelHeight / 2 + 120 + (index * 40), `• ${itemName}`, {
                    fontFamily: 'Arial', fontSize: '24px', color: '#ffffff'
                }).setOrigin(0.5);
            });
        }

        this.createButton(panelX, panelY + panelHeight / 2 - 60, 'Close', () => this.closeScene());
    }

    closeScene() {
        this.scene.resume('HomeScene');
        this.scene.stop();
    }

    createButton(x, y, text, callback) {
        const button = this.add.text(x, y, text, {
            fontFamily: 'Arial', fontSize: '24px', color: '#000000',
            backgroundColor: '#d4af37', padding: { x: 20, y: 10 },
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        button.on('pointerover', () => button.setBackgroundColor('#f5d56b'));
        button.on('pointerout', () => button.setBackgroundColor('#d4af37'));
        button.on('pointerdown', callback);
        return button;
    }
}