// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @notice ERC721 collectible used by the game. Players can mint items and trade them in.
contract GameItems is ERC721URIStorage, Ownable {
    uint256 private _nextId;
    address public treasuryAddress;

    struct Item {
        string name;
        string description;
    }
    mapping(uint256 => Item) public items;

    event ItemMinted(address indexed to, uint256 indexed id, string name);
    event ItemTradedIn(uint256 indexed id, address indexed from, address indexed to);

    constructor() ERC721("EchoesItem", "EITEM") Ownable(msg.sender) {
        treasuryAddress = 0x9E3639F2fAbE9Cb99879b479E57c45202060B0C9; // Default treasury to the deployer
        _nextId = 1;
    }

    /// @notice Sets the address of the treasury that receives traded-in items.
    function setTreasuryAddress(address _treasury) external onlyOwner {
        require(_treasury != address(0), "Treasury address cannot be the zero address");
        treasuryAddress = _treasury;
    }

    /// @notice Mint an item to an address. Anyone can call this function.
    function mintItemTo(
        address to,
        string memory tokenURI,
        string memory name_,
        string memory description_
    ) external returns (uint256) {
        require(to != address(0), "Cannot mint to the zero address");
        uint256 id = _nextId;
        _nextId++;
        _safeMint(to, id);
        if (bytes(tokenURI).length > 0) {
            _setTokenURI(id, tokenURI);
        }
        items[id] = Item(name_, description_);
        emit ItemMinted(to, id, name_);
        return id;
    }

    /// @notice Trades in an item to the game's treasury. Can only be called by the item's owner or an approved address.
    /// @dev This is used in-game when a player uses an item to unlock a villager.
    function tradeInItem(uint256 tokenId) external {
        address from = ownerOf(tokenId);
        // safeTransferFrom already checks if the caller is the owner or is approved.
        safeTransferFrom(from, treasuryAddress, tokenId);
        delete items[tokenId];
        emit ItemTradedIn(tokenId, from, treasuryAddress);
    }

    function getItem(
        uint256 tokenId
    )
        external
        view
        returns (string memory, string memory, address, string memory)
    {
        Item storage it = items[tokenId];
        return (it.name, it.description, ownerOf(tokenId), tokenURI(tokenId));
    }
}
