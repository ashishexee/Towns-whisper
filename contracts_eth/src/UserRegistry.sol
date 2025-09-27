// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

contract UserRegistry {
    struct User {
        string username;
        bool isRegistered;
        uint256 registrationTime;
    }
    
    mapping(address => User) public users;
    mapping(string => address) public usernameToAddress;
    mapping(string => bool) public usernameExists;
    
    event UserRegistered(address indexed userAddress, string username, uint256 timestamp);
    
    modifier onlyNewUser() {
        require(!users[msg.sender].isRegistered, "User already registered");
        _;
    }
    
    modifier validUsername(string memory _username) {
        require(bytes(_username).length >= 3, "Username must be at least 3 characters");
        require(bytes(_username).length <= 20, "Username must be at most 20 characters");
        require(!usernameExists[_username], "Username already taken");
        _;
    }
    
    function registerUser(string memory _username) 
        external 
        onlyNewUser 
        validUsername(_username) 
    {
        users[msg.sender] = User({
            username: _username,
            isRegistered: true,
            registrationTime: block.timestamp
        });
        
        usernameToAddress[_username] = msg.sender;
        usernameExists[_username] = true;
        
        emit UserRegistered(msg.sender, _username, block.timestamp);
    }
    
    function isUserRegistered(address _userAddress) external view returns (bool) {
        return users[_userAddress].isRegistered;
    }
    
    function getUserInfo(address _userAddress) 
        external 
        view 
        returns (string memory username, bool isRegistered, uint256 registrationTime) 
    {
        User memory user = users[_userAddress];
        return (user.username, user.isRegistered, user.registrationTime);
    }
    
    function isUsernameAvailable(string memory _username) external view returns (bool) {
        return !usernameExists[_username];
    }
}