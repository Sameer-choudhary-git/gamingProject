/**
 * Poker Engine - Card and Hand Evaluation Logic
 */

export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export interface Card {
  suit: Suit;
  rank: Rank;
  faceUp: boolean;
}

export const SUIT_SYMBOLS: Record<Suit, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
};

export const SUIT_COLORS: Record<Suit, string> = {
  hearts: 'text-red-500',
  diamonds: 'text-red-500',
  clubs: 'text-gray-900',
  spades: 'text-gray-900',
};

export const RANK_VALUES: Record<Rank, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
  'J': 11, 'Q': 12, 'K': 13, 'A': 14,
};

export type HandRank = 
  | 'royal_flush'
  | 'straight_flush'
  | 'four_of_a_kind'
  | 'full_house'
  | 'flush'
  | 'straight'
  | 'three_of_a_kind'
  | 'two_pair'
  | 'pair'
  | 'high_card';

export const POKER_HAND_NAMES: Record<HandRank, string> = {
  royal_flush: 'Royal Flush',
  straight_flush: 'Straight Flush',
  four_of_a_kind: 'Four of a Kind',
  full_house: 'Full House',
  flush: 'Flush',
  straight: 'Straight',
  three_of_a_kind: 'Three of a Kind',
  two_pair: 'Two Pair',
  pair: 'Pair',
  high_card: 'High Card',
};

export const HAND_VALUES: Record<HandRank, number> = {
  royal_flush: 10,
  straight_flush: 9,
  four_of_a_kind: 8,
  full_house: 7,
  flush: 6,
  straight: 5,
  three_of_a_kind: 4,
  two_pair: 3,
  pair: 2,
  high_card: 1,
};

/**
 * Deck class for managing cards
 */
export class Deck {
  private cards: Card[] = [];
  private dealtCards: Card[] = [];

  constructor() {
    this.initialize();
    this.shuffle();
  }

  private initialize() {
    const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
    const ranks: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

    this.cards = [];
    suits.forEach(suit => {
      ranks.forEach(rank => {
        this.cards.push({ suit, rank, faceUp: false });
      });
    });
  }

  shuffle() {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }

  draw(faceUp: boolean = false): Card | undefined {
    const card = this.cards.pop();
    if (card) {
      card.faceUp = faceUp;
      this.dealtCards.push(card);
    }
    return card;
  }

  drawMultiple(count: number, faceUp: boolean = false): Card[] {
    const drawn: Card[] = [];
    for (let i = 0; i < count; i++) {
      const card = this.draw(faceUp);
      if (card) drawn.push(card);
    }
    return drawn;
  }

  reset() {
    this.initialize();
    this.shuffle();
    this.dealtCards = [];
  }

  getRemainingCount(): number {
    return this.cards.length;
  }
}

/**
 * Evaluate poker hand
 */
export interface HandEvaluation {
  rank: HandRank;
  value: number;
  cards: Card[];
  highCards: number[];
}

export function evaluatePokerHand(cards: Card[]): HandEvaluation {
  if (cards.length < 5) {
    return {
      rank: 'high_card',
      value: 0,
      cards: [],
      highCards: [],
    };
  }

  // Get all possible 5-card combinations
  const combinations = get5CardCombinations(cards);
  let bestHand: HandEvaluation = {
    rank: 'high_card',
    value: 0,
    cards: [],
    highCards: [],
  };

  combinations.forEach(combo => {
    const evaluation = evaluateFiveCards(combo);
    if (evaluation.value > bestHand.value) {
      bestHand = evaluation;
    }
  });

  return bestHand;
}

function get5CardCombinations(cards: Card[]): Card[][] {
  const combinations: Card[][] = [];
  const n = cards.length;

  function combine(start: number, combo: Card[]) {
    if (combo.length === 5) {
      combinations.push([...combo]);
      return;
    }

    for (let i = start; i < n; i++) {
      combo.push(cards[i]);
      combine(i + 1, combo);
      combo.pop();
    }
  }

  combine(0, []);
  return combinations;
}

