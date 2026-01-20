// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
/**
 * @title PokerGame
 * @dev Texas Hold'em Poker game contract
 */
contract PokerGame is ReentrancyGuard {
    
    enum GameStatus { Waiting, InProgress, Finished }
    enum Action { None, Fold, Check, Call, Raise }
    
    struct Player {
        address addr;
        uint256 balance;
        uint256 currentBet;
        bool folded;
        bool isActive;
    }
    
    struct Game {
        uint256 gameId;
        address creator;
        uint256 buyIn;
        uint256 smallBlind;
        uint256 bigBlind;
        uint256 pot;
        GameStatus status;
        uint8 maxPlayers;
        uint8 playerCount;
        uint8 currentPlayerIndex;
        uint256 currentBet;
        uint256 lastActionTime;
        bytes32 deckHash; // For verifiable randomness
    }
    
    // Platform contract
    address public platformContract;
    
    // Games
    mapping(uint256 => Game) public games;
    mapping(uint256 => mapping(uint8 => Player)) public gamePlayers;
    mapping(uint256 => address[]) public gamePlayerAddresses;
    
    uint256 public gameCounter;
    uint256 public constant ACTION_TIMEOUT = 60 seconds;
    
    // Events
    event GameCreated(uint256 indexed gameId, address indexed creator, uint256 buyIn);
    event PlayerJoined(uint256 indexed gameId, address indexed player, uint8 seatIndex);
    event GameStarted(uint256 indexed gameId);
    event PlayerAction(uint256 indexed gameId, address indexed player, Action action, uint256 amount);
    event PotAwarded(uint256 indexed gameId, address indexed winner, uint256 amount);
    event GameEnded(uint256 indexed gameId);
    
    modifier onlyActivePlayers(uint256 gameId) {
        bool isPlayer = false;
        for (uint8 i = 0; i < games[gameId].maxPlayers; i++) {
            if (gamePlayers[gameId][i].addr == msg.sender && gamePlayers[gameId][i].isActive) {
                isPlayer = true;
                break;
            }
        }
        require(isPlayer, "Not an active player");
        _;
    }
    
    constructor(address _platformContract) {
        platformContract = _platformContract;
    }
    
    /**
     * @dev Create a new poker game
     */
    function createGame(
        uint256 buyIn,
        uint256 smallBlind,
        uint256 bigBlind,
        uint8 maxPlayers
    ) external payable returns (uint256) {
        require(buyIn > 0, "Buy-in must be positive");
        require(msg.value == buyIn, "Must send buy-in amount");
        require(maxPlayers >= 2 && maxPlayers <= 9, "Invalid player count");
        require(smallBlind > 0 && bigBlind > smallBlind, "Invalid blinds");
        
        uint256 gameId = gameCounter++;
        
        games[gameId] = Game({
            gameId: gameId,
            creator: msg.sender,
            buyIn: buyIn,
            smallBlind: smallBlind,
            bigBlind: bigBlind,
            pot: 0,
            status: GameStatus.Waiting,
            maxPlayers: maxPlayers,
            playerCount: 1,
            currentPlayerIndex: 0,
            currentBet: 0,
            lastActionTime: block.timestamp,
            deckHash: keccak256(abi.encodePacked(block.timestamp, msg.sender, gameId))
        });
        
        // Add creator as first player
        gamePlayers[gameId][0] = Player({
            addr: msg.sender,
            balance: buyIn,
            currentBet: 0,
            folded: false,
            isActive: true
        });
        
        gamePlayerAddresses[gameId].push(msg.sender);
        
        emit GameCreated(gameId, msg.sender, buyIn);
        emit PlayerJoined(gameId, msg.sender, 0);
        
        return gameId;
    }
    
    /**
     * @dev Join an existing game
     */
    function joinGame(uint256 gameId) external payable nonReentrant {
        Game storage game = games[gameId];
        require(game.status == GameStatus.Waiting, "Game not available");
        require(msg.value == game.buyIn, "Incorrect buy-in amount");
        require(game.playerCount < game.maxPlayers, "Game is full");
        
        // Check player not already in game
        for (uint8 i = 0; i < game.playerCount; i++) {
            require(gamePlayers[gameId][i].addr != msg.sender, "Already in game");
        }
        
        uint8 seatIndex = game.playerCount;
        
        gamePlayers[gameId][seatIndex] = Player({
            addr: msg.sender,
            balance: game.buyIn,
            currentBet: 0,
            folded: false,
            isActive: true
        });
        
        gamePlayerAddresses[gameId].push(msg.sender);
        game.playerCount++;
        
        emit PlayerJoined(gameId, msg.sender, seatIndex);
        
        // Auto-start if full
        if (game.playerCount == game.maxPlayers) {
            _startGame(gameId);
        }
    }
    
    /**
     * @dev Start game manually (creator only, if at least 2 players)
     */
    function startGame(uint256 gameId) external {
        Game storage game = games[gameId];
        require(msg.sender == game.creator, "Only creator can start");
        require(game.status == GameStatus.Waiting, "Game already started");
        require(game.playerCount >= 2, "Need at least 2 players");
        
        _startGame(gameId);
    }
    
    /**
     * @dev Internal function to start game
     */
    function _startGame(uint256 gameId) internal {
        Game storage game = games[gameId];
        game.status = GameStatus.InProgress;
        game.lastActionTime = block.timestamp;
        
        // Post blinds
        _postBlind(gameId, 0, game.smallBlind);
        _postBlind(gameId, 1, game.bigBlind);
        
        game.currentBet = game.bigBlind;
        game.currentPlayerIndex = 2 % game.playerCount;
        
        emit GameStarted(gameId);
    }
    
    /**
     * @dev Post blind
     */
    function _postBlind(uint256 gameId, uint8 playerIndex, uint256 amount) internal {
        Player storage player = gamePlayers[gameId][playerIndex];
        require(player.balance >= amount, "Insufficient balance for blind");
        
        player.balance -= amount;
        player.currentBet = amount;
        games[gameId].pot += amount;
    }
    
    /**
     * @dev Player folds
     */
    function fold(uint256 gameId) external onlyActivePlayers(gameId) {
        Game storage game = games[gameId];
        require(game.status == GameStatus.InProgress, "Game not in progress");
        
        uint8 playerIndex = _getPlayerIndex(gameId, msg.sender);
        require(playerIndex == game.currentPlayerIndex, "Not your turn");
        
        Player storage player = gamePlayers[gameId][playerIndex];
        player.folded = true;
        
        emit PlayerAction(gameId, msg.sender, Action.Fold, 0);
        
        _nextTurn(gameId);
    }
    
    /**
     * @dev Player checks
     */
    function check(uint256 gameId) external onlyActivePlayers(gameId) {
        Game storage game = games[gameId];
        require(game.status == GameStatus.InProgress, "Game not in progress");
        
        uint8 playerIndex = _getPlayerIndex(gameId, msg.sender);
        require(playerIndex == game.currentPlayerIndex, "Not your turn");
        
        Player storage player = gamePlayers[gameId][playerIndex];
        require(player.currentBet == game.currentBet, "Must call or raise");
        
        emit PlayerAction(gameId, msg.sender, Action.Check, 0);
        
        _nextTurn(gameId);
    }
    
    /**
     * @dev Player calls
     */
    function call(uint256 gameId) external onlyActivePlayers(gameId) {
        Game storage game = games[gameId];
        require(game.status == GameStatus.InProgress, "Game not in progress");
        
        uint8 playerIndex = _getPlayerIndex(gameId, msg.sender);
        require(playerIndex == game.currentPlayerIndex, "Not your turn");
        
        Player storage player = gamePlayers[gameId][playerIndex];
        uint256 callAmount = game.currentBet - player.currentBet;
        require(player.balance >= callAmount, "Insufficient balance");
        
        player.balance -= callAmount;
        player.currentBet += callAmount;
        game.pot += callAmount;
        
        emit PlayerAction(gameId, msg.sender, Action.Call, callAmount);
        
        _nextTurn(gameId);
    }
    
    /**
     * @dev Player raises
     */
    function raise(uint256 gameId, uint256 raiseAmount) external onlyActivePlayers(gameId) {
        Game storage game = games[gameId];
        require(game.status == GameStatus.InProgress, "Game not in progress");
        
        uint8 playerIndex = _getPlayerIndex(gameId, msg.sender);
        require(playerIndex == game.currentPlayerIndex, "Not your turn");
        
        Player storage player = gamePlayers[gameId][playerIndex];
        uint256 totalBet = game.currentBet + raiseAmount;
        uint256 needed = totalBet - player.currentBet;
        require(player.balance >= needed, "Insufficient balance");
        
        player.balance -= needed;
        player.currentBet = totalBet;
        game.pot += needed;
        game.currentBet = totalBet;
        
        emit PlayerAction(gameId, msg.sender, Action.Raise, raiseAmount);
        
        _nextTurn(gameId);
    }
    
    /**
     * @dev End game and award pot (simplified - in production, use oracle for hand evaluation)
     */
    function endGame(uint256 gameId, address winner) external nonReentrant {
        Game storage game = games[gameId];
        require(game.status == GameStatus.InProgress, "Game not in progress");
        require(msg.sender == game.creator, "Only creator can end game"); // In production, use oracle
        
        // Award pot to winner
        uint256 potAmount = game.pot;
        game.status = GameStatus.Finished;
        
        payable(winner).transfer(potAmount);
        
        emit PotAwarded(gameId, winner, potAmount);
        emit GameEnded(gameId);
    }
    
    /**
     * @dev Get player index
     */
    function _getPlayerIndex(uint256 gameId, address player) internal view returns (uint8) {
        for (uint8 i = 0; i < games[gameId].playerCount; i++) {
            if (gamePlayers[gameId][i].addr == player) {
                return i;
            }
        }
        revert("Player not found");
    }
    
    /**
     * @dev Move to next player's turn
     */
    function _nextTurn(uint256 gameId) internal {
        Game storage game = games[gameId];
        game.lastActionTime = block.timestamp;
        
        // Find next active, non-folded player
        uint8 startIndex = game.currentPlayerIndex;
        uint8 activePlayers = 0;
        
        for (uint8 i = 0; i < game.playerCount; i++) {
            if (gamePlayers[gameId][i].isActive && !gamePlayers[gameId][i].folded) {
                activePlayers++;
            }
        }
        
        // If only one player left, they win
        if (activePlayers == 1) {
            for (uint8 i = 0; i < game.playerCount; i++) {
                if (gamePlayers[gameId][i].isActive && !gamePlayers[gameId][i].folded) {
                    address winner = gamePlayers[gameId][i].addr;
                    uint256 potAmount = game.pot;
                    game.status = GameStatus.Finished;
                    payable(winner).transfer(potAmount);
                    emit PotAwarded(gameId, winner, potAmount);
                    emit GameEnded(gameId);
                    return;
                }
            }
        }
        
        // Move to next player
        do {
            game.currentPlayerIndex = (game.currentPlayerIndex + 1) % game.playerCount;
        } while (
            gamePlayers[gameId][game.currentPlayerIndex].folded || 
            !gamePlayers[gameId][game.currentPlayerIndex].isActive
        );
    }
    
    /**
     * @dev Get game details
     */
    function getGame(uint256 gameId) external view returns (Game memory) {
        return games[gameId];
    }
    
    /**
     * @dev Get player in game
     */
    function getPlayer(uint256 gameId, uint8 playerIndex) external view returns (Player memory) {
        return gamePlayers[gameId][playerIndex];
    }
}