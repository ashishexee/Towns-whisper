// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title StakingManager
 * @dev Manages single-player and multiplayer staking using the chain's native token (e.g., ETH).
 * Holds staked tokens and distributes them based on game outcomes reported
 * by the trusted backend server (the contract owner).
 */
contract StakingManager is Ownable, ReentrancyGuard {

    // ============== STRUCTS ==============

    struct SinglePlayerStake {
        uint256 amount;         // Amount of native token staked
        uint256 targetDuration; // The time in seconds the player is aiming for
        uint256 startTime;      // Timestamp when the stake was initiated
        bool isActive;          // Flag to check if a stake is currently active
    }

    struct MultiplayerGame {
        address[] players;
        uint256 stakePerPlayer;
        uint256 prizePool;
        uint256 startTime;
        address winner;
        bool isActive;
    }

    // ============== STATE VARIABLES ==============

    mapping(address => SinglePlayerStake) public singlePlayerStakes;
    mapping(uint256 => MultiplayerGame) public multiplayerGames;
    mapping(address => uint256) public claimableRewards; // ADDED: To hold rewards pending claim
    uint256 public nextGameId;

    // ============== EVENTS ==============

    event StakeCreated(address indexed player, uint256 amount, uint256 targetDuration);
    event MultiplayerGameCreated(uint256 indexed gameId, address[] players, uint256 stakePerPlayer);
    event MultiplayerGameSettled(uint256 indexed gameId, address indexed winner, uint256 prizePool);
    event FundsWithdrawn(address indexed owner, uint256 amount);
    event FundsDeposited(address indexed from, uint256 amount);
    event RewardClaimed(address indexed player, uint256 amount);
    event StakeForfeited(address indexed player, uint256 amount);


    // ============== CONSTRUCTOR ==============

    constructor() Ownable(msg.sender) {
        nextGameId = 1;
    }

    // ============== SINGLE-PLAYER FUNCTIONS ==============

    /**
     * @dev Allows a player to stake the native token on a personal challenge.
     * @param _targetDuration The target completion time in seconds.
     */
    function stakeForSinglePlayer(uint256 _targetDuration) external payable nonReentrant {
        require(msg.value > 0, "Stake amount must be greater than 0");
        require(_targetDuration > 0, "Target duration must be greater than 0");
        require(!singlePlayerStakes[msg.sender].isActive, "Player already has an active stake");

        // Create and store the stake details
        singlePlayerStakes[msg.sender] = SinglePlayerStake({
            amount: msg.value,
            targetDuration: _targetDuration,
            startTime: block.timestamp,
            isActive: true
        });

        // Do NOT immediately credit to claimable rewards
        // The frontend will determine if they won, and only then can they claim
        
        emit StakeCreated(msg.sender, msg.value, _targetDuration);
    }

    /**
     * @dev Allows a player to claim their stake back after winning within time limit.
     * Frontend determines eligibility - only winners within time limit should call this.
     */
    function claimReward() external nonReentrant {
        SinglePlayerStake storage stake = singlePlayerStakes[msg.sender];
        require(stake.isActive, "No active stake to claim from.");

        uint256 amount = stake.amount;
        require(amount > 0, "No stake to claim");

        // Calculate the reward: 1.5x the original stake, matching the UI promise.
        uint256 rewardAmount = (amount * 3) / 2;
        require(address(this).balance >= rewardAmount, "Insufficient contract balance for reward payout.");

        // Deactivate stake first
        stake.isActive = false;

        // Transfer the staked amount + bonus back to the player
        (bool success, ) = payable(msg.sender).call{value: rewardAmount}("");
        require(success, "Reward transfer failed");

        emit RewardClaimed(msg.sender, rewardAmount);
    }

    /**
     * @dev Allows a player to deposit funds for in-game actions, like paying a penalty for a wrong guess.
     */
    function depositFundsForHint() external payable {
        require(msg.value > 0, "Deposit must be greater than 0");
        emit FundsDeposited(msg.sender, msg.value);
    }

    // ============== MULTIPLAYER FUNCTIONS ==============

    /**
     * @dev Creates a multiplayer game room. Called by the backend.
     * The backend is responsible for sending the total stake amount in native currency.
     * @param _players An array of player addresses in the game.
     * @param _stakeAmount The amount each player is staking.
     */
    function createMultiplayerGame(address[] calldata _players, uint256 _stakeAmount) external payable onlyOwner {
        require(_players.length > 1, "Multiplayer game requires at least 2 players");
        require(_stakeAmount > 0, "Stake amount must be greater than 0");
        
        uint256 totalPrizePool = _players.length * _stakeAmount;
        require(msg.value == totalPrizePool, "Incorrect total stake amount sent");

        uint256 currentId = nextGameId;

        // Check that no player has an active single-player stake
        for (uint i = 0; i < _players.length; i++) {
            address player = _players[i];
            require(!singlePlayerStakes[player].isActive, "A player has an active single-player stake");
        }

        // Create and store the game details
        multiplayerGames[currentId] = MultiplayerGame({
            players: _players,
            stakePerPlayer: _stakeAmount,
            prizePool: totalPrizePool,
            startTime: block.timestamp,
            winner: address(0),
            isActive: true
        });

        nextGameId++;
        emit MultiplayerGameCreated(currentId, _players, _stakeAmount);
    }

    // ============== SETTLEMENT FUNCTIONS (OWNER ONLY) ==============

    /**
     * @dev Reclaims the stake from a player who did not win the game. Called by the backend.
     * @param _player The address of the player whose stake is being reclaimed.
     */
    function reclaimForfeitedStake(address _player) external onlyOwner {
        SinglePlayerStake storage stake = singlePlayerStakes[_player];
        require(stake.isActive, "No active stake to reclaim.");

        uint256 amountToForfeit = stake.amount;

        // Deactivate stake and forfeit to contract
        stake.isActive = false;
        
        // The forfeited amount stays in the contract balance for owner withdrawal

        emit StakeForfeited(_player, amountToForfeit);
    }

    /**
     * @dev Settles a multiplayer game. Called only by the backend.
     * @param _gameId The ID of the game to settle.
     * @param _winner The address of the winning player.
     */
    function settleMultiplayerGame(uint256 _gameId, address _winner) external onlyOwner nonReentrant {
        MultiplayerGame storage game = multiplayerGames[_gameId];
        require(game.isActive, "Game is not active or does not exist");

        // Mark the winner and deactivate the game
        game.winner = _winner;
        game.isActive = false;

        // Transfer the entire prize pool to the winner
        (bool success, ) = payable(_winner).call{value: game.prizePool}("");
        require(success, "Prize pool transfer failed");

        emit MultiplayerGameSettled(_gameId, _winner, game.prizePool);
    }

    // ============== OWNER-ONLY ADMINISTRATIVE FUNCTIONS ==============

    /**
     * @dev Allows the owner to withdraw the contract's entire native token balance.
     * This is intended for recovering forfeited stakes from lost single-player games.
     */
    function withdrawFunds() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");

        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Withdrawal failed");

        emit FundsWithdrawn(owner(), balance);
    }

    /**
     * @dev Receive Ether. This can be used by the owner to fund the contract for rewards.
     */
    receive() external payable {}
}
