import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { WalletScene } from "../scenes/WalletScene.js";
import { MenuScene } from "../scenes/MenuScene.js";
import { LoadingScene } from "../scenes/LoadingScene.js";
import { HomeScene } from "../scenes/HomeScene.js";
import { LeaderboardScene } from "../scenes/LeaderboardScene.js";
import { DialogueScene } from "../scenes/DialogueScene.js";
import { VideoScene } from "../scenes/VideoScene.js";
import { UIScene } from "../scenes/UIScene.js";
import { ItemLockScene } from "../scenes/ItemLockScene.js";
import { InventoryScene } from "../scenes/InventoryScene.js";
import { EndScene } from "../scenes/EndScene.js";

const PhaserGame = () => {
    const gameRef = useRef(null);

    useEffect(() => {
        if (gameRef.current) {
            const config = {
                type: Phaser.CANVAS,
                parent: 'game-container', // This ID must match the div below
                width: 1920,
                height: 1080,
                scale: {
                    mode: Phaser.Scale.ENVELOP,
                    autoCenter: Phaser.Scale.CENTER_BOTH,
                },
                physics: {
                    default: "arcade",
                    arcade: {
                        gravity: { y: 0 },
                        debug: false,
                    },
                },
                scene: [
                    WalletScene, MenuScene, LoadingScene, VideoScene, HomeScene, 
                    UIScene, DialogueScene, InventoryScene, ItemLockScene, 
                    LeaderboardScene, EndScene
                ],
            };

            const game = new Phaser.Game(config);

            return () => {
                game.destroy(true);
            };
        }
    }, []);

    return <div id="game-container" ref={gameRef} style={{ width: '100vw', height: '100vh' }} />;
};

export default PhaserGame;