import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { LoadingScene } from '../scenes/LoadingScene';
import { VideoScene } from '../scenes/VideoScene';
import { HomeScene } from '../scenes/HomeScene';
import { DialogueScene } from '../scenes/DialogueScene';
import { ItemLockScene } from '../scenes/ItemlockScene';
import { MultiplayerScene } from '../scenes/MultiplayerScene';
import { UIScene } from '../scenes/UIScene';

const PhaserGame = ({ gameConfig }) => {
  const gameRef = useRef(null);

  useEffect(() => {
    if (gameRef.current) return; // Prevent duplicate games

    const config = {
      type: Phaser.AUTO,
      width: window.innerWidth,
      height: window.innerHeight,
      parent: 'phaser-game',
      backgroundColor: '#2c3e50',
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
      // Make sure DialogueScene is loaded BEFORE other scenes that might use it
      scene: [DialogueScene,UIScene , LoadingScene, VideoScene, HomeScene, ItemLockScene, MultiplayerScene]
    };

    const game = new Phaser.Game(config);
    gameRef.current = game;

    // Handle window resize
    const handleResize = () => {
      game.scale.resize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

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
      window.removeEventListener('resize', handleResize);
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, [gameConfig]);

  return <div id="phaser-game" style={{ width: '100vw', height: '100vh', overflow: 'hidden' }} />;
};

export default PhaserGame;