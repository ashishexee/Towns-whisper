// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

/// @notice ERC721 collectible used by the game. Anyone can mint items.
contract GameItems is ERC721URIStorage {
    uint256 private _nextId;

    struct Item {
        string name;
        string description;
    }
    mapping(uint256 => Item) public items;

    event ItemMinted(address indexed to, uint256 indexed id, string name);

    constructor() ERC721("EchoesItem", "EITEM") {
        // No roles needed
    }

    /// @notice Mint to an arbitrary address. Anyone can call this function.
    function mintItemTo(
        address to,
        string memory tokenURI,
        string memory name_,
        string memory description_
    ) external returns (uint256) {
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
        Item storage it = items[tokenId];
        return (it.name, it.description, ownerOf(tokenId), tokenURI(tokenId));
    }

    // The supportsInterface override is no longer needed as the conflict is resolved
    // by removing AccessControl.
}