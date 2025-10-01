import Phaser from "phaser";

export class VideoScene extends Phaser.Scene {
    constructor() {
        super({ key: 'VideoScene' });
        this.playerGender = 'Male';
        this.account = null;
        this.dialogues = [];
        this.currentTypingEvent = null;
        this.dataToPass = {};
    }

    init(data) {
        this.playerGender = data ? data.playerGender : 'Male';
        this.account = data ? data.account : null;
        this.dataToPass = data;
    }

    preload() {
        this.load.video('intro_video', 'assets/cut-scene/intro.mp4', 'loadeddata', false, true);
    }

    create() {
        this.currentTypingEvent = null;
        this.initTTS();
        this.showTypingText(
            "A Few Days Back",
            { fontSize: '48px', color: '#ffffff', fontFamily: 'Arial' },
            this.scale.width / 2,
            this.scale.height / 2,
            () => {
                this.playIntroVideo();
            }
        );
    }

    initTTS() {
        if (!('speechSynthesis' in window)) return;
        const populateVoiceList = () => {
            this.voices = window.speechSynthesis.getVoices() || [];
        };
        populateVoiceList();
        if (window.speechSynthesis.onvoiceschanged !== undefined) {
            window.speechSynthesis.onvoiceschanged = populateVoiceList;
        }
    }

    speakText(text, speaker) {
        if (!('speechSynthesis' in window)) return Promise.resolve();
        return new Promise((resolve) => {
            const utterance = new SpeechSynthesisUtterance(text);
            if (speaker === "Villager") {
                const villagerVoice = this.voices.find(v => /David|Google US English|en-US/i.test(v.name)) || this.voices.find(v => v.lang && v.lang.toLowerCase().startsWith('en')) || this.voices[0];
                if (villagerVoice) utterance.voice = villagerVoice;
                utterance.pitch = 0.9;
                utterance.rate = 1.0;
            } else if (speaker === "You") {
                const desiredName = (this.playerGender && this.playerGender.toLowerCase() === 'female') ? 'Zira' : 'Mark';
                let playerVoice = this.voices.find(v => v.name && v.name.includes(desiredName));
                if (!playerVoice) playerVoice = this.voices.find(v => v.lang && v.lang.toLowerCase().startsWith('en')) || this.voices[0];
                if (playerVoice) utterance.voice = playerVoice;
                utterance.pitch = desiredName === 'Zira' ? 1.1 : 1.0;
                utterance.rate = 1.0;
            }
            utterance.volume = 1.0;
            utterance.onend = () => resolve();
            utterance.onerror = () => resolve();
            const cancelHandler = () => {
            resolve();
            window.speechSynthesis.removeEventListener('cancel', cancelHandler);
        };
        window.speechSynthesis.addEventListener('cancel', cancelHandler);

        window.speechSynthesis.speak(utterance);
        });
    }

    playIntroVideo() {
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
        const video = this.add.video(this.scale.width / 2, this.scale.height / 2, 'intro_video');
        video.setVolume(1);
        video.setMute(false);
        video.setActive(true);
        video.setOrigin(0.5);
        const zoomOutFactor = 0.9;
        const scaleX = this.scale.width / (video.width || this.scale.width);
        const scaleY = this.scale.height / (video.height || this.scale.height);
        const scale = Math.min(scaleX, scaleY) * zoomOutFactor;
        video.setScale(scale).setScrollFactor(0);
        video.play(false);
        video.once('complete', () => {
            this.showDialogue();
        });
        const skipButton = this.add.text(this.scale.width - 100, this.scale.height - 50, 'Skip >>', {
            fontFamily: 'Arial',
            fontSize: '24px',
            color: '#ffffff',
            backgroundColor: 'rgba(0,0,0,0.5)',
            padding: { x: 10, y: 5 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        skipButton.on('pointerdown', () => {
            if (video.isPlaying) video.stop();
            this.showDialogue();
        });
    }

    startHomeScene() {
        window.speechSynthesis.cancel();
        this.scene.start('HomeScene', { 
            playerGender: this.playerGender,
            account: this.account,
            difficulty: this.dataToPass.difficulty
        });
    }

    showDialogue() {
        const dialogues = [
            { speaker: "You", text: "Ugh... Where am I? My head... what happened?" },
            { speaker: "Villager", text: "You were in an accident. I found you unconscious near a broken car." },
            { speaker: "You", text: "My friends! Did you see them? Were they with me?" },
            { speaker: "Villager", text: "I’m sorry… I didn’t see anyone else. But perhaps they are still in the village." },
            { speaker: "You", text: "Then I have to find them. Please, can you help me?" },
            { speaker: "Villager", text: "I will guide you. Search the village — maybe you’ll find answers there." }
        ];
        let index = 0;
        const textStyle = {
            fontSize: '24px',
            color: '#ffffff',
            fontFamily: 'Arial',
            wordWrap: { width: this.scale.width - 150 }
        };
        const dialogueText = this.add.text(this.scale.width / 2, this.scale.height / 2, '', textStyle).setOrigin(0.5);
        const speakerText = this.add.text(this.scale.width / 2, this.scale.height / 2 - 60, '', {
            fontSize: '28px',
            color: '#ffff00',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        const skipButton = this.add.text(this.scale.width - 100, this.scale.height - 50, 'Skip >>', {
            fontFamily: 'Arial',
            fontSize: '20px',
            color: '#ffffff',
            backgroundColor: 'rgba(0,0,0,0.5)',
            padding: { x: 8, y: 4 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(200);

        const cleanupAndGoHome = () => {
    window.speechSynthesis.cancel();

    if (this.currentTypingEvent) {
        this.currentTypingEvent.remove(false);
        this.currentTypingEvent = null;
    }

    if (skipButton && skipButton.destroy) skipButton.destroy();
    if (dialogueText && dialogueText.destroy) dialogueText.destroy();
    if (speakerText && speakerText.destroy) speakerText.destroy();

    this.startHomeScene();
};

        skipButton.on('pointerdown', () => {
            cleanupAndGoHome();
        });

        const showNextLine = async () => {
            window.speechSynthesis.cancel();
            if (index >= dialogues.length) {
                this.startHomeScene();
                return;
            }
            const { speaker, text } = dialogues[index];
            speakerText.setText(speaker);
            dialogueText.setText('');
            const speechPromise = this.speakText(text, speaker);
            const typingPromise = new Promise((resolve) => {
                this.typeText(dialogueText, text, resolve);
            });
            await Promise.all([speechPromise, typingPromise]);
            index++;
            this.time.delayedCall(0, showNextLine, [], this);
        };
        showNextLine();
    }

   typeText(target, fullText, onComplete) {
    let i = 0;
    target.setText('');

    if (this.currentTypingEvent) {
        this.currentTypingEvent.remove();
    }

    this.currentTypingEvent = this.time.addEvent({
        delay: 60,
        loop: true,
        callback: () => {
            if (i < fullText.length) {
                target.setText(target.text + fullText[i]);
                i++;
                return;
            }
            this.currentTypingEvent.remove(false);
            this.currentTypingEvent = null;
            if (onComplete) this.time.delayedCall(100, onComplete, [], this);
        },
        callbackScope: this
    });
}

    showTypingText(text, style, x, y, onComplete) {
        let i = 0;
        const displayText = this.add.text(x, y, '', style).setOrigin(0.5);
        const evt = this.time.addEvent({
            delay: 100,
            loop: true,
            callback: () => {
                if (i < text.length) {
                    displayText.setText(displayText.text + text[i]);
                    i++;
                    return;
                }
                evt.remove(false);
                if (onComplete) this.time.delayedCall(200, onComplete, [], this);
            },
            callbackScope: this
        });
    }

    shutdown() {
        window.speechSynthesis.cancel();
    }
}