function evaluateFiveCards(cards: Card[]): HandEvaluation {
  const sorted = [...cards].sort((a, b) => RANK_VALUES[b.rank] - RANK_VALUES[a.rank]);
  const ranks = sorted.map(c => c.rank);
  const suits = sorted.map(c => c.suit);
  const rankCounts = countRanks(ranks);
  const suitCounts = countSuits(suits);

  const isFlush = Object.values(suitCounts).some(count => count === 5);
  const isStraight = checkStraight(ranks);
  const isRoyal = isStraight && ranks[0] === 'A' && ranks[1] === 'K';

  // Royal Flush
  if (isFlush && isRoyal) {
    return {
      rank: 'royal_flush',
      value: HAND_VALUES.royal_flush * 1000000 + getRankValue(ranks[0]),
      cards: sorted,
      highCards: ranks.map(r => RANK_VALUES[r]),
    };
  }

  // Straight Flush
  if (isFlush && isStraight) {
    return {
      rank: 'straight_flush',
      value: HAND_VALUES.straight_flush * 1000000 + getRankValue(ranks[0]),
      cards: sorted,
      highCards: ranks.map(r => RANK_VALUES[r]),
    };
  }

  // Four of a Kind
  const fourOfKind = Object.entries(rankCounts).find(([_, count]) => count === 4);
  if (fourOfKind) {
    return {
      rank: 'four_of_a_kind',
      value: HAND_VALUES.four_of_a_kind * 1000000 + getRankValue(fourOfKind[0] as Rank) * 100,
      cards: sorted,
      highCards: [RANK_VALUES[fourOfKind[0] as Rank]],
    };
  }

  // Full House
  const threeOfKind = Object.entries(rankCounts).find(([_, count]) => count === 3);
  const pair = Object.entries(rankCounts).find(([_, count]) => count === 2);
  if (threeOfKind && pair) {
    return {
      rank: 'full_house',
      value: HAND_VALUES.full_house * 1000000 + getRankValue(threeOfKind[0] as Rank) * 100 + getRankValue(pair[0] as Rank),
      cards: sorted,
      highCards: [RANK_VALUES[threeOfKind[0] as Rank], RANK_VALUES[pair[0] as Rank]],
    };
  }

  // Flush
  if (isFlush) {
    return {
      rank: 'flush',
      value: HAND_VALUES.flush * 1000000 + calculateHighCardValue(ranks),
      cards: sorted,
      highCards: ranks.map(r => RANK_VALUES[r]),
    };
  }

  // Straight
  if (isStraight) {
    return {
      rank: 'straight',
      value: HAND_VALUES.straight * 1000000 + getRankValue(ranks[0]),
      cards: sorted,
      highCards: ranks.map(r => RANK_VALUES[r]),
    };
  }

  // Three of a Kind
  if (threeOfKind) {
    return {
      rank: 'three_of_a_kind',
      value: HAND_VALUES.three_of_a_kind * 1000000 + getRankValue(threeOfKind[0] as Rank) * 100,
      cards: sorted,
      highCards: [RANK_VALUES[threeOfKind[0] as Rank]],
    };
  }

  // Two Pair
  const pairs = Object.entries(rankCounts).filter(([_, count]) => count === 2);
  if (pairs.length === 2) {
    const pairValues = pairs.map(([rank]) => RANK_VALUES[rank as Rank]).sort((a, b) => b - a);
    return {
      rank: 'two_pair',
      value: HAND_VALUES.two_pair * 1000000 + pairValues[0] * 100 + pairValues[1],
      cards: sorted,
      highCards: pairValues,
    };
  }

  // Pair
  if (pair) {
    return {
      rank: 'pair',
      value: HAND_VALUES.pair * 1000000 + getRankValue(pair[0] as Rank) * 100,
      cards: sorted,
      highCards: [RANK_VALUES[pair[0] as Rank]],
    };
  }

  // High Card
  return {
    rank: 'high_card',
    value: HAND_VALUES.high_card * 1000000 + calculateHighCardValue(ranks),
    cards: sorted,
    highCards: ranks.map(r => RANK_VALUES[r]),
  };
}

function countRanks(ranks: Rank[]): Record<string, number> {
  const counts: Record<string, number> = {};
  ranks.forEach(rank => {
    counts[rank] = (counts[rank] || 0) + 1;
  });
  return counts;
}

function countSuits(suits: Suit[]): Record<string, number> {
  const counts: Record<string, number> = {};
  suits.forEach(suit => {
    counts[suit] = (counts[suit] || 0) + 1;
  });
  return counts;
}

function checkStraight(ranks: Rank[]): boolean {
  const values = ranks.map(r => RANK_VALUES[r]).sort((a, b) => b - a);
  
  // Check regular straight
  for (let i = 0; i < values.length - 1; i++) {
    if (values[i] - values[i + 1] !== 1) {
      // Check for A-2-3-4-5 straight (wheel)
      if (values[0] === 14 && values[1] === 5 && values[2] === 4 && values[3] === 3 && values[4] === 2) {
        return true;
      }
      return false;
    }
  }
  
  return true;
}

function getRankValue(rank: Rank): number {
  return RANK_VALUES[rank];
}

function calculateHighCardValue(ranks: Rank[]): number {
  let value = 0;
  ranks.forEach((rank, index) => {
    value += RANK_VALUES[rank] * Math.pow(14, 4 - index);
  });
  return value;
}

/**
 * Compare two hands to determine winner
 */
export function compareHands(hand1: HandEvaluation, hand2: HandEvaluation): number {
  if (hand1.value > hand2.value) return 1;
  if (hand1.value < hand2.value) return -1;
  return 0;
}

/**
 * Get best hand from player cards and community cards
 */
export function getBestHand(playerCards: Card[], communityCards: Card[]): HandEvaluation {
  const allCards = [...playerCards, ...communityCards];
  return evaluatePokerHand(allCards);
}