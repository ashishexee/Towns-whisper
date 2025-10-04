import Phaser from "phaser";
import { ethers } from "ethers";
import {
  STAKING_MANAGER_ABI,
  CONTRACT_ADDRESSES,
} from "../../contracts_eth/config.js";

export class EndScene extends Phaser.Scene {
  constructor() {
    super({ key: "EndScene" });
    this.submissionStatusText = null;
  }

  init(data) {
    this.endGameData = data;
  }

  create() {
        this.cameras.main.fadeIn(800, 0, 0, 0);
        this.add.rectangle(0, 0, this.cameras.main.width, this.cameras.main.height, 0x000000, 0.85).setOrigin(0);

        this.centerX = this.cameras.main.centerX;
        this.centerY = this.cameras.main.centerY;

        let gameScenario = this.determineGameScenario();
        let titleText = "";
        let scenarioMessage = "";
        let showClaimButton = false;

        switch (gameScenario) {
          case "non_staking":
            titleText = this.endGameData.isCorrect
              ? "YOU ARE A TRUE DETECTIVE!"
              : "THE MYSTERY REMAINS...";
            scenarioMessage = "You have played a non-staking game";
            showClaimButton = false;
            break;
          case "staking_failed":
            titleText = "CHALLENGE NOT COMPLETED!";
            scenarioMessage =
              "You were not able to complete the challenge within the time limit";
            showClaimButton = false;
            this.handleForfeitStake();
            break;
          case "staking_success":
            titleText = "CHALLENGE COMPLETED SUCCESSFULLY!";
            scenarioMessage =
              "Congratulations! You completed the challenge within the time limit";
            showClaimButton = true;
            break;
        }

        // Display the title
        this.add.text(this.centerX, 180, titleText, { 
            fontSize: '48px', 
            color: '#ffffff', 
            fontStyle: 'bold', 
            align: 'center', 
            wordWrap: { width: 800 } 
        }).setOrigin(0.5);

        // Display scenario-specific message
        this.add.text(this.centerX, 240, scenarioMessage, { 
            fontSize: '24px', 
            color: '#d4af37', 
            fontStyle: 'italic', 
            align: 'center', 
            wordWrap: { width: 600 } 
        }).setOrigin(0.5);

        // Display game statistics
        const stats = [
          `Final Score: ${this.endGameData.score}`,
          `Total Time: ${this.endGameData.time}`,
          `Total Guesses: ${this.endGameData.guesses}`,
          `NFTs Collected: ${this.endGameData.nfts}`,
        ];

        if (this.endGameData.isStaking && this.endGameData.timeLimit) {
            const timeLimitMinutes = this.endGameData.timeLimit / 60; // Convert seconds to minutes for display
            stats.push(`Time Challenge: ${timeLimitMinutes} minutes`);
        }

        this.add.text(this.centerX, this.centerY + 20, stats, {
            fontFamily: 'Arial',
            fontSize: '32px',
            color: '#ffffff',
            align: 'center',
            lineSpacing: 20
        }).setOrigin(0.5);

        this.submissionStatusText = this.add.text(this.centerX, this.centerY + 270, '', {
            fontFamily: 'Arial',
            fontSize: '18px',
            color: '#d4af37',
            align: 'center',
        }).setOrigin(0.5);

        // Show appropriate button based on scenario
        if (showClaimButton) {
          this.createClaimButton();
        } else {
          this.createMainMenuButton();
        }

        // Submit the score if it's greater than zero
        if (this.endGameData.score > 0) {
          this.submitScore(this.endGameData.score);
        }

        // Display return message for non-staking or failed staking scenarios
        if (!showClaimButton) {
          this.add.text(this.centerX, this.centerY + 220, 'Press SPACE to return to the main menu', {
            fontSize: '18px',
            color: '#ffffff',
            align: 'center',
        }).setOrigin(0.5);
    }
  }

  determineGameScenario() {
    // Scenario 1: Non-staking game
    if (!this.endGameData.isStaking) {
      return "non_staking";
    }

    // For staking games, check if user completed correctly and within time limit
    if (this.endGameData.isCorrect && this.endGameData.timeLimit) {
      const timeLimitSeconds = this.endGameData.timeLimit; // Value is already in seconds

      // Scenario 3: Staking game completed within time limit
      if (this.endGameData.elapsedTime <= timeLimitSeconds) {
        return "staking_success";
      }
      // Scenario 2: Staking game but exceeded time limit
      else {
        return "staking_failed";
      }
    }

    // Default to failed if staking game but didn't complete correctly
    return "staking_failed";
  }

