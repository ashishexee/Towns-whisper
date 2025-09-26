import Phaser from "phaser";

export class ItemLockScene extends Phaser.Scene {
    constructor() {
        super({ key: "ItemLockScene" });
        this.villager = null;
        this.account = null;
        this.gameData = null;
        this.statusText = null;
    }

    init(data) {
        this.villager = data.villager;
        this.account = data.account;
        this.gameData = data.gameData;
    }

    create() {
        this.add.rectangle(0, 0, this.cameras.main.width, this.cameras.main.height, 0x000000, 0.7).setOrigin(0);
        const panelWidth = this.cameras.main.width * 0.7;
        const panelHeight = this.cameras.main.height * 0.6;
        const panelX = this.cameras.main.centerX;
        const panelY = this.cameras.main.centerY;

        this.add.graphics()
            .fillStyle(0x1a1a1a, 1)
            .fillRoundedRect(panelX - panelWidth / 2, panelY - panelHeight / 2, panelWidth, panelHeight, 16)
            .lineStyle(2, 0xd4af37, 1)
            .strokeRoundedRect(panelX - panelWidth / 2, panelY - panelHeight / 2, panelWidth, panelHeight, 16);

        const villagerInfo = this.gameData.villagers.find(v => v.id === this.villager.name);
        const requiredItemName = this.villager.requiredItem.replace(/_/g, ' ');

        this.add.text(panelX, panelY - panelHeight / 2+ 50, `Villager Requires ${requiredItemName}`, {
            fontFamily: 'Georgia, serif', fontSize: '32px', color: '#ffffff', align: 'center'
        }).setOrigin(0.5);

        this.add.text(panelX, panelY - panelHeight / 2 + 120, `This villager will only talk if you trade them a ${requiredItemName}. This will remove the item from your wallet.`, {
            fontFamily: 'Arial', fontSize: '20px', color: '#dddddd', align: 'center', wordWrap: { width: panelWidth - 80 }
        }).setOrigin(0.5);

        // Status text for feedback
        this.statusText = this.add.text(panelX, panelY + 50, '', {
            fontFamily: 'Arial', fontSize: '22px', color: '#d4af37', align: 'center'
        }).setOrigin(0.5);

        // Buttons
        this.createButton(panelX, panelY + panelHeight / 2 - 120, 'Trade Off (Check Wallet)', () => this.tradeAndBurnItem());
        this.createButton(panelX, panelY + panelHeight / 2 - 60, 'Close', () => this.closeScene());
    }

    async tradeAndBurnItem() {
        if (!this.account) {
            this.statusText.setText("Wallet is not connected.");
            return;
        }

        this.statusText.setText("Checking your wallet for the item...");

        try {
            // HERE the integration of a function to check for and burn/transfer an NFT on an EVM contract is to be done.
            const homeScene = this.scene.get('HomeScene');
            if (homeScene && homeScene.playerInventory && homeScene.playerInventory.has(this.villager.requiredItem)) {
                this.statusText.setText(`Found ${this.villager.requiredItem.replace(/_/g, ' ')}! Preparing trade...`);
                
                await new Promise(resolve => setTimeout(resolve, 1500));

                homeScene.playerInventory.delete(this.villager.requiredItem);

                this.statusText.setText("Trade successful! The villager will talk to you now.");
                this.time.delayedCall(2000, () => {
                    this.scene.stop();
                    homeScene.events.emit('villagerUnlocked', this.villager.id);
                    homeScene.scene.resume();
                });
            } else {
                this.statusText.setText(`You do not have a ${this.villager.requiredItem.replace(/_/g, ' ')}.`);
                return;
            }

        } catch (error) {
            console.error("Trade failed:", error);
            this.statusText.setText("Trade failed. See console for details.");
        }
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