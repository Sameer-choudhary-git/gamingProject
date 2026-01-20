/**
 * Updated GameStore Types for Blockchain Integration
 * Add these types to your gameStore or create a separate types file
 */

export type GameType = 'chess' | 'poker' | 'blackjack';
export type LobbyStatus = 'waiting' | 'in_progress' | 'finished';

export interface User {
  id: string;
  username: string;
  avatar: string;
  rating: number;
  isReady: boolean;
  isOnline: boolean;
  walletAddress?: string; // Added for blockchain integration
}

export interface Lobby {
  id: string;
  blockchainGameId?: string; // 🟢 NEW: Link to blockchain game ID
  name: string;
  gameType: GameType;
  host: User;
  players: User[];
  maxPlayers: number;
  entryFee: number; // In ETH
  isPrivate: boolean;
  status: LobbyStatus;
  timeControl?: string;
  createdAt: Date;
  // Blockchain specific
  txHash?: string; // Transaction hash
  contractAddress?: string; // Game contract address
}

export interface Match {
  id: string;
  gameId?: string; // Blockchain game ID
  gameType: GameType;
  players: User[];
  winner?: User;
  result: 'win' | 'loss' | 'draw';
  opponent: string;
  date: string;
  prize?: number; // Winnings in ETH
  txHash?: string; // Settlement transaction hash
}

export interface Notification {
  id: string;
  type: 'game_invite' | 'game_start' | 'game_end' | 'friend_request' | 'transaction';
  message: string;
  read: boolean;
  timestamp: Date;
  txHash?: string; // For transaction notifications
  gameId?: string; // For game-related notifications
}

export interface GameState {
  // User state
  currentUser: User | null;
  walletAddress: string | null;
  balance: number; // GAME token balance
  ethBalance?: number; // ETH balance for gas
  
  // Game state
  lobbies: Lobby[];
  activeLobby: Lobby | null;
  friends: User[];
  recentMatches: Match[];
  notifications: Notification[];
  
  // Platform stats
  playersOnline: number;
  activeGames: number;
  totalPrizePool: number;
  
  // Actions
  setCurrentUser: (user: User | null) => void;
  setWalletAddress: (address: string | null) => void;
  setBalance: (balance: number) => void;
  setEthBalance: (balance: number) => void;
  
  addLobby: (lobby: Lobby) => void;
  joinLobby: (lobbyId: string) => void;
  leaveLobby: (lobbyId: string) => void;
  setActiveLobby: (lobby: Lobby | null) => void;
  updateLobbyStatus: (lobbyId: string, status: LobbyStatus) => void;
  updateLobbyGameId: (lobbyId: string, blockchainGameId: string, txHash?: string) => void;
  
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  markNotificationRead: (id: string) => void;
  
  addMatch: (match: Match) => void;
}

/**
 * Example Zustand Store Implementation
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useGameStore = create<GameState>()(
  persist(
    (set) => ({
      // Initial state
      currentUser: null,
      walletAddress: null,
      balance: 0,
      ethBalance: 0,
      lobbies: [],
      activeLobby: null,
      friends: [],
      recentMatches: [],
      notifications: [],
      playersOnline: 1247,
      activeGames: 89,
      totalPrizePool: 15420,

      // Actions
      setCurrentUser: (user) => set({ currentUser: user }),
      setWalletAddress: (address) => set({ walletAddress: address }),
      setBalance: (balance) => set({ balance }),
      setEthBalance: (balance) => set({ ethBalance: balance }),

      addLobby: (lobby) => set((state) => ({ 
        lobbies: [...state.lobbies, lobby] 
      })),

      joinLobby: (lobbyId) => set((state) => ({
        lobbies: state.lobbies.map((lobby) =>
          lobby.id === lobbyId && state.currentUser
            ? { 
                ...lobby, 
                players: [...lobby.players, state.currentUser],
                status: lobby.players.length + 1 >= lobby.maxPlayers ? 'in_progress' : lobby.status
              }
            : lobby
        ),
      })),

      leaveLobby: (lobbyId) => set((state) => ({
        lobbies: state.lobbies.map((lobby) =>
          lobby.id === lobbyId && state.currentUser
            ? {
                ...lobby,
                players: lobby.players.filter((p) => p.id !== state.currentUser?.id),
              }
            : lobby
        ),
      })),

      setActiveLobby: (lobby) => set({ activeLobby: lobby }),

      updateLobbyStatus: (lobbyId, status) => set((state) => ({
        lobbies: state.lobbies.map((lobby) =>
          lobby.id === lobbyId ? { ...lobby, status } : lobby
        ),
      })),

      updateLobbyGameId: (lobbyId, blockchainGameId, txHash) => set((state) => ({
        lobbies: state.lobbies.map((lobby) =>
          lobby.id === lobbyId 
            ? { ...lobby, blockchainGameId, txHash } 
            : lobby
        ),
      })),

      addNotification: (notification) => set((state) => ({
        notifications: [
          {
            ...notification,
            id: `notif-${Date.now()}`,
          },
          ...state.notifications,
        ],
      })),

      markNotificationRead: (id) => set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, read: true } : n
        ),
      })),

      addMatch: (match) => set((state) => ({
        recentMatches: [match, ...state.recentMatches].slice(0, 10),
      })),
    }),
    {
      name: 'game-storage',
      partialize: (state) => ({
        currentUser: state.currentUser,
        walletAddress: state.walletAddress,
        recentMatches: state.recentMatches,
      }),
    }
  )
);

/**
 * Helper function to sync blockchain game with lobby
 */
export const syncGameWithLobby = async (
  lobbyId: string,
  gameId: string,
  txHash: string
) => {
  const store = useGameStore.getState();
  store.updateLobbyGameId(lobbyId, gameId, txHash);
  
  store.addNotification({
    type: 'transaction',
    message: `Game created on blockchain! Game ID: ${gameId}`,
    read: false,
    timestamp: new Date(),
    txHash,
    gameId,
  });
};

/**
 * Helper to add match result
 */
export const recordMatchResult = (
  gameType: GameType,
  opponent: User,
  result: 'win' | 'loss' | 'draw',
  prize?: number,
  gameId?: string,
  txHash?: string
) => {
  const store = useGameStore.getState();
  
  store.addMatch({
    id: `match-${Date.now()}`,
    gameId,
    gameType,
    players: [store.currentUser!, opponent],
    winner: result === 'win' ? store.currentUser! : result === 'loss' ? opponent : undefined,
    result,
    opponent: opponent.username,
    date: new Date().toISOString(),
    prize,
    txHash,
  });
  
  // Update user stats if you have that
  if (result === 'win' && prize) {
    store.setBalance(store.balance + prize);
  }
};