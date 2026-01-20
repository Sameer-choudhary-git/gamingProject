export interface UCIOptions {
  limitStrength: boolean;
  elo: number;
  skillLevel: number;
}
export interface PendingMessage {
  resolve: (value: string) => void;
  reject: (error: Error) => void;
}