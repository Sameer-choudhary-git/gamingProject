"use client";

import React, {
  useRef,
  useState,
  useEffect,
  useMemo,
  useCallback, // Added missing import
} from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import { StockfishEngine } from "@/engines/stockfishUtils/stockfishGameState/StockfishEngine"; // Check this path
import { useRouter } from "next/navigation"; // Next.js equivalent of useNavigate
import {
  ArrowLeft,
  Clock,
  RotateCcw,
  Flag,
  Cpu,
  User,
  Trophy,
  AlertTriangle,
} from "lucide-react";

// --- Types ---
// Ensure these paths match your project structure
import { ChessGameState } from "@/engines/stockfishUtils/chessGameState"; 
import onPieceDropHandler from "@/engines/stockfishUtils/Gamefunctions/onDropPieceHandler";
import onSquareClickHandler from "@/engines/stockfishUtils/Gamefunctions/onSquareClickHandler";

const INITIAL_TIME = 600; // 10 minutes

const formatTime = (time: number) => {
  const minutes = Math.floor(time / 60);
  const seconds = time % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
};

interface BoardProps {
  gameId: string;
}

const Board = ({ gameId }: BoardProps) => {
  const router = useRouter(); // Use this for navigation (back button)
  const isVsAI = gameId === "ai";

  // --- GAME STATE ---
  const chessGameRef = useRef(new Chess());
  const chessGame = chessGameRef.current;

  const [chessPosition, setChessPosition] = useState(chessGame.fen());
  const [moveFrom, setMoveFrom] = useState("");
  const [optionSquares, setOptionSquares] = useState({});
  const [isAiThinking, setIsAiThinking] = useState(false);

  // Timers & Status
  const [whiteTime, setWhiteTime] = useState(INITIAL_TIME);
  const [blackTime, setBlackTime] = useState(INITIAL_TIME);
  const [gameStatus, setGameStatus] = useState<
    "playing" | "checkmate" | "draw" | "timeout" | "resigned"
  >("playing");
  const [winner, setWinner] = useState<"w" | "b" | "draw" | null>(null);

  const stockfishEngineRef = useRef<StockfishEngine | null>(null);

  // --- INIT: Blockchain vs AI Switch ---
  useEffect(() => {
    if (isVsAI) {
      // Logic for Local Stockfish is handled in the Engine Setup useEffect below
      console.log("Initializing AI Mode");
    } else {
      // Logic for Blockchain Game
      console.log(`Initializing Blockchain Game for ID: ${gameId}`);
      // TODO: Fetch contract state here using gameId
    }
  }, [gameId, isVsAI]);

  // --- ENGINE SETUP (Only runs if AI mode is potentially needed) ---
  useEffect(() => {
    const engine = new StockfishEngine();
    stockfishEngineRef.current = engine;
    
    engine.initialize().then(() => {
      engine.setOptions({ limitStrength: true, elo: 1500, skillLevel: 10 });
    });

    return () => {
      if (stockfishEngineRef.current) stockfishEngineRef.current.terminate();
    };
  }, []);

  // --- TIMER LOGIC ---
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (gameStatus === "playing") {
      interval = setInterval(() => {
        if (chessGame.isGameOver()) return;

        const turn = chessGame.turn();
        if (turn === "w") {
          setWhiteTime((prev) => {
            if (prev <= 1) {
              setGameStatus("timeout");
              setWinner("b");
              return 0;
            }
            return prev - 1;
          });
        } else {
          setBlackTime((prev) => {
            if (prev <= 1) {
              setGameStatus("timeout");
              setWinner("w");
              return 0;
            }
            return prev - 1;
          });
        }
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [gameStatus, chessPosition, chessGame]);

  // --- GAME OVER DETECTION ---
  useEffect(() => {
    if (chessGame.isCheckmate()) {
      setGameStatus("checkmate");
      setWinner(chessGame.turn() === "w" ? "b" : "w");
      setIsAiThinking(false);
    } else if (
      chessGame.isDraw() ||
      chessGame.isStalemate() ||
      chessGame.isThreefoldRepetition()
    ) {
      setGameStatus("draw");
      setWinner("draw");
      setIsAiThinking(false);
    }
  }, [chessPosition, chessGame]);

  // --- MOVE HANDLING ---
  const makeAiMove = async () => {
    // Only move if AI mode is active and it's black's turn
    if (!isVsAI || !stockfishEngineRef.current || isAiThinking || gameStatus !== "playing")
      return;

    if (chessGame.isGameOver()) return;
    if (chessGame.turn() !== "b") return;

    setIsAiThinking(true);
    try {
      const bestMove = await stockfishEngineRef.current.getBestMove(
        chessGame.fen(),
      );

      if (bestMove) {
        const from = bestMove.substring(0, 2);
        const to = bestMove.substring(2, 4);
        const promotion = bestMove.length > 4 ? bestMove[4] : undefined;

        chessGame.move({
          from: from as any,
          to: to as any,
          promotion: promotion as any,
        });
        setChessPosition(chessGame.fen());
      }
    } catch (error) {
      console.error("Stockfish move error", error);
    } finally {
      setIsAiThinking(false);
    }
  };

  // --- ACTIONS ---
  const handleReset = () => {
    chessGame.reset();
    setChessPosition(chessGame.fen());
    setOptionSquares({});
    setWhiteTime(INITIAL_TIME);
    setBlackTime(INITIAL_TIME);
    setGameStatus("playing");
    setWinner(null);
    setIsAiThinking(false);
  };

  const handleResign = () => {
    if (gameStatus !== "playing") return;
    setGameStatus("resigned");
    setWinner("b"); 
    // TODO: If blockchain, send resign transaction
  };

  const handleUndo = () => {
    if (gameStatus !== "playing" || isAiThinking) return;
    chessGame.undo(); // Undo AI/Opponent
    chessGame.undo(); // Undo You
    setChessPosition(chessGame.fen());
    setOptionSquares({});
  };

  // --- HANDLERS SETUP ---
  const gameState: ChessGameState = {
    chessGame,
    chessPosition,
    setChessPosition,
    moveFrom,
    setMoveFrom,
    optionSquares,
    setOptionSquares,
    stockfishEngine: stockfishEngineRef.current ?? undefined,
    isAiThinking,
    setIsAiThinking,
  };

  const onPieceDrop = onPieceDropHandler(gameState, makeAiMove);
  const onSquareClick = onSquareClickHandler(gameState, makeAiMove);

  const moveHistory = useMemo(() => {
    const history = chessGame.history({ verbose: true });
    const moves = [];
    for (let i = 0; i < history.length; i += 2) {
      moves.push({ white: history[i], black: history[i + 1] || null });
    }
    return moves;
  }, [chessPosition, chessGame]);

  return (
    <div className="min-h-screen bg-[#0B0E14] text-slate-200 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <button 
            onClick={() => router.back()} // Next.js navigation
            className="flex items-center text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            <span className="font-medium tracking-wide">BACK</span>
          </button>
          <h1 className="text-2xl font-bold tracking-wider text-white uppercase">
            {isVsAI ? "Stockfish 1500" : `Match #${gameId}`}
          </h1>
          <div className="w-16"></div>
        </header>

        <div className="grid lg:grid-cols-[1fr_380px] gap-8">
          {/* LEFT: Board Area */}
          <div className="flex flex-col gap-4">
            
            {/* Opponent Card (AI or Blockchain Player) */}
            <div
              className={`bg-[#161922] rounded-xl p-4 flex items-center justify-between shadow-lg border ${chessGame.turn() === "b" && gameStatus === "playing" ? "border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.1)]" : "border-slate-800/50"}`}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <Cpu className="w-7 h-7" />
                </div>
                <div>
                  <div className="font-bold text-white">
                     {isVsAI ? "Stockfish AI" : "Opponent"}
                  </div>
                  <div className="text-xs font-mono text-slate-500">
                    {isVsAI ? "ELO: 1500" : "Waiting..."}
                  </div>
                </div>
              </div>
              <div
                className={`px-4 py-2 rounded-lg font-mono text-xl flex items-center gap-2 border ${chessGame.turn() === "b" ? "bg-[#1e293b] text-white border-cyan-500" : "bg-[#0B0E14] text-slate-500 border-slate-800"}`}
              >
                <Clock className="w-4 h-4" />
                {formatTime(blackTime)}
              </div>
            </div>

            {/* CHESSBOARD */}
            <div className="relative w-full aspect-square max-w-[700px] mx-auto bg-[#161922] p-1 rounded-sm shadow-2xl">
              <Chessboard 
                id="PlayBoard"
                position={chessPosition}
                onPieceDrop={onPieceDrop}
                onSquareClick={onSquareClick}
                customSquareStyles={optionSquares}
                customDarkSquareStyle={{ backgroundColor: "#334155" }}
                customLightSquareStyle={{ backgroundColor: "#94a3b8" }}
                animationDuration={200}
                arePiecesDraggable={gameStatus === "playing"}
              />

              {/* GAME OVER MODAL OVERLAY */}
              {gameStatus !== "playing" && (
                <div className="absolute inset-0 z-10 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 rounded-sm">
                  <div className="bg-[#161922] border border-slate-700 p-8 rounded-2xl shadow-2xl max-w-sm w-full text-center">
                    <Trophy
                      className={`w-16 h-16 mx-auto mb-4 ${winner === "w" ? "text-yellow-400" : "text-slate-400"}`}
                    />
                    <h2 className="text-2xl font-bold text-white mb-2">
                      {winner === "w"
                        ? "You Won!"
                        : winner === "b"
                          ? "You Lost"
                          : "Draw"}
                    </h2>
                    <p className="text-slate-400 mb-6 capitalize">
                      {gameStatus === "checkmate"
                        ? `By Checkmate`
                        : gameStatus === "timeout"
                          ? `Time Ran Out`
                          : gameStatus === "resigned"
                            ? `Opponent Resigned`
                            : "Stalemate / Draw"}
                    </p>
                    <button
                      onClick={handleReset}
                      className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-bold py-3 rounded-lg transition-all"
                    >
                      New Game
                    </button>
                  </div>
                </div>
              )}

              {/* AI Thinking Overlay */}
              {isAiThinking && gameStatus === "playing" && (
                <div className="absolute top-4 right-4 bg-black/80 text-cyan-400 px-3 py-1 rounded-full text-xs font-bold animate-pulse flex items-center gap-2 border border-cyan-500/30 shadow-lg z-0">
                  <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" />
                  AI THINKING...
                </div>
              )}
            </div>

            {/* Player Card */}
            <div
              className={`bg-[#161922] rounded-xl p-4 flex items-center justify-between shadow-lg border ${chessGame.turn() === "w" && gameStatus === "playing" ? "border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.1)]" : "border-slate-800/50"}`}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-teal-500/20 flex items-center justify-center text-teal-400">
                  <User className="w-7 h-7" />
                </div>
                <div>
                  <div className="font-bold text-white">You</div>
                  <div className="text-xs font-mono text-slate-500">
                    ELO: 1500
                  </div>
                </div>
              </div>
              <div
                className={`px-4 py-2 rounded-lg font-mono text-xl flex items-center gap-2 border ${chessGame.turn() === "w" ? "bg-[#1e293b] text-white border-cyan-500" : "bg-[#0B0E14] text-slate-500 border-slate-800"}`}
              >
                <Clock className="w-4 h-4" />
                {formatTime(whiteTime)}
              </div>
            </div>
          </div>

          {/* RIGHT: Sidebar */}
          <div className="space-y-6">
            {/* Game Status */}
            <div className="bg-[#161922] rounded-xl p-5 border border-slate-800/50 shadow-xl">
              <h3 className="text-white font-bold mb-4 tracking-wide uppercase text-sm">
                Game Status
              </h3>
              <div className="space-y-3">
                {chessGame.inCheck() && gameStatus === "playing" && (
                  <div className="bg-red-500/20 border border-red-500/50 text-red-400 px-3 py-2 rounded text-center font-bold flex items-center justify-center gap-2 animate-pulse">
                    <AlertTriangle className="w-4 h-4" /> CHECK
                  </div>
                )}

                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400">Turn</span>
                  <span
                    className={`font-bold px-2 py-0.5 rounded ${chessGame.turn() === "w" ? "bg-white text-black" : "bg-black text-white border border-slate-700"}`}
                  >
                    {chessGame.turn() === "w" ? "White" : "Black"}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400">Total Moves</span>
                  <span className="font-mono text-white">
                    {Math.floor(chessGame.history().length / 2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-[#161922] rounded-xl p-5 border border-slate-800/50 shadow-xl">
              <h3 className="text-white font-bold mb-4 tracking-wide uppercase text-sm">
                Actions
              </h3>
              <button
                onClick={handleReset}
                className="w-full mb-3 bg-cyan-500 hover:bg-cyan-400 text-black font-bold py-3 rounded-lg transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)]"
              >
                NEW GAME
              </button>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleUndo}
                  disabled={
                    gameStatus !== "playing" ||
                    isAiThinking ||
                    moveHistory.length === 0
                  }
                  className="flex items-center justify-center gap-2 bg-[#1f2937] hover:bg-[#374151] disabled:opacity-50 disabled:cursor-not-allowed text-slate-300 py-2 rounded-lg text-sm font-medium transition-colors border border-slate-700"
                >
                  <RotateCcw className="w-4 h-4" />
                  Undo
                </button>
                <button
                  onClick={handleResign}
                  disabled={gameStatus !== "playing"}
                  className="flex items-center justify-center gap-2 bg-[#1f2937] hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-300 py-2 rounded-lg text-sm font-medium transition-colors border border-slate-700 hover:border-red-500/50"
                >
                  <Flag className="w-4 h-4" />
                  Resign
                </button>
              </div>
            </div>

            {/* Move History */}
            <div className="bg-[#161922] rounded-xl p-5 border border-slate-800/50 shadow-xl flex flex-col h-[300px]">
              <h3 className="text-white font-bold mb-4 tracking-wide uppercase text-sm">
                Move History
              </h3>
              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-1">
                {moveHistory.length === 0 ? (
                  <div className="text-slate-600 text-sm text-center italic mt-10">
                    No moves yet
                  </div>
                ) : (
                  moveHistory.map((move, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-[30px_1fr_1fr] gap-2 text-sm py-1.5 px-2 rounded hover:bg-slate-800/50"
                    >
                      <span className="text-slate-500 font-mono text-xs pt-1">
                        {index + 1}.
                      </span>
                      <span className="bg-[#1F2937] text-slate-200 px-2 rounded text-center font-medium">
                        {move.white.san}
                      </span>
                      {move.black && (
                        <span className="bg-[#1F2937] text-slate-200 px-2 rounded text-center font-medium">
                          {move.black.san}
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Board;