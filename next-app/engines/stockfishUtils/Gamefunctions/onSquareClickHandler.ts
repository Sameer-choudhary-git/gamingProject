import { Square } from "chess.js";
import { ChessGameState } from "../chessGameState";
import getMoveOptions from "./getMoveOptions";

export default function onSquareClickHandler(
  gameState: ChessGameState,
  makeAiMove?: () => void
) {
  // Correct signature: receives square and piece (optional) directly
  return function onSquareClick(square: Square, piece?: string) {
    const {
      chessGame,
      setChessPosition,
      moveFrom,
      setMoveFrom,
      setOptionSquares,
      isAiThinking,
    } = gameState;

    if (isAiThinking) {
      return;
    }

    // piece clicked to move (if no move is currently started)
    if (!moveFrom && piece) {
      // get the move options for the square
      const hasMoveOptions = getMoveOptions(
        square,
        chessGame,
        setOptionSquares
      );

      // if move options, set the moveFrom to the square
      if (hasMoveOptions) {
        setMoveFrom(square);
      }

      // return early
      return;
    }

    // square clicked to move to, check if valid move
    const moves = chessGame.moves({
      square: moveFrom as Square,
      verbose: true,
    });
    const foundMove = moves.find((m) => m.from === moveFrom && m.to === square);

    // not a valid move
    if (!foundMove) {
      // check if clicked on new piece
      const hasMoveOptions = getMoveOptions(
        square,
        chessGame,
        setOptionSquares
      );

      // if new piece, setMoveFrom, otherwise clear moveFrom
      setMoveFrom(hasMoveOptions ? square : ""); // or null

      // return early
      return;
    }

    // is normal move
    try {
      chessGame.move({
        from: moveFrom as Square,
        to: square,
        promotion: "q",
      });
    } catch {
      // if invalid, setMoveFrom and getMoveOptions
      const hasMoveOptions = getMoveOptions(
        square,
        chessGame,
        setOptionSquares
      );

      // if new piece, setMoveFrom, otherwise clear moveFrom
      if (hasMoveOptions) {
        setMoveFrom(square);
      }
      return;
    }

    // update the position state
    setChessPosition(chessGame.fen());

    // clear moveFrom and optionSquares
    setMoveFrom(""); // or null
    setOptionSquares({});
    
    if (makeAiMove) {
      setTimeout(() => {
        makeAiMove();
      }, 300);
    }
  };
}