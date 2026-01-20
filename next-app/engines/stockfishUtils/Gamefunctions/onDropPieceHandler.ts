import { Square } from "chess.js";
import { ChessGameState } from "../chessGameState";
import { CALCULATION_TIMEOUT } from "../contants";

export default function onPieceDropHandler(
  gameState: ChessGameState,
  makeAiMove?: () => void
) {
  // Correct signature: receives sourceSquare and targetSquare directly
  return function onPieceDrop(sourceSquare: Square, targetSquare: Square) {
    const {
      chessGame,
      setChessPosition,
      setMoveFrom,
      setOptionSquares,
      isAiThinking,
    } = gameState;

    if (isAiThinking) {
      return false;
    }

    // type narrow targetSquare potentially being null (e.g. if dropped off board)
    if (!targetSquare) {
      return false;
    }

    // try to make the move according to chess.js logic
    try {
      const move = chessGame.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: "q", // always promote to a queen for example simplicity
      });

      // chess.js .move() returns null/undefined if invalid, or the move object if valid.
      // We must check if move is valid before proceeding.
      if (!move) return false;

      // update the position state upon successful move to trigger a re-render of the chessboard
      setChessPosition(chessGame.fen());

      // clear moveFrom and optionSquares
      setMoveFrom(null); // or "" depending on your type
      setOptionSquares({});

      // make random cpu move after a short delay
      if (makeAiMove) {
        setTimeout(() => {
          makeAiMove();
        }, CALCULATION_TIMEOUT / 3);
      }
      // return true as the move was successful
      return true;
    } catch {
      // return false as the move was not successful
      return false;
    }
  };
}