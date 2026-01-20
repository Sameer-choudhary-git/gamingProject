// Card types and utilities for Poker and Blackjack

export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  suit: Suit;
  rank: Rank;
  faceUp: boolean;
}

export const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
export const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

export const SUIT_SYMBOLS: Record<Suit, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
};

export const SUIT_COLORS: Record<Suit, string> = {
  hearts: 'text-red-500',
  diamonds: 'text-red-500',
  clubs: 'text-foreground',
  spades: 'text-foreground',
};

export class Deck {
  private cards: Card[] = [];

  constructor() {
    this.reset();
  }

  reset(): void {
    this.cards = [];
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        this.cards.push({ suit, rank, faceUp: false });
      }
    }
    this.shuffle();
  }

  shuffle(): void {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }

  draw(faceUp: boolean = true): Card | null {
    const card = this.cards.pop();
    if (card) {
      card.faceUp = faceUp;
    }
    return card || null;
  }

  drawMultiple(count: number, faceUp: boolean = true): Card[] {
    const cards: Card[] = [];
    for (let i = 0; i < count; i++) {
      const card = this.draw(faceUp);
      if (card) cards.push(card);
    }
    return cards;
  }

  remaining(): number {
    return this.cards.length;
  }
}

// Card value functions
export const getCardValue = (card: Card): number => {
  if (['J', 'Q', 'K'].includes(card.rank)) return 10;
  if (card.rank === 'A') return 11;
  return parseInt(card.rank);
};

export const getRankValue = (rank: Rank): number => {
  const values: Record<Rank, number> = {
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
    'J': 11, 'Q': 12, 'K': 13, 'A': 14
  };
  return values[rank];
};

// Blackjack specific
export const calculateBlackjackHand = (cards: Card[]): { value: number; isSoft: boolean } => {
  let value = 0;
  let aces = 0;

  for (const card of cards) {
    if (!card.faceUp) continue;
    
    if (card.rank === 'A') {
      aces++;
      value += 11;
    } else if (['J', 'Q', 'K'].includes(card.rank)) {
      value += 10;
    } else {
      value += parseInt(card.rank);
    }
  }

  // Adjust for aces
  while (value > 21 && aces > 0) {
    value -= 10;
    aces--;
  }

  return { value, isSoft: aces > 0 };
};

export const isBlackjack = (cards: Card[]): boolean => {
  if (cards.length !== 2) return false;
  const { value } = calculateBlackjackHand(cards);
  return value === 21;
};

// Poker hand evaluation
export type PokerHandRank = 
  | 'high_card'
  | 'pair'
  | 'two_pair'
  | 'three_of_a_kind'
  | 'straight'
  | 'flush'
  | 'full_house'
  | 'four_of_a_kind'
  | 'straight_flush'
  | 'royal_flush';

export const POKER_HAND_NAMES: Record<PokerHandRank, string> = {
  high_card: 'High Card',
  pair: 'Pair',
  two_pair: 'Two Pair',
  three_of_a_kind: 'Three of a Kind',
  straight: 'Straight',
  flush: 'Flush',
  full_house: 'Full House',
  four_of_a_kind: 'Four of a Kind',
  straight_flush: 'Straight Flush',
  royal_flush: 'Royal Flush',
};

export const POKER_HAND_VALUES: Record<PokerHandRank, number> = {
  high_card: 1,
  pair: 2,
  two_pair: 3,
  three_of_a_kind: 4,
  straight: 5,
  flush: 6,
  full_house: 7,
  four_of_a_kind: 8,
  straight_flush: 9,
  royal_flush: 10,
};

export interface PokerHandResult {
  rank: PokerHandRank;
  value: number;
  cards: Card[];
  highCards: Rank[];
}

export const evaluatePokerHand = (cards: Card[]): PokerHandResult => {
  // Sort cards by rank value
  const sortedCards = [...cards].sort((a, b) => getRankValue(b.rank) - getRankValue(a.rank));
  
  // Count ranks and suits
  const rankCounts = new Map<Rank, number>();
  const suitCounts = new Map<Suit, number>();
  
  for (const card of cards) {
    rankCounts.set(card.rank, (rankCounts.get(card.rank) || 0) + 1);
    suitCounts.set(card.suit, (suitCounts.get(card.suit) || 0) + 1);
  }

  const isFlush = [...suitCounts.values()].some(count => count >= 5);
  const sortedRanks = sortedCards.map(c => getRankValue(c.rank));
  
  // Check for straight
  let isStraight = false;
  for (let i = 0; i <= sortedRanks.length - 5; i++) {
    if (sortedRanks[i] - sortedRanks[i + 4] === 4) {
      isStraight = true;
      break;
    }
  }
  
  // Check for A-2-3-4-5 straight (wheel)
  if (!isStraight && sortedRanks.includes(14) && sortedRanks.includes(2) && 
      sortedRanks.includes(3) && sortedRanks.includes(4) && sortedRanks.includes(5)) {
    isStraight = true;
  }

  const counts = [...rankCounts.values()].sort((a, b) => b - a);
  const highCards = sortedCards.map(c => c.rank);

  // Determine hand rank
  if (isStraight && isFlush) {
    if (sortedRanks.includes(14) && sortedRanks.includes(13)) {
      return { rank: 'royal_flush', value: POKER_HAND_VALUES.royal_flush, cards: sortedCards, highCards };
    }
    return { rank: 'straight_flush', value: POKER_HAND_VALUES.straight_flush, cards: sortedCards, highCards };
  }

  if (counts[0] === 4) {
    return { rank: 'four_of_a_kind', value: POKER_HAND_VALUES.four_of_a_kind, cards: sortedCards, highCards };
  }

  if (counts[0] === 3 && counts[1] >= 2) {
    return { rank: 'full_house', value: POKER_HAND_VALUES.full_house, cards: sortedCards, highCards };
  }

  if (isFlush) {
    return { rank: 'flush', value: POKER_HAND_VALUES.flush, cards: sortedCards, highCards };
  }

  if (isStraight) {
    return { rank: 'straight', value: POKER_HAND_VALUES.straight, cards: sortedCards, highCards };
  }

  if (counts[0] === 3) {
    return { rank: 'three_of_a_kind', value: POKER_HAND_VALUES.three_of_a_kind, cards: sortedCards, highCards };
  }

  if (counts[0] === 2 && counts[1] === 2) {
    return { rank: 'two_pair', value: POKER_HAND_VALUES.two_pair, cards: sortedCards, highCards };
  }

  if (counts[0] === 2) {
    return { rank: 'pair', value: POKER_HAND_VALUES.pair, cards: sortedCards, highCards };
  }

  return { rank: 'high_card', value: POKER_HAND_VALUES.high_card, cards: sortedCards, highCards };
};

export const comparePokerHands = (hand1: PokerHandResult, hand2: PokerHandResult): number => {
  if (hand1.value !== hand2.value) {
    return hand1.value - hand2.value;
  }
  
  // Compare high cards
  for (let i = 0; i < Math.min(hand1.highCards.length, hand2.highCards.length); i++) {
    const diff = getRankValue(hand1.highCards[i]) - getRankValue(hand2.highCards[i]);
    if (diff !== 0) return diff;
  }
  
  return 0;
};
