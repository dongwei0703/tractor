import type { Card, Suit, PlayType } from './types'

export function isJoker(card: Card): boolean {
  return card.suit === 'joker'
}

export function isTrump(card: Card, trumpSuit: Suit | 'fixed' | null, trumpRank: number | null): boolean {
  if (card.suit === 'joker') return true
  if (trumpRank !== null && card.rank === trumpRank) return true
  if (trumpSuit && trumpSuit !== 'fixed' && card.suit === trumpSuit) return true
  return false
}

export function getCardPower(card: Card, trumpSuit: Suit | 'fixed' | null, trumpRank: number | null): number {
  if (card.rank === 16) return 1000
  if (card.rank === 15) return 900
  if (trumpRank !== null && card.rank === trumpRank) return 800
  if (trumpSuit && trumpSuit !== 'fixed' && card.suit === trumpSuit) return 500 + card.rank
  return card.rank
}

export function compareCards(
  a: Card, b: Card,
  trumpSuit: Suit | 'fixed' | null,
  trumpRank: number | null,
): number {
  const pa = getCardPower(a, trumpSuit, trumpRank)
  const pb = getCardPower(b, trumpSuit, trumpRank)
  if (pa > pb) return 1
  if (pa < pb) return -1
  return 0
}

export function sameCard(a: Card, b: Card): boolean {
  return a.id === b.id
}

// 按花色+点数分组（对子必须是同花色同点数，不同花色同点数不算对子）
// key 格式: "suit|rank"，例如 "spades|5"
export function groupCardsByRank(cards: Card[]): Map<string, Card[]> {
  const groups = new Map<string, Card[]>()
  for (const c of cards) {
    const key = `${c.suit}|${c.rank}`
    const list = groups.get(key) || []
    list.push(c)
    groups.set(key, list)
  }
  return groups
}

// 从分组 key 中解析出点数
export function getRankFromGroupKey(key: string): number {
  return parseInt(key.split('|')[1], 10)
}

export function identifyPlayType(
  cards: Card[],
  trumpSuit: Suit | 'fixed' | null,
  trumpRank: number | null,
): { playType: PlayType; tractorLength?: number } | null {
  const n = cards.length
  if (n === 0) return null
  if (n === 1) return { playType: 'single' }

  // Check pair
  if (n === 2 && cards[0].suit === cards[1].suit && cards[0].rank === cards[1].rank) {
    return { playType: 'pair' }
  }

  // Check tractor: must be even number of cards, all pairs of same suit
  if (n >= 4 && n % 2 === 0) {
    const allTrump = cards.every(c => isTrump(c, trumpSuit, trumpRank))
    const allSameSuit = cards.every(c => c.suit === cards[0].suit)

    if (!allTrump && !allSameSuit) return null

    const groups = groupCardsByRank(cards)
    // All groups must be pairs
    for (const [, group] of groups) {
      if (group.length % 2 !== 0) return null
    }

    // Get unique ranks
    const ranks = [...new Set(cards.map(c => c.rank))]

    if (allTrump) {
      // Trump tractor: ranks must be consecutive in trump hierarchy
      ranks.sort((a, b) => getCardPower({ suit: 'joker', rank: a, id: '', faceUp: false } as Card, trumpSuit, trumpRank) -
        getCardPower({ suit: trumpSuit || 'spades', rank: b, id: '', faceUp: false } as Card, trumpSuit, trumpRank))
      // Check consecutiveness in power order
      for (let i = 1; i < ranks.length; i++) {
        if (!areTrumpAdjacent(ranks[i - 1], ranks[i], trumpSuit, trumpRank)) return null
      }
    } else {
      // Non-trump tractor: ranks must be consecutive
      ranks.sort((a, b) => b - a)
      for (let i = 1; i < ranks.length; i++) {
        if (ranks[i - 1] - ranks[i] !== 1) return null
      }
    }

    return { playType: 'tractor', tractorLength: ranks.length }
  }

  return null
}

function areTrumpAdjacent(r1: number, r2: number, trumpSuit: Suit | 'fixed' | null, trumpRank: number | null): boolean {
  // Trump hierarchy (strongest to weakest):
  // 16 (big joker) -> 15 (small joker) -> trumpRank (level) -> 14 (A) -> 13 (K) -> ... -> 2
  const trumpOrder: number[] = [16, 15]
  if (trumpRank !== null) trumpOrder.push(trumpRank)
  if (trumpSuit && trumpSuit !== 'fixed') {
    for (let r = 14; r >= 2; r--) {
      if (r !== trumpRank) trumpOrder.push(r)
    }
  }

  const i1 = trumpOrder.indexOf(r1)
  const i2 = trumpOrder.indexOf(r2)
  if (i1 === -1 || i2 === -1) return false
  return Math.abs(i2 - i1) === 1
}

export function getHighestCard(cards: Card[], trumpSuit: Suit | 'fixed' | null, trumpRank: number | null): Card {
  return cards.reduce((best, c) =>
    compareCards(c, best, trumpSuit, trumpRank) > 0 ? c : best
  )
}
