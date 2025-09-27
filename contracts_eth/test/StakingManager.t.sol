// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "src/StakingManager.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
// FIX: Import Ownable to access its custom errors
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockVillageCoin
 * @dev A mock ERC20 contract for testing purposes.
 */
contract MockVillageCoin is ERC20 {
    constructor() ERC20("Mock Village Coin", "VCOIN") {}

    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }
}

/**
 * @title StakingManagerTest
 * @dev A comprehensive test suite for the StakingManager contract.
 */
contract StakingManagerTest is Test {
    // --- Contracts ---
    StakingManager public stakingManager;
    MockVillageCoin public villageCoin;

    // --- Users ---
    address public owner;
    address public player1;
    address public player2;
    address public player3;

    // --- Constants ---
    uint256 public constant STARTING_BALANCE = 1000 * 1e18;
    uint256 public constant STAKE_AMOUNT = 100 * 1e18;
    uint256 public constant MULTIPLAYER_STAKE = 200 * 1e18;

    function setUp() public {
        // 1. Setup Users
        owner = address(this);
        player1 = vm.addr(1);
        player2 = vm.addr(2);
        player3 = vm.addr(3);

        // 2. Deploy Contracts
        villageCoin = new MockVillageCoin();
        stakingManager = new StakingManager(address(villageCoin));

        // 3. Setup Initial State
        villageCoin.mint(player1, STARTING_BALANCE);
        villageCoin.mint(player2, STARTING_BALANCE);
        villageCoin.mint(player3, STARTING_BALANCE);
        villageCoin.mint(address(stakingManager), 5000 * 1e18); // Pre-fund contract for rewards

        // 4. Pre-approve the StakingManager for all players
        vm.startPrank(player1);
        villageCoin.approve(address(stakingManager), type(uint256).max);
        vm.stopPrank();

        vm.startPrank(player2);
        villageCoin.approve(address(stakingManager), type(uint256).max);
        vm.stopPrank();

        vm.startPrank(player3);
        villageCoin.approve(address(stakingManager), type(uint256).max);
        vm.stopPrank();
    }

    // ===================================
    // Single-Player Tests
    // ===================================
    function test_SP_SuccessfulStake() public {
        vm.prank(player1);
        stakingManager.stakeForSinglePlayer(STAKE_AMOUNT, 300);

        (uint256 amount, uint256 targetDuration, , bool isActive) = stakingManager.singlePlayerStakes(player1);

        assertTrue(isActive);
        assertEq(amount, STAKE_AMOUNT);
        assertEq(targetDuration, 300);
        assertEq(villageCoin.balanceOf(address(stakingManager)), STAKE_AMOUNT + 5000 * 1e18);
    }

    function test_SP_Settle_Win() public {
        uint256 targetDuration = 240;
        uint256 actualDuration = 200; // Win condition
        uint256 expectedReward = (STAKE_AMOUNT * 15) / 10; // 1.5x

        vm.prank(player1);
        stakingManager.stakeForSinglePlayer(STAKE_AMOUNT, targetDuration);

        vm.prank(owner);
        stakingManager.settleSinglePlayerGame(player1, actualDuration);

        assertEq(villageCoin.balanceOf(player1), STARTING_BALANCE - STAKE_AMOUNT + expectedReward);
        
        (,,, bool isActive) = stakingManager.singlePlayerStakes(player1);
        assertFalse(isActive);
    }

    function test_SP_Settle_Loss() public {
        uint256 targetDuration = 240;
        uint256 actualDuration = 300; // Lose condition

        vm.prank(player1);
        stakingManager.stakeForSinglePlayer(STAKE_AMOUNT, targetDuration);

        vm.prank(owner);
        stakingManager.settleSinglePlayerGame(player1, actualDuration);

        assertEq(villageCoin.balanceOf(player1), STARTING_BALANCE - STAKE_AMOUNT);
        
        (,,, bool isActive) = stakingManager.singlePlayerStakes(player1);
        assertFalse(isActive);
    }

    // ===================================
    // Multiplayer Tests
    // ===================================
    function test_MP_SuccessfulGameCreation() public {
        address[] memory players = new address[](2);
        players[0] = player1;
        players[1] = player2;

        uint256 gameId = stakingManager.nextGameId();
        
        vm.prank(owner);
        stakingManager.createMultiplayerGame(players, MULTIPLAYER_STAKE);
        
        (, uint256 prizePool, , , bool isActive) = stakingManager.multiplayerGames(gameId);

        assertTrue(isActive);
        assertEq(prizePool, MULTIPLAYER_STAKE * 2);
        assertEq(stakingManager.nextGameId(), gameId + 1);
    }

    function test_MP_Settle_Game_OneWinner() public {
        address[] memory players = new address[](2);
        players[0] = player1;
        players[1] = player2;
        
        uint256 gameId = stakingManager.nextGameId();
        uint256 prizePool = MULTIPLAYER_STAKE * 2;

        vm.prank(owner);
        stakingManager.createMultiplayerGame(players, MULTIPLAYER_STAKE);
        
        vm.prank(owner);
        stakingManager.settleMultiplayerGame(gameId, player1);

        assertEq(villageCoin.balanceOf(player1), STARTING_BALANCE - MULTIPLAYER_STAKE + prizePool);
        assertEq(villageCoin.balanceOf(player2), STARTING_BALANCE - MULTIPLAYER_STAKE);
        
        (,,, address winner, bool isActive) = stakingManager.multiplayerGames(gameId);
        
        assertFalse(isActive);
        assertEq(winner, player1);
    }
    
    // ===================================
    // Failure & Edge Case Tests
    // ===================================
    function test_Fail_SP_StakeWithZeroAmount() public {
        vm.prank(player1);
        vm.expectRevert("Stake amount must be greater than 0");
        stakingManager.stakeForSinglePlayer(0, 300);
    }

    function test_Fail_SP_StakeWhileActive() public {
        vm.prank(player1);
        stakingManager.stakeForSinglePlayer(STAKE_AMOUNT, 300);

        // FIX: The second attempt to stake must also be from player1.
        // vm.prank() only works for the immediate next call, so we wrap this
        // second attempt to ensure the caller is correct.
        vm.startPrank(player1);
        vm.expectRevert("Player already has an active stake");
        stakingManager.stakeForSinglePlayer(STAKE_AMOUNT, 300);
        vm.stopPrank();
    }

    function test_Fail_SP_NonOwnerCannotSettle() public {
        vm.prank(player1);
        stakingManager.stakeForSinglePlayer(STAKE_AMOUNT, 300);

        vm.prank(player2); // Not the owner
        
        // FIX: Expect the modern OwnableUnauthorizedAccount custom error, not the old string.
        bytes memory expectedError = abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, player2);
        vm.expectRevert(expectedError);
        stakingManager.settleSinglePlayerGame(player1, 250);
    }

    function test_Fail_MP_CreateWithOnePlayer() public {
        address[] memory players = new address[](1);
        players[0] = player1;
        
        vm.prank(owner);
        vm.expectRevert("Multiplayer game requires at least 2 players");
        stakingManager.createMultiplayerGame(players, MULTIPLAYER_STAKE);
    }

    function test_Fail_MP_CreateWithPlayerWhoHasActiveSPStake() public {
        vm.prank(player1);
        stakingManager.stakeForSinglePlayer(STAKE_AMOUNT, 300);

        address[] memory players = new address[](2);
        players[0] = player1;
        players[1] = player2;

        vm.prank(owner);
        vm.expectRevert("A player has an active single-player stake");
        stakingManager.createMultiplayerGame(players, MULTIPLAYER_STAKE);
    }

    function test_Fail_MP_NonOwnerCannotCreateGame() public {
        address[] memory players = new address[](2);
        players[0] = player1;
        players[1] = player2;

        vm.prank(player3); // Not the owner
        
        // FIX: Expect the modern OwnableUnauthorizedAccount custom error, not the old string.
        bytes memory expectedError = abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, player3);
        vm.expectRevert(expectedError);
        stakingManager.createMultiplayerGame(players, MULTIPLAYER_STAKE);
    }
}