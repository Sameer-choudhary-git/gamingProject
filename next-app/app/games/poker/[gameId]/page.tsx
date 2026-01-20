"use client";

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
// 1. CHANGE: Use Next.js navigation hooks
import { useRouter, useParams } from 'next/navigation';
import { 
  Deck, Card, POKER_HAND_NAMES,
  SUIT_SYMBOLS, SUIT_COLORS, getBestHand
} from '@/engines/pokerEngine';
import { useGameStore } from '@/stores/gameStore';
import { Button } from '@/ui/button';
import { useToast } from '@/hooks/use-toast';
import { 
  getPokerGame, 
  pokerFold, 
  pokerCheck, 
  pokerCall, 
  pokerRaise,
  listenToPokerEvents 
} from '@/stores/gameStore';
import { getEthBalance, NETWORK } from '@/lib/wallet';
import { ArrowLeft, Coins, RefreshCw, Users, Loader2 } from 'lucide-react';

type GamePhase = 'waiting' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown' | 'finished';

interface PokerPlayer {
  id: string;
  name: string;
  avatar: string;
  chips: number;
  hand: Card[];
  bet: number;
  folded: boolean;
  isDealer: boolean;
  isCurrentTurn: boolean;
  address?: string;
}

// 2. CHANGE: Rename component to match page convention (optional but good practice)
export default function PokerPage() {
  // 3. CHANGE: Use useRouter instead of useNavigate
  const router = useRouter();
  const params = useParams();
  
  // Safe access to gameId (Next.js params can be array or string)
  const gameId = typeof params.gameId === 'string' ? params.gameId : '';

  const { toast } = useToast();
  const { currentUser, walletAddress, balance, setBalance } = useGameStore();

  // Game state
  const [deck, setDeck] = useState<Deck>(() => new Deck());
  const [communityCards, setCommunityCards] = useState<Card[]>([]);
  const [players, setPlayers] = useState<PokerPlayer[]>([]);
  const [pot, setPot] = useState(0);
  const [currentBet, setCurrentBet] = useState(0);
  const [phase, setPhase] = useState<GamePhase>('waiting');
  const [winner, setWinner] = useState<PokerPlayer | null>(null);
  const [winningHand, setWinningHand] = useState<string>('');
  const [raiseAmount, setRaiseAmount] = useState(0);

  // Blockchain state
  const [blockchainGame, setBlockchainGame] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [txPending, setTxPending] = useState(false);
  const [ethBalance, setEthBalance] = useState('0');

  const SMALL_BLIND = blockchainGame ? parseFloat(blockchainGame.smallBlind) : 0.001;
  const BIG_BLIND = blockchainGame ? parseFloat(blockchainGame.bigBlind) : 0.002;

  // Load blockchain game
  useEffect(() => {
    if (!gameId) {
      // 4. CHANGE: navigate -> router.push
      router.push('/lobbies');
      return;
    }

    if (!currentUser || !walletAddress) {
      router.push('/');
      return;
    }

    loadBlockchainGame();
    loadEthBalance();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId, currentUser, walletAddress]);

  const loadBlockchainGame = async () => {
    if (!gameId) return;

    try {
      setIsLoading(true);
      const game = await getPokerGame(gameId);
      setBlockchainGame(game);

      // Initialize game based on blockchain state
      if (game.status === 1) { // In Progress
        setPhase('preflop');
        initializePlayers(game);
      } else {
        setPhase('waiting');
      }
    } catch (error: any) {
      console.error('Failed to load game:', error);
      toast({
        title: 'Failed to Load Game',
        description: error.message,
        variant: 'destructive',
      });
      router.push('/lobbies');
    } finally {
      setIsLoading(false);
    }
  };

  const loadEthBalance = async () => {
    if (!walletAddress) return;
    const bal = await getEthBalance(walletAddress);
    setEthBalance(bal);
  };

  // Listen to blockchain events
  useEffect(() => {
    if (!gameId) return;

    const cleanup = listenToPokerEvents(gameId, {
      onPlayerJoined: (player: any, seat: any) => {
        toast({
          title: 'Player Joined',
          description: `Player joined at seat ${seat}`,
        });
        loadBlockchainGame();
      },
      onGameStarted: () => {
        toast({
          title: 'Game Started!',
          description: 'The poker game has begun',
        });
        setPhase('preflop');
        startNewRound();
      },
    });

    return cleanup;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId]);

  // Initialize players from blockchain
  const initializePlayers = useCallback((game: any) => {
    const buyIn = parseFloat(game.buyIn);
    
    const initialPlayers: PokerPlayer[] = [
      {
        id: currentUser?.id || '1',
        name: currentUser?.username || 'You',
        avatar: currentUser?.avatar || '🎮',
        chips: buyIn,
        hand: [],
        bet: 0,
        folded: false,
        isDealer: false,
        isCurrentTurn: false,
        address: walletAddress || undefined,
      },
    ];

    // Add AI players to fill the table (for demo)
    for (let i = 1; i < game.maxPlayers && initialPlayers.length < 3; i++) {
      initialPlayers.push({
        id: `ai${i}`,
        name: `Player ${i + 1}`,
        avatar: ['🤖', '🎰', '🎲', '🃏', '🎯'][i] || '👤',
        chips: buyIn,
        hand: [],
        bet: 0,
        folded: false,
        isDealer: i === 1,
        isCurrentTurn: false,
      });
    }

    setPlayers(initialPlayers);
    setPot(parseFloat(game.pot));
  }, [currentUser, walletAddress]);

  const startNewRound = () => {
    const newDeck = new Deck();
    setDeck(newDeck);
    setCommunityCards([]);
    setCurrentBet(BIG_BLIND);
    setPhase('preflop');
    setWinner(null);
    setWinningHand('');
    setRaiseAmount(BIG_BLIND);

    // Deal cards to players
    const updatedPlayers = players.map((player, index) => {
      const hand = newDeck.drawMultiple(2, player.id === currentUser?.id);
      // AI cards are face down until showdown
      if (player.id !== currentUser?.id) {
        hand.forEach(card => card.faceUp = false);
      }
      
      // Post blinds
      let bet = 0;
      if (index === 1) bet = SMALL_BLIND;
      if (index === 2) bet = BIG_BLIND;

      return {
        ...player,
        hand,
        bet,
        folded: false,
        isCurrentTurn: index === 0,
      };
    });

    setPot(prev => prev + SMALL_BLIND + BIG_BLIND);
    setPlayers(updatedPlayers);
  };

  // Handle player action - sends to blockchain
  const handlePlayerAction = async (action: 'fold' | 'check' | 'call' | 'raise') => {
    if (!gameId || txPending) return;

    const playerIndex = players.findIndex(p => p.id === currentUser?.id);
    if (playerIndex === -1) return;

    const player = players[playerIndex];

    try {
      setTxPending(true);

      switch (action) {
        case 'fold':
          await pokerFold(gameId);
          player.folded = true;
          toast({ title: 'You folded', variant: 'destructive' });
          break;

        case 'check':
          if (currentBet > player.bet) {
            toast({ 
              title: 'Cannot check', 
              description: 'You must call or raise', 
              variant: 'destructive' 
            });
            return;
          }
          await pokerCheck(gameId);
          break;

        case 'call':
          const callAmount = currentBet - player.bet;
          if (callAmount > player.chips) {
            toast({ title: 'Not enough chips', variant: 'destructive' });
            return;
          }
          await pokerCall(gameId);
          player.chips -= callAmount;
          player.bet = currentBet;
          setPot(prev => prev + callAmount);
          break;

        case 'raise':
          const totalRaise = currentBet - player.bet + raiseAmount;
          if (totalRaise > player.chips) {
            toast({ title: 'Not enough chips', variant: 'destructive' });
            return;
          }
          await pokerRaise(gameId, raiseAmount.toString());
          player.chips -= totalRaise;
          player.bet = currentBet + raiseAmount;
          setPot(prev => prev + totalRaise);
          setCurrentBet(player.bet);
          break;
      }

      toast({
        title: 'Action Confirmed',
        description: 'Transaction sent to blockchain',
      });

      player.isCurrentTurn = false;
      const newPlayers = [...players];
      newPlayers[playerIndex] = player;
      setPlayers(newPlayers);

      // Simulate AI turns (in production, this would come from blockchain)
      if (!player.folded) {
        setTimeout(() => aiTurn(newPlayers), 1000);
      }

    } catch (error: any) {
      console.error('Action failed:', error);
      toast({
        title: 'Transaction Failed',
        description: error.message || 'Failed to submit action',
        variant: 'destructive',
      });
    } finally {
      setTxPending(false);
    }
  };

  const aiTurn = (currentPlayers: PokerPlayer[]) => {
    let newPlayers = [...currentPlayers];
    
    for (let i = 1; i < newPlayers.length; i++) {
      const ai = newPlayers[i];
      if (ai.folded) continue;

      // Simple AI logic
      const random = Math.random();
      const callAmount = currentBet - ai.bet;

      if (random < 0.1 && currentBet > 0) {
        ai.folded = true;
      } else if (callAmount === 0 || random < 0.7) {
        if (callAmount > 0 && callAmount <= ai.chips) {
          ai.chips -= callAmount;
          ai.bet = currentBet;
          setPot(prev => prev + callAmount);
        }
      } else if (random < 0.9) {
        const raiseAmt = Math.min(BIG_BLIND * 2, ai.chips - callAmount);
        if (raiseAmt > 0) {
          const total = callAmount + raiseAmt;
          ai.chips -= total;
          ai.bet = currentBet + raiseAmt;
          setPot(prev => prev + total);
          setCurrentBet(ai.bet);
        }
      }
    }

    setPlayers(newPlayers);

    // Check if round should progress
    const activePlayers = newPlayers.filter(p => !p.folded);
    if (activePlayers.length === 1) {
      endRound(activePlayers[0], newPlayers);
      return;
    }

    setTimeout(() => progressPhase(newPlayers), 1000);
  };

  const progressPhase = (currentPlayers: PokerPlayer[]) => {
    switch (phase) {
      case 'preflop':
        setCommunityCards(deck.drawMultiple(3, true));
        setPhase('flop');
        resetBets(currentPlayers);
        break;

      case 'flop':
        setCommunityCards(prev => [...prev, deck.draw(true)!]);
        setPhase('turn');
        resetBets(currentPlayers);
        break;

      case 'turn':
        setCommunityCards(prev => [...prev, deck.draw(true)!]);
        setPhase('river');
        resetBets(currentPlayers);
        break;

      case 'river':
        setPhase('showdown');
        determineWinner(currentPlayers);
        break;
    }
  };

  const resetBets = (currentPlayers: PokerPlayer[]) => {
    const newPlayers = currentPlayers.map(p => ({ 
      ...p, 
      bet: 0, 
      isCurrentTurn: p.id === currentUser?.id && !p.folded 
    }));
    setPlayers(newPlayers);
    setCurrentBet(0);
  };

  const determineWinner = (currentPlayers: PokerPlayer[]) => {
    const activePlayers = currentPlayers.filter(p => !p.folded);
    
    // Reveal all hands
    const newPlayers = currentPlayers.map(p => ({
      ...p,
      hand: p.hand.map(c => ({ ...c, faceUp: true }))
    }));
    setPlayers(newPlayers);

    let bestPlayer: PokerPlayer | null = null;
    let bestHandResult = { value: 0, rank: 'high_card' as any, cards: [], highCards: [] as any };

    activePlayers.forEach(player => {
      const handResult = getBestHand(player.hand, communityCards);
      
      if (!bestPlayer || handResult.value > bestHandResult.value) {
        bestPlayer = player;
        bestHandResult = handResult;
      }
    });

    if (bestPlayer) {
      setWinningHand(POKER_HAND_NAMES[bestHandResult.rank]);
      setTimeout(() => endRound(bestPlayer!, newPlayers), 2000);
    }
  };

  const endRound = (winningPlayer: PokerPlayer, currentPlayers: PokerPlayer[]) => {
    setWinner(winningPlayer);
    setPhase('finished');

    const newPlayers = currentPlayers.map(p => {
      if (p.id === winningPlayer.id) {
        return { ...p, chips: p.chips + pot };
      }
      return p;
    });
    setPlayers(newPlayers);

    if (winningPlayer.id === currentUser?.id) {
      setBalance(balance + pot);
      toast({
        title: 'You Win!',
        description: `Won ${pot.toFixed(4)} ETH with ${winningHand || 'last player standing'}!`,
      });
    } else {
      toast({
        title: `${winningPlayer.name} Wins!`,
        description: `Won ${pot.toFixed(4)} ETH`,
        variant: 'destructive',
      });
    }
  };

  const humanPlayer = players.find(p => p.id === currentUser?.id);
  const canCheck = currentBet === (humanPlayer?.bet || 0);
  const isPlayerTurn = humanPlayer?.isCurrentTurn && !humanPlayer?.folded && 
                       phase !== 'showdown' && phase !== 'finished' && phase !== 'waiting';

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading poker game from {NETWORK.chainName}...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <header className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={() => router.push('/lobbies')}>
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Lobbies
          </Button>
          
          <div className="text-center">
            <h1 className="font-display text-2xl font-bold">Texas Hold'em</h1>
            {blockchainGame && (
              <div className="text-xs text-muted-foreground flex items-center justify-center gap-2 mt-1">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                Game #{gameId} on {NETWORK.chainName}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1 bg-secondary rounded-full">
              <Users className="w-4 h-4" />
              <span>{players.filter(p => !p.folded).length} active</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-secondary rounded-full">
              <Coins className="w-4 h-4 text-yellow-500" />
              <span>Pot: {pot.toFixed(4)} ETH</span>
            </div>
          </div>
        </header>

        {/* Blockchain Info */}
        {blockchainGame && (
          <div className="p-4 mb-6 border rounded-lg bg-card">
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Buy-in</div>
                <div className="font-medium">{blockchainGame.buyIn} ETH</div>
              </div>
              <div>
                <div className="text-muted-foreground">Small Blind</div>
                <div className="font-medium">{blockchainGame.smallBlind} ETH</div>
              </div>
              <div>
                <div className="text-muted-foreground">Big Blind</div>
                <div className="font-medium">{blockchainGame.bigBlind} ETH</div>
              </div>
              <div>
                <div className="text-muted-foreground">Players</div>
                <div className="font-medium">{blockchainGame.playerCount}/{blockchainGame.maxPlayers}</div>
              </div>
            </div>
          </div>
        )}

        <div className="p-8 border rounded-lg bg-card">
          {/* Poker Table */}
          <div className="relative min-h-[400px] bg-gradient-to-b from-green-900 to-green-800 rounded-[100px] border-8 border-amber-900 shadow-inner">
            {/* Community Cards */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="flex gap-2 mb-4">
                <AnimatePresence>
                  {communityCards.map((card, index) => (
                    <PokerCard key={index} card={card} delay={index * 0.2} />
                  ))}
                  {Array.from({ length: 5 - communityCards.length }).map((_, i) => (
                    <div key={`empty-${i}`} className="w-16 h-22 rounded-lg border-2 border-dashed border-white/20" />
                  ))}
                </AnimatePresence>
              </div>
              <div className="text-center">
                <div className="font-display text-2xl text-yellow-500 mb-1">
                  POT: {pot.toFixed(4)} ETH
                </div>
                <div className="text-xs text-white/60 capitalize">
                  {phase === 'waiting' ? 'Waiting to start' : phase}
                </div>
              </div>
            </div>

            {/* Players */}
            {players.map((player, index) => {
              const positions = [
                'bottom-4 left-1/2 -translate-x-1/2',
                'top-1/2 left-8 -translate-y-1/2',
                'top-4 left-1/2 -translate-x-1/2',
              ];
              
              return (
                <div 
                  key={player.id}
                  className={`absolute ${positions[index]}`}
                >
                  <div className={`text-center ${player.folded ? 'opacity-50' : ''}`}>
                    {/* Cards */}
                    {phase !== 'waiting' && (
                      <div className="flex gap-1 justify-center mb-2">
                        {player.hand.map((card, cardIndex) => (
                          <PokerCard 
                            key={cardIndex} 
                            card={card} 
                            small={index !== 0}
                          />
                        ))}
                      </div>
                    )}
                    
                    {/* Player info */}
                    <div className={`px-4 py-2 rounded-full ${
                      player.isCurrentTurn ? 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2' : 
                      'bg-black/50 text-white'
                    }`}>
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{player.avatar}</span>
                        <div className="text-left">
                          <div className="text-sm font-medium">{player.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {player.chips.toFixed(4)} ETH
                          </div>
                        </div>
                        {player.isDealer && (
                          <span className="ml-2 w-6 h-6 rounded-full bg-white text-black text-xs font-bold flex items-center justify-center">
                            D
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Current bet */}
                    {player.bet > 0 && (
                      <motion.div 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="mt-2 inline-flex items-center gap-1 px-2 py-1 rounded bg-yellow-500/20 text-yellow-500 text-sm"
                      >
                        <Coins className="w-3 h-3" />
                        {player.bet.toFixed(4)}
                      </motion.div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Winner display */}
          <AnimatePresence>
            {winner && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background/95 p-8 rounded-xl text-center border-2 border-yellow-500 z-10"
              >
                <div className="text-4xl mb-2">{winner.avatar}</div>
                <h3 className="font-display text-2xl font-bold text-yellow-500">{winner.name} Wins!</h3>
                {winningHand && <p className="text-muted-foreground">{winningHand}</p>}
                <p className="text-green-500 text-xl mt-2">+{pot.toFixed(4)} ETH</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Game Controls */}
          <div className="mt-8">
            {phase === 'waiting' && blockchainGame && (
              <div className="text-center">
                <p className="text-muted-foreground mb-4">
                  Waiting for players ({blockchainGame.playerCount}/{blockchainGame.maxPlayers})
                </p>
                {blockchainGame.playerCount >= 2 && (
                  <Button size="lg" onClick={startNewRound}>
                    Start Round
                  </Button>
                )}
              </div>
            )}

            {isPlayerTurn && (
              <div className="flex flex-wrap justify-center gap-4">
                <Button 
                  variant="destructive" 
                  size="lg" 
                  onClick={() => handlePlayerAction('fold')}
                  disabled={txPending}
                >
                  Fold
                </Button>
                {canCheck ? (
                  <Button 
                    variant="secondary" 
                    size="lg" 
                    onClick={() => handlePlayerAction('check')}
                    disabled={txPending}
                  >
                    Check
                  </Button>
                ) : (
                  <Button 
                    variant="secondary" 
                    size="lg" 
                    onClick={() => handlePlayerAction('call')}
                    disabled={txPending}
                  >
                    Call {(currentBet - (humanPlayer?.bet || 0)).toFixed(4)}
                  </Button>
                )}
                <div className="flex items-center gap-2">
                  <Button 
                    variant="default" 
                    size="lg" 
                    onClick={() => handlePlayerAction('raise')}
                    disabled={txPending}
                  >
                    Raise {raiseAmount.toFixed(4)}
                  </Button>
                  <input
                    type="range"
                    min={BIG_BLIND}
                    max={BIG_BLIND * 10}
                    step={BIG_BLIND}
                    value={raiseAmount}
                    onChange={(e) => setRaiseAmount(parseFloat(e.target.value))}
                    className="w-24"
                  />
                </div>
              </div>
            )}

            {txPending && (
              <div className="text-center mt-4">
                <Loader2 className="w-6 h-6 text-primary animate-spin mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Sending transaction...</p>
              </div>
            )}

            {phase === 'finished' && (
              <div className="text-center">
                <Button size="lg" onClick={startNewRound}>
                  <RefreshCw className="w-5 h-5 mr-2" />
                  New Round
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface PokerCardProps {
  card: Card;
  delay?: number;
  small?: boolean;
}

const PokerCard = ({ card, delay = 0, small = false }: PokerCardProps) => {
  const sizeClass = small ? 'w-12 h-16' : 'w-16 h-22';
  const textSize = small ? 'text-xs' : 'text-sm';
  const suitSize = small ? 'text-lg' : 'text-2xl';

  if (!card.faceUp) {
    return (
      <motion.div
        initial={{ opacity: 0, rotateY: 180 }}
        animate={{ opacity: 1, rotateY: 0 }}
        transition={{ delay }}
        className={`${sizeClass} rounded-lg bg-gradient-to-br from-blue-900 to-blue-700 shadow-lg border border-blue-500/50`}
        style={{
          backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(255,255,255,0.03) 5px, rgba(255,255,255,0.03) 10px)',
        }}
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, rotateY: 180 }}
      animate={{ opacity: 1, rotateY: 0 }}
      transition={{ delay }}
      className={`${sizeClass} rounded-lg bg-white shadow-lg flex flex-col items-center justify-center border-2 border-gray-200`}
    >
      <div className={`${textSize} font-bold ${SUIT_COLORS[card.suit]}`}>
        {card.rank}
      </div>
      <div className={`${suitSize} ${SUIT_COLORS[card.suit]}`}>
        {SUIT_SYMBOLS[card.suit]}
      </div>
    </motion.div>
  );
};