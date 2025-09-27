// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Chainlink VRF & Automation
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/v0.8/automation/AutomationCompatible.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IGameItems {
    function mintItemTo(
        address to,
        string memory tokenURI,
        string memory name_,
        string memory description_
    ) external returns (uint256);
}

interface IGameCoin {
    function mint(address to, uint256 amount) external;
}

contract TreasureBox is
    VRFConsumerBaseV2,
    AutomationCompatibleInterface,
    Ownable
{
    VRFCoordinatorV2Interface public COORDINATOR;

    // Game contracts
    IGameItems public gameItems;
    IGameCoin public gameCoin;

    // VRF config
    uint64 public subscriptionId;
    bytes32 public keyHash; // gasLane
    uint32 public callbackGasLimit;
    uint16 public requestConfirmations = 3;
    uint32 public numWords = 1;

    // scheduling
    uint256 public interval; // seconds between automated runs (default 24h)
    uint256 public lastTimeStamp;
    uint256 public batchSize = 5; // number of recipients processed per upkeep
    uint256 public currentIndex; // next recipient index to process

    // recipients
    address[] public recipients;
    mapping(address => bool) public registered;

    // items available (the 8 items)
    struct ItemMeta {
        string name;
        string tokenURI;
        string description;
    }
    ItemMeta[] public items;

    // bounds for coin reward (in token decimals - GameCoin decimals are 18)
    uint256 public minCoins; // e.g., 1 * 1e18
    uint256 public maxCoins; // e.g., 100 * 1e18

    // map Chainlink requestId -> recipient
    mapping(uint256 => address) public requestToRecipient;

    // events
    event RandomRequested(uint256 indexed requestId, address indexed recipient);
    event AwardedNFT(
        address indexed to,
        uint256 indexed itemIndex,
        uint256 requestId
    );
    event AwardedCoins(address indexed to, uint256 amount, uint256 requestId);
    event AwardedCoinsRequested(
        address indexed to,
        uint256 amount,
        uint256 requestId
    );

    constructor(
        address _vrfCoordinator,
        bytes32 _keyHash,
        uint64 _subscriptionId,
        uint32 _callbackGasLimit,
        address _gameItems,
        address _gameCoin,
        uint256 _intervalSeconds,
        uint256 _minCoins,
        uint256 _maxCoins
    ) VRFConsumerBaseV2(_vrfCoordinator) {
        COORDINATOR = VRFCoordinatorV2Interface(_vrfCoordinator);
        keyHash = _keyHash;
        subscriptionId = _subscriptionId;
        callbackGasLimit = _callbackGasLimit;

        gameItems = IGameItems(_gameItems);
        gameCoin = IGameCoin(_gameCoin);

        interval = _intervalSeconds;
        lastTimeStamp = block.timestamp;
        minCoins = _minCoins;
        maxCoins = _maxCoins;
    }

    // ---------- Registration ----------
    function register() external {
        require(!registered[msg.sender], "already registered");
        registered[msg.sender] = true;
        recipients.push(msg.sender);
    }

    function unregister() external {
        require(registered[msg.sender], "not registered");
        registered[msg.sender] = false;
        // keep array unchanged; performUpkeep ignores unregistered addresses when hit
    }

    // admin functions
    function addItem(
        string memory name_,
        string memory tokenURI,
        string memory description_
    ) external onlyOwner {
        items.push(ItemMeta(name_, tokenURI, description_));
    }

    function setBatchSize(uint256 b) external onlyOwner {
        batchSize = b;
    }

    function setInterval(uint256 seconds_) external onlyOwner {
        interval = seconds_;
    }

    function setCallbackGasLimit(uint32 g) external onlyOwner {
        callbackGasLimit = g;
    }

    function setMinMaxCoins(uint256 minC, uint256 maxC) external onlyOwner {
        minCoins = minC;
        maxCoins = maxC;
    }

    function setSubscriptionId(uint64 id) external onlyOwner {
        subscriptionId = id;
    }

    // ---------- Automation-compatible ----------
    function checkUpkeep(
        bytes calldata
    ) external view override returns (bool upkeepNeeded, bytes memory) {
        // trigger if interval elapsed and there are recipients
        if (
            (block.timestamp - lastTimeStamp) > interval &&
            recipients.length > 0
        ) {
            upkeepNeeded = true;
        } else {
            upkeepNeeded = false;
        }
    }

    /// @notice Called by Chainlink Automation nodes. It processes up to batchSize recipients by requesting randomness for each.
    function performUpkeep(bytes calldata) external override {
        require(
            (block.timestamp - lastTimeStamp) > interval,
            "interval not elapsed"
        );

        uint256 cnt = 0;
        uint256 n = recipients.length;
        while (cnt < batchSize && n > 0) {
            address recipient = recipients[currentIndex];
            // skip if unregistered
            if (registered[recipient]) {
                _requestRandomAward(recipient);
                cnt++;
            }
            // advance index (circular)
            currentIndex++;
            if (currentIndex >= n) currentIndex = 0;
        }

        lastTimeStamp = block.timestamp;
    }

    // ---------- VRF request ----------
    function _requestRandomAward(address recipient) internal {
        uint256 requestId = COORDINATOR.requestRandomWords(
            keyHash,
            subscriptionId,
            requestConfirmations,
            callbackGasLimit,
            numWords
        );
        requestToRecipient[requestId] = recipient;
        emit RandomRequested(requestId, recipient);
    }

    /// @notice VRF callback
    function fulfillRandomWords(
        uint256 requestId,
        uint256[] memory randomWords
    ) internal override {
        address recipient = requestToRecipient[requestId];
        require(recipient != address(0), "unknown request");

        uint256 rnd = randomWords[0];
        // use low-bit for coin vs nft, and other bits for selection.
        bool giveNFT = (rnd % 2 == 0);

        if (giveNFT && items.length > 0) {
            uint256 idx = (rnd / 2) % items.length;
            ItemMeta memory it = items[idx];
            // TreasureBox must have MINTER_ROLE on GameItems (set by deployer)
            gameItems.mintItemTo(
                recipient,
                it.tokenURI,
                it.name,
                it.description
            );
            emit AwardedNFT(recipient, idx, requestId);
        } else {
            // award coins
            uint256 range = maxCoins - minCoins + 1;
            uint256 amount = minCoins + ((rnd / 2) % range);
            // instead of minting on-chain, emit event for off-chain backend to process
            emit AwardedCoinsRequested(recipient, amount, requestId);
            emit AwardedCoins(recipient, amount, requestId); // optional for on-chain logs
        }

        delete requestToRecipient[requestId];
    }

    // ---------- Testing helper (ONLY OWNER, local testing) ----------
    /// @notice Simulate VRF fulfillment for local tests: owner can call to emulate randomness.
    function fulfillRandomWordsMock(
        uint256 requestId,
        uint256 fakeRandom
    ) external onlyOwner {
        // emulate an array of 1 word
        uint256[] memory arr = new uint256[](1);
        arr[0] = fakeRandom;
        fulfillRandomWords(requestId, arr);
    }

    // getters
    function recipientsLength() external view returns (uint256) {
        return recipients.length;
    }

    function itemsLength() external view returns (uint256) {
        return items.length;
    }
}
