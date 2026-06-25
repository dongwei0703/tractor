export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades'
export type JokerType = 'small' | 'big'

export interface Card {
  id: string
  suit: Suit | 'joker'
  rank: number
  jokerType?: JokerType
  faceUp: boolean
}

export type Seat = 0 | 1 | 2 | 3
export type Team = 'us' | 'them'
export type GamePhase =
  | 'start'
  | 'dealing'
  | 'bidding'
  | 'bottom_cards'
  | 'playing'
  | 'round_end'

export type PlayType = 'single' | 'pair' | 'tractor' | 'throw'
export type Difficulty = 'easy' | 'hard' | 'crazy'

export interface PlayerInfo {
  name: string
  seat: Seat
  isHuman: boolean
  team: Team
}

export interface TrickPlay {
  seat: Seat
  cards: Card[]
  playType: PlayType
  tractorLength?: number
}

export interface DealStep {
  card: Card
  targetSeat: Seat
  index: number
}

export interface BidInfo {
  bidder: Seat
  suit: Suit | 'fixed'
  isPair: boolean
  pairCount: number
}

export interface RoundResult {
  winner: Team
  ourPoints: number
  theirPoints: number
  ourLevelChange: number
  theirLevelChange: number
  newOurLevel: number
  newTheirLevel: number
  gameOver: boolean
  dealerTeam: Team
}

export interface GameState {
  phase: GamePhase
  difficulty: Difficulty
  currentLevel: number
  players: PlayerInfo[]
  hands: Card[][]
  trumpSuit: Suit | 'fixed' | null
  trumpRank: number | null
  dealer: Seat | null
  currentPlayer: Seat | null
  currentTrick: TrickPlay[]
  trickNumber: number
  tricksWon: [number, number]
  pointsCollected: [number, number]
  bottomCards: Card[]
  dealingQueue: DealStep[]
  dealingIndex: number
  bidHistory: BidInfo[]
  hasBid: boolean
  roundResults: RoundResult[]
  ourLevel: number
  theirLevel: number
  autoPlayTimer: number | null
}
