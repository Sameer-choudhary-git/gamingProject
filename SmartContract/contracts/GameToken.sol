// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title GameToken
 * @dev Platform token for your gaming ecosystem
 */
contract GameToken is ERC20, ERC20Burnable, Ownable {
    
    // Maximum supply cap (e.g., 1 billion tokens)
    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10**18;
    
    // Minter role
    mapping(address => bool) public minters;
    
    // Events
    event MinterAdded(address indexed minter);
    event MinterRemoved(address indexed minter);
    event TokensMinted(address indexed to, uint256 amount);
    
    constructor (
    string memory name,
    string memory symbol,
    uint256 initialSupply
    ) ERC20(name, symbol) Ownable(msg.sender) {
    require(initialSupply <= MAX_SUPPLY, "Initial supply exceeds max");
    
    // Mint initial supply to deployer
    if (initialSupply > 0) {
        _mint(msg.sender, initialSupply);
    }
    
    // Add deployer as first minter
    minters[msg.sender] = true;
}
    
    /**
     * @dev Add a minter
     */
    function addMinter(address minter) external onlyOwner {
        require(minter != address(0), "Invalid minter address");
        require(!minters[minter], "Already a minter");
        
        minters[minter] = true;
        emit MinterAdded(minter);
    }
    
    /**
     * @dev Remove a minter
     */
    function removeMinter(address minter) external onlyOwner {
        require(minters[minter], "Not a minter");
        
        minters[minter] = false;
        emit MinterRemoved(minter);
    }
    
    /**
     * @dev Mint new tokens (only minters)
     */
    function mint(address to, uint256 amount) external {
        require(minters[msg.sender], "Caller is not a minter");
        require(totalSupply() + amount <= MAX_SUPPLY, "Would exceed max supply");
        
        _mint(to, amount);
        emit TokensMinted(to, amount);
    }
    
    /**
     * @dev Batch mint to multiple addresses
     */
    function batchMint(address[] calldata recipients, uint256[] calldata amounts) external {
        require(minters[msg.sender], "Caller is not a minter");
        require(recipients.length == amounts.length, "Array length mismatch");
        
        uint256 totalAmount = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            totalAmount += amounts[i];
        }
        
        require(totalSupply() + totalAmount <= MAX_SUPPLY, "Would exceed max supply");
        
        for (uint256 i = 0; i < recipients.length; i++) {
            _mint(recipients[i], amounts[i]);
            emit TokensMinted(recipients[i], amounts[i]);
        }
    }
}