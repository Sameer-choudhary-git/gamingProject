// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract ChessGame is ReentrancyGuard {
    enum GameStatus { Waiting, InProgress, WhiteWins, BlackWins, Draw }
    enum PieceColor { None, White, Black }
    
    struct Game {
        address whitePlayer;
        address blackPlayer;
        address token; // address(0) for ETH, otherwise ERC20 address
        uint256 stake;
        GameStatus status;
        PieceColor currentTurn;
        uint256 moveCount;
        bytes32 boardHash;
        uint256 lastMoveTime;
    }
    
    mapping(uint256 => Game) public games;
    mapping(address => uint256[]) public playerGames;
    uint256 public gameCounter;
    
    uint256 public constant MOVE_TIMEOUT = 24 hours;
    
    event GameCreated(uint256 indexed gameId, address indexed creator, address token, uint256 stake);
    event GameJoined(uint256 indexed gameId, address indexed joiner);
    event MoveMade(uint256 indexed gameId, address indexed player, bytes moveData);
    event GameEnded(uint256 indexed gameId, GameStatus status, address winner);
    
    // --- ETH METHODS ---

    function createGame() external payable returns (uint256) {
        return _createGame(address(0), msg.value);
    }

    function joinGame(uint256 gameId) external payable nonReentrant {
        Game storage game = games[gameId];
        require(game.token == address(0), "This game requires tokens");
        require(msg.value == game.stake, "Incorrect ETH amount");
        _joinGame(gameId);
    }

    // --- TOKEN METHODS ---

    function createGameWithToken(address token, uint256 amount) external returns (uint256) {
        require(token != address(0), "Invalid token address");
        require(amount > 0, "Stake must be > 0");
        
        // Transfer tokens from creator to contract
        // User must Approve this contract first!
        IERC20(token).transferFrom(msg.sender, address(this), amount);
        
        return _createGame(token, amount);
    }

    function joinGameWithToken(uint256 gameId) external nonReentrant {
        Game storage game = games[gameId];
        require(game.token != address(0), "This game requires ETH");
        
        // Transfer tokens from joiner to contract
        IERC20(game.token).transferFrom(msg.sender, address(this), game.stake);
        
        _joinGame(gameId);
    }

    // --- INTERNAL LOGIC ---

    function _createGame(address token, uint256 stake) internal returns (uint256) {
        uint256 gameId = gameCounter++;
        
        games[gameId] = Game({
            whitePlayer: msg.sender,
            blackPlayer: address(0),
            token: token,
            stake: stake,
            status: GameStatus.Waiting,
            currentTurn: PieceColor.White,
            moveCount: 0,
            boardHash: keccak256("initial_board_state"),
            lastMoveTime: block.timestamp
        });
        
        playerGames[msg.sender].push(gameId);
        emit GameCreated(gameId, msg.sender, token, stake);
        return gameId;
    }

    function _joinGame(uint256 gameId) internal {
        Game storage game = games[gameId];
        require(game.status == GameStatus.Waiting, "Game not available");
        require(game.blackPlayer == address(0), "Game full");
        require(msg.sender != game.whitePlayer, "Cannot play self");
        
        game.blackPlayer = msg.sender;
        game.status = GameStatus.InProgress;
        game.lastMoveTime = block.timestamp;
        
        playerGames[msg.sender].push(gameId);
        emit GameJoined(gameId, msg.sender);
    }

    // --- GAMEPLAY (UNCHANGED) ---

    function makeMove(uint256 gameId, bytes calldata moveData, bytes32 newBoardHash) external {
        Game storage game = games[gameId];
        require(game.status == GameStatus.InProgress, "Game not in progress");
        
        if (game.currentTurn == PieceColor.White) {
            require(msg.sender == game.whitePlayer, "Not your turn");
            game.currentTurn = PieceColor.Black;
        } else {
            require(msg.sender == game.blackPlayer, "Not your turn");
            game.currentTurn = PieceColor.White;
        }
        
        game.boardHash = newBoardHash;
        game.moveCount++;
        game.lastMoveTime = block.timestamp;
        
        emit MoveMade(gameId, msg.sender, moveData);
    }

    function endGame(uint256 gameId, GameStatus result) external nonReentrant {
        Game storage game = games[gameId];
        require(game.status == GameStatus.InProgress, "Game not in progress");
        require(msg.sender == game.whitePlayer || msg.sender == game.blackPlayer, "Not a player");
        require(result != GameStatus.Waiting && result != GameStatus.InProgress, "Invalid result");
        
        game.status = result;
        _distributePrizes(game, result);
    }

    function _distributePrizes(Game storage game, GameStatus result) internal {
        uint256 totalPot = game.stake * 2;
        address winner = address(0);

        if (result == GameStatus.WhiteWins) winner = game.whitePlayer;
        else if (result == GameStatus.BlackWins) winner = game.blackPlayer;

        if (winner != address(0)) {
            // Winner takes all
            if (game.token == address(0)) {
                payable(winner).transfer(totalPot);
            } else {
                IERC20(game.token).transfer(winner, totalPot);
            }
            emit GameEnded(game.moveCount, result, winner); // Using moveCount as dummy ID for event signature match
        } else {
            // Draw - Refund
            if (game.token == address(0)) {
                payable(game.whitePlayer).transfer(game.stake);
                payable(game.blackPlayer).transfer(game.stake);
            } else {
                IERC20(game.token).transfer(game.whitePlayer, game.stake);
                IERC20(game.token).transfer(game.blackPlayer, game.stake);
            }
            emit GameEnded(game.moveCount, result, address(0));
        }
    }
}