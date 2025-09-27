import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { LoadingScene } from "../scenes/LoadingScene.js";
import { HomeScene } from "../scenes/HomeScene.js";
import { DialogueScene } from "../scenes/DialogueScene.js";
import { VideoScene } from "../scenes/VideoScene.js";
import { UIScene } from "../scenes/UIScene.js";
import { ItemLockScene } from "../scenes/ItemLockScene.js";
import { InventoryScene } from "../scenes/InventoryScene.js";
import { EndScene } from "../scenes/EndScene.js";

const PhaserGame = ({ gameConfig }) => {
    const gameRef = useRef(null);

    useEffect(() => {
        if (gameRef.current && gameConfig) {
            const config = {
                type: Phaser.CANVAS,
                parent: 'game-container',
                width: window.innerWidth,
                height: window.innerHeight,
                scale: {
                    mode: Phaser.Scale.FIT,
                    autoCenter: Phaser.Scale.CENTER_BOTH,
                    min: {
                        width: 800,
                        height: 600
                    },
                    max: {
                        width: 1920,
                        height: 1080
                    }
                },
                scene: [LoadingScene, HomeScene, DialogueScene, VideoScene, UIScene, ItemLockScene, InventoryScene, EndScene],
                physics: {
                    default: 'arcade',
                    arcade: {
                        gravity: { y: 0 },
                        debug: false,
                    },
                },
            };

            const game = new Phaser.Game(config);
            
            // Handle window resize
            const handleResize = () => {
                game.scale.resize(window.innerWidth, window.innerHeight);
            };
            
            window.addEventListener('resize', handleResize);
            
            // Start with LoadingScene and pass the gameConfig properly
            game.scene.start('LoadingScene', {
                playerGender: 'Male', // Default or from gameConfig
                account: gameConfig.account,
                difficulty: gameConfig.difficulty,
                nextScene: 'VideoScene'
            });

            return () => {
                window.removeEventListener('resize', handleResize);
                game.destroy(true);
            };
        }
    }, [gameConfig]);

    return (
        <div 
            id="game-container" 
            ref={gameRef} 
            style={{ 
                width: '100vw', 
                height: '100vh',
                overflow: 'hidden',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: '#000'
            }} 
        />
    );
};

export default PhaserGame;