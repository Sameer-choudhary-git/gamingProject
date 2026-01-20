import { Chess } from "chess.js";
export default interface ChessGameState{
   chessGame: Chess;
   setChessPosition: React.Dispatch<React.SetStateAction<string>>;
   moveFrom: string;
   setMoveFrom: React.Dispatch<React.SetStateAction<string>>;
   optionSquares: Record<string, React.CSSProperties>;
   setOptionSquares: React.Dispatch<React.SetStateAction<Record<string, React.CSSProperties>>>;
}
