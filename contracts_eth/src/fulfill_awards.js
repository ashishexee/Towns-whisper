// scripts/fulfill_awards.js
require("dotenv").config();
const { ethers } = require("ethers");
const {
    Client,
    PrivateKey,
    TokenId,
    AccountId,
    TransferTransaction,
    TokenTransferTransaction,
} = require("@hashgraph/sdk");

// --- Config from .env ---
const RPC_URL = process.env.ETH_RPC_URL; // Hedera EVM RPC endpoint (or other JSON-RPC that exposes the contract logs)
const TREASUREBOX_ADDRESS = process.env.TREASUREBOX_ADDRESS; // deployed Solidity TreasureBox contract address (EVM style)
const TREASUREBOX_ABI = require("../abis/TreasureBox.json").abi; // compile artifact ABI
const HEDERA_OPERATOR_ID = process.env.HEDERA_OPERATOR_ID; // e.g., "0.0.12345" (the treasury)
const HEDERA_OPERATOR_KEY = process.env.HEDERA_OPERATOR_KEY; // treasury private key (do NOT share)
const RN_TOKEN_ID = process.env.RN_TOKEN_ID || "0.0.6913517"; // your Rune token id
const RN_DECIMALS = parseInt(process.env.RN_DECIMALS || "8"); // you said 8 decimals

// --- Setup ethers provider to listen for events ---
const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
const contract = new ethers.Contract(TREASUREBOX_ADDRESS, TREASUREBOX_ABI, provider);

// --- Hedera client (treasury account signs the transfer) ---
const operatorId = AccountId.fromString(HEDERA_OPERATOR_ID);
const operatorKey = PrivateKey.fromString(HEDERA_OPERATOR_KEY);
const client = Client.forTestnet(); // or Client.forMainnet() if mainnet
client.setOperator(operatorId, operatorKey);

// helper: convert ethers-style EVM address to Hedera AccountId alias form
function evmAddressToAccountId(evmAddr) {
    // Hedera SDK provides AccountId.fromEvmAddress
    // But we accept either hex string or 0x-prefixed solidity addr
    return AccountId.fromEvmAddress(evmAddr);
}

async function handleAwardedCoinsRequested(recipientEvm, amountWei, requestId) {
    try {
        console.log("Award requested:", recipientEvm, amountWei.toString(), requestId.toString());

        // Convert amount based on RN_DECIMALS.
        // Note: TreasureBox amount uses token base units (should already be in smallest units).
        // If not, convert accordingly here. We'll treat amountWei as a BigNumber of base units.
        const amountBaseUnits = amountWei.toString(); // as string

        // Convert EVM address -> Hedera AccountId
        const recipientAccountId = evmAddressToAccountId(recipientEvm);
        console.log("Recipient Hedera AccountId:", recipientAccountId.toString());

        // Build Token transfer (treasury -> recipient)
        // The TokenTransferTransaction accepts tokenId & transfers map.
        const tokenId = TokenId.fromString(RN_TOKEN_ID);

        const tx = new TokenTransferTransaction()
            .addTokenTransfer(tokenId, operatorId, -BigInt(amountBaseUnits))
            .addTokenTransfer(tokenId, recipientAccountId, BigInt(amountBaseUnits));

        const submitResp = await tx.freezeWith(client).sign(operatorKey).execute(client);
        const receipt = await submitResp.getReceipt(client);

        console.log("Transfer executed, status:", receipt.status.toString());
        // Optionally: call your contract to mark fulfilled (if you want on-chain ack).
    } catch (err) {
        console.error("Error fulfilling award:", err);
    }
}

async function main() {
    console.log("Listening for AwardedCoinsRequested events...");

    // Listen for event: AwardedCoinsRequested(address indexed to, uint256 amount, uint256 requestId)
    contract.on("AwardedCoinsRequested", async (to, amount, requestId, event) => {
        console.log("Event caught:", { to, amount: amount.toString(), requestId: requestId.toString() });
        // call handler
        await handleAwardedCoinsRequested(to, amount, requestId);
    });

    // Keep the process alive
    process.stdin.resume();
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});