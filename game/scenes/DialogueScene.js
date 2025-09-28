import Phaser from "phaser";
import { getConversation } from '../api'; 

export class DialogueScene extends Phaser.Scene {
    constructor() {
        super({ key: "DialogueScene" });
        this.conversationData = null;
        this.villagrSpriteKey = null;
        this.newGameData = null;
        this.rightPanelContainer = null; 
        this.playerId = null;
        this.callingScene = null; // Track which scene called this
        this.voices = [];
        this._currentSpeechResolve = null;
        this._currentSpeechTimer = null;
    }

    init(data) {
        console.log("DialogueScene init called with data:", data);
        this.conversationData = data.conversationData;
        this.villagerSpriteKey = data.villagerSpriteKey;
        this.newGameData = data.newGameData;
        this.playerId = data.playerId;
        this.callingScene = data.callingScene || 'HomeScene'; // Default to HomeScene
        
        // Add validation
        if (!this.conversationData) {
            console.error("No conversation data provided to DialogueScene!");
            this.closeDialogue();
            return;
        }
        
        if (!this.conversationData.npc_dialogue) {
            console.error("No npc_dialogue in conversation data:", this.conversationData);
            this.closeDialogue();
            return;
        }
    }
    
    create() {
        console.log("DialogueScene create - conversationData:", this.conversationData);
        
        if (!this.conversationData) {
            console.error("No conversation data available!");
            this.closeDialogue();
            return;
        }
        
        // Make sure this scene is on top
        this.scene.bringToTop();
        
        this.initTTS();
        
        // Create a full-screen black overlay with higher alpha for better visibility
        const overlay = this.add.rectangle(0, 0, this.cameras.main.width, this.cameras.main.height, 0x000000, 0.85)
            .setOrigin(0)
            .setDepth(0);
        
        const framePadding = 20;
        const frameWidth = this.cameras.main.width - framePadding * 2;
        const frameHeight = this.cameras.main.height - framePadding * 2;
        const cornerRadius = 30;

        // Create main dialogue panel
        const panelWidth = this.cameras.main.width * 0.9;
        const panelHeight = this.cameras.main.height * 0.8;
        const panelX = this.cameras.main.centerX;
        const panelY = this.cameras.main.centerY;

        const mainPanel = this.add.graphics()
            .fillStyle(0x1a1a1a, 1)
            .fillRoundedRect(panelX - panelWidth / 2, panelY - panelHeight / 2, panelWidth, panelHeight, 16)
            .lineStyle(2, 0xd4af37, 1)
            .strokeRoundedRect(panelX - panelWidth / 2, panelY - panelHeight / 2, panelWidth, panelHeight, 16)
            .setDepth(1);

        // Golden frame for visual appeal
        const frame = this.add.graphics()
            .lineStyle(10, 0xd4af37, 1)
            .strokeRoundedRect(framePadding, framePadding, frameWidth, frameHeight, cornerRadius)
            .setDepth(100);

        // UI Creation
        this.createLeftPanel(panelX, panelY, panelWidth, panelHeight);
        
        this.rightPanelContainer = this.add.container().setDepth(10);
        this.displayConversationInRightPanel(panelX, panelY, panelWidth, panelHeight);

        // Close button with better styling
        const closeButton = this.add.text(panelX, panelY + panelHeight / 2 - 30, 'Close Conversation', {
            fontFamily: 'Arial',
            fontSize: '18px',
            color: '#ff4444',
            fontStyle: 'italic',
            backgroundColor: 'rgba(0,0,0,0.7)',
            padding: { x: 10, y: 5 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(20);

        closeButton.on('pointerdown', () => {
            this.closeDialogue();
        });

        // Add ESC key to close dialogue
        this.escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
        this.escKey.on('down', () => {
            this.closeDialogue();
        });

        // Entry Animation
        this.cameras.main.fadeIn(300, 0, 0, 0);
        
        console.log("DialogueScene created successfully with depth layers");
    }

    closeDialogue() {
        this.stopSpeaking();
        this.scene.stop('DialogueScene');
        
        // Resume the appropriate scene
        if (this.callingScene === 'MultiplayerScene') {
            this.scene.resume('MultiplayerScene');
            const multiplayerScene = this.scene.get('MultiplayerScene');
            if (multiplayerScene && multiplayerScene.input && multiplayerScene.input.keyboard) {
                multiplayerScene.input.keyboard.enabled = true;
            }
        } else {
            this.scene.resume('HomeScene');
            const homeScene = this.scene.get('HomeScene');
            if (homeScene && homeScene.input && homeScene.input.keyboard) {
                homeScene.input.keyboard.enabled = true;
            }
        }
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

    stopSpeaking() {
        try { window.speechSynthesis.cancel(); } catch(e) {}
        if (this._currentSpeechTimer) {
            clearTimeout(this._currentSpeechTimer);
            this._currentSpeechTimer = null;
        }
        if (this._currentSpeechResolve) {
            try { this._currentSpeechResolve(); } catch(e) {}
            this._currentSpeechResolve = null;
        }
    }

    speakText(text, speakerName) {
        if (!('speechSynthesis' in window) || !text) return Promise.resolve();
        
        this.stopSpeaking();

        return new Promise((resolve) => {
            const utterance = new SpeechSynthesisUtterance(text);
            this._currentSpeechResolve = () => {
                resolve();
                this._currentSpeechResolve = null;
            };

            const estimatedMs = Math.max(2000, text.length * 80);
            this._currentSpeechTimer = setTimeout(() => {
                if (this._currentSpeechResolve) this._currentSpeechResolve();
            }, estimatedMs + 2000);

            const villagerVoice = this.voices.find(v => /David|Google US English|en-US/i.test(v.name)) || 
                                  this.voices.find(v => v.lang && v.lang.toLowerCase().startsWith('en')) || 
                                  this.voices[0];
            if (villagerVoice) utterance.voice = villagerVoice;
            
            utterance.pitch = 0.9;
            utterance.rate = 1.0;
            utterance.volume = 1.0;

            utterance.onend = () => {
                if (this._currentSpeechResolve) this._currentSpeechResolve();
                if (this._currentSpeechTimer) clearTimeout(this._currentSpeechTimer);
            };
            
            utterance.onerror = () => {
                if (this._currentSpeechResolve) this._currentSpeechResolve();
                if (this._currentSpeechTimer) clearTimeout(this._currentSpeechTimer);
            };
            
            try {
                window.speechSynthesis.speak(utterance);
            } catch (e) {
                if (this._currentSpeechResolve) this._currentSpeechResolve();
            }
        });
    }

    createLeftPanel(panelX, panelY, panelWidth, panelHeight) {
        const leftPanelX = panelX - panelWidth / 4;
        const leftPanelY = panelY;

        const villagerImage = this.add.image(leftPanelX, leftPanelY - panelHeight / 6, this.villagerSpriteKey)
            .setScale(0.67)
            .setOrigin(0.5)
            .setDepth(5);

        const villagerName = this.conversationData.villager_name || "Villager";
        
        const currentVillagerInfo = this.newGameData.villagers.find(v => v.id === this.conversationData.villager_id);
        const villagerTitle = currentVillagerInfo ? currentVillagerInfo.title : "Mysterious Figure";

        const nameText = this.add.text(leftPanelX, leftPanelY + panelHeight / 4 - 20, villagerName, {
            fontFamily: 'Georgia, serif',
            fontSize: '32px',
            color: '#ffffff',
            fontStyle: 'bold',
            align: 'center'
        }).setOrigin(0.5).setDepth(5);

        const titleBg = this.add.graphics()
            .fillStyle(0x000000, 0.5)
            .fillRoundedRect(leftPanelX - 150, leftPanelY + panelHeight / 4 + 35, 300, 30, 15)
            .setDepth(4);

        const titleText = this.add.text(leftPanelX, leftPanelY + panelHeight / 4 + 50, villagerTitle, {
            fontFamily: 'Arial',
            fontSize: '18px',
            color: '#d4af37',
            fontStyle: 'italic'
        }).setOrigin(0.5).setDepth(5);

        // Animate the text appearing
        this.tweens.add({
            targets: [nameText, titleBg, titleText, villagerImage],
            alpha: { from: 0, to: 1 },
            duration: 800,
            ease: 'Sine.easeInOut'
        });
    }

    displayConversationInRightPanel(panelX, panelY, panelWidth, panelHeight) {
        this.rightPanelContainer.removeAll(true);

        const rightPanelX = panelX + panelWidth / 4;
        const rightPanelY = panelY - panelHeight / 2 + 50;
        
        const textStyle = {
            fontFamily: 'Arial',
            fontSize: '20px',
            color: '#e0e0e0',
            fontStyle: 'italic',
            wordWrap: { width: panelWidth / 2 - 60 }
        };

        const dialogueText = this.add.text(rightPanelX, rightPanelY, `"${this.conversationData.npc_dialogue}"`, textStyle)
            .setOrigin(0.5, 0)
            .setDepth(10);
        this.rightPanelContainer.add(dialogueText);
        
        // Start speech
        this.speakText(this.conversationData.npc_dialogue, this.conversationData.villagerName);

        let startY = rightPanelY + dialogueText.getBounds().height + 50;

        // Create suggestion buttons
        this.conversationData.player_suggestions.forEach((suggestion, index) => {
            const button = this.createSuggestionButton(rightPanelX, startY + (index * 70), suggestion, () => {
                this.getNextDialogue(this.conversationData.villager_id, suggestion);
            });
            this.rightPanelContainer.add(button);

            // Staggered fade-in animation
            button.setAlpha(0);
            this.tweens.add({
                targets: button,
                alpha: 1,
                duration: 500,
                delay: 200 + (index * 150),
                ease: 'Sine.easeInOut'
            });
        });
    }

    createSuggestionButton(x, y, text, callback) {
        const buttonWidth = 400;
        const buttonHeight = 50;
        const container = this.add.container(x, y).setDepth(15);

        const background = this.add.graphics()
            .fillStyle(0x333333, 0.8)
            .fillRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, 15);

        const border = this.add.graphics()
            .lineStyle(2, 0x87ceeb, 1)
            .strokeRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, 15);

        const buttonText = this.add.text(0, 0, text, {
            fontFamily: 'Arial',
            fontSize: '18px',
            color: '#87ceeb',
            wordWrap: { width: buttonWidth - 40 },
            align: 'center'
        }).setOrigin(0.5);

        container.add([background, border, buttonText]);
        container.setSize(buttonWidth, buttonHeight);
        container.setInteractive({ useHandCursor: true })
            .on('pointerdown', callback)
            .on('pointerover', () => {
                background.clear().fillStyle(0x4D4D4D, 1).fillRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, 15);
                border.clear().lineStyle(2, 0xFFFFFF, 1).strokeRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, 15);
                this.tweens.add({ targets: container, scale: 1.05, duration: 200, ease: 'Power1' });
            })
            .on('pointerout', () => {
                background.clear().fillStyle(0x333333, 0.8).fillRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, 15);
                border.clear().lineStyle(2, 0x87ceeb, 1).strokeRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, 15);
                this.tweens.add({ targets: container, scale: 1, duration: 200, ease: 'Power1' });
            });

        return container;
    }

    async getNextDialogue(villagerId, playerMessage) {
        this.stopSpeaking();
        this.rightPanelContainer.removeAll(true);
        
        const loadingText = this.add.text(this.cameras.main.centerX + this.cameras.main.width / 4, this.cameras.main.centerY, "...", {
            fontSize: '24px',
            color: '#ffffff'
        }).setOrigin(0.5).setDepth(10);
        this.rightPanelContainer.add(loadingText);

        const nextData = await getConversation(villagerId, playerMessage, this.playerId);

        if (nextData && nextData.npc_dialogue) {
            this.conversationData = nextData;
            this.displayConversationInRightPanel(this.cameras.main.centerX, this.cameras.main.centerY, this.cameras.main.width * 0.9, this.cameras.main.height * 0.8);
        } else {
            loadingText.setText("I... have nothing more to say.");
            setTimeout(() => {
                this.closeDialogue();
            }, 2000);
        }
    }

    shutdown() {
        this.stopSpeaking();
    }
}

