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
    this.add
      .rectangle(
        0,
        0,
        this.cameras.main.width,
        this.cameras.main.height,
        0x000000,
        0.85
      )
      .setOrigin(0);

    this.centerX = this.cameras.main.centerX;
    this.centerY = this.cameras.main.centerY;

    const panelWidth = 800;
    const panelHeight = 600;
    const panelX = this.centerX - panelWidth / 2;
    const panelY = this.centerY - panelHeight / 2;

    const panel = this.add.graphics({ x: panelX, y: panelY });
    panel.fillStyle(0x1a1a2e, 0.95); // Dark blue, almost black
    panel.fillRoundedRect(0, 0, panelWidth, panelHeight, 32);
    panel.lineStyle(4, 0xd4af37, 1); // Gold border
    panel.strokeRoundedRect(0, 0, panelWidth, panelHeight, 32);

    let gameScenario = this.determineGameScenario();
    let titleText = "";
    let scenarioMessage = "";
    let titleColor = "#ffffff";
    let showClaimButton = false;

    switch (gameScenario) {
      case "non_staking":
        titleText = this.endGameData.isCorrect
          ? "VICTORY!"
          : "THE MYSTERY REMAINS...";
        titleColor = this.endGameData.isCorrect ? "#2ecc71" : "#e74c3c";
        scenarioMessage = "You have completed a non-staking game.";
        showClaimButton = false;
        break;
      case "staking_failed":
        titleText = "CHALLENGE FAILED";
        titleColor = "#e74c3c";
        scenarioMessage =
          "You did not complete the challenge within the time limit.";
        showClaimButton = false;
        this.handleForfeitStake();
        break;
      case "staking_success":
        titleText = "CHALLENGE COMPLETE!";
        titleColor = "#2ecc71";
        scenarioMessage = "Congratulations! You have proven your skills.";
        showClaimButton = true;
        break;
    }

    const title = this.add
      .text(this.centerX, panelY + 80, titleText, {
        fontFamily: "Georgia, serif",
        fontSize: "52px",
        color: titleColor,
        fontStyle: "bold",
        align: "center",
        shadow: {
          color: "#000000",
          fill: true,
          offsetX: 2,
          offsetY: 2,
          blur: 8,
        },
      })
      .setOrigin(0.5)
      .setAlpha(0);

    const message = this.add
      .text(this.centerX, panelY + 140, scenarioMessage, {
        fontFamily: "Arial, sans-serif",
        fontSize: "24px",
        color: "#cccccc",
        fontStyle: "italic",
        align: "center",
        wordWrap: { width: panelWidth - 100 },
      })
      .setOrigin(0.5)
      .setAlpha(0);

    // Separator line
    const separator = this.add.graphics({ x: this.centerX, y: panelY + 190 });
    separator.fillStyle(0xd4af37, 0.5);
    separator.fillRect(-(panelWidth / 2) + 50, 0, panelWidth - 100, 2);
    separator.setAlpha(0);

    const statsY = panelY + 280;
    const statsData = [
      { label: "Final Score", value: this.endGameData.score },
      { label: "Total Time", value: this.endGameData.time },
      { label: "Total Guesses", value: this.endGameData.guesses },
      { label: "NFTs Collected", value: this.endGameData.nfts },
    ];

    if (this.endGameData.isStaking && this.endGameData.timeLimit) {
      const timeLimitMinutes = this.endGameData.timeLimit / 60;
      statsData.push({
        label: "Time Challenge",
        value: `${timeLimitMinutes} minutes`,
      });
    }

    const statsContainer = this.add.container(this.centerX, statsY).setAlpha(0);

    statsData.forEach((stat, index) => {
      const yPos = index * 50;
      const label = this.add
        .text(-150, yPos, `${stat.label}:`, {
          fontFamily: "Arial, sans-serif",
          fontSize: "28px",
          color: "#ffffff",
          align: "right",
        })
        .setOrigin(1, 0.5);

      const value = this.add
        .text(-130, yPos, stat.value, {
          fontFamily: "Arial, sans-serif",
          fontSize: "28px",
          color: "#d4af37",
          fontStyle: "bold",
          align: "left",
        })
        .setOrigin(0, 0.5);
      statsContainer.add([label, value]);
    });

    // Submission status text
    this.submissionStatusText = this.add
      .text(this.centerX, panelY + panelHeight - 120, "", {
        fontFamily: "Arial",
        fontSize: "18px",
        color: "#d4af37",
        align: "center",
      })
      .setOrigin(0.5)
      .setAlpha(0);

    const buttonY = panelY + panelHeight - 60;
    if (showClaimButton) {
      this.createClaimButton(this.centerX, buttonY);
    } else {
      this.createMainMenuButton(this.centerX, buttonY);
    }

    this.tweens.add({
      targets: [
        title,
        message,
        separator,
        statsContainer,
        this.submissionStatusText,
      ],
      alpha: 1,
      y: "-=20", // slide up effect
      duration: 800,
      ease: "Power2",
      delay: this.tweens.stagger(200, { start: 500 }),
    });

    // Score submission logic
    if (this.endGameData.score > 0) {
      this.submitScore(this.endGameData.score);
    }
  }

  determineGameScenario() {
    if (!this.endGameData.isStaking) {
      return "non_staking";
    }

    if (this.endGameData.isCorrect && this.endGameData.timeLimit) {
      const timeLimitSeconds = this.endGameData.timeLimit; // Value is already in seconds

      if (this.endGameData.elapsedTime <= timeLimitSeconds) {
        return "staking_success";
      }
      else {
        return "staking_failed";
      }
    }

    return "staking_failed";
  }

  async handleForfeitStake() {
    if (!this.endGameData.isStaking) {
      console.log("Not a staking game, no forfeit needed.");
      return;
    }

    const forfeitStatusText = this.add
      .text(
        this.centerX,
        this.centerY + 200,
        "Forfeiting stake on-chain...",
        {
          fontSize: "20px",
          color: "#ffdddd",
          backgroundColor: "rgba(0,0,0,0.7)",
          padding: { x: 10, y: 5 },
          align: "center",
        }
      )
      .setOrigin(0.5);

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
      forfeitStatusText.setText("Your stake has been forfeited.");
      forfeitStatusText.setColor("#ffaaaa");
    } catch (error) {
      console.error("Failed to forfeit stake:", error);
      forfeitStatusText.setText("Error forfeiting stake. See console.");
      forfeitStatusText.setColor("#ff5555");
    }
  }

  createMainMenuButton(x, y) {
    const button = this.add.container(x, y).setAlpha(0);

    const buttonBackground = this.add.graphics();
    buttonBackground.fillStyle(0x2ecc71, 1);
    buttonBackground.fillRoundedRect(-175, -30, 350, 60, 20);

    const buttonText = this.add
      .text(0, 0, "Return to Main Menu", {
        fontSize: "24px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    button.add([buttonBackground, buttonText]);
    button.setSize(350, 60).setInteractive({ useHandCursor: true });

    button.on("pointerdown", () => {
      this.registry.set("elapsedTime", 0);
      window.location.reload();
    });

    button.on("pointerover", () => {
      this.tweens.add({ targets: button, scale: 1.05, duration: 200 });
    });

    button.on("pointerout", () => {
      this.tweens.add({ targets: button, scale: 1, duration: 200 });
    });

    // Animate button in
    this.tweens.add({
      targets: button,
      alpha: 1,
      y: "-=20",
      duration: 800,
      ease: "Power2",
      delay: 1500,
    });
  }

  createClaimButton(x, y) {
    const button = this.add.container(x, y).setAlpha(0);

    const buttonBackground = this.add.graphics();
    buttonBackground.fillStyle(0xf1c40f, 1); // Gold color
    buttonBackground.fillRoundedRect(-175, -30, 350, 60, 20);

    const buttonText = this.add
      .text(0, 0, "CLAIM REWARD", {
        fontSize: "24px",
        color: "#1a1a2e", // Dark text for contrast
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    button.add([buttonBackground, buttonText]);
    button.setSize(350, 60).setInteractive({ useHandCursor: true });

    button.on("pointerdown", async () => {
      button.disableInteractive();
      buttonText.setText("CLAIMING...");
      await this.handleClaimReward(button); // Pass the container
    });

    button.on("pointerover", () => {
      if (button.input.enabled) {
        this.tweens.add({ targets: button, scale: 1.05, duration: 200 });
      }
    });

    button.on("pointerout", () => {
      if (button.input.enabled) {
        this.tweens.add({ targets: button, scale: 1, duration: 200 });
      }
    });

    // Animate button in
    this.tweens.add({
      targets: button,
      alpha: 1,
      y: "-=20",
      duration: 800,
      ease: "Power2",
      delay: 1500,
    });
  }

  async handleClaimReward(claimButtonContainer) {
    this.submissionStatusText.setText(
      "Please confirm transaction in your wallet..."
    );
    try {
      if (typeof window.ethereum === "undefined") {
        this.submissionStatusText.setText(
          "Wallet not found. Please install MetaMask."
        );
        claimButtonContainer.setInteractive();
        const text = claimButtonContainer.getAt(1);
        if (text) text.setText("CLAIM REWARD");
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

      this.submissionStatusText.setText("Success! Reward claimed.");

      const txHashShort = `${receipt.hash.substring(
        0,
        6
      )}...${receipt.hash.substring(receipt.hash.length - 4)}`;

      const txHashText = this.add
        .text(
          this.centerX,
          this.centerY + 320,
          `Tx: ${txHashShort} (Click to copy)`,
          {
            fontSize: "16px",
            fill: "#3498db",
            align: "center",
          }
        )
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

      txHashText.on("pointerdown", () => {
        navigator.clipboard.writeText(receipt.hash);
        this.submissionStatusText.setText("Transaction hash copied!");
      });

      claimButtonContainer.destroy();

      this.time.delayedCall(500, () => {
        const buttonY =
          this.centerY - 600 / 2 + 600 - 60; // panelY + panelHeight - 60
        this.createMainMenuButton(this.centerX, buttonY);
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
      claimButtonContainer.setInteractive();
      const text = claimButtonContainer.getAt(1);
      if (text) text.setText("RETRY CLAIM");
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
