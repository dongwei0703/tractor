import type { Card, Suit, Seat, TrickPlay, PlayType } from './types'
import { isTrump, getCardPower, groupCardsByRank, getRankFromGroupKey } from './comparator'

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
// 主牌（大小王/级牌/将牌花色）首出时无花色限制，跟牌者必须跟主牌
function getLeadSuit(trick: TrickPlay[], trumpSuit: Suit | 'fixed' | null, trumpRank: number | null): Suit | null {
  if (trick.length === 0) return null
  const leadCard = trick[0].cards[0]
  if (isTrump(leadCard, trumpSuit, trumpRank)) return null
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
  trick: TrickPlay[],
  trumpSuit: Suit | 'fixed' | null,
  trumpRank: number | null,
): LegalPlay[] {
  const leadCard = lead.cards[0]
  const isTrumpLead = isTrump(leadCard, trumpSuit, trumpRank)
  const leadSuit = isTrumpLead ? null : leadCard.suit
  const results: LegalPlay[] = []

  if (leadSuit) {
    // 副牌首出：必须跟同花色
    const suitCards = getCardsOfSuit(hand, leadSuit)
    if (suitCards.length > 0) {
      for (const c of suitCards) {
        results.push({ cards: [c], playType: 'single' })
      }
    } else {
      // 无法跟花色: 可以选择杀牌(出主牌)或垫牌(出非主牌)
      const trumpCards = hand.filter(c => isTrump(c, trumpSuit, trumpRank))
      for (const c of trumpCards) {
        results.push({ cards: [c], playType: 'single' })
      }
      const nonTrumps = getNonTrumpCards(hand, trumpSuit, trumpRank)
      for (const c of nonTrumps) {
        results.push({ cards: [c], playType: 'single' })
      }
    }
  } else {
    // 主牌首出（大小王/级牌/将牌花色）：有主牌必须跟主牌，无主牌才能垫牌
    const trumpCards = hand.filter(c => isTrump(c, trumpSuit, trumpRank))
    if (trumpCards.length > 0) {
      for (const c of trumpCards) {
        results.push({ cards: [c], playType: 'single' })
      }
    } else {
      // 无主牌，可以垫任意牌
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
  trick: TrickPlay[],
  trumpSuit: Suit | 'fixed' | null,
  trumpRank: number | null,
): LegalPlay[] {
  const leadCard = lead.cards[0]
  const isTrumpLead = isTrump(leadCard, trumpSuit, trumpRank)
  const leadSuit = isTrumpLead ? null : leadCard.suit
  const results: LegalPlay[] = []

  if (leadSuit) {
    // 副牌对子首出
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
    } else if (suitCards.length >= 2) {
      // 有同花色但无对子 — 必须出2张该花色单张
      for (let i = 0; i < suitCards.length; i++) {
        for (let j = i + 1; j < suitCards.length; j++) {
          results.push({ cards: [suitCards[i], suitCards[j]], playType: 'throw' })
        }
      }
    } else if (suitCards.length === 1) {
      // 只有1张同花色 — 必须出这张牌 + 1张其他牌（优先非主牌）
      const otherCards = hand.filter(c => c.id !== suitCards[0].id && !isTrump(c, trumpSuit, trumpRank))
      if (otherCards.length > 0) {
        for (const oc of otherCards) {
          results.push({ cards: [suitCards[0], oc], playType: 'throw' })
        }
      } else {
        const trumpCards = hand.filter(c => c.id !== suitCards[0].id && isTrump(c, trumpSuit, trumpRank))
        for (const tc of trumpCards) {
          results.push({ cards: [suitCards[0], tc], playType: 'throw' })
        }
      }
    } else {
      // 无法跟花色: 可以选择杀牌或垫牌
      const trumpCards = hand.filter(c => isTrump(c, trumpSuit, trumpRank))
      const trumpGroups = groupCardsByRank(trumpCards)

      for (const [, group] of trumpGroups) {
        if (group.length >= 2) {
          results.push({ cards: group.slice(0, 2), playType: 'pair' })
        }
      }

      // 垫牌：出任意2张牌
      if (hand.length >= 2) {
        for (let i = 0; i < hand.length; i++) {
          for (let j = i + 1; j < hand.length; j++) {
            results.push({ cards: [hand[i], hand[j]], playType: 'throw' })
          }
        }
      } else {
        for (const c of hand) { results.push({ cards: [c], playType: 'single' }) }
      }
    }
  } else {
    // 主牌对子首出（大小王/级牌/将牌花色对子）：有主牌必须跟主牌，无主牌才能垫牌
    const trumpCards = hand.filter(c => isTrump(c, trumpSuit, trumpRank))
    if (trumpCards.length > 0) {
      const trumpGroups = groupCardsByRank(trumpCards)
      // 优先出主牌对子
      for (const [, group] of trumpGroups) {
        if (group.length >= 2) {
          results.push({ cards: group.slice(0, 2), playType: 'pair' })
        }
      }
      // 无对子但有2张主牌：拆单张跟
      if (results.length === 0 && trumpCards.length >= 2) {
        for (let i = 0; i < trumpCards.length; i++) {
          for (let j = i + 1; j < trumpCards.length; j++) {
            results.push({ cards: [trumpCards[i], trumpCards[j]], playType: 'throw' })
          }
        }
      }
      // 只有1张主牌：出这张 + 1张其他牌
      if (results.length === 0 && trumpCards.length === 1) {
        const otherCards = hand.filter(c => c.id !== trumpCards[0].id)
        for (const oc of otherCards) {
          results.push({ cards: [trumpCards[0], oc], playType: 'throw' })
        }
      }
    } else {
      // 无主牌，垫任意2张牌
      if (hand.length >= 2) {
        for (let i = 0; i < hand.length; i++) {
          for (let j = i + 1; j < hand.length; j++) {
            results.push({ cards: [hand[i], hand[j]], playType: 'throw' })
          }
        }
      } else {
        for (const c of hand) { results.push({ cards: [c], playType: 'single' }) }
      }
    }
  }

  return results
}

// Get valid follow plays for a tractor lead
function followTractor(
  hand: Card[],
  lead: TrickPlay,
  trick: TrickPlay[],
  trumpSuit: Suit | 'fixed' | null,
  trumpRank: number | null,
): LegalPlay[] {
  const results: LegalPlay[] = []
  const tractorLen = lead.tractorLength || (lead.cards.length / 2)
  const totalCards = tractorLen * 2
  const leadCard = lead.cards[0]
  const isTrumpLead = isTrump(leadCard, trumpSuit, trumpRank)
  const leadSuit = isTrumpLead ? null : leadCard.suit

  if (leadSuit) {
    // 副牌拖拉机首出
    const suitCards = getCardsOfSuit(hand, leadSuit)

    // 1. 尝试找同等长度的同花色拖拉机
    if (suitCards.length >= totalCards) {
      const suitTractors = findTractorsInCards(suitCards, trumpSuit, trumpRank, tractorLen, false)
      for (const tractor of suitTractors) {
        results.push({ cards: tractor, playType: 'tractor', tractorLength: tractorLen })
      }
    }

    // 2. 有同花色牌但无拖拉机：必须用同花色牌（对子优先+单张补足）
    if (results.length === 0 && suitCards.length > 0) {
      const combos = buildTractorFallback(suitCards, totalCards, hand)
      for (const combo of combos) {
        results.push({ cards: combo, playType: 'throw' })
      }
    }

    // 3. 完全没有同花色：杀牌或垫牌
    if (results.length === 0) {
      // 杀牌：用主牌拖拉机
      const trumpCards = hand.filter(c => isTrump(c, trumpSuit, trumpRank))
      const trumpTractors = findTractorsInCards(trumpCards, trumpSuit, trumpRank, tractorLen, true)
      for (const tractor of trumpTractors) {
        results.push({ cards: tractor, playType: 'tractor', tractorLength: tractorLen })
      }

      // 垫牌：出任意 totalCards 张牌
      if (hand.length >= totalCards) {
        const sorted = [...hand].sort((a, b) =>
          getCardPower(a, trumpSuit, trumpRank) - getCardPower(b, trumpSuit, trumpRank)
        )
        results.push({ cards: sorted.slice(0, totalCards), playType: 'throw' })
      } else if (hand.length > 0) {
        results.push({ cards: [...hand], playType: 'throw' })
      }
    }
  } else {
    // 主牌拖拉机首出：有主牌必须跟主牌，无主牌才能垫牌
    const trumpCards = hand.filter(c => isTrump(c, trumpSuit, trumpRank))
    if (trumpCards.length > 0) {
      // 优先找主牌拖拉机
      const trumpTractors = findTractorsInCards(trumpCards, trumpSuit, trumpRank, tractorLen, true)
      for (const tractor of trumpTractors) {
        results.push({ cards: tractor, playType: 'tractor', tractorLength: tractorLen })
      }
      // 无拖拉机但有足够主牌：用主牌对子+单张补足
      if (results.length === 0 && trumpCards.length >= totalCards) {
        const combos = buildTractorFallback(trumpCards, totalCards, hand)
        for (const combo of combos) {
          results.push({ cards: combo, playType: 'throw' })
        }
      }
      // 主牌不够 totalCards 张但有一些主牌：全部主牌 + 其他牌补足
      if (results.length === 0 && trumpCards.length < totalCards) {
        const otherCards = hand.filter(c => !isTrump(c, trumpSuit, trumpRank))
        const combo = [...trumpCards, ...otherCards].slice(0, totalCards)
        if (combo.length > 0) {
          results.push({ cards: combo, playType: 'throw' })
        }
      }
    } else {
      // 无主牌，垫任意 totalCards 张牌
      if (hand.length >= totalCards) {
        const sorted = [...hand].sort((a, b) =>
          getCardPower(a, trumpSuit, trumpRank) - getCardPower(b, trumpSuit, trumpRank)
        )
        results.push({ cards: sorted.slice(0, totalCards), playType: 'throw' })
      } else if (hand.length > 0) {
        results.push({ cards: [...hand], playType: 'throw' })
      }
    }
  }

  return results
}

// 在指定牌中查找长度为 minPairs 的拖拉机（连续对子序列）
function findTractorsInCards(
  cards: Card[],
  trumpSuit: Suit | 'fixed' | null,
  trumpRank: number | null,
  minPairs: number,
  isTrumpContext: boolean,
): Card[][] {
  const groups = groupCardsByRank(cards)
  const pairs: { rank: number; cards: Card[] }[] = []

  for (const [key, group] of groups) {
    if (group.length >= 2) {
      pairs.push({ rank: getRankFromGroupKey(key), cards: group.slice(0, 2) })
    }
  }

  if (pairs.length < minPairs) return []

  if (isTrumpContext) {
    pairs.sort((a, b) => getCardPower(b.cards[0], trumpSuit, trumpRank) - getCardPower(a.cards[0], trumpSuit, trumpRank))
  } else {
    pairs.sort((a, b) => b.rank - a.rank)
  }

  const result: Card[][] = []
  for (let i = 0; i <= pairs.length - minPairs; i++) {
    let isConsecutive = true
    for (let j = 0; j < minPairs - 1; j++) {
      const adj = isTrumpContext
        ? areTrumpRanksAdjacent(pairs[i + j].rank, pairs[i + j + 1].rank, trumpSuit, trumpRank)
        : (pairs[i + j].rank - pairs[i + j + 1].rank === 1)
      if (!adj) { isConsecutive = false; break }
    }
    if (isConsecutive) {
      const tractorCards: Card[] = []
      for (let j = 0; j < minPairs; j++) {
        tractorCards.push(...pairs[i + j].cards)
      }
      result.push(tractorCards)
    }
  }
  return result
}

// 从牌中选取对子优先、剩余用单张补足的出牌组合（用于拖拉机跟牌fallback）
// suitCards: 同花色牌；totalCards: 需要出的总牌数；fullHand: 完整手牌（用于不足时从其他花色补）
function buildTractorFallback(suitCards: Card[], totalCards: number, fullHand: Card[]): Card[][] {
  const results: Card[][] = []
  const groups = groupCardsByRank(suitCards)

  // 收集所有对子
  const pairCards: Card[] = []
  const singleCards: Card[] = []
  for (const [, group] of groups) {
    if (group.length >= 2) {
      pairCards.push(group[0], group[1])
      for (let k = 2; k < group.length; k++) {
        singleCards.push(group[k])
      }
    } else {
      singleCards.push(group[0])
    }
  }

  // 优先用对子，再用同花色单张，不够的从其他花色补
  const suitAvailable = [...pairCards, ...singleCards]
  if (suitAvailable.length >= totalCards) {
    // 同花色够用：生成多种组合
    for (let i = 0; i <= suitAvailable.length - totalCards; i++) {
      const combo: Card[] = []
      for (let j = 0; j < totalCards; j++) {
        combo.push(suitAvailable[(i + j) % suitAvailable.length])
      }
      // 去重
      const comboKey = combo.map(c => c.id).sort().join(',')
      if (!results.some(r => r.map(c => c.id).sort().join(',') === comboKey)) {
        results.push(combo)
      }
    }
  } else {
    // 同花色不够：全部同花色 + 从其他花色补足
    const otherCards = fullHand.filter(c =>
      !suitCards.some(sc => sc.id === c.id)
    )
    // 从其他牌中选 (totalCards - suitAvailable.length) 张补足
    const needMore = totalCards - suitAvailable.length
    if (otherCards.length >= needMore) {
      for (let i = 0; i <= otherCards.length - needMore; i++) {
        const combo = [...suitAvailable]
        for (let j = 0; j < needMore; j++) {
          combo.push(otherCards[(i + j) % otherCards.length])
        }
        const comboKey = combo.map(c => c.id).sort().join(',')
        if (!results.some(r => r.map(c => c.id).sort().join(',') === comboKey)) {
          results.push(combo)
        }
      }
    } else {
      // 整个手牌不够 totalCards（极端情况），全出
      results.push([...suitAvailable, ...otherCards])
    }
  }

  return results
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
      return followSingle(hand, lead, trick, trumpSuit, trumpRank)
    case 'pair':
      return followPair(hand, lead, trick, trumpSuit, trumpRank)
    case 'tractor':
      return followTractor(hand, lead, trick, trumpSuit, trumpRank)
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

  for (const [key, group] of groups) {
    if (group.length >= 2) {
      pairs.push({ rank: getRankFromGroupKey(key), cards: group.slice(0, 2) })
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

