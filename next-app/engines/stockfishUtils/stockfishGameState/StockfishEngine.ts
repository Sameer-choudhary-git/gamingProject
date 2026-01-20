import { StockfishState } from ".";
import { READY_TIMEOUT,STOCKFISH_PATH,DEFAULT_DEPTH,CALCULATION_TIMEOUT } from "../contants";
import { UCIOptions } from "./UCI";
export class StockfishEngine {
  private state: StockfishState;

  constructor() {
    this.state = new StockfishState();
  }
  async initialize(): Promise<void> {
    if (this.state.worker) {
      return;
    }
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Stockfish initialization timeout"));
      }, READY_TIMEOUT);
      try {
        this.state.worker = new Worker(STOCKFISH_PATH);
        this.state.worker.onmessage = (event) => {
          const message = event.data;

          if (message === "readyok") {
            this.state.isReady = true;
            clearTimeout(timeout);
            resolve();
          }
          if (this.state.pendingMessages.length > 0) {
            const pending = this.state.pendingMessages[0];
            if (message.startsWith("bestmove")) {
              this.state.pendingMessages.shift();
              const match = message.match(/bestmove (\w+)/);
              if (match) {
                pending.resolve(match[1]);
              }
            }
          }
        };
        this.state.worker.onerror = (error) => {
          clearTimeout(timeout);
          reject(error);
        };

        this.state.worker.postMessage("uci");
        this.state.worker.postMessage("isready");
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  async setOptions(options: UCIOptions): Promise<void> {
    if (!this.state.worker || !this.state.isReady) {
      throw new Error("Stockfish not initialized");
    }

    if (options.limitStrength) {
      this.state.worker.postMessage(
        `setoption name UCI_LimitStrength value true`
      );
      this.state.worker.postMessage(
        `setoption name UCI_Elo value ${options.elo}`
      );
    } else {
      this.state.worker.postMessage(
        `setoption name UCI_LimitStrength value false`
      );
    }

    this.state.worker.postMessage(
      `setoption name Skill Level value ${options.skillLevel}`
    );
  }

  async getBestMove(
    fen: string,
    depth: number = DEFAULT_DEPTH
  ): Promise<string> {
    if (!this.state.worker || !this.state.isReady) {
      throw new Error("Stockfish not initialized");
    }
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Calculation timeout"));
      }, CALCULATION_TIMEOUT);

      this.state.pendingMessages.push({
        resolve: (move) => {
          clearTimeout(timeout);
          resolve(move);
        },
        reject: (error) => {
          clearTimeout(timeout);
          reject(error);
        },
      });
      this.state.worker!.postMessage(`position fen ${fen}`);
      this.state.worker!.postMessage(`go depth ${depth}`);
    });
  }
  
  terminate(): void {
    if (this.state.worker) {
      this.state.worker.terminate();
      this.state.worker = null;
      this.state.isReady = false;
      this.state.pendingMessages = [];
    }
  }

  isInitialized(): boolean {
    return this.state.isReady && this.state.worker !== null;
  }
}