// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title GamePlatform
 * @dev Main platform contract that manages all games, fees, and platform operations
 */
contract GamePlatform is Ownable, ReentrancyGuard {
    
    // Platform token (your custom ERC20 token)
    IERC20 public platformToken;
    
    // Platform fee percentage (basis points: 250 = 2.5%)
    uint256 public platformFee = 250; // 2.5%
    uint256 public constant MAX_FEE = 1000; // 10% max
    uint256 public constant BASIS_POINTS = 10000;
    
    // Treasury address for platform fees
    address public treasury;
    
    // Registered game contracts
    mapping(address => bool) public registeredGames;
    address[] public gameContracts;
    
    // Player statistics
    struct PlayerStats {
        uint256 totalGamesPlayed;
        uint256 totalWins;
        uint256 totalLosses;
        uint256 totalDraws;
        uint256 totalWagered;
        uint256 totalWinnings;
    }
    
    mapping(address => PlayerStats) public playerStats;
    
    // Events
    event GameRegistered(address indexed gameContract, string gameName);
    event GameUnregistered(address indexed gameContract);
    event PlatformFeeUpdated(uint256 oldFee, uint256 newFee);
    event TreasuryUpdated(address oldTreasury, address newTreasury);
    event FeesCollected(address indexed game, uint256 amount);
    event PlayerStatsUpdated(address indexed player);
    
    constructor(address _platformToken, address _treasury) Ownable(msg.sender) {
    require(_platformToken != address(0), "Invalid token address");
    require(_treasury != address(0), "Invalid treasury address");
    
    platformToken = IERC20(_platformToken);
    treasury = _treasury;
}
    
    /**
     * @dev Register a new game contract
     */
    function registerGame(address gameContract, string calldata gameName) external onlyOwner {
        require(gameContract != address(0), "Invalid game contract");
        require(!registeredGames[gameContract], "Game already registered");
        
        registeredGames[gameContract] = true;
        gameContracts.push(gameContract);
        
        emit GameRegistered(gameContract, gameName);
    }
    
    /**
     * @dev Unregister a game contract
     */
    function unregisterGame(address gameContract) external onlyOwner {
        require(registeredGames[gameContract], "Game not registered");
        
        registeredGames[gameContract] = false;
        
        // Remove from array
        for (uint256 i = 0; i < gameContracts.length; i++) {
            if (gameContracts[i] == gameContract) {
                gameContracts[i] = gameContracts[gameContracts.length - 1];
                gameContracts.pop();
                break;
            }
        }
        
        emit GameUnregistered(gameContract);
    }
    
    /**
     * @dev Update platform fee
     */
    function updatePlatformFee(uint256 newFee) external onlyOwner {
        require(newFee <= MAX_FEE, "Fee too high");
        
        uint256 oldFee = platformFee;
        platformFee = newFee;
        
        emit PlatformFeeUpdated(oldFee, newFee);
    }
    
    /**
     * @dev Update treasury address
     */
    function updateTreasury(address newTreasury) external onlyOwner {
        require(newTreasury != address(0), "Invalid treasury");
        
        address oldTreasury = treasury;
        treasury = newTreasury;
        
        emit TreasuryUpdated(oldTreasury, newTreasury);
    }
    
    /**
     * @dev Calculate platform fee for a given amount
     */
    function calculateFee(uint256 amount) public view returns (uint256) {
        return (amount * platformFee) / BASIS_POINTS;
    }
    
    /**
     * @dev Update player statistics (called by game contracts)
     */
    function updatePlayerStats(
        address player,
        bool won,
        bool draw,
        uint256 wagered,
        uint256 winnings
    ) external {
        require(registeredGames[msg.sender], "Caller not a registered game");
        
        PlayerStats storage stats = playerStats[player];
        stats.totalGamesPlayed++;
        
        if (won) {
            stats.totalWins++;
        } else if (draw) {
            stats.totalDraws++;
        } else {
            stats.totalLosses++;
        }
        
        stats.totalWagered += wagered;
        stats.totalWinnings += winnings;
        
        emit PlayerStatsUpdated(player);
    }
    
    /**
     * @dev Get player statistics
     */
    function getPlayerStats(address player) external view returns (PlayerStats memory) {
        return playerStats[player];
    }
    
    /**
     * @dev Get all registered game contracts
     */
    function getAllGames() external view returns (address[] memory) {
        return gameContracts;
    }
    
    /**
     * @dev Collect fees from game contract (ETH)
     */
    function collectEthFees() external nonReentrant {
        require(registeredGames[msg.sender], "Caller not a registered game");
        
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to collect");
        
        payable(treasury).transfer(balance);
        emit FeesCollected(msg.sender, balance);
    }
    
    /**
     * @dev Collect fees from game contract (Tokens)
     */
    function collectTokenFees(uint256 amount) external nonReentrant {
        require(registeredGames[msg.sender], "Caller not a registered game");
        require(amount > 0, "Invalid amount");
        
        platformToken.transferFrom(msg.sender, treasury, amount);
        emit FeesCollected(msg.sender, amount);
    }
    
    /**
     * @dev Emergency withdraw (owner only)
     */
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        if (balance > 0) {
            payable(owner()).transfer(balance);
        }
    }
    
    // Receive ETH
    receive() external payable {}
}