import { ethers } from 'ethers';

// Contract ABI - you'll need to update this with the actual ABI after compiling
const USER_REGISTRY_ABI = [
    "function registerUser(string memory _username) external",
    "function isUserRegistered(address _userAddress) external view returns (bool)",
    "function getUserInfo(address _userAddress) external view returns (string memory username, bool isRegistered, uint256 registrationTime)",
    "function isUsernameAvailable(string memory _username) external view returns (bool)",
    "event UserRegistered(address indexed userAddress, string username, uint256 timestamp)"
];

const USER_REGISTRY_ADDRESS = "0xffd7c7a891300758507f4ac1303a6a9f1deb7946"; // Replace with deployed contract address

export class UserRegistryService {
    constructor(provider, signer) {
        this.provider = provider;
        this.signer = signer;
        this.contract = new ethers.Contract(USER_REGISTRY_ADDRESS, USER_REGISTRY_ABI, signer);
        this.readOnlyContract = new ethers.Contract(USER_REGISTRY_ADDRESS, USER_REGISTRY_ABI, provider);
    }

    async isUserRegistered(address) {
        try {
            return await this.readOnlyContract.isUserRegistered(address);
        } catch (error) {
            console.error("Error checking user registration:", error);
            return false;
        }
    }

    async getUserInfo(address) {
        try {
            const [username, isRegistered, registrationTime] = await this.readOnlyContract.getUserInfo(address);
            return {
                username,
                isRegistered,
                registrationTime: registrationTime.toString()
            };
        } catch (error) {
            console.error("Error getting user info:", error);
            return null;
        }
    }

    async isUsernameAvailable(username) {
        try {
            return await this.readOnlyContract.isUsernameAvailable(username);
        } catch (error) {
            console.error("Error checking username availability:", error);
            return false;
        }
    }

    async registerUser(username) {
        try {
            const tx = await this.contract.registerUser(username);
            console.log("Registration transaction sent:", tx.hash);
            const receipt = await tx.wait();
            console.log("Registration confirmed:", receipt);
            return { success: true, txHash: tx.hash };
        } catch (error) {
            console.error("Error registering user:", error);
            return { success: false, error: error.message };
        }
    }
}