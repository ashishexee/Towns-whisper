// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../lib/forge-std/src/Test.sol";
import "../src/StakingManager.sol";
import "../lib/openzeppelin-contracts/contracts/access/Ownable.sol";

/**
 * @title StakingManagerTest
 * @dev A comprehensive test suite for the StakingManager contract, focused on native token (ETH) staking.
 */
contract StakingManagerTest is Test {
    // --- Contracts ---
    StakingManager public stakingManager;

    // --- Users ---
    address public owner;
    address public player1;
    address public player2;
    address public player3;

    // --- Constants ---
    uint256 public constant STARTING_BALANCE = 10 ether;
    uint256 public constant STAKE_AMOUNT = 1 ether;
    uint256 public constant MULTIPLAYER_STAKE = 2 ether;

    function setUp() public {
        // 1. Setup Users
        owner = address(this);
        player1 = vm.addr(1);
        player2 = vm.addr(2);
        player3 = vm.addr(3);

        // 2. Deploy Contract
        // The owner is set to 'this' contract by default in the constructor
        stakingManager = new StakingManager();

        // 3. Fund Users with native currency (ETH)
        vm.deal(player1, STARTING_BALANCE);
        vm.deal(player2, STARTING_BALANCE);
        vm.deal(player3, STARTING_BALANCE);
    }

    // ===================================
    // Single-Player Tests
    // ===================================
    function test_SP_SuccessfulStake() public {
        vm.prank(player1);
        stakingManager.stakeForSinglePlayer{value: STAKE_AMOUNT}(300);

        (uint256 amount, uint256 targetDuration, , bool isActive) = stakingManager.singlePlayerStakes(player1);

        assertTrue(isActive);
        assertEq(amount, STAKE_AMOUNT);
        assertEq(targetDuration, 300);
        assertEq(address(stakingManager).balance, STAKE_AMOUNT);
    }

    function test_SP_Settle_Win_WithBonus() public {
        uint256 targetDuration = 240;
        uint256 actualDuration = 200; // Win condition

        vm.prank(player1);
        stakingManager.stakeForSinglePlayer{value: STAKE_AMOUNT}(targetDuration);

        uint256 playerBalanceBefore = player1.balance;
        uint256 contractBalanceBefore = address(stakingManager).balance;

        // Calculate expected reward: 1.5x base + time bonus
        uint256 baseReward = (STAKE_AMOUNT * 3) / 2;
        uint256 timeSaved = targetDuration - actualDuration;
        uint256 timeBonus = (STAKE_AMOUNT * timeSaved) / (targetDuration * 2);
        uint256 expectedReward = baseReward + timeBonus;

        vm.prank(owner);
        stakingManager.settleSinglePlayerGame(player1, actualDuration);

        assertEq(player1.balance, playerBalanceBefore + expectedReward, "Player balance should increase by reward amount");
        assertEq(address(stakingManager).balance, contractBalanceBefore - expectedReward, "Contract balance should decrease by reward amount");
        
        (,,, bool isActive) = stakingManager.singlePlayerStakes(player1);
        assertFalse(isActive, "Stake should be inactive after settlement");
    }

    function test_SP_Settle_Loss() public {
        uint256 targetDuration = 240;
        uint256 actualDuration = 300; // Lose condition

        vm.prank(player1);
        stakingManager.stakeForSinglePlayer{value: STAKE_AMOUNT}(targetDuration);

        uint256 playerBalanceBefore = player1.balance;
        uint256 contractBalanceBefore = address(stakingManager).balance;

        vm.prank(owner);
        stakingManager.settleSinglePlayerGame(player1, actualDuration);

        assertEq(player1.balance, playerBalanceBefore, "Player balance should be unchanged after losing");
        assertEq(address(stakingManager).balance, contractBalanceBefore, "Contract balance should retain the forfeited stake");
        
        (,,, bool isActive) = stakingManager.singlePlayerStakes(player1);
        assertFalse(isActive, "Stake should be inactive after settlement");
    }

    // ===================================
    // Multiplayer Tests
    // ===================================
    function test_MP_SuccessfulGameCreation() public {
        address[] memory players = new address[](2);
        players[0] = player1;
        players[1] = player2;

        uint256 gameId = stakingManager.nextGameId();
        uint256 totalStake = MULTIPLAYER_STAKE * 2;
        
        vm.prank(owner);
        stakingManager.createMultiplayerGame{value: totalStake}(players, MULTIPLAYER_STAKE);
        
        (, uint256 prizePool, , , , bool isActive) = stakingManager.multiplayerGames(gameId);

        assertTrue(isActive);
        assertEq(prizePool, totalStake);
        assertEq(stakingManager.nextGameId(), gameId + 1);
        assertEq(address(stakingManager).balance, totalStake);
    }

    function test_MP_Settle_Game_OneWinner() public {
        address[] memory players = new address[](2);
        players[0] = player1;
        players[1] = player2;
        
        uint256 gameId = stakingManager.nextGameId();
        uint256 totalStake = MULTIPLAYER_STAKE * 2;

        vm.prank(owner);
        stakingManager.createMultiplayerGame{value: totalStake}(players, MULTIPLAYER_STAKE);

        uint256 winnerBalanceBefore = player1.balance;
        
        vm.prank(owner);
        stakingManager.settleMultiplayerGame(gameId, player1);

        assertEq(player1.balance, winnerBalanceBefore + totalStake, "Winner should receive the entire prize pool");
        assertEq(address(stakingManager).balance, 0, "Contract balance should be zero after payout");
        
        (,,,, address winner, bool isActive) = stakingManager.multiplayerGames(gameId);
        
        assertFalse(isActive);
        assertEq(winner, player1);
    }
    
    // ===================================
    // Withdrawal Test
    // ===================================
    function test_OwnerCanWithdrawForfeitedFunds() public {
        // Player 1 stakes and loses, forfeiting their stake to the contract.
        vm.prank(player1);
        stakingManager.stakeForSinglePlayer{value: STAKE_AMOUNT}(240);
        
        vm.prank(owner);
        stakingManager.settleSinglePlayerGame(player1, 300); // Player loses

        uint256 contractBalance = address(stakingManager).balance;
        assertEq(contractBalance, STAKE_AMOUNT, "Contract should hold the forfeited stake");

        uint256 ownerBalanceBefore = owner.balance;

        // Owner withdraws the funds.
        vm.prank(owner);
        stakingManager.withdrawFunds();

        assertEq(address(stakingManager).balance, 0, "Contract balance should be zero after withdrawal");
        assertEq(owner.balance, ownerBalanceBefore + contractBalance, "Owner should receive the withdrawn funds");
    }

    // ===================================
    // Failure & Edge Case Tests
    // ===================================
    function test_Fail_SP_StakeWithZeroAmount() public {
        vm.prank(player1);
        vm.expectRevert("Stake amount must be greater than 0");
        stakingManager.stakeForSinglePlayer{value: 0}(300);
    }

    function test_Fail_SP_StakeWhileActive() public {
        vm.prank(player1);
        stakingManager.stakeForSinglePlayer{value: STAKE_AMOUNT}(300);

        vm.prank(player1);
        vm.expectRevert("Player already has an active stake");
        stakingManager.stakeForSinglePlayer{value: STAKE_AMOUNT}(300);
    }

    function test_Fail_SP_NonOwnerCannotSettle() public {
        vm.prank(player1);
        stakingManager.stakeForSinglePlayer{value: STAKE_AMOUNT}(300);

        vm.prank(player2); // Not the owner
        bytes memory expectedError = abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, player2);
        vm.expectRevert(expectedError);
        stakingManager.settleSinglePlayerGame(player1, 250);
    }

    function test_Fail_MP_CreateWithIncorrectStakeValue() public {
        address[] memory players = new address[](2);
        players[0] = player1;
        players[1] = player2;
        
        vm.prank(owner);
        vm.expectRevert("Incorrect total stake amount sent");
        // Sending 1 ether instead of the required 2 * MULTIPLAYER_STAKE
        stakingManager.createMultiplayerGame{value: 1 ether}(players, MULTIPLAYER_STAKE);
    }

    function test_Fail_MP_CreateWithPlayerWhoHasActiveSPStake() public {
        vm.prank(player1);
        stakingManager.stakeForSinglePlayer{value: STAKE_AMOUNT}(300);

        address[] memory players = new address[](2);
        players[0] = player1;
        players[1] = player2;

        vm.prank(owner);
        vm.expectRevert("A player has an active single-player stake");
        stakingManager.createMultiplayerGame{value: MULTIPLAYER_STAKE * 2}(players, MULTIPLAYER_STAKE);
    }

    function test_Fail_NonOwnerCannotWithdraw() public {
        vm.prank(player1); // Not the owner
        bytes memory expectedError = abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, player1);
        vm.expectRevert(expectedError);
        stakingManager.withdrawFunds();
    }
}