  async handleForfeitStake() {
    if (!this.endGameData.isStaking) {
      console.log("Not a staking game, no forfeit needed.");
      return;
    }

    const forfeitStatusText = this.add.text(this.centerX, this.cameras.main.height - 100, 'Forfeiting stake on-chain...', {
        fontSize: '20px',
        color: '#ffdddd',
        backgroundColor: 'rgba(0,0,0,0.7)',
        padding: { x: 10, y: 5 },
        align: 'center'
    }).setOrigin(0.5);

    try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const stakingContract = new ethers.Contract(
            CONTRACT_ADDRESSES.stakingManager,
            STAKING_MANAGER_ABI,
            signer
        );

        console.log("Calling forfeitStake() on the contract...");
        const tx = await stakingContract.forfeitStake();
        await tx.wait();
        console.log("Stake forfeited successfully.");
        forfeitStatusText.setText('Your stake has been forfeited.');
        forfeitStatusText.setColor('#ffaaaa');
    } catch (error) {
        console.error("Failed to forfeit stake:", error);
        forfeitStatusText.setText('Error forfeiting stake. See console.');
        forfeitStatusText.setColor('#ff5555');
    }
  }

  createMainMenuButton() {
    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;
    const mainMenuButton = this.add
      .text(centerX, centerY + 200, "Return to Main Menu", {
        fontSize: "32px",
        fill: "#2ecc71",
        padding: { x: 20, y: 10 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => {
        this.registry.set("elapsedTime", 0);
        window.location.reload();
      })
      .on("pointerover", () => mainMenuButton.setStyle({ fill: "#4aff9f" }))
      .on("pointerout", () => mainMenuButton.setStyle({ fill: "#2ecc71" }));
  }

  createClaimButton() {
        const claimButton = this.add.text(this.centerX, this.centerY + 200, 'CLAIM REWARD', {
            fontSize: '32px',
            fill: '#f1c40f',
            padding: { x: 20, y: 10 },
            backgroundColor: '#2c3e50'
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

    claimButton.on("pointerdown", async () => {
      claimButton.disableInteractive().setText("CLAIMING...");
      await this.handleClaimReward(claimButton);
    });

    claimButton.on("pointerover", () => {
      if (claimButton.active) claimButton.setStyle({ fill: "#f39c12" });
    });
    claimButton.on("pointerout", () => {
      if (claimButton.active) claimButton.setStyle({ fill: "#f1c40f" });
    });
  }

  async handleClaimReward(claimButton) {
        this.submissionStatusText.setText('Please confirm transaction in your wallet...');
        try {
      if (typeof window.ethereum === "undefined") {
        this.submissionStatusText.setText(
          "Wallet not found. Please install MetaMask."
        );
        claimButton.setInteractive().setText("CLAIM REWARD");
        return;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const stakingContract = new ethers.Contract(
        CONTRACT_ADDRESSES.stakingManager,
        STAKING_MANAGER_ABI,
        signer
      );

      const tx = await stakingContract.claimReward();
      this.submissionStatusText.setText("Processing transaction...");
      const receipt = await tx.wait();

      this.submissionStatusText.setText('Success! Reward claimed.');
      
      const txHashShort = `${receipt.hash.substring(0, 6)}...${receipt.hash.substring(receipt.hash.length - 4)}`;

      const txHashText = this.add.text(this.centerX, this.centerY + 320, `Tx: ${txHashShort} (Click to copy)`, {
                fontSize: '16px',
                fill: '#3498db',
                align: 'center'
            })
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });

      txHashText.on("pointerdown", () => {
        navigator.clipboard.writeText(receipt.hash);
        this.submissionStatusText.setText("Transaction hash copied!");
      });

      claimButton.destroy();

      this.time.delayedCall(500, () => {
        this.createMainMenuButton();
      });
    } catch (error) {
      console.error("Failed to claim reward:", error);
      let errorMessage = "Claim failed. See console for details.";
      if (error.reason) {
        errorMessage = `Claim failed: ${error.reason}`;
      } else if (error.code === "ACTION_REJECTED") {
        errorMessage = "Transaction rejected.";
      }
      this.submissionStatusText.setText(errorMessage);
      claimButton.setInteractive().setText("RETRY CLAIM");
    }
  }

  async submitScore(finalScore) {
    const { account } = this.endGameData;

    if (!account) {
      this.submissionStatusText.setText(
        "Wallet not connected. Cannot submit score."
      );
      console.error("Wallet data not available in EndScene.");
      return;
    }

    this.submissionStatusText.setText("Submitting score to the blockchain...");

    try {
      console.log(`Simulating score submission for ${account}: ${finalScore}`);
      await new Promise((resolve) => setTimeout(resolve, 1500));

      this.submissionStatusText.setText("Score submitted successfully!");
      console.log("Score submission successful!");
    } catch (error) {
      this.submissionStatusText.setText("Failed to submit score. See console.");
      console.error("Score submission failed:", error);
    }
  }
}
