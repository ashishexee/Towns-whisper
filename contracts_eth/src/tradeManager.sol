// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title TradeManager
 * @dev Manages peer-to-peer trade requests for NFTs within Echoes of the Village.
 * Acts as a decentralized escrow to facilitate an atomic swap of a GameNFT
 * for a fixed amount of VillageCoin.
 */
contract TradeManager is ReentrancyGuard {

    // ============== STATE VARIABLES ==============

    IERC721 public gameNFT;
    IERC20 public villageCoin;

    uint256 public constant TRADE_PRICE = 100 * 1e18; // Fixed price of 100 VCOIN for any trade

    struct TradeRequest {
        address buyer;      // The address of the player who wants to buy
        uint256 tokenId;    // The ID of the specific NFT they want
        bool isActive;      // Whether the request is still open
    }

    mapping(uint256 => TradeRequest) public tradeRequests; // tokenId -> TradeRequest

    // ============== EVENTS ==============

    event TradeRequestCreated(address indexed buyer, uint256 indexed tokenId);
    event TradeRequestCancelled(address indexed buyer, uint256 indexed tokenId);
    event TradeCompleted(address indexed buyer, address indexed seller, uint256 indexed tokenId, uint256 price);

    // ============== CONSTRUCTOR ==============

    constructor(address _gameNFTAddress, address _villageCoinAddress) {
        gameNFT = IERC721(_gameNFTAddress);
        villageCoin = IERC20(_villageCoinAddress);
    }

    // ============== CORE FUNCTIONS ==============

    /**
     * @dev Creates a public request to buy a specific NFT.
     * The buyer must have already approved this contract to spend TRADE_PRICE of their VillageCoin.
     * @param _tokenId The ID of the NFT the user wants to buy.
     */
    function createTradeRequest(uint256 _tokenId) external nonReentrant {
        require(gameNFT.ownerOf(_tokenId) != msg.sender, "You cannot request to buy an NFT you already own.");
        require(!tradeRequests[_tokenId].isActive, "A trade request for this NFT is already active.");
        
        // Check if the buyer has enough balance and has approved the contract
        require(villageCoin.balanceOf(msg.sender) >= TRADE_PRICE, "Insufficient VillageCoin balance.");
        require(villageCoin.allowance(msg.sender, address(this)) >= TRADE_PRICE, "TradeManager must be approved to spend VillageCoin.");

        tradeRequests[_tokenId] = TradeRequest({
            buyer: msg.sender,
            tokenId: _tokenId,
            isActive: true
        });

        emit TradeRequestCreated(msg.sender, _tokenId);
    }

    /**
     * @dev Allows the seller (current owner of the NFT) to accept an active trade request.
     * The seller must have approved this contract to manage the specific NFT.
     * @param _tokenId The ID of the NFT being traded.
     */
    function acceptTradeRequest(uint256 _tokenId) external nonReentrant {
        TradeRequest storage request = tradeRequests[_tokenId];
        address buyer = request.buyer;
        address seller = msg.sender;

        require(request.isActive, "No active trade request for this NFT.");
        require(gameNFT.ownerOf(_tokenId) == seller, "You are not the owner of this NFT.");
        require(gameNFT.getApproved(_tokenId) == address(this), "TradeManager must be approved to manage this NFT.");

        // Mark the request as inactive to prevent re-entrancy issues
        request.isActive = false;

        // --- The Atomic Swap ---
        // 1. Pull funds from the buyer
        villageCoin.transferFrom(buyer, seller, TRADE_PRICE);

        // 2. Pull NFT from the seller and send to the buyer
        gameNFT.transferFrom(seller, buyer, _tokenId);

        emit TradeCompleted(buyer, seller, _tokenId, TRADE_PRICE);
    }

    /**
     * @dev Allows a buyer to cancel their own trade request if it hasn't been filled.
     * @param _tokenId The ID of the NFT in the request.
     */
    function cancelTradeRequest(uint256 _tokenId) external {
        TradeRequest storage request = tradeRequests[_tokenId];
        require(request.isActive, "No active trade request for this NFT.");
        require(request.buyer == msg.sender, "You are not the creator of this trade request.");

        // Mark the request as inactive
        request.isActive = false;

        emit TradeRequestCancelled(msg.sender, _tokenId);
    }
}