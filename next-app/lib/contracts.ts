// FILE: src/lib/contracts.ts (Ethers v6 Version - Fixed)
import { ethers, Contract, TransactionReceipt } from "ethers";
import { getProvider, getSigner, CHESS_CONTRACT_ADDRESS, POKER_CONTRACT_ADDRESS, GAME_TOKEN_ADDRESS } from "./wallet";

// --- ABIs ---
const CHESS_ABI = [
  "function createGame() external payable returns (uint256)",
  "function createGameWithToken(address token, uint256 amount) external returns (uint256)",
  "function joinGame(uint256 gameId) external payable",
  "function joinGameWithToken(uint256 gameId) external",
  "function makeMove(uint256 gameId, bytes calldata moveData, bytes32 newBoardHash) external",
  "function getGame(uint256 gameId) external view returns (tuple(address whitePlayer, address blackPlayer, address token, uint256 stake, uint8 status, uint8 currentTurn, uint256 moveCount, bytes32 boardHash, uint256 lastMoveTime))",
  "function getPlayerGames(address player) external view returns (uint256[])",
  "event GameCreated(uint256 indexed gameId, address indexed creator, address token, uint256 stake)",
  "event GameJoined(uint256 indexed gameId, address indexed joiner)",
  "event MoveMade(uint256 indexed gameId, address indexed player, bytes moveData)",
  "event GameEnded(uint256 indexed gameId, uint8 status, address winner)",
];

const POKER_ABI = [
  "function createGame(uint256 buyIn, uint256 smallBlind, uint256 bigBlind, uint8 maxPlayers) external payable returns (uint256)",
  "function joinGame(uint256 gameId) external payable",
  "function startGame(uint256 gameId) external",
  "function fold(uint256 gameId) external",
  "function check(uint256 gameId) external",
  "function call(uint256 gameId) external",
  "function raise(uint256 gameId, uint256 raiseAmount) external",
  "function getGame(uint256 gameId) external view returns (tuple(uint256 gameId, address creator, uint256 buyIn, uint256 smallBlind, uint256 bigBlind, uint256 pot, uint8 status, uint8 maxPlayers, uint8 playerCount, uint8 currentPlayerIndex, uint256 currentBet, uint256 lastActionTime, bytes32 deckHash))",
  "event GameCreated(uint256 indexed gameId, address indexed creator, uint256 buyIn)",
  "event PlayerJoined(uint256 indexed gameId, address indexed player, uint8 seatIndex)",
  "event GameStarted(uint256 indexed gameId)",
];

// --- TYPES ---
export enum GameType {
  CHESS = "chess",
  POKER = "poker",
}

export enum GameStatus {
  WAITING = 0,
  IN_PROGRESS = 1,
  FINISHED = 2,
}

export interface ChessGame {
  gameId: string;
  whitePlayer: string;
  blackPlayer: string;
  stake: string;
  status: GameStatus;
  currentTurn: number;
  moveCount: number;
  boardHash: string;
  lastMoveTime: number;
}

export interface PokerGame {
  gameId: string;
  creator: string;
  buyIn: string;
  smallBlind: string;
  bigBlind: string;
  pot: string;
  status: GameStatus;
  maxPlayers: number;
  playerCount: number;
  currentPlayerIndex: number;
  currentBet: string;
  lastActionTime: number;
}

// --- HELPER: Validate Ethereum Address ---
const isValidAddress = (address: string | undefined): boolean => {
  if (!address || address.trim() === "") return false;
  try {
    // Check if it's a valid Ethereum address
    return ethers.isAddress(address);
  } catch {
    return false;
  }
};

// --- HELPER: Get Contract Instance (v6) ---
const getContractInstance = async (address: string, abi: any[], needSigner: boolean = false) => {
  // Validate address is not empty and is a valid Ethereum address
  if (!isValidAddress(address)) {
    throw new Error(
      `Invalid contract address: "${address}". ` +
      `Please check that your .env.local file contains the correct NEXT_PUBLIC_* variables. ` +
      `Expected format: NEXT_PUBLIC_CHESS_CONTRACT_ADDRESS=0x...`
    );
  }
  
  if (needSigner) {
    const signer = await getSigner();
    return new Contract(address, abi, signer);
  } else {
    const provider = getProvider();
    return new Contract(address, abi, provider);
  }
};

