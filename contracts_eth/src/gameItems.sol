// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/// @notice ERC721 collectible used by the game. TreasureBox will be granted MINTER_ROLE to mint items.
contract GameItems is ERC721URIStorage, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    uint256 private _nextId;

    struct Item {
        string name;
        string description;
    }
    mapping(uint256 => Item) public items;

    event ItemMinted(address indexed to, uint256 indexed id, string name);

    constructor() ERC721("EchoesItem", "EITEM") {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(MINTER_ROLE, msg.sender);
    }

    /// @notice Mint to arbitrary address. Only accounts with MINTER_ROLE can call.
    function mintItemTo(
        address to,
        string memory tokenURI,
        string memory name_,
        string memory description_
    ) external onlyRole(MINTER_ROLE) returns (uint256) {
        _nextId++;
        uint256 id = _nextId;
        _safeMint(to, id);
        if (bytes(tokenURI).length > 0) _setTokenURI(id, tokenURI);
        items[id] = Item(name_, description_);
        emit ItemMinted(to, id, name_);
        return id;
    }

    function getItem(
        uint256 tokenId
    )
        external
        view
        returns (string memory, string memory, address, string memory)
    {
        require(_exists(tokenId), "Nonexistent token");
        Item storage it = items[tokenId];
        return (it.name, it.description, ownerOf(tokenId), tokenURI(tokenId));
    }
}
