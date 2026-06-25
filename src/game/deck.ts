import type { Card, Suit, Seat, DealStep } from './types'
import { SUITS } from './constants'

let cardIdCounter = 0

function resetIdCounter(): void {
  cardIdCounter = 0
}

function createCard(suit: Suit, rank: number): Card {
  return {
    id: `c-${++cardIdCounter}`,
    suit,
    rank,
    faceUp: false,
  }
}

function createJoker(type: 'small' | 'big'): Card {
  return {
    id: `c-${++cardIdCounter}`,
    suit: 'joker',
    rank: type === 'big' ? 16 : 15,
    jokerType: type,
    faceUp: false,
  }
}

export function createDeck(): Card[] {
  resetIdCounter()
  const deck: Card[] = []
  for (let d = 0; d < 2; d++) {
    deck.push(createJoker('big'))
    deck.push(createJoker('small'))
    for (const suit of SUITS) {
      for (let rank = 2; rank <= 14; rank++) {
        deck.push(createCard(suit, rank))
      }
    }
  }
  return deck
}

export function shuffleDeck(deck: Card[]): Card[] {
  const result = [...deck]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

export function generateDealSequence(deck: Card[]): DealStep[] {
  const steps: DealStep[] = []
  const seats: Seat[] = [0, 1, 2, 3]
  let idx = 0
  for (let round = 0; round < 25; round++) {
    for (const seat of seats) {
      steps.push({ card: deck[idx], targetSeat: seat, index: idx })
      idx++
    }
  }
  return steps
}

export function getBottomCards(deck: Card[]): Card[] {
  return deck.slice(100, 108)
}

export function sortHand(cards: Card[], trumpSuit: Suit | 'fixed' | null, trumpRank: number | null): Card[] {
  const getGroup = (c: Card): number => {
    if (c.rank === 16) return 0
    if (c.rank === 15) return 1
    if (trumpRank !== null && c.rank === trumpRank) return 2
    if (trumpSuit && trumpSuit !== 'fixed' && c.suit === trumpSuit) return 3
    const suitOrder: Record<string, number> = { spades: 4, hearts: 5, clubs: 6, diamonds: 7 }
    return suitOrder[c.suit] ?? 8
  }

  return [...cards].sort((a, b) => {
    const ga = getGroup(a)
    const gb = getGroup(b)
    if (ga !== gb) return ga - gb
    return b.rank - a.rank
  })
}

export function removeCards(hand: Card[], toRemove: Card[]): Card[] {
  const removeIds = new Set(toRemove.map(c => c.id))
  return hand.filter(c => !removeIds.has(c.id))
}

export function addCards(hand: Card[], cards: Card[]): Card[] {
  return [...hand, ...cards]
}
