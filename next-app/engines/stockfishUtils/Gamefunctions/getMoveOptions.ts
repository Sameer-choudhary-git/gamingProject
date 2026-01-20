import { Chess, Square } from "chess.js";
export default function getMoveOptions(
  square: Square,
  chessGame: Chess,
  setOptionSquares: React.Dispatch<
    React.SetStateAction<Record<string, React.CSSProperties>>
  >
): boolean {
  // get the moves for the square
  const moves = chessGame.moves({
    square,
    verbose: true,
  });

  // if no moves, clear the option squares
  if (moves.length === 0) {
    setOptionSquares({});
    return false;
  }

  // create a new object to store the option squares
  const newSquares: Record<string, React.CSSProperties> = {};

  // loop through the moves and set the option squares
  for (const move of moves) {
    newSquares[move.to] = {
      background:
        chessGame.get(move.to) &&
        chessGame.get(move.to)?.color !== chessGame.get(square)?.color
          ? "radial-gradient(circle, rgba(0,0,0,.1) 85%, transparent 85%)" // larger circle for capturing
          : "radial-gradient(circle, rgba(0,0,0,.1) 25%, transparent 25%)",
      // smaller circle for moving
      borderRadius: "50%",
    };
  }

  // set the square clicked to move from to yellow
  newSquares[square] = {
    background: "rgba(255, 255, 0, 0.4)",
  };

  // set the option squares
  setOptionSquares(newSquares);

  // return true to indicate that there are move options
  return true;
}
