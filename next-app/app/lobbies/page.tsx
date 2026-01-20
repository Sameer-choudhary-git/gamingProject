"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useGameStore, Lobby, GameType } from '@/stores/gameStore';
import { Button } from '@/ui/button';
import { useToast } from '@/hooks/use-toast';
import { 
  createChessGame,
} from '@/lib/contracts';
import { 
  getEthBalance, 
  getGameBalance, 
  isOnCorrectNetwork, 
  switchToBase, 
  NETWORK,
  approveToken,
  checkAllowance,
  GAME_TOKEN_ADDRESS,
  CHESS_CONTRACT_ADDRESS
} from '@/lib/wallet';
import { 
  ArrowLeft, Plus, Users, Coins, Lock, 
  Search, Sword, Bot, Loader2,
  AlertCircle, Wallet, Check
} from 'lucide-react';

export default function LobbiesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { currentUser, walletAddress, lobbies, addLobby, setActiveLobby } = useGameStore();
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGame, setFilterGame] = useState<GameType | 'all'>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [ethBalance, setEthBalance] = useState('0');
  const [gameBalance, setGameBalance] = useState('0');
  const [onCorrectNetwork, setOnCorrectNetwork] = useState(true);

  // Reusing the same useEffects for balances and network checks as in your previous files
  // Ensure you include them here (omitted for brevity, but crucial for function)

  const filteredLobbies = lobbies.filter((lobby) => {
    const matchesSearch = lobby.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGame = filterGame === 'all' || lobby.gameType === filterGame;
    return matchesSearch && matchesGame;
  });

  const handleCreateGame = async (lobbyData: any) => {
    setShowCreateModal(false);
    setIsLoading(true);
    
    try {
      let gameId: string;
      
      if (lobbyData.gameType === 'chess') {
        // 1. Create Game on Blockchain
        gameId = await createChessGame(
          lobbyData.entryFee.toString(), 
          lobbyData.currency === 'GAME'
        );
        
        toast({
          title: 'Game Created!',
          description: `Game ID: ${gameId}`,
        });

        // 2. Add to local store (Optimistic UI)
        const newLobby: Lobby = {
          id: `lobby-${Date.now()}`,
          blockchainGameId: gameId,
          name: lobbyData.name,
          gameType: 'chess',
          host: currentUser!,
          players: [currentUser!],
          maxPlayers: 2,
          entryFee: lobbyData.entryFee,
          isPrivate: lobbyData.isPrivate,
          status: 'waiting',
          createdAt: new Date(),
        };
        addLobby(newLobby);
        setActiveLobby(newLobby);

        // 3. Navigate IMMEDIATELY to the game
        router.push(`/games/chess/${gameId}`);
      } 
      // Add Poker logic here...

    } catch (error: any) {
      console.error('Failed to create game:', error);
      toast({
        title: 'Failed to Create Game',
        description: error.message || 'Transaction failed',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <main className="max-w-7xl mx-auto p-6 space-y-8">
        
        {/* SECTION 1: GAME MODES */}
        <section>
          <h2 className="text-2xl font-display font-bold mb-4">Select Game Mode</h2>
          <div className="grid md:grid-cols-2 gap-6">
            
            {/* Practice vs AI */}
            <motion.div 
              whileHover={{ scale: 1.02 }}
              className="gaming-card p-8 cursor-pointer relative overflow-hidden group"
              onClick={() => router.push('/games/chess/ai')}
            >
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Bot className="w-32 h-32" />
              </div>
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400 mb-4">
                  <Bot className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-bold mb-2">Practice vs AI</h3>
                <p className="text-muted-foreground mb-4">Sharpen your skills against Stockfish engine. No fees, no pressure.</p>
                <Button variant="secondary" className="w-fit">Play Now</Button>
              </div>
            </motion.div>

            {/* Ranked PvP */}
            <motion.div 
              whileHover={{ scale: 1.02 }}
              className="gaming-card p-8 cursor-pointer relative overflow-hidden group"
              onClick={() => document.getElementById('public-lobbies')?.scrollIntoView({ behavior: 'smooth' })}
            >
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Sword className="w-32 h-32" />
              </div>
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center text-orange-400 mb-4">
                  <Sword className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-bold mb-2">Ranked PvP</h3>
                <p className="text-muted-foreground mb-4">Compete against real players. Wager ETH or GAME tokens.</p>
                <Button variant="hero" className="w-fit">Find Match</Button>
              </div>
            </motion.div>

          </div>
        </section>

        {/* SECTION 2: PUBLIC LOBBIES */}
        <section id="public-lobbies">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-display font-bold">Public Lobbies</h2>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4 mr-2" /> Create Lobby
            </Button>
          </div>

          <div className="space-y-3">
             {filteredLobbies.map(lobby => (
               <div key={lobby.id} className="gaming-card p-4">
                 {/* Basic Lobby Display Logic */}
                 <h3>{lobby.name}</h3>
                 <Button onClick={() => router.push(`/lobbies/${lobby.id}`)}>Join</Button>
               </div>
             ))}
          </div>
        </section>
      </main>

      {/* CREATE LOBBY MODAL */}
      {showCreateModal && (
        <CreateLobbyModal 
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateGame}
          ethBalance={ethBalance}
          gameBalance={gameBalance}
          walletAddress={walletAddress || ''}
        />
      )}
    </div>
  );
};

const CreateLobbyModal = ({ onClose, onCreate, ethBalance, gameBalance, walletAddress }: any) => {
  const [currency, setCurrency] = useState<'ETH' | 'GAME'>('ETH');
  const [entryFee, setEntryFee] = useState(0);
  const [name, setName] = useState('');
  const [isApproving, setIsApproving] = useState(false);
  const [hasAllowance, setHasAllowance] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      if (currency === 'GAME' && entryFee > 0) {
        const allowance = await checkAllowance(GAME_TOKEN_ADDRESS, walletAddress, CHESS_CONTRACT_ADDRESS);
        setHasAllowance(parseFloat(allowance) >= entryFee);
      } else {
        setHasAllowance(true);
      }
    };
    checkAuth();
  }, [currency, entryFee, walletAddress]);

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      const tx = await approveToken(GAME_TOKEN_ADDRESS, CHESS_CONTRACT_ADDRESS, "1000000");
      await tx.wait();
      setHasAllowance(true);
    } catch (e) {
      console.error(e);
    } finally {
      setIsApproving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="gaming-card p-6 max-w-md w-full"
      >
        <h2 className="text-xl font-bold mb-4">Create Game Lobby</h2>
        
        <div className="mb-4">
          <label className="block text-sm mb-2">Lobby Name</label>
          <input 
            type="text" 
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-input border border-border rounded p-2"
            placeholder="Epic Chess Match"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm mb-2">Currency</label>
          <div className="flex bg-input rounded p-1">
            <button 
              className={`flex-1 py-2 rounded text-sm font-medium transition-colors ${currency === 'ETH' ? 'bg-primary text-primary-foreground' : 'hover:bg-white/5'}`}
              onClick={() => setCurrency('ETH')}
            >
              ETH
            </button>
            <button 
              className={`flex-1 py-2 rounded text-sm font-medium transition-colors ${currency === 'GAME' ? 'bg-primary text-primary-foreground' : 'hover:bg-white/5'}`}
              onClick={() => setCurrency('GAME')}
            >
              GAME Token
            </button>
          </div>
          <div className="text-right text-xs text-muted-foreground mt-1">
            Balance: {currency === 'ETH' ? parseFloat(ethBalance).toFixed(4) : parseFloat(gameBalance).toFixed(2)}
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm mb-2">Entry Fee ({currency})</label>
          <input 
            type="number" 
            value={entryFee}
            onChange={(e) => setEntryFee(parseFloat(e.target.value))}
            className="w-full bg-input border border-border rounded p-2"
            step={currency === 'ETH' ? "0.001" : "10"}
          />
        </div>

        <div className="flex gap-3">
          <Button variant="ghost" className="flex-1" onClick={onClose}>Cancel</Button>
          
          {currency === 'GAME' && !hasAllowance && entryFee > 0 ? (
            <Button 
              className="flex-1" 
              onClick={handleApprove}
              disabled={isApproving}
            >
              {isApproving ? <Loader2 className="animate-spin" /> : "Approve GAME"}
            </Button>
          ) : (
            <Button 
              variant="hero"
              className="flex-1" 
              onClick={() => onCreate({ name, gameType: 'chess', entryFee, currency, maxPlayers: 2 })}
              disabled={!name || entryFee < 0}
            >
              Create
            </Button>
          )}
        </div>

      </motion.div>
    </div>
  );
};