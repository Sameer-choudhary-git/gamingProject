"use client";

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { 
  Deck, Card, calculateBlackjackHand, isBlackjack,
  SUIT_SYMBOLS, SUIT_COLORS
} from '@/engines/cardEngine'; // Ensure cardEngine is moved to app/engines or lib
import { useGameStore } from '@/stores/gameStore';
import { Button } from '@/ui/button';
import { ArrowLeft, Coins, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type GamePhase = 'betting' | 'playing' | 'dealer_turn' | 'finished';
type GameResult = 'win' | 'lose' | 'push' | 'blackjack' | null;

export default function BlackjackGame() {
  const router = useRouter();
  const { toast } = useToast();
  const { currentUser, balance, setBalance } = useGameStore();

  const [deck, setDeck] = useState<Deck>(() => new Deck());
  const [playerHand, setPlayerHand] = useState<Card[]>([]);
  const [dealerHand, setDealerHand] = useState<Card[]>([]);
  const [bet, setBet] = useState(10);
  const [phase, setPhase] = useState<GamePhase>('betting');
  const [result, setResult] = useState<GameResult>(null);
  const [winnings, setWinnings] = useState(0);

  useEffect(() => {
    if (!currentUser) {
      router.push('/');
    }
  }, [currentUser, router]);

  const startNewRound = useCallback(() => {
    const newDeck = new Deck();
    setDeck(newDeck);
    setPlayerHand([]);
    setDealerHand([]);
    setPhase('betting');
    setResult(null);
    setWinnings(0);
  }, []);

  const dealCards = () => {
    if (bet > balance) {
      toast({
        title: 'Insufficient Balance',
        description: 'You don\'t have enough tokens for this bet',
        variant: 'destructive',
      });
      return;
    }

    setBalance(balance - bet);

    // Deal initial cards
    const newPlayerHand: Card[] = [];
    const newDealerHand: Card[] = [];

    newPlayerHand.push(deck.draw(true)!);
    newDealerHand.push(deck.draw(true)!);
    newPlayerHand.push(deck.draw(true)!);
    newDealerHand.push(deck.draw(false)!); // Dealer's second card is face down

    setPlayerHand(newPlayerHand);
    setDealerHand(newDealerHand);
    setPhase('playing');

    // Check for blackjack
    if (isBlackjack(newPlayerHand)) {
      setTimeout(() => {
        revealDealerAndEnd(newPlayerHand, newDealerHand);
      }, 500);
    }
  };

  const hit = () => {
    const newCard = deck.draw(true);
    if (!newCard) return;

    const newHand = [...playerHand, newCard];
    setPlayerHand(newHand);

    const { value } = calculateBlackjackHand(newHand);
    if (value > 21) {
      endGame(newHand, dealerHand, 'lose');
    }
  };

  const stand = () => {
    setPhase('dealer_turn');
    dealerPlay();
  };

  const doubleDown = () => {
    if (bet > balance) {
      toast({
        title: 'Insufficient Balance',
        description: 'You don\'t have enough tokens to double down',
        variant: 'destructive',
      });
      return;
    }

    setBalance(balance - bet);
    setBet(bet * 2);

    const newCard = deck.draw(true);
    if (!newCard) return;

    const newHand = [...playerHand, newCard];
    setPlayerHand(newHand);

    const { value } = calculateBlackjackHand(newHand);
    if (value > 21) {
      endGame(newHand, dealerHand, 'lose');
    } else {
      setPhase('dealer_turn');
      dealerPlay(newHand);
    }
  };

  const dealerPlay = (currentPlayerHand: Card[] = playerHand) => {
    let currentDealerHand = [...dealerHand];
    // Reveal face-down card
    currentDealerHand = currentDealerHand.map(card => ({ ...card, faceUp: true }));
    setDealerHand(currentDealerHand);

    const playDealer = () => {
      let hand = [...currentDealerHand];
      
      const deal = () => {
        const { value } = calculateBlackjackHand(hand);
        if (value < 17) {
          const newCard = deck.draw(true);
          if (newCard) {
            hand = [...hand, newCard];
            setDealerHand(hand);
            setTimeout(deal, 500);
          }
        } else {
          finishGame(currentPlayerHand, hand);
        }
      };

      setTimeout(deal, 500);
    };

    playDealer();
  };

  const revealDealerAndEnd = (pHand: Card[], dHand: Card[]) => {
    const revealedDealer = dHand.map(card => ({ ...card, faceUp: true }));
    setDealerHand(revealedDealer);
    finishGame(pHand, revealedDealer);
  };

  const finishGame = (pHand: Card[], dHand: Card[]) => {
    const playerValue = calculateBlackjackHand(pHand).value;
    const dealerValue = calculateBlackjackHand(dHand).value;
    const playerBJ = isBlackjack(pHand);
    const dealerBJ = isBlackjack(dHand);

    let gameResult: GameResult;

    if (playerBJ && !dealerBJ) {
      gameResult = 'blackjack';
    } else if (playerBJ && dealerBJ) {
      gameResult = 'push';
    } else if (dealerBJ) {
      gameResult = 'lose';
    } else if (playerValue > 21) {
      gameResult = 'lose';
    } else if (dealerValue > 21) {
      gameResult = 'win';
    } else if (playerValue > dealerValue) {
      gameResult = 'win';
    } else if (playerValue < dealerValue) {
      gameResult = 'lose';
    } else {
      gameResult = 'push';
    }

    endGame(pHand, dHand, gameResult);
  };

  const endGame = (pHand: Card[], dHand: Card[], gameResult: GameResult) => {
    setPhase('finished');
    setResult(gameResult);

    let won = 0;
    if (gameResult === 'blackjack') {
      won = bet * 2.5;
    } else if (gameResult === 'win') {
      won = bet * 2;
    } else if (gameResult === 'push') {
      won = bet;
    }

    setWinnings(won);
    setBalance(balance + won);

    toast({
      title: gameResult === 'blackjack' ? 'BLACKJACK!' :
             gameResult === 'win' ? 'You Win!' :
             gameResult === 'push' ? 'Push' : 'Dealer Wins',
      description: won > 0 ? `You won ${won} tokens!` : 'Better luck next time',
      variant: gameResult === 'lose' ? 'destructive' : 'default',
    });
  };

  const playerValue = calculateBlackjackHand(playerHand);
  const dealerValue = calculateBlackjackHand(dealerHand);

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back
          </Button>
          
          <h1 className="font-display text-2xl font-bold">Blackjack</h1>
          
          <div className="stat-badge">
            <Coins className="w-4 h-4 text-gold" />
            <span>{balance.toFixed(0)} tokens</span>
          </div>
        </header>

        <div className="gaming-card p-8">
          {/* Dealer Section */}
          <div className="text-center mb-8">
            <h2 className="font-display text-lg text-muted-foreground mb-4">Dealer</h2>
            <div className="flex justify-center gap-2 mb-2 min-h-[120px]">
              <AnimatePresence>
                {dealerHand.map((card, index) => (
                  <PlayingCard key={index} card={card} delay={index * 0.1} />
                ))}
              </AnimatePresence>
            </div>
            {dealerHand.length > 0 && (
              <div className="font-display text-xl">
                {dealerHand.every(c => c.faceUp) ? dealerValue.value : '?'}
              </div>
            )}
          </div>

          {/* Result Display */}
          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                className={`text-center py-4 px-8 rounded-xl mb-8 font-display text-2xl ${
                  result === 'blackjack' ? 'bg-gold/20 text-gold' :
                  result === 'win' ? 'bg-success/20 text-success' :
                  result === 'push' ? 'bg-muted text-muted-foreground' :
                  'bg-destructive/20 text-destructive'
                }`}
              >
                {result === 'blackjack' ? 'BLACKJACK! +' + winnings :
                 result === 'win' ? 'YOU WIN! +' + winnings :
                 result === 'push' ? 'PUSH - Bet Returned' :
                 'DEALER WINS'}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Player Section */}
          <div className="text-center mb-8">
            <div className="flex justify-center gap-2 mb-2 min-h-[120px]">
              <AnimatePresence>
                {playerHand.map((card, index) => (
                  <PlayingCard key={index} card={card} delay={index * 0.1} />
                ))}
              </AnimatePresence>
            </div>
            {playerHand.length > 0 && (
              <div className={`font-display text-xl ${
                playerValue.value > 21 ? 'text-destructive' : ''
              }`}>
                {playerValue.value} {playerValue.isSoft && playerValue.value <= 21 && '(soft)'}
              </div>
            )}
            <h2 className="font-display text-lg text-muted-foreground mt-2">Your Hand</h2>
          </div>

          {/* Betting Phase */}
          {phase === 'betting' && (
            <div className="text-center">
              <h3 className="font-display text-lg mb-4">Place Your Bet</h3>
              <div className="flex justify-center gap-2 mb-6">
                {[5, 10, 25, 50, 100].map((amount) => (
                  <Button
                    key={amount}
                    variant={bet === amount ? 'default' : 'outline'}
                    onClick={() => setBet(amount)}
                  >
                    {amount}
                  </Button>
                ))}
              </div>
              <Button variant="hero" size="lg" onClick={dealCards}>
                Deal Cards
              </Button>
            </div>
          )}

          {/* Playing Phase */}
          {phase === 'playing' && (
            <div className="flex justify-center gap-4">
              <Button variant="default" size="lg" onClick={hit}>
                Hit
              </Button>
              <Button variant="secondary" size="lg" onClick={stand}>
                Stand
              </Button>
              {playerHand.length === 2 && (
                <Button variant="outline" size="lg" onClick={doubleDown}>
                  Double Down
                </Button>
              )}
            </div>
          )}

          {/* Dealer Turn */}
          {phase === 'dealer_turn' && (
            <div className="text-center">
              <p className="text-muted-foreground">Dealer is playing...</p>
            </div>
          )}

          {/* Finished */}
          {phase === 'finished' && (
            <div className="text-center">
              <Button variant="hero" size="lg" onClick={startNewRound}>
                <RefreshCw className="w-5 h-5 mr-2" />
                Play Again
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface PlayingCardProps {
  card: Card;
  delay?: number;
}

const PlayingCard = ({ card, delay = 0 }: PlayingCardProps) => {
  if (!card.faceUp) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -50, rotateY: 180 }}
        animate={{ opacity: 1, y: 0, rotateY: 0 }}
        transition={{ delay, type: 'spring', stiffness: 200 }}
        className="w-20 h-28 rounded-lg bg-gradient-to-br from-blue-900 to-blue-700 shadow-lg border-2 border-blue-500/50 flex items-center justify-center"
        style={{
          backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.05) 10px, rgba(255,255,255,0.05) 20px)',
        }}
      >
        <div className="w-12 h-16 rounded border border-blue-400/30" />
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -50, rotateY: 180 }}
      animate={{ opacity: 1, y: 0, rotateY: 0 }}
      transition={{ delay, type: 'spring', stiffness: 200 }}
      className="w-20 h-28 rounded-lg bg-white shadow-lg flex flex-col items-center justify-between p-2"
    >
      <div className={`text-lg font-bold ${SUIT_COLORS[card.suit]}`}>
        {card.rank}
      </div>
      <div className={`text-3xl ${SUIT_COLORS[card.suit]}`}>
        {SUIT_SYMBOLS[card.suit]}
      </div>
      <div className={`text-lg font-bold ${SUIT_COLORS[card.suit]} rotate-180`}>
        {card.rank}
      </div>
    </motion.div>
  );
};