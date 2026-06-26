import type { Card, Suit, Seat, TrickPlay, BidInfo, Difficulty } from './types'
import { getValidFollows, getValidLeads, type LegalPlay } from './rules'
import { isTrump, getCardPower } from './comparator'
function countSuitCards(hand: Card[], suit: Suit): number {
  return hand.filter(c => c.suit === suit).length
}
function countTrumpCards(hand: Card[], trumpSuit: Suit | 'fixed' | null, trumpRank: number | null): number {
  return hand.filter(c => isTrump(c, trumpSuit, trumpRank)).length
}
function hasJoker(hand: Card[], type: 'big' | 'small'): boolean {
  return hand.some(c => c.jokerType === type)
}
export function shouldBid(
  hand: Card[],
  currentLevel: number,
  existingBid: BidInfo | null,
  difficulty: Difficulty,
): BidInfo | null {
  const levelCards = hand.filter(c => c.rank === currentLevel && c.suit !== 'joker')
  if (levelCards.length === 0) return null
  const bySuit = new Map<Suit, Card[]>()
  for (const c of levelCards) {
    const list = bySuit.get(c.suit as Suit) || []
    list.push(c)
    bySuit.set(c.suit as Suit, list)
  }
  if (existingBid && existingBid.suit !== 'fixed') {
    const existingSuit = bySuit.get(existingBid.suit)
    if (existingSuit && existingSuit.length >= 2) {
      if (!existingBid.isPair || existingSuit.length >= 4) {
        return { bidder: -1 as Seat, suit: existingBid.suit, isPair: true, pairCount: Math.floor(existingSuit.length / 2) }
      }
    }
    return null
  }
  let bestSuit: Suit | null = null
  let bestScore = 0
  const cfg: Record<Difficulty, { minSuitCount: number }> = {
    easy: { minSuitCount: 8 },
    hard: { minSuitCount: 6 },
    crazy: { minSuitCount: 5 },
  }
  const threshold = cfg[difficulty].minSuitCount
  for (const [suit, cards] of bySuit) {
    const suitCount = countSuitCards(hand, suit)
    if (suitCount < threshold) continue
    let score = suitCount
    if (hasJoker(hand, 'big')) score += 5
    if (hasJoker(hand, 'small')) score += 3
    if (cards.length >= 2) score += 4
    if (score > bestScore) { bestScore = score; bestSuit = suit }
  }
  if (!bestSuit) return null
  const bestCards = bySuit.get(bestSuit)!
  const isPair = bestCards.length >= 2
  return { bidder: -1 as Seat, suit: bestSuit, isPair, pairCount: isPair ? Math.floor(bestCards.length / 2) : 1 }
}
export function selectPlay(
  hand: Card[],
  trick: TrickPlay[],
  trumpSuit: Suit | 'fixed' | null,
  trumpRank: number | null,
  _seat: Seat,
  difficulty: Difficulty,
): LegalPlay | null {
  const options = trick.length === 0
    ? getValidLeads(hand, trumpSuit, trumpRank)
    : getValidFollows(hand, trick, trumpSuit, trumpRank)
  if (options.length === 0) return null
  switch (difficulty) {
    case 'easy': return randomPick(options)
    case 'hard': return smartPick(options, trick, trumpSuit, trumpRank)
    case 'crazy': return smartPick(options, trick, trumpSuit, trumpRank)
  }
}
function randomPick(options: LegalPlay[]): LegalPlay {
  return options[Math.floor(Math.random() * options.length)]
}
function smartPick(
  options: LegalPlay[],
  trick: TrickPlay[],
  trumpSuit: Suit | 'fixed' | null,
  trumpRank: number | null,
): LegalPlay {
  let pointsInTrick = 0
  for (const play of trick) {
    for (const c of play.cards) {
      if (c.rank === 5) pointsInTrick += 5
      if (c.rank === 10) pointsInTrick += 10
      if (c.rank === 13) pointsInTrick += 10
    }
  }
  const sorted = [...options].sort((a, b) => {
    const pa = getCardPower(a.cards[0], trumpSuit, trumpRank)
    const pb = getCardPower(b.cards[0], trumpSuit, trumpRank)
    return pointsInTrick > 0 ? pb - pa : pa - pb
  })
  return sorted[0]
}


