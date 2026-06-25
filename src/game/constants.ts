import type { Suit, Seat, Difficulty } from "./types"

export const SUITS: Suit[] = ["spades", "hearts", "clubs", "diamonds"]

export const SUIT_NAMES: Record<Suit, string> = {
  spades: "\u2660",
  hearts: "\u2665",
  clubs: "\u2663",
  diamonds: "\u2666",
}

export const SUIT_COLORS: Record<Suit, string> = {
  spades: "#1a1a2e",
  hearts: "#c0392b",
  clubs: "#1a1a2e",
  diamonds: "#c0392b",
}

export const RANK_NAMES: Record<number, string> = {
  2: "2", 3: "3", 4: "4", 5: "5", 6: "6", 7: "7", 8: "8",
  9: "9", 10: "10", 11: "J", 12: "Q", 13: "K", 14: "A",
  15: "\u5C0F", 16: "\u5927",
}

export const POINT_VALUES: Record<number, number> = {
  5: 5,
  10: 10,
  13: 10,
}

export const TOTAL_POINTS = 200

export const PLAYER_NAMES: Record<Seat, string> = {
  0: "\u73A9\u5BB6",
  1: "\u5173\u7FBD",
  2: "\u5218\u5907",
  3: "\u5F20\u98DE",
}

export const SEAT_TEAMS: Record<Seat, "us" | "them"> = {
  0: "us",
  1: "them",
  2: "us",
  3: "them",
}

export const TRUMP_FIXED_RANKS = [16, 15]

export const DEAL_SPEED_MS = 40
export const BID_WINDOW_MS = 100

export const AI_PLAY_DELAY_MS: Record<Difficulty, number> = {
  easy: 600,
  hard: 500,
  crazy: 400,
}

export const SCORE_THRESHOLDS = [
  { max: 15, usChange: 3, themChange: 0, winner: "us" as const },
  { max: 35, usChange: 2, themChange: 0, winner: "us" as const },
  { max: 75, usChange: 1, themChange: 0, winner: "us" as const },
  { max: 115, usChange: 0, themChange: 1, winner: "them" as const },
  { max: 155, usChange: 0, themChange: 2, winner: "them" as const },
  { max: 195, usChange: 0, themChange: 3, winner: "them" as const },
  { max: 200, usChange: 0, themChange: 4, winner: "them" as const },
]

export const MAX_LEVEL = 14

export const SEAT_ORDER: Seat[] = [0, 1, 2, 3]

export function getCardPoints(rank: number): number {
  return POINT_VALUES[rank] || 0
}

