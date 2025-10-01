import Phaser from "phaser";

export class LoadingScene extends Phaser.Scene {
  constructor() {
    super({ key: "LoadingScene" });
    this.account = null;
    this.dataToPass = {};
  }

  init(data) {
    this.nextScene = (data && data.nextScene) ? data.nextScene : 'VideoScene';
    this.playerGender = (data && data.playerGender) ? data.playerGender : 'Male';
    this.account = data ? data.account : null;
    this.difficulty = data ? data.difficulty : 'Easy';
    this.dataToPass = data;
    
    console.log("LoadingScene initialized with:", {
      nextScene: this.nextScene,
      playerGender: this.playerGender,
      account: this.account,
      difficulty: this.difficulty
    });
  }

  preload() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.load.image("loading_bg", "assets/images/world/Bg04.png");
    this.load.once('complete', () => { });

    this.load.on('filecomplete-image-loading_bg', (key, type, data) => {
      this.add.image(0, 0, 'loading_bg').setOrigin(0).setDisplaySize(width, height);
      this.add.rectangle(0, 0, width, height, 0x000000, 0.7).setOrigin(0);
    });

    const loadingText = this.add.text(width / 2, height / 2 - 100, 'Loading Assets...', {
      fontFamily: 'Georgia, serif',
      fontSize: '40px',
      color: '#ffffff',
      align: 'center'
    }).setOrigin(0.5);

    const progressBarWidth = 400;
    const progressBarHeight = 40;
    const progressBarX = (width - progressBarWidth) / 2;
    const progressBarY = height / 2;

    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x1a1a1a, 0.8);
    progressBox.fillRoundedRect(progressBarX, progressBarY, progressBarWidth, progressBarHeight, 15);
    progressBox.lineStyle(2, 0xd4af37, 1);
    progressBox.strokeRoundedRect(progressBarX, progressBarY, progressBarWidth, progressBarHeight, 15);

    const progressBar = this.add.graphics();

    const percentText = this.add.text(width / 2, progressBarY + progressBarHeight / 2, '0%', {
      fontFamily: 'Arial',
      fontSize: '20px',
      color: '#ffffff'
    }).setOrigin(0.5);

    const assetText = this.add.text(width / 2, height / 2 + 70, '', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#cccccc'
    }).setOrigin(0.5);

    this.load.image("grass", "assets/images/world/grass.png");
    this.load.image("house01", "assets/images/world/house01.png");
    this.load.image("house02", "assets/images/world/house02.png");
    this.load.image("house03", "assets/images/world/house03.png");
    this.load.image("house04", "assets/images/world/house04.png");
    this.load.image("house05", "assets/images/world/house05.png");
    this.load.image("tree01", "assets/images/world/tree02.png");
    this.load.image("tree02", "assets/images/world/tree03.png");
    this.load.image("flower01", "assets/images/world/flowers01.png");
    this.load.image("flower02", "assets/images/world/flowers02.png");
    this.load.image("flower03" , "assets/images/world/flowers03.png");
    this.load.image("path", "assets/images/world/path.png");
    this.load.image("path_rounded" , "assets/images/world/path_rounded.png");
    this.load.image("background", "assets/images/world/background02.png");
    this.load.image("windmill", "assets/images/world/windmill.png");
    this.load.image("farmhouse", "assets/images/world/farmhouse.png");
    this.load.image("lake01" , "assets/images/world/lake04.png");
    this.load.image("lake02" , "assets/images/world/lake05.png");
    this.load.image("church01" , "assets/images/world/church03.png");
    this.load.image("crop01" , "assets/images/world/crop01.png");
    this.load.image("forest01", "assets/images/world/forest03.png");
    this.load.image("forest02", "assets/images/world/forest02.png");
    this.load.image("player", "assets/images/characters/mc.png");
    this.load.image("crop02" , "assets/images/world/crop02.png");
    this.load.image("crop03" , "assets/images/world/crop03.png");
    this.load.image("tree05","assets/images/world/tree05.png");
    this.load.image("villager01", "assets/images/characters/villager01.png");
    this.load.image("villager02", "assets/images/characters/villager02.png");
    this.load.image("villager03", "assets/images/characters/villager03.png");
    this.load.image("villager04", "assets/images/characters/villager04.png");
    this.load.image("well01", "assets/images/world/well02.png");
    this.load.image("shop01", "assets/images/world/shop01.png");
    this.load.image("stove01", "assets/images/world/stove01.png");
    this.load.image("animals01", "assets/images/world/animals01.png");
    this.load.audio("background_music", "assets/music/background_audio.mp3");
    this.load.audio("villager_accept", "assets/music/villager_accept.ogg");
    this.load.audio("thunder", "assets/music/thunder.mp3");



    this.load.on("progress", (value) => {
      progressBar.clear();
      progressBar.fillStyle(0xd4af37, 1);
      const padding = 5;
      progressBar.fillRoundedRect(
        progressBarX + padding,
        progressBarY + padding,
        (progressBarWidth - padding * 2) * value,
        progressBarHeight - padding * 2,
        10
      );
      percentText.setText(parseInt(value * 100) + '%');
    });

    this.load.on('fileprogress', (file) => {
      assetText.setText('Loading: ' + file.key);
    });

    this.load.on("complete", () => {
      progressBar.destroy();
      progressBox.destroy();
      percentText.destroy();
      assetText.destroy();
      loadingText.setText('Loading Complete!');
      this.cameras.main.fadeOut(500, 0, 0, 0);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        this.scene.start(this.nextScene, this.dataToPass);
      });
    });

    this.load.image('player_up', 'assets/images/characters/mc.png');
    this.load.image('player_down', 'assets/images/characters/mc.png');
    this.load.image('player_left', 'assets/images/characters/leftmc.png');
    this.load.image('player_right', 'assets/images/characters/rightmc.png');
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

    this.time.delayedCall(500, () => {
      this.cameras.main.fadeOut(500, 0, 0, 0);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
         const payload = { 
           playerGender: this.playerGender,
           account: this.account,
           difficulty: this.difficulty
         };
        this.scene.start(this.nextScene, payload);
      });
    });
  }
}
