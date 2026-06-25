import type { Suit, Rank, Seat, Difficulty } from './types'

export const SUITS: Suit[] = ['spades', 'hearts', 'clubs', 'diamonds']

// Display names for suits
export const SUIT_NAMES: Record<Suit, string> = {
  spades: '♠',
  hearts: '♥',
  clubs: '♣',
  diamonds: '♦',
}

export const SUIT_COLORS: Record<Suit, string> = {
  spades: '#1a1a2e',
  hearts: '#c0392b',
  clubs: '#1a1a2e',
  diamonds: '#c0392b',
}

// Rank display values
export const RANK_NAMES: Record<number, string> = {
  2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8',
  9: '9', 10: '10', 11: 'J', 12: 'Q', 13: 'K', 14: 'A',
  15: '小', 16: '大',
}

// Point values for scoring cards
export const POINT_VALUES: Record<number, number> = {
  5: 5,
  10: 10,
  13: 10, // K = 10
}

// Total points in 2 decks: 200
export const TOTAL_POINTS = 200

// Player names by seat
export const PLAYER_NAMES: Record<Seat, string> = {
  0: '玩家',
  1: '关羽',
  2: '刘备',
  3: '张飞',
}

// Team assignment by seat
export const SEAT_TEAMS: Record<Seat, 'us' | 'them'> = {
  0: 'us',
  1: 'them',
  2: 'us',
  3: 'them',
}

// Trump hierarchy (excluding trump suit cards)
// Order: big joker > small joker > level cards > trump suit A > K > ... > 2
export const TRUMP_FIXED_RANKS = [16, 15] // big joker, small joker

// Dealing speed
export const DEAL_SPEED_MS = 80
export const BID_WINDOW_MS = 300

// AI auto-play delay
export const AI_PLAY_DELAY_MS: Record<Difficulty, number> = {
  easy: 600,
  hard: 500,
  crazy: 400,
}

// Score thresholds for level changes
export const SCORE_THRESHOLDS = [
  { max: 15, usChange: 3, themChange: 0, winner: 'us' as const },
  { max: 35, usChange: 2, themChange: 0, winner: 'us' as const },
  { max: 75, usChange: 1, themChange: 0, winner: 'us' as const },
  { max: 115, usChange: 0, themChange: 1, winner: 'them' as const },
  { max: 155, usChange: 0, themChange: 2, winner: 'them' as const },
  { max: 195, usChange: 0, themChange: 3, winner: 'them' as const },
  { max: 200, usChange: 0, themChange: 4, winner: 'them' as const },
]

// Max level is A (14)
export const MAX_LEVEL = 14

// Seat order for dealing and play
export const SEAT_ORDER: Seat[] = [0, 1, 2, 3]

export function getCardPoints(rank: number): number {
  return POINT_VALUES[rank] || 0
}
