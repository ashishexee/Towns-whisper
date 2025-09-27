export class MultiplayerScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MultiplayerScene' });
        this.players = new Map();
    }

    init(data) {
        this.roomId = data.roomId;
        this.playerId = data.playerId;
    }

    create() {
        this.ws = new WebSocket(`ws://localhost:8000/ws/${this.roomId}/${this.playerId}`);
        
        // Create local player
        this.player = this.add.sprite(400, 300, 'player');
        this.players.set(this.playerId, this.player);

        // Handle WebSocket messages
        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            switch (data.type) {
                case 'player_moved':
                    if (data.playerId !== this.playerId) {
                        let otherPlayer = this.players.get(data.playerId);
                        if (!otherPlayer) {
                            otherPlayer = this.add.sprite(data.x, data.y, 'player');
                            this.players.set(data.playerId, otherPlayer);
                        }
                        otherPlayer.x = data.x;
                        otherPlayer.y = data.y;
                    }
                    break;
                case 'player_left':
                    const playerSprite = this.players.get(data.playerId);
                    if (playerSprite) {
                        playerSprite.destroy();
                        this.players.delete(data.playerId);
                    }
                    break;
            }
        };

        // Add movement controls
        this.cursors = this.input.keyboard.createCursorKeys();
    }

    update() {
        if (!this.player || !this.ws) return;

        const speed = 4;
        let moved = false;

        if (this.cursors.left.isDown) {
            this.player.x -= speed;
            moved = true;
        }
        if (this.cursors.right.isDown) {
            this.player.x += speed;
            moved = true;
        }
        if (this.cursors.up.isDown) {
            this.player.y -= speed;
            moved = true;
        }
        if (this.cursors.down.isDown) {
            this.player.y += speed;
            moved = true;
        }

        if (moved) {
            this.ws.send(JSON.stringify({
                type: 'move',
                x: this.player.x,
                y: this.player.y
            }));
        }
    }
}