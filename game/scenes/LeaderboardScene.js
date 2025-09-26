import Phaser from "phaser";

export class LeaderboardScene extends Phaser.Scene {
    constructor() {
        super({ key: 'LeaderboardScene' });
        this.walletAddress = null;
    }

    init(data) {
        this.walletAddress = data.account;
    }

    preload() {
        this.load.video(
            "bg_video",
            "assets/cut-scene/bg04_animated.mp4",
            "loadeddata",
            false,
            true
        );
    }

    create() {
            const framePadding = 20;
    const frameWidth = this.cameras.main.width - framePadding * 2;
    const frameHeight = this.cameras.main.height - framePadding * 2;
    const cornerRadius = 30;

    const maskShape = this.make.graphics();
    maskShape.fillStyle(0xffff00);
    maskShape.fillRoundedRect(framePadding, framePadding, frameWidth, frameHeight, cornerRadius);
    this.cameras.main.setMask(maskShape.createGeometryMask());

    const frame = this.add.graphics();
    frame.lineStyle(10, 0xd4af37, 1);
    frame.strokeRoundedRect(framePadding, framePadding, frameWidth, frameHeight, cornerRadius);
    frame.setDepth(100);
        const { width, height } = this.scale;

        const bgVideo = this.add.video(width / 2, height / 2, "bg_video").play(true);
        bgVideo.setScale(Math.min(width / bgVideo.width, height / bgVideo.height) * 0.45).setScrollFactor(0).setOrigin(0.5);
        this.add.rectangle(0, 0, width, height, 0x000000, 0.7).setOrigin(0);

        const panelWidth = 600;
        const panelHeight = 500;
        const panelX = width / 2;
        const panelY = height / 2;

        this.add.graphics()
            .fillStyle(0x1a1a1a, 0.9)
            .fillRoundedRect(panelX - panelWidth / 2, panelY - panelHeight / 2, panelWidth, panelHeight, 20)
            .lineStyle(2, 0xd4af37, 1)
            .strokeRoundedRect(panelX - panelWidth / 2, panelY - panelHeight / 2, panelWidth, panelHeight, 20);

        this.add.text(width / 2, panelY - 180, 'LEADERBOARD', {
            fontFamily: 'Georgia, serif',
            fontSize: '48px',
            color: '#ffffff',
            align: 'center',
            shadow: { offsetX: 2, offsetY: 2, color: '#000', blur: 5, stroke: true, fill: true }
        }).setOrigin(0.5);

       this.fetchAndDisplayLeaderboard();

        this.add.text(width / 2, panelY + 200, 'Press SPACE to return to village', {
            fontFamily: 'Arial',
            fontSize: '16px',
            color: '#aaaaaa'
        }).setOrigin(0.5);

        const backButton = this.add.text(width / 2, panelY + 200, 'Back', {
            fontFamily: 'Arial',
            fontSize: '16px',
            color: '#d4af37',
            backgroundColor: '#000000',
            padding: { x: 10, y: 5 },
            borderRadius: 10
        }).setOrigin(0.5).setInteractive();

        backButton.on('pointerover', () => backButton.setColor('#ffffff'));
        backButton.on('pointerout', () => backButton.setColor('#d4af37'));
        backButton.on('pointerdown', () => {
            this.scene.start('MenuScene', { account: this.walletAddress });
        });
    }

    async fetchAndDisplayLeaderboard() {
        const { width, height } = this.scale;
        const panelY = height / 2;

        if (!this.walletAddress) {
            this.add.text(width / 2, panelY, 'Error: Wallet not connected.', { fontSize: '20px', color: '#ff0000' }).setOrigin(0.5);
            return;
        }

        const loadingText = this.add.text(width / 2, panelY, 'Loading...', { fontSize: '24px', color: '#cccccc' }).setOrigin(0.5);

        try {
            // HERE the integration of a function to fetch leaderboard data from an EVM contract is to be done.
            console.log("Simulating leaderboard fetch...");
            await new Promise(resolve => setTimeout(resolve, 1000));

            const leaderboardData = [
                { address: '0x1234...5678', score: 50000 },
                { address: '0xabcd...ef01', score: 45000 },
                { address: this.walletAddress, score: 10000 },
                { address: '0x9876...5432', score: 8000 },
            ].sort((a, b) => b.score - a.score);

            loadingText.destroy();

            // // Display leaderboard
            // const title = this.add.text(width / 2, 100, 'Leaderboard', {
            //     fontFamily: 'Georgia, serif',
            //     fontSize: '48px',
            //     color: '#d4af37'
            // }).setOrigin(0.5);

            leaderboardData.forEach((entry, index) => {
                const yPos = 180 + index * 50;
                const rank = `${index + 1}.`;
                const address = `${entry.address.substring(0, 6)}...${entry.address.substring(entry.address.length - 4)}`;
                const score = entry.score.toString();

                this.add.text(width / 2 - 250, yPos, rank, { fontSize: '22px', color: '#ffffff' }).setOrigin(0, 0.5);
                this.add.text(width / 2 - 200, yPos, address, { fontSize: '22px', color: '#ffffff' }).setOrigin(0, 0.5);
                this.add.text(width / 2 + 200, yPos, score, { fontSize: '22px', color: '#2ecc71' }).setOrigin(1, 0.5);
            });

        } catch (error) {
            loadingText.destroy();
            console.error("Failed to fetch leaderboard:", error);
            this.add.text(width / 2, panelY, 'Failed to load leaderboard.', { fontSize: '20px', color: '#ff0000' }).setOrigin(0.5);
        }
    }
}