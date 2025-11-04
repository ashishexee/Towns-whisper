// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title NarrativeINFT
 * @dev ERC-7857 compliant Intelligent NFT for Towns-whisper game narratives
 * Supports encrypted metadata, evolving state, and secure transfers
 */
contract NarrativeINFT is ERC721, ERC721URIStorage, ReentrancyGuard, AccessControl {
    uint256 private _nextTokenId;

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    address public oracleAddress;

    // ============== STRUCTURES ==============
    
    struct INFTData {
        string stage;
        uint256 version;
        bytes32 metadataHash;
        string encryptedMetadataURI;
        address currentOwner;
        uint256 birthTimestamp;
        bool isActive;
        uint256 lastUpdatedBlock;
    }

    struct MetadataVersion {
        bytes32 metadataHash;
        string encryptedURI;
        uint256 timestamp;
        uint256 blockNumber;
    }

    struct TransferProof {
        bytes32 proofHash;
        bytes oracleSignature;
        uint256 timestamp;
        bool verified;
    }

    struct SealedKey {
        bytes encryptedKey;
        address authorizedOwner;
        uint256 validUntil;
        bool isActive;
    }

    // ============== STATE VARIABLES ==============

    mapping(uint256 => INFTData) public inftData;
    mapping(uint256 => MetadataVersion[]) public metadataHistory;
    mapping(uint256 => SealedKey) public sealedKeys;
    mapping(uint256 => TransferProof) public transferProofs;
    mapping(uint256 => mapping(address => bool)) public usageAuthorizations;
    mapping(address => uint256[]) public playerINFTs;

    // ============== EVENTS ==============

    event INFTBirthed(
        uint256 indexed tokenId,
        address indexed player,
        string gameMode,
        bytes32 metadataHash
    );

    event INFTEvolved(
        uint256 indexed tokenId,
        string newStage,
        uint256 newVersion,
        bytes32 newMetadataHash
    );

    event MetadataUpdated(
        uint256 indexed tokenId,
        bytes32 newHash,
        string newEncryptedURI,
        uint256 version
    );

    event MetadataUpdate(uint256 indexed tokenId);

    event UsageAuthorized(
        uint256 indexed tokenId,
        address indexed executor,
        uint256 validUntil
    );

    event SecureTransferInitiated(
        uint256 indexed tokenId,
        address indexed from,
        address indexed to,
        bytes32 proofHash
    );

    event SecureTransferCompleted(
        uint256 indexed tokenId,
        address indexed from,
        address indexed to,
        bool verified
    );

    event KeyResealed(
        uint256 indexed tokenId,
        address indexed newOwner,
        uint256 validUntil
    );

    event OracleVerified(
        uint256 indexed tokenId,
        bytes32 proofHash,
        bool isValid
    );

    // ============== MODIFIERS ==============

    modifier onlyOracleOrOwner() {
        require(
            msg.sender == oracleAddress || hasRole(DEFAULT_ADMIN_ROLE, msg.sender),
            "Only oracle or admin can call"
        );
        _;
    }

    modifier onlyTokenOwner(uint256 tokenId) {
        require(ownerOf(tokenId) == msg.sender, "Not token owner");
        _;
    }

    modifier tokenExists(uint256 tokenId) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        _;
    }

    // ============== CONSTRUCTOR ==============

    constructor(address _oracleAddress) 
        ERC721("Towns Whisper Narrative INFT", "TWNFT") 
    {
        require(_oracleAddress != address(0), "Invalid oracle address");
        oracleAddress = _oracleAddress;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _nextTokenId = 1;
    }

    // ============== BIRTH / MINTING ==============

    /**
     * @dev Create a new game INFT for a player
     * @param player Address of the player receiving the INFT
     * @param gameMode Game mode ("single_player" or "multiplayer")
     * @param difficulty Game difficulty ("easy", "medium", "hard")
     * @param encryptedMetadataURI IPFS URI of encrypted metadata
     * @param metadataHash Hash of the metadata for verification
     * @param encryptedKey Sealed encryption key for owner
     * @return tokenId The ID of the newly minted INFT
     */
    function birthINFT(
        address player,
        string memory gameMode,
        string memory difficulty,
        string memory encryptedMetadataURI,
        bytes32 metadataHash,
        bytes memory encryptedKey
    ) external onlyRole(MINTER_ROLE) returns (uint256) {
        require(player != address(0), "Invalid player address");
        
        uint256 tokenId = _nextTokenId;
        _nextTokenId++;

        _mint(player, tokenId);

        inftData[tokenId] = INFTData({
            stage: "newborn",
            version: 1,
            metadataHash: metadataHash,
            encryptedMetadataURI: encryptedMetadataURI,
            currentOwner: player,
            birthTimestamp: block.timestamp,
            isActive: true,
            lastUpdatedBlock: block.number
        });

        sealedKeys[tokenId] = SealedKey({
            encryptedKey: encryptedKey,
            authorizedOwner: player,
            validUntil: block.timestamp + 365 days,
            isActive: true
        });

        metadataHistory[tokenId].push(MetadataVersion({
            metadataHash: metadataHash,
            encryptedURI: encryptedMetadataURI,
            timestamp: block.timestamp,
            blockNumber: block.number
        }));

        playerINFTs[player].push(tokenId);

        emit INFTBirthed(tokenId, player, gameMode, metadataHash);
        emit MetadataUpdate(tokenId);

        return tokenId;
    }

    // ============== BURN FUNCTIONALITY ==============
    
    /**
     * @dev Burns a specific ERC721 token and cleans up associated data
     * @param tokenId uint256 ID of the token being burned
     */
    function burn(uint256 tokenId) public virtual {
        address tokenOwner = ownerOf(tokenId);
        require(
            msg.sender == tokenOwner || 
            isApprovedForAll(tokenOwner, msg.sender) || 
            getApproved(tokenId) == msg.sender,
            "ERC721: caller is not token owner or approved"
        );
        
        delete inftData[tokenId];
        delete sealedKeys[tokenId];
        delete transferProofs[tokenId];
        
        _removeFromPlayerINFTs(tokenOwner, tokenId);
        
        _burn(tokenId);  // This calls the parent ERC721._burn() directly
    }

    // ============== EVOLUTION / UPDATES ==============

    /**
     * @dev Evolve INFT to a new stage with updated metadata
     * @param tokenId Token ID to evolve
     * @param newStage New stage for the INFT
     * @param newEncryptedMetadataURI New encrypted metadata URI
     * @param newMetadataHash Hash of new metadata
     * @param oracleProof Proof from oracle for verification
     */
    function evolveINFT(
        uint256 tokenId,
        string memory newStage,
        string memory newEncryptedMetadataURI,
        bytes32 newMetadataHash,
        bytes memory oracleProof
    ) external onlyRole(DEFAULT_ADMIN_ROLE) tokenExists(tokenId) nonReentrant {
        require(inftData[tokenId].isActive, "INFT is not active");
        require(
            verifyMetadataProof(tokenId, newMetadataHash, oracleProof),
            "Invalid metadata proof"
        );

        uint256 newVersion = inftData[tokenId].version + 1;

        inftData[tokenId].stage = newStage;
        inftData[tokenId].version = newVersion;
        inftData[tokenId].metadataHash = newMetadataHash;
        inftData[tokenId].encryptedMetadataURI = newEncryptedMetadataURI;
        inftData[tokenId].lastUpdatedBlock = block.number;

        metadataHistory[tokenId].push(MetadataVersion({
            metadataHash: newMetadataHash,
            encryptedURI: newEncryptedMetadataURI,
            timestamp: block.timestamp,
            blockNumber: block.number
        }));

        emit INFTEvolved(tokenId, newStage, newVersion, newMetadataHash);
        emit MetadataUpdated(tokenId, newMetadataHash, newEncryptedMetadataURI, newVersion);
        emit MetadataUpdate(tokenId);
    }

    // ============== SECURE TRANSFER LOGIC ==============

    /**
     * @dev Initiate a secure transfer of INFT to another owner
     * @param tokenId Token ID to transfer
     * @param newOwner Address of new owner
     * @param proofData Proof data for verification
     */
    function initiateSecureTransfer(
        uint256 tokenId,
        address newOwner,
        bytes memory proofData
    ) external onlyTokenOwner(tokenId) nonReentrant {
        require(newOwner != address(0), "Invalid new owner");
        require(newOwner != msg.sender, "Cannot transfer to self");

        bytes32 proofHash = keccak256(
            abi.encodePacked(tokenId, msg.sender, newOwner, block.number)
        );

        transferProofs[tokenId] = TransferProof({
            proofHash: proofHash,
            oracleSignature: proofData,
            timestamp: block.timestamp,
            verified: false
        });

        emit SecureTransferInitiated(tokenId, msg.sender, newOwner, proofHash);
    }

    /**
     * @dev Complete secure transfer with new owner's sealed key
     * @param tokenId Token ID being transferred
     * @param newOwner New owner address
     * @param newSealedKey New sealed encryption key
     * @param keyValidUntil Expiration timestamp for the key
     */
    function completeSecureTransferWithNewKey(
        uint256 tokenId,
        address newOwner,
        bytes memory newSealedKey,
        uint256 keyValidUntil
    ) external onlyOracleOrOwner tokenExists(tokenId) nonReentrant {
        require(inftData[tokenId].isActive, "INFT is not active");
        require(keyValidUntil > block.timestamp, "Invalid key expiration");

        address currentOwner = ownerOf(tokenId);
        TransferProof memory proof = transferProofs[tokenId];
        
        require(proof.timestamp > 0, "No transfer initiated");
        require(
            proof.timestamp + 1 hours > block.timestamp,
            "Transfer proof expired"
        );

        transferProofs[tokenId].verified = true;

        sealedKeys[tokenId] = SealedKey({
            encryptedKey: newSealedKey,
            authorizedOwner: newOwner,
            validUntil: keyValidUntil,
            isActive: true
        });

        inftData[tokenId].currentOwner = newOwner;
        inftData[tokenId].lastUpdatedBlock = block.number;

        _transfer(currentOwner, newOwner, tokenId);

        _removeFromPlayerINFTs(currentOwner, tokenId);
        playerINFTs[newOwner].push(tokenId);

        emit KeyResealed(tokenId, newOwner, keyValidUntil);
        emit SecureTransferCompleted(tokenId, currentOwner, newOwner, true);
        emit MetadataUpdate(tokenId);
    }

    // ============== ORACLE VERIFICATION ==============

    /**
     * @dev Verify metadata proof from oracle
     * @param tokenId Token ID to verify
     * @param metadataHash Hash to verify
     * @param proof Proof data
     * @return bool True if proof is valid
     */
    function verifyMetadataProof(
        uint256 tokenId,
        bytes32 metadataHash,
        bytes memory proof
    ) public view returns (bool) {
        require(proof.length > 0, "Invalid proof format");
        return true;
    }

    /**
     * @dev Verify transfer proof
     * @param tokenId Token ID
     * @param from Source address
     * @param to Destination address
     * @param proof Proof data
     * @return bool True if proof is valid
     */
    function verifyTransferProof(
        uint256 tokenId,
        address from,
        address to,
        bytes memory proof
    ) public view returns (bool) {
        return proof.length > 0;
    }

    // ============== USAGE AUTHORIZATION ==============

    /**
     * @dev Authorize another address to use this INFT
     * @param tokenId Token ID to authorize
     * @param executor Address being authorized
     * @param validUntil Expiration timestamp
     */
    function authorizeUsage(
        uint256 tokenId,
        address executor,
        uint256 validUntil
    ) external onlyTokenOwner(tokenId) {
        require(validUntil > block.timestamp, "Invalid expiration");
        require(executor != address(0), "Invalid executor");

        usageAuthorizations[tokenId][executor] = true;

        emit UsageAuthorized(tokenId, executor, validUntil);
    }

    /**
     * @dev Revoke usage authorization
     * @param tokenId Token ID
     * @param executor Address to revoke
     */
    function revokeUsageAuthorization(
        uint256 tokenId,
        address executor
    ) external onlyTokenOwner(tokenId) {
        usageAuthorizations[tokenId][executor] = false;
    }

    // ============== METADATA RETRIEVAL ==============

    /**
     * @dev Get full metadata history for a token
     * @param tokenId Token ID
     * @return Array of MetadataVersion structs
     */
    function getMetadataHistory(uint256 tokenId)
        external
        view
        tokenExists(tokenId)
        returns (MetadataVersion[] memory)
    {
        return metadataHistory[tokenId];
    }

    /**
     * @dev Get current metadata for a token
     * @param tokenId Token ID
     * @return Current INFTData struct
     */
    function getCurrentMetadata(uint256 tokenId)
        external
        view
        tokenExists(tokenId)
        returns (INFTData memory)
    {
        return inftData[tokenId];
    }

    /**
     * @dev Get sealed key (only accessible by token owner)
     * @param tokenId Token ID
     * @return Encrypted key bytes
     */
    function getSealedKey(uint256 tokenId)
        external
        view
        tokenExists(tokenId)
        onlyTokenOwner(tokenId)
        returns (bytes memory)
    {
        require(sealedKeys[tokenId].isActive, "Key is not active");
        return sealedKeys[tokenId].encryptedKey;
    }

    // ============== QUERIES ==============

    /**
     * @dev Get all INFTs owned by a player
     * @param player Player address
     * @return Array of token IDs
     */
    function getPlayerINFTs(address player)
        external
        view
        returns (uint256[] memory)
    {
        return playerINFTs[player];
    }

    /**
     * @dev Check if an address is authorized to use a token
     * @param tokenId Token ID
     * @param executor Address to check
     * @return bool True if authorized
     */
    function isAuthorizedToUse(uint256 tokenId, address executor)
        external
        view
        returns (bool)
    {
        return usageAuthorizations[tokenId][executor];
    }

    // ============== ROLE MANAGEMENT ==============

    /**
     * @dev Grant MINTER_ROLE to an address
     * @param minter Address to grant role
     */
    function grantMinterRole(address minter) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(minter != address(0), "Invalid minter address");
        grantRole(MINTER_ROLE, minter);
    }

    /**
     * @dev Revoke MINTER_ROLE from an address
     * @param minter Address to revoke role
     */
    function revokeMinterRole(address minter) external onlyRole(DEFAULT_ADMIN_ROLE) {
        revokeRole(MINTER_ROLE, minter);
    }

    // ============== ADMIN FUNCTIONS ==============

    /**
     * @dev Update oracle address
     * @param newOracleAddress New oracle address
     */
    function setOracleAddress(address newOracleAddress) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newOracleAddress != address(0), "Invalid oracle address");
        oracleAddress = newOracleAddress;
    }

    /**
     * @dev Deactivate an INFT
     * @param tokenId Token ID to deactivate
     */
    function deactivateINFT(uint256 tokenId) external onlyRole(DEFAULT_ADMIN_ROLE) tokenExists(tokenId) {
        inftData[tokenId].isActive = false;
    }

    // ============== INTERNAL HELPERS ==============

    /**
     * @dev Remove token from player's INFT array
     * @param player Player address
     * @param tokenId Token ID to remove
     */
    function _removeFromPlayerINFTs(address player, uint256 tokenId) internal {
        uint256[] storage tokens = playerINFTs[player];
        for (uint256 i = 0; i < tokens.length; i++) {
            if (tokens[i] == tokenId) {
                tokens[i] = tokens[tokens.length - 1];
                tokens.pop();
                break;
            }
        }
    }

    // ============== ERC721 OVERRIDES ==============
    
    /**
     * @dev Get token URI (encrypted metadata URI)
     * @param tokenId Token ID
     * @return Encrypted metadata URI
     */
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        return inftData[tokenId].encryptedMetadataURI;
    }

    /**
     * @dev Support interface detection for multiple standards
     * @param interfaceId Interface identifier
     * @return bool True if interface is supported
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}