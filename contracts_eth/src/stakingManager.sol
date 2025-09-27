// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title StakingManager
 * @dev Manages single-player and multiplayer staking for Echoes of the Village.
 * Holds staked VillageCoins and distributes them based on game outcomes reported
 * by the trusted backend server (the contract owner).
 */
contract StakingManager is Ownable, ReentrancyGuard {

    // The ERC20 token contract used for staking
    IERC20 public villageCoin;

    // ============== STRUCTS ==============

    struct SinglePlayerStake {
        uint256 amount;         // Amount of VCOIN staked
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

    constructor(address _villageCoinAddress) Ownable(msg.sender) {
        villageCoin = IERC20(_villageCoinAddress);
        nextGameId = 1;
    }

    // ============== SINGLE-PLAYER FUNCTIONS ==============

    /**
     * @dev Allows a player to stake VCOIN on a personal challenge.
     * The player must have approved this contract to spend their VCOIN first.
     * @param _amount The amount of VCOIN to stake.
     * @param _targetDuration The target completion time in seconds.
     */
    function stakeForSinglePlayer(uint256 _amount, uint256 _targetDuration) external nonReentrant {
        require(_amount > 0, "Stake amount must be greater than 0");
        require(!singlePlayerStakes[msg.sender].isActive, "Player already has an active stake");

        // Transfer VCOIN from the player to this contract
        bool success = villageCoin.transferFrom(msg.sender, address(this), _amount);
        require(success, "ERC20 transfer failed");

        // Create and store the stake details
        singlePlayerStakes[msg.sender] = SinglePlayerStake({
            amount: _amount,
            targetDuration: _targetDuration,
            startTime: block.timestamp,
            isActive: true
        });

        emit StakeCreated(msg.sender, _amount, _targetDuration);
    }

    // ============== MULTIPLAYER FUNCTIONS ==============

    /**
     * @dev Creates a multiplayer game room. Called by the backend.
     * Assumes all players have already approved this contract to spend their VCOIN.
     * @param _players An array of player addresses in the game.
     * @param _stakeAmount The amount each player is staking.
     */
    function createMultiplayerGame(address[] calldata _players, uint256 _stakeAmount) external onlyOwner {
        require(_players.length > 1, "Multiplayer game requires at least 2 players");
        require(_stakeAmount > 0, "Stake amount must be greater than 0");

        uint256 currentId = nextGameId;
        uint256 totalPrizePool = 0;

        // Collect stakes from all players
        for (uint i = 0; i < _players.length; i++) {
            address player = _players[i];
            require(!singlePlayerStakes[player].isActive, "A player has an active single-player stake");
            bool success = villageCoin.transferFrom(player, address(this), _stakeAmount);
            require(success, "ERC20 transfer failed for one of the players");
            totalPrizePool += _stakeAmount;
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
            // Player lost, their stake is forfeited (stays in the contract for now, could go to a treasury)
            rewardAmount = 0;
        }

        // Reset the player's stake
        delete singlePlayerStakes[_player];

        // Pay out the reward if they won
        if (rewardAmount > 0) {
            villageCoin.transfer(_player, rewardAmount);
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
        villageCoin.transfer(_winner, game.prizePool);

        emit MultiplayerGameSettled(_gameId, _winner, game.prizePool);
    }
}