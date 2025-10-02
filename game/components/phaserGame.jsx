import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { LoadingScene } from '../scenes/LoadingScene';
import { VideoScene } from '../scenes/VideoScene';
import { HomeScene } from '../scenes/HomeScene';
import { DialogueScene } from '../scenes/DialogueScene';
import { ItemLockScene } from '../scenes/ItemlockScene';
import { MultiplayerScene } from '../scenes/MultiplayerScene';
import { UIScene } from '../scenes/UIScene';
import { InventoryScene } from '../scenes/InventoryScene';
import {EndScene} from '../scenes/EndScene'
 
const PhaserGame = ({ gameConfig }) => {
  const gameRef = useRef(null);

  useEffect(() => {
    if (gameRef.current) return;

    const config = {
      type: Phaser.AUTO,
      width: '100%',
      height: '100%',
      parent: 'phaser-game',
      backgroundColor: '#000000',
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH
      },
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { y: 0 },
          debug: false
        }
      },
      scene: [DialogueScene,UIScene  ,EndScene, InventoryScene , LoadingScene, VideoScene, HomeScene, ItemLockScene, MultiplayerScene]
    };

    const game = new Phaser.Game(config);
    gameRef.current = game;

    // Handle window resize
    // The FIT scale mode handles resizing automatically
    // const handleResize = () => {
    //   game.scale.resize(window.innerWidth, window.innerHeight);
    // };

    // window.addEventListener('resize', handleResize);

    // Start the appropriate scene based on game mode
    if (gameConfig?.isMultiplayer) {
      console.log('Starting multiplayer game with config:', gameConfig);
      // Start directly with MultiplayerScene for multiplayer
      game.scene.start('MultiplayerScene', {
        roomId: gameConfig.roomId,
        playerId: gameConfig.playerId,
        difficulty: gameConfig.difficulty || 'medium',
        gameData: gameConfig.gameData
      });
    } else {
      // Start with LoadingScene for single player
      game.scene.start('LoadingScene', gameConfig);
    }

    return () => {
      // window.removeEventListener('resize', handleResize);
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, [gameConfig]);

  return <div id="phaser-game" style={{ width: '100vw', height: '100vh', overflow: 'hidden' }} />;
};

export default PhaserGame;