// --- CHESS FUNCTIONS ---

export const makeChessMove = async (gameId: string, moveData: string, newBoardHash: string): Promise<void> => {
  const contract = await getContractInstance(CHESS_CONTRACT_ADDRESS, CHESS_ABI, true);
  const moveBytes = ethers.toUtf8Bytes(moveData);
  const tx = await contract.makeMove(gameId, moveBytes, newBoardHash);
  await tx.wait();
};

export const getChessGame = async (gameId: string) => {
  try {
    const contract = await getContractInstance(CHESS_CONTRACT_ADDRESS, CHESS_ABI, false);
    const game = await contract.getGame(gameId);

    return {
      gameId,
      whitePlayer: game.whitePlayer,
      blackPlayer: game.blackPlayer,
      token: game.token,
      stake: ethers.formatEther(game.stake),
      status: Number(game.status),
      currentTurn: Number(game.currentTurn),
      moveCount: Number(game.moveCount),
      boardHash: game.boardHash,
      lastMoveTime: Number(game.lastMoveTime),
    };
  } catch (error) {
    console.error("Error getting chess game:", error);
    throw error;
  }
};

export const getPlayerChessGames = async (playerAddress: string): Promise<string[]> => {
  const contract = await getContractInstance(CHESS_CONTRACT_ADDRESS, CHESS_ABI, false);
  const gameIds = await contract.getPlayerGames(playerAddress);
  return gameIds.map((id: bigint) => id.toString());
};

export const createChessGame = async (
  amount: string, 
  isToken: boolean = false
): Promise<string> => {
  try {
    const contract = await getContractInstance(CHESS_CONTRACT_ADDRESS, CHESS_ABI, true);
    let tx;

    if (isToken) {
      if (!isValidAddress(GAME_TOKEN_ADDRESS)) {
        throw new Error("Game Token Address not configured or invalid");
      }
      const amountWei = ethers.parseUnits(amount, 18);
      tx = await contract.createGameWithToken(GAME_TOKEN_ADDRESS, amountWei);
    } else {
      const amountWei = ethers.parseEther(amount);
      tx = await contract.createGame({ value: amountWei });
    }

    console.log("Transaction sent:", tx.hash);
    const receipt = await tx.wait();

    // v6 Change: Event Parsing
    const iface = new ethers.Interface(CHESS_ABI);
    let gameId = null;

    for (const log of receipt.logs) {
      try {
        const parsed = iface.parseLog(log);
        if (parsed && parsed.name === "GameCreated") {
          gameId = parsed.args.gameId.toString();
          break;
        }
      } catch (e) { continue; }
    }

    if (!gameId) throw new Error("GameCreated event not found");
    return gameId;

  } catch (error: any) {
    console.error("Error creating chess game:", error);
    throw error;
  }
};

export const joinChessGame = async (
  gameId: string, 
  amount: string, 
  isToken: boolean = false
): Promise<void> => {
  try {
    const contract = await getContractInstance(CHESS_CONTRACT_ADDRESS, CHESS_ABI, true);
    let tx;

    if (isToken) {
      tx = await contract.joinGameWithToken(gameId);
    } else {
      const amountWei = ethers.parseEther(amount);
      tx = await contract.joinGame(gameId, { value: amountWei });
    }

    await tx.wait();
  } catch (error) {
    console.error("Error joining chess game:", error);
    throw error;
  }
};

// --- POKER FUNCTIONS ---

export const createPokerGame = async (buyInEth: string, smallBlindEth: string, bigBlindEth: string, maxPlayers: number): Promise<string> => {
  const contract = await getContractInstance(POKER_CONTRACT_ADDRESS, POKER_ABI, true);
  const buyIn = ethers.parseEther(buyInEth);
  const smallBlind = ethers.parseEther(smallBlindEth);
  const bigBlind = ethers.parseEther(bigBlindEth);
  
  const tx = await contract.createGame(buyIn, smallBlind, bigBlind, maxPlayers, { value: buyIn });
  const receipt = await tx.wait();
  
  const iface = new ethers.Interface(POKER_ABI);
  let gameId = null;

  for (const log of receipt.logs) {
    try {
      const parsed = iface.parseLog(log);
      if (parsed && parsed.name === "GameCreated") {
        gameId = parsed.args.gameId.toString();
        break;
      }
    } catch (e) { continue; }
  }
  
  if (!gameId) throw new Error("GameCreated event not found");
  return gameId;
};

