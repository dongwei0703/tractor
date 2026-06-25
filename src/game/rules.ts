import type { Card, Suit, Seat, TrickPlay, PlayType } from './types'
import { isTrump, getCardPower, identifyPlayType, groupCardsByRank, compareCards } from './comparator'

export interface LegalPlay {
  cards: Card[]
  playType: PlayType
  tractorLength?: number
}

// Check if a card matches the lead suit
function matchesSuit(card: Card, leadSuit: Suit | null): boolean {
  if (!leadSuit) return true
  return card.suit === leadSuit || card.suit === 'joker'
}

// Get the suit of a trick's lead (the first play's suit)
function getLeadSuit(trick: TrickPlay[]): Suit | null {
  if (trick.length === 0) return null
  const leadCard = trick[0].cards[0]
  if (leadCard.suit === 'joker') return null // joker lead = no suit restriction
  return leadCard.suit
}

// Get card combinations from hand for a specific suit and power
function getCardsOfSuit(hand: Card[], suit: Suit | 'joker'): Card[] {
  return hand.filter(c => c.suit === suit)
}

function getNonTrumpCards(hand: Card[], trumpSuit: Suit | 'fixed' | null, trumpRank: number | null): Card[] {
  return hand.filter(c => !isTrump(c, trumpSuit, trumpRank))
}

// Get valid follow plays for a single card lead
function followSingle(
  hand: Card[],
  lead: TrickPlay,
  trumpSuit: Suit | 'fixed' | null,
  trumpRank: number | null,
): LegalPlay[] {
  const leadCard = lead.cards[0]
  const leadSuit = leadCard.suit === 'joker' ? null : leadCard.suit
  const results: LegalPlay[] = []

  const mustBeat = getMaxTrumpInTrick(lead, trumpSuit, trumpRank)

  if (leadSuit) {
    // Must follow suit if possible
    const suitCards = getCardsOfSuit(hand, leadSuit)
    if (suitCards.length > 0) {
      for (const c of suitCards) {
        results.push({ cards: [c], playType: 'single' })
      }
    } else {
      // No suit to follow: must trump if possible, or discard
      const trumpCards = hand.filter(c => isTrump(c, trumpSuit, trumpRank))
      if (trumpCards.length > 0) {
        // Must trump and must beat existing trump
        for (const c of trumpCards) {
          if (mustBeat === null || getCardPower(c, trumpSuit, trumpRank) > mustBeat) {
            results.push({ cards: [c], playType: 'single' })
          }
        }
      } else {
        // No trump, can discard any single card (just first available of each rank)
        for (const c of hand) {
          results.push({ cards: [c], playType: 'single' })
        }
      }
    }
  } else {
    // Joker lead: must trump or can play any
    const trumpCards = hand.filter(c => isTrump(c, trumpSuit, trumpRank))
    if (trumpCards.length > 0) {
      for (const c of trumpCards) {
        if (mustBeat === null || getCardPower(c, trumpSuit, trumpRank) > mustBeat) {
          results.push({ cards: [c], playType: 'single' })
        }
      }
    } else {
      for (const c of hand) {
        results.push({ cards: [c], playType: 'single' })
      }
    }
  }

  return results
}

// Get valid follow plays for a pair lead
function followPair(
  hand: Card[],
  lead: TrickPlay,
  trumpSuit: Suit | 'fixed' | null,
  trumpRank: number | null,
): LegalPlay[] {
  const leadCard = lead.cards[0]
  const leadSuit = leadCard.suit === 'joker' ? null : leadCard.suit
  const results: LegalPlay[] = []
  const mustBeat = getMaxTrumpInTrick(lead, trumpSuit, trumpRank)

  if (leadSuit) {
    const suitCards = getCardsOfSuit(hand, leadSuit)
    const suitGroups = groupCardsByRank(suitCards)

    // Find pairs in lead suit
    const pairs: LegalPlay[] = []
    for (const [, group] of suitGroups) {
      if (group.length >= 2) {
        pairs.push({ cards: group.slice(0, 2), playType: 'pair' })
      }
    }

    if (pairs.length > 0) {
      // Must follow with a pair
      results.push(...pairs)
    } else if (suitCards.length > 0) {
      // Have suit cards but no pair - must play 2 singles of that suit
      for (let i = 0; i < suitCards.length; i++) {
        for (let j = i + 1; j < suitCards.length; j++) {
          results.push({ cards: [suitCards[i], suitCards[j]], playType: 'pair' })
        }
      }
    } else {
      // No suit to follow: trump or discard
      const trumpCards = hand.filter(c => isTrump(c, trumpSuit, trumpRank))
      const trumpGroups = groupCardsByRank(trumpCards)

      let trumpPairs: LegalPlay[] = []
      for (const [, group] of trumpGroups) {
        if (group.length >= 2) {
          const pair: LegalPlay = { cards: group.slice(0, 2), playType: 'pair' }
          if (mustBeat === null || getPairPower(group.slice(0, 2), trumpSuit, trumpRank) > mustBeat) {
            trumpPairs.push(pair)
          }
        }
      }

      if (trumpPairs.length > 0) {
        results.push(...trumpPairs)
      } else {
        // Discard any 2 non-trump cards
        const nonTrumps = getNonTrumpCards(hand, trumpSuit, trumpRank)
        for (let i = 0; i < nonTrumps.length; i++) {
          for (let j = i + 1; j < nonTrumps.length; j++) {
            results.push({ cards: [nonTrumps[i], nonTrumps[j]], playType: 'pair' })
          }
        }
      }
    }
  } else {
    // Joker lead
    const trumpCards = hand.filter(c => isTrump(c, trumpSuit, trumpRank))
    const trumpGroups = groupCardsByRank(trumpCards)
    for (const [, group] of trumpGroups) {
      if (group.length >= 2) {
        if (mustBeat === null || getPairPower(group.slice(0, 2), trumpSuit, trumpRank) > mustBeat) {
          results.push({ cards: group.slice(0, 2), playType: 'pair' })
        }
      }
    }
  }

  return results
}

function getPairPower(cards: Card[], trumpSuit: Suit | 'fixed' | null, trumpRank: number | null): number {
  return getCardPower(cards[0], trumpSuit, trumpRank)
}

function getMaxTrumpInTrick(trick: TrickPlay[] | TrickPlay, trumpSuit: Suit | 'fixed' | null, trumpRank: number | null): number | null {
  if (Array.isArray(trick)) {
    let max = -1
    for (const play of trick) {
      if (play.playType === 'single' && isTrump(play.cards[0], trumpSuit, trumpRank)) {
        max = Math.max(max, getCardPower(play.cards[0], trumpSuit, trumpRank))
      }
    }
    return max === -1 ? null : max
  }
  return null
}

// Get valid follow plays
export function getValidFollows(
  hand: Card[],
  trick: TrickPlay[],
  trumpSuit: Suit | 'fixed' | null,
  trumpRank: number | null,
): LegalPlay[] {
  if (trick.length === 0) return getValidLeads(hand, trumpSuit, trumpRank)

  const lead = trick[0]
  switch (lead.playType) {
    case 'single':
      return followSingle(hand, lead, trumpSuit, trumpRank)
    case 'pair':
      return followPair(hand, lead, trumpSuit, trumpRank)
    case 'tractor':
      return followPair(hand, lead, trumpSuit, trumpRank) // simplified
    default:
      return []
  }
}

// Get valid lead plays
export function getValidLeads(
  hand: Card[],
  trumpSuit: Suit | 'fixed' | null,
  trumpRank: number | null,
): LegalPlay[] {
  const results: LegalPlay[] = []

  // All singles
  const seenIds = new Set<string>()
  for (const c of hand) {
    if (!seenIds.has(c.id)) {
      seenIds.add(c.id)
      results.push({ cards: [c], playType: 'single' })
    }
  }

  // Pairs
  const groups = groupCardsByRank(hand)
  for (const [, group] of groups) {
    if (group.length >= 2) {
      for (let i = 0; i + 1 < group.length; i += 2) {
        results.push({ cards: [group[i], group[i + 1]], playType: 'pair' })
      }
    }
  }

  // Tractors (simplified - 2-pair tractors only for now)
  // Detect consecutive pairs
  const trumpCards = hand.filter(c => isTrump(c, trumpSuit, trumpRank))
  const trumpPairs = findConsecutivePairs(trumpCards, trumpSuit, trumpRank, true)
  for (const tractor of trumpPairs) {
    results.push({ cards: tractor, playType: 'tractor', tractorLength: tractor.length / 2 })
  }

  return results
}

function findConsecutivePairs(
  cards: Card[],
  trumpSuit: Suit | 'fixed' | null,
  trumpRank: number | null,
  isTrumpContext: boolean,
): Card[][] {
  const groups = groupCardsByRank(cards)
  const pairs: { rank: number; cards: Card[] }[] = []

  for (const [rank, group] of groups) {
    if (group.length >= 2) {
      pairs.push({ rank, cards: group.slice(0, 2) })
    }
  }

  if (pairs.length < 2) return []

  // Sort by power
  if (isTrumpContext) {
    pairs.sort((a, b) => getCardPower(b.cards[0], trumpSuit, trumpRank) - getCardPower(a.cards[0], trumpSuit, trumpRank))
  } else {
    pairs.sort((a, b) => b.rank - a.rank)
  }

  const result: Card[][] = []
  // Find consecutive pairs
  for (let i = 0; i < pairs.length - 1; i++) {
    const isAdj = isTrumpContext
      ? areTrumpRanksAdjacent(pairs[i].rank, pairs[i + 1].rank, trumpSuit, trumpRank)
      : (pairs[i].rank - pairs[i + 1].rank === 1)

    if (isAdj) {
      result.push([...pairs[i].cards, ...pairs[i + 1].cards])
    }
  }

  return result
}

function areTrumpRanksAdjacent(r1: number, r2: number, trumpSuit: Suit | 'fixed' | null, trumpRank: number | null): boolean {
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
