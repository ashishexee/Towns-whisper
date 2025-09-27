// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "src/GameItems.sol";
import "src/StakingManager.sol";
import "src/TradeManager.sol";

// Import for the Mock ERC20 and AccessControl errors
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title MockRuneCoin
 * @dev A mock ERC20 contract to simulate the Hedera HTS bridge for local testing.
 * Includes a public mint function to distribute tokens to test accounts.
 */
contract MockRuneCoin is ERC20 {
    constructor() ERC20("Mock Rune Coin", "MRN") {}

    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }
}

/**
 * @title GameIntegrationTest
 * @dev A unified test suite for GameItems, StakingManager, and TradeManager.
 * This test simulates the entire game economy using a mock Rune Coin.
 */
contract GameIntegrationTest is Test {
    // --- Contracts ---
    GameItems public gameItems;
    StakingManager public stakingManager;
    TradeManager public tradeManager;
    MockRuneCoin public runeCoin;

    // --- Users ---
    address public owner;
    address public player1;
    address public player2;
    address public minter; // An account that will be granted MINTER_ROLE

    // --- Constants ---
    uint256 public constant STARTING_BALANCE = 1000 * 1e18;
    uint256 public constant STAKE_AMOUNT = 100 * 1e18;
    uint256 public constant TRADE_PRICE = 100 * 1e18;
    uint256 public constant NFT_ID = 1;

    function setUp() public {
        // 1. Setup Users
        owner = address(this);
        player1 = vm.addr(1);
        player2 = vm.addr(2);
        minter = vm.addr(3);

        // 2. Deploy Contracts
        gameItems = new GameItems();
        runeCoin = new MockRuneCoin(); // Deploy the mock Rune Coin
        stakingManager = new StakingManager(address(runeCoin));
        tradeManager = new TradeManager(address(gameItems), address(runeCoin));

        // 3. Setup Initial State
        // Grant minter role to the 'minter' account
        gameItems.grantRole(gameItems.MINTER_ROLE(), minter);

        // Mint a reward pool to the staking contract so it can pay rewards
        runeCoin.mint(address(stakingManager), 5000 * 1e18);

        // Distribute mock Rune Coins to players
        runeCoin.mint(player1, STARTING_BALANCE);
        runeCoin.mint(player2, STARTING_BALANCE);

        // Mint an initial NFT to player2 (who will be the seller in trade tests)
        vm.prank(minter);
        gameItems.mintItemTo(player2, "uri_sword", "Magic Sword", "A sharp sword.");
    
        // 4. Pre-approve contracts for players
        vm.startPrank(player1);
        runeCoin.approve(address(stakingManager), type(uint256).max);
        runeCoin.approve(address(tradeManager), type(uint256).max);
        vm.stopPrank();

        vm.startPrank(player2);
        runeCoin.approve(address(stakingManager), type(uint256).max);
        runeCoin.approve(address(tradeManager), type(uint256).max);
        vm.stopPrank();
    }

    // ===================================
    //       GameItems.sol Tests
    // ===================================
    function test_GI_MinterCanMint() public {
        vm.prank(minter);
        uint256 newItemId = gameItems.mintItemTo(player1, "uri_shield", "Iron Shield", "A sturdy shield.");
        assertEq(gameItems.ownerOf(newItemId), player1);
    }

   function test_GI_Fail_NonMinterCannotMint() public {
        vm.startPrank(player1); // player1 does not have MINTER_ROLE
        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector,
                player1,
                gameItems.MINTER_ROLE()
            )
        );
        gameItems.mintItemTo(player1, "uri_fail", "Fail Item", "This should not mint.");
        vm.stopPrank();
    }

    // ===================================
    //       StakingManager.sol Tests
    // ===================================
    function test_SM_PlayerCanStakeAndWin() public {
        uint256 targetDuration = 240;
        uint256 actualDuration = 200; // Win condition
        uint256 expectedReward = (STAKE_AMOUNT * 15) / 10;

        // Player 1 stakes
        vm.prank(player1);
        stakingManager.stakeForSinglePlayer(STAKE_AMOUNT, targetDuration);

        // Owner settles the game
        vm.prank(owner);
        stakingManager.settleSinglePlayerGame(player1, actualDuration);

        // Check final balance
        assertEq(runeCoin.balanceOf(player1), STARTING_BALANCE - STAKE_AMOUNT + expectedReward);
    }
    
    function test_SM_PlayerCanStakeAndLose() public {
        uint256 targetDuration = 240;
        uint256 actualDuration = 300; // Lose condition

        vm.prank(player1);
        stakingManager.stakeForSinglePlayer(STAKE_AMOUNT, targetDuration);

        vm.prank(owner);
        stakingManager.settleSinglePlayerGame(player1, actualDuration);

        assertEq(runeCoin.balanceOf(player1), STARTING_BALANCE - STAKE_AMOUNT);
    }

    // ===================================
    //       TradeManager.sol Tests
    // ===================================
    function test_TM_SuccessfulTrade() public {
        // Player 1 (buyer) creates a request for the NFT owned by Player 2
        vm.prank(player1);
        tradeManager.createTradeRequest(NFT_ID);

        // Player 2 (seller) approves the TradeManager for the NFT
        vm.startPrank(player2);
        gameItems.approve(address(tradeManager), NFT_ID);
        
        // Player 2 accepts the trade
        tradeManager.acceptTradeRequest(NFT_ID);
        vm.stopPrank();

        // Assert final state
        assertEq(gameItems.ownerOf(NFT_ID), player1, "Buyer should own NFT");
        assertEq(runeCoin.balanceOf(player1), STARTING_BALANCE - TRADE_PRICE, "Buyer balance incorrect");
        assertEq(runeCoin.balanceOf(player2), STARTING_BALANCE + TRADE_PRICE, "Seller balance incorrect");
    }

    function test_TM_BuyerCanCancelRequest() public {
        // FIX: Use startPrank and stopPrank to apply the prank to a block of code.
        vm.startPrank(player1);
        tradeManager.createTradeRequest(NFT_ID);
        tradeManager.cancelTradeRequest(NFT_ID);
        vm.stopPrank();
        
        (,,bool isActive) = tradeManager.tradeRequests(NFT_ID);
        assertFalse(isActive, "Request should be inactive after cancellation");
    }
}

