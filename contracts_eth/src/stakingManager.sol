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
    uint256 public nextGameId;

    // ============== EVENTS ==============

    event StakeCreated(address indexed player, uint256 amount, uint256 targetDuration);
    event MultiplayerGameCreated(uint256 indexed gameId, address[] players, uint256 stakePerPlayer);
    event SinglePlayerGameSettled(address indexed player, uint256 rewardAmount, bool won);
    event MultiplayerGameSettled(uint256 indexed gameId, address indexed winner, uint256 prizePool);


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
        require(!singlePlayerStakes[msg.sender].isActive, "Player already has an active stake");

        // Native token is transferred automatically with the 'payable' call.

        // Create and store the stake details
        singlePlayerStakes[msg.sender] = SinglePlayerStake({
            amount: msg.value,
            targetDuration: _targetDuration,
            startTime: block.timestamp,
            isActive: true
        });

        emit StakeCreated(msg.sender, msg.value, _targetDuration);
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
     * @dev Settles a single-player game. Called only by the backend.
     * @param _player The address of the player whose game is being settled.
     * @param _actualDuration The player's actual completion time in seconds.
     */
    function settleSinglePlayerGame(address _player, uint256 _actualDuration) external onlyOwner nonReentrant {
        SinglePlayerStake storage stake = singlePlayerStakes[_player];
        require(stake.isActive, "No active stake for this player");

        uint256 rewardAmount = 0;
        bool playerWon = false;

        // Reward logic:
        if (_actualDuration <= stake.targetDuration) {
            // Player won, reward is 150% of their stake
            rewardAmount = (stake.amount * 15) / 10; // 1.5x
            playerWon = true;
        } else {
            // Player lost, their stake is forfeited (stays in the contract)
            rewardAmount = 0;
        }

        // Reset the player's stake
        delete singlePlayerStakes[_player];

        // Pay out the reward if they won
        if (rewardAmount > 0) {
            (bool success, ) = payable(_player).call{value: rewardAmount}("");
            require(success, "Reward transfer failed");
        }

        emit SinglePlayerGameSettled(_player, rewardAmount, playerWon);
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
}