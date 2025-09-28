
# Towns-whisper

**Towns-whisper** is an immersive 2D mystery-adventure game that fuses **AI-driven storytelling** with **blockchain technology**. Each playthrough offers a **unique, dynamically generated narrative**, challenging players to explore, trade, and compete to unravel secrets in order to rescue their lost friends.

---

## Table of Contents

* [Storyline](#storyline)
* [Key Features](#key-features)
* [Project Structure](#project-structure)
* [System Architecture](#system-architecture)
* [Getting Started](#getting-started)
* [Components](#components)
* [Notes on 0g Integration](#notes-on-0g-integration)
* [Notes on Hedera Integration](#notes-on-hedera-integration)
* [Smart Contracts](#smart-contracts)
* [Team Members](#team-members)
* [License](#license)

---

## Storyline

A relaxing trip with friends takes a terrifying turn after a sudden accident. You awaken alone, disoriented, on the outskirts of a strange, mist-shrouded village. Your friends are missing.

Guided by a **mysterious disembodied voice** (powered by Text-to-Speech), you begin exploring the village. The locals are wary, their memories fragmented, and their secrets buried. To uncover the truth and save your friends, you must piece together clues, earn villagers’ trust, and make difficult choices before time runs out.

---

## Key Features

* **Dynamic Narrative Engine**
  Powered by a Large Language Model (LLM), every playthrough generates a new mystery—unique villagers, clues, and hidden truths.

* **Voice-Driven Conversations**
  Interact with villagers through **AI-generated dialogues** and **Text-to-Speech**, choosing from dynamically suggested responses.

* **Scheduled Rewards**
  After a set duration (currently 5 seconds for demo), players make a final guess to locate their missing friends. Success depends on the clues gathered.

* **Competitive Multiplayer**
  Up to **five players** can join the same game world. While they can share clues and trade assets, the real challenge lies in **competing against each other** to be the first to uncover the truth and rescue their friends. Blockchain-backed items and trades ensure fairness and verifiability.

---

## Project Structure

```
Towns-whisper/
  bridge_server/           # Node.js server bridging game client and blockchain
  contracts_eth/           # Ethereum smart contracts and deployment scripts
  game/                    # Web-based game client (React + Vite + Phaser 3)
  hedera-agent/            # Hedera integration services
  server_centralized/      # Centralized backend server (FastAPI)
  server_decentralized_0g/ # Decentralized backend server (0g integration)
```

---

## System Architecture

### Technology Stack

**Frontend (game)**

* **Game Engine**: Phaser 3 (2D game framework)
* **Framework**: React + Vite (modern web frontend)
* **Styling**: Tailwind CSS
* **Web3**: Ethers-compatible libraries for wallet & contract interaction

**Backend (server)**

* **Framework**: FastAPI (Python)
* **AI**: Google Gemini for narrative generation & conversational AI
* **APIs**: Supports both centralized and decentralized modes

**Blockchain (contracts)**

* **Network**: EVM compatible chains
* **Smart Contracts**: Written in **Solidity**

---

## Getting Started

### Prerequisites

* Node.js (v16+)
* npm or yarn
* Foundry (for Ethereum smart contracts)
* Python 3.9+

### Installation

Clone the repository with submodules:

```bash
git clone --recurse-submodules <repo-url>
cd Towns-whisper
```

Install dependencies for each component:

```bash
cd bridge_server && npm install
cd ../game && npm install
cd ../contracts_eth && # install Foundry dependencies
```

### Run the Backend (Centralized Server)

```bash
cd ../server_centralized
pip install -r requirements.txt
uvicorn main:app --reload
```

### Run the Frontend

```bash
cd ../game
npm run dev
```

---

## Components

* **[`bridge_server`](bridge_server/)** → Connects the game client with blockchain services.
* **[`contracts_eth`](contracts_eth/)** → Ethereum smart contracts & deployment scripts.
* **[`game`](game/)** → React + Vite frontend with Phaser 3 for gameplay.
* **[`hedera-agent`](hedera-agent/)** → Hedera integration (HTS, HCS, scheduling).
* **[`server_centralized`](server_centralized/)** → Centralized FastAPI backend.
* **[`server_decentralized_0g`](server_decentralized_0g/)** → Decentralized backend powered by 0g.

---

## Notes on 0g Integration

* Contracts deployed on **0g chain**.
* Planned but currently unavailable (due to missing OG testnet):

  * Decentralized AI for story/dialogue generation
  * 0g storage for usernames, tokens, NFTs, and rewards

---

## Notes on Hedera Integration

* **Scheduling**: Implemented in frontend & backend for timed rewards.
* **Hedera Consensus Service (HCS)**: Used for validating AI responses & anti-cheat mechanisms.
* **Hedera Token Service (HTS)**: Used for in-game assets, staking, and competitive rewards.
* **Mirror Node**: Integrated for analytics and tracking.
* Currently, Hedera features are implemented in the **backend only** due to time constraints.

---

## Smart Contracts

### Hedera Contracts

* **User Registry** → `0x6886bcfbd5e16b05bb3ee3720e22bb1464d313f5`
* **Game Item** → `0x0b0fcae92ca2888e2deaf08db99d7b3fd150d462`
* **Staking** → `0xdd4043c5932628c272a7bedd167b99d6afb18ef9`
* **HTS Token** → `0x0000000000000000000000000000000000697ded` (`Token ID: 0.0.6913517`)

### Ethereum Contracts

* Located in [`contracts_eth`](contracts_eth/).
* Includes deployment scripts, tests, and asset logic.

---

## Team Members

* [Vineet Goel](https://x.com/rustRoguee)
* [Siddhant Jain](https://x.com/siddhant_jainn)
* [Lakshay Panchal](https://x.com/lakshay_p007)
* [Ashish](https://x.com/ashishexeee)
* [Dhruv Saxena](https://x.com/dhruvsaxen61077)

---

## License

This project is licensed under the **MIT License**.