export const joinPokerGame = async (gameId: string, buyInEth: string): Promise<void> => {
  const contract = await getContractInstance(POKER_CONTRACT_ADDRESS, POKER_ABI, true);
  const buyIn = ethers.parseEther(buyInEth);
  const tx = await contract.joinGame(gameId, { value: buyIn });
  await tx.wait();
};

export const getPokerGame = async (gameId: string): Promise<PokerGame> => {
  const contract = await getContractInstance(POKER_CONTRACT_ADDRESS, POKER_ABI, false);
  const game = await contract.getGame(gameId);
  return {
    gameId: game.gameId.toString(),
    creator: game.creator,
    buyIn: ethers.formatEther(game.buyIn),
    smallBlind: ethers.formatEther(game.smallBlind),
    bigBlind: ethers.formatEther(game.bigBlind),
    pot: ethers.formatEther(game.pot),
    status: Number(game.status),
    maxPlayers: Number(game.maxPlayers),
    playerCount: Number(game.playerCount),
    currentPlayerIndex: Number(game.currentPlayerIndex),
    currentBet: ethers.formatEther(game.currentBet),
    lastActionTime: Number(game.lastActionTime),
  };
};

export const pokerFold = async (gameId: string): Promise<void> => {
  const contract = await getContractInstance(POKER_CONTRACT_ADDRESS, POKER_ABI, true);
  const tx = await contract.fold(gameId);
  await tx.wait();
};

export const pokerCheck = async (gameId: string): Promise<void> => {
  const contract = await getContractInstance(POKER_CONTRACT_ADDRESS, POKER_ABI, true);
  const tx = await contract.check(gameId);
  await tx.wait();
};

export const pokerCall = async (gameId: string): Promise<void> => {
  const contract = await getContractInstance(POKER_CONTRACT_ADDRESS, POKER_ABI, true);
  const tx = await contract.call(gameId);
  await tx.wait();
};

export const pokerRaise = async (gameId: string, raiseAmountEth: string): Promise<void> => {
  const contract = await getContractInstance(POKER_CONTRACT_ADDRESS, POKER_ABI, true);
  const raiseAmount = ethers.parseEther(raiseAmountEth);
  const tx = await contract.raise(gameId, raiseAmount);
  await tx.wait();
};

export const listenToPokerEvents = (
  gameId: string,
  callbacks: {
    onPlayerJoined?: (player: string, seat: number) => void;
    onGameStarted?: () => void;
  }
) => {
  let contract: Contract | null = null;
  
  getContractInstance(POKER_CONTRACT_ADDRESS, POKER_ABI, false).then((c) => {
    contract = c;
    
    if (callbacks.onPlayerJoined) {
        contract.on("PlayerJoined", (id, player, seat) => {
            if (id.toString() === gameId) callbacks.onPlayerJoined!(player, Number(seat));
        });
    }

    if (callbacks.onGameStarted) {
        contract.on("GameStarted", (id) => {
            if (id.toString() === gameId) callbacks.onGameStarted!();
        });
    }
  }).catch((error) => {
    console.error("Error setting up poker event listeners:", error);
  });

  return () => {
    if (contract) {
        contract.removeAllListeners();
    }
  };
};

// --- UTILS ---
export const estimateGas = async (
  contract: Contract,
  methodName: string,
  ...args: any[]
): Promise<string> => {
  try {
    // @ts-ignore - Dynamic method access
    const gasEstimate = await contract.estimateGas[methodName](...args);
    const feeData = await getProvider().getFeeData();
    const gasPrice = feeData.gasPrice ?? BigInt(0);
    
    const gasCost = gasEstimate * gasPrice;
    return ethers.formatEther(gasCost);
  } catch (error) {
    console.error("Error estimating gas:", error);
    return "0";
  }
};