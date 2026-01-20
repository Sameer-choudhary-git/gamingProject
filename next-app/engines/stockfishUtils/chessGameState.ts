import { Chess } from "chess.js";
import React from "react";
import { StockfishEngine } from "./stockfishGameState/StockfishEngine";
export interface ChessGameState {
  chessGame: Chess;
  chessPosition: string;
  setChessPosition: React.Dispatch<React.SetStateAction<string>>;
  moveFrom: string;
  setMoveFrom: React.Dispatch<React.SetStateAction<string>>;
  optionSquares: Record<string, React.CSSProperties>;
  setOptionSquares: React.Dispatch<
    React.SetStateAction<Record<string, React.CSSProperties>>
  >;
  stockfishEngine?: StockfishEngine;
  isAiThinking?: boolean;
  setIsAiThinking?: React.Dispatch<React.SetStateAction<boolean>>;
}
//implement this interface in Board.tsx