import { create } from 'zustand';
import * as Contracts from '@/lib/contracts';

// =========================================================
// TYPES
// =========================================================

export type GameType = 'chess' | 'poker' | 'blackjack';

export interface User {
  id: string;
  username: string;
  avatar: string;
  address?: string;
  rating?: number;
  isReady?: boolean;
  isOnline?: boolean;
}

// FIX: Export Player as an alias of User so components can use it
export type Player = User;

// --- NEW TYPES FOR DASHBOARD ---
export interface Friend {
  id: string;
  username: string;
  avatar: string;
  isOnline: boolean;
  rating: number;
}

export interface MatchHistory {
  id: string;
  gameType: GameType;
  opponent: string;
  result: 'win' | 'loss' | 'draw';
  date: string; 
  amount: number;
}

export interface Notification {
  id: string;
  message: string;
  read: boolean;
  date: string;
  type: 'info' | 'invite' | 'system';
}

export interface Lobby {
  id: string;
  blockchainGameId?: string;
  name: string;
  gameType: GameType;
  host: User;
  players: User[];
  maxPlayers: number;
  entryFee: number;
  isPrivate: boolean;
  status: 'waiting' | 'in_progress' | 'finished';
  timeControl?: string;
  createdAt: Date;
}

interface GameState {
  // --- User State ---
  currentUser: User | null;
  walletAddress: string | null;
  balance: number;

  // --- Social & Dashboard State ---
  friends: Friend[];
  recentMatches: MatchHistory[];
  notifications: Notification[];

  // --- Platform Stats ---
  playersOnline: number;
  activeGames: number;
  totalPrizePool: number;
  
  // --- Game Lobby State ---
  lobbies: Lobby[];
  activeLobby: Lobby | null;
  isLoading: boolean;
  
  // --- Actions ---
  setCurrentUser: (user: User | null) => void;
  setWalletAddress: (address: string | null) => void;
  setBalance: (balance: number) => void;
  
  addLobby: (lobby: Lobby) => void;
  joinLobby: (lobbyId: string) => void;
  setActiveLobby: (lobby: Lobby | null) => void;
}

// =========================================================
// ZUSTAND STORE
// =========================================================

export const useGameStore = create<GameState>((set) => ({
  // Initial State
  currentUser: null,
  walletAddress: null,
  balance: 0,

  // --- MOCK DATA FOR DASHBOARD ---
  friends: [
    { id: 'f1', username: 'CryptoKing', avatar: '🦁', isOnline: true, rating: 1650 },
    { id: 'f2', username: 'BaseBuilder', avatar: '🛡️', isOnline: true, rating: 1420 },
    { id: 'f3', username: 'Alice_Dev', avatar: '👩‍💻', isOnline: false, rating: 1500 },
  ],
  
  recentMatches: [
    { id: 'm1', gameType: 'chess', opponent: 'GrandMaster_X', result: 'loss', amount: 0.05, date: new Date(Date.now() - 86400000).toISOString() },
    { id: 'm2', gameType: 'poker', opponent: 'Table #4', result: 'win', amount: 0.12, date: new Date(Date.now() - 172800000).toISOString() },
    { id: 'm3', gameType: 'chess', opponent: 'Rookie_1', result: 'win', amount: 0.01, date: new Date(Date.now() - 259200000).toISOString() },
  ],

  notifications: [
    { id: 'n1', message: 'Welcome to the Base Gaming Hub!', read: false, date: new Date().toISOString(), type: 'system' },
    { id: 'n2', message: 'CryptoKing challenged you to Chess', read: false, date: new Date().toISOString(), type: 'invite' },
  ],

  // Platform Stats
  playersOnline: 128, 
  activeGames: 45,
  totalPrizePool: 15000, 

  lobbies: [
    {
      id: 'lobby-demo-1',
      name: "Grandmaster's Arena",
      gameType: 'chess',
      host: { id: 'u1', username: 'Magnus', avatar: '👑', address: '0x123...' },
      players: [{ id: 'u1', username: 'Magnus', avatar: '👑', address: '0x123...' }],
      maxPlayers: 2,
      entryFee: 0.01,
      isPrivate: false,
      status: 'waiting',
      timeControl: '10+0',
      createdAt: new Date()
    }
  ],
  activeLobby: null,
  isLoading: false,

  // Actions
  setCurrentUser: (user) => set({ currentUser: user }),
  
  setWalletAddress: (address) => set({ walletAddress: address }),
  
  setBalance: (balance) => set({ balance: balance }),
  
  addLobby: (lobby) => set((state) => ({ lobbies: [lobby, ...state.lobbies] })),
  
  setActiveLobby: (lobby) => set({ activeLobby: lobby }),
  
  joinLobby: (lobbyId) => set((state) => {
    const { currentUser, lobbies } = state;
    if (!currentUser) return state;

    return {
      lobbies: lobbies.map((lobby) => 
        lobby.id === lobbyId && !lobby.players.find(p => p.id === currentUser.id)
          ? { ...lobby, players: [...lobby.players, currentUser] } 
          : lobby
      )
    };
  }),
}));

// =========================================================
// EXPORTS (Contract Wrappers)
// =========================================================

export const createChessGame = Contracts.createChessGame;
export const createPokerGame = Contracts.createPokerGame;
export const joinChessGame = Contracts.joinChessGame;
export const joinPokerGame = Contracts.joinPokerGame;
export const getPlayerChessGames = Contracts.getPlayerChessGames;
export const getChessGame = Contracts.getChessGame;
export const getPokerGame = Contracts.getPokerGame;
export const pokerFold = Contracts.pokerFold;
export const pokerCheck = Contracts.pokerCheck;
export const pokerCall = Contracts.pokerCall;
export const pokerRaise = Contracts.pokerRaise;
export const listenToPokerEvents = Contracts.listenToPokerEvents;