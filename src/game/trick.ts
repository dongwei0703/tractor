import type { TrickPlay, Seat, Suit } from './types'
import { isTrump, getCardPower } from './comparator'

const typeRank: Record<string, number> = { tractor: 3, pair: 2, single: 1, throw: 0 }

function comparePlay(
  a: TrickPlay, b: TrickPlay,
  trumpSuit: Suit | 'fixed' | null,
  trumpRank: number | null,
): number {
  const aT = a.cards.length > 0 && isTrump(a.cards[0], trumpSuit, trumpRank)
  const bT = b.cards.length > 0 && isTrump(b.cards[0], trumpSuit, trumpRank)

  if (aT && !bT) return 1
  if (!aT && bT) return -1

  const at = typeRank[a.playType] || 1
  const bt = typeRank[b.playType] || 1
  if (at !== bt) return at - bt

  const ap = getCardPower(a.cards[0], trumpSuit, trumpRank)
  const bp = getCardPower(b.cards[0], trumpSuit, trumpRank)
  if (ap !== bp) return ap - bp

  if (a.playType === 'tractor' && b.playType === 'tractor') {
    const al = a.cards.length
    const bl = b.cards.length
    if (al !== bl) return al - bl
  }

  return 0
}

export function determineTrickWinner(
  trick: TrickPlay[],
  trumpSuit: Suit | 'fixed' | null,
  trumpRank: number | null,
): Seat {
  if (trick.length === 0) return 0
  let best = trick[0]
  for (let i = 1; i < trick.length; i++) {
    if (comparePlay(trick[i], best, trumpSuit, trumpRank) > 0) {
      best = trick[i]
    }
  }
  return best.seat
}
