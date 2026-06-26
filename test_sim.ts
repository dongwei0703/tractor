import { createDeck, shuffleDeck, generateDealSequence, getBottomCards, sortHand, removeCards, addCards } from "./src/game/deck.ts"
import { isTrump } from "./src/game/comparator.ts"
import { determineTrickWinner } from "./src/game/trick.ts"
import { countTrickPoints, calculateLevelChange } from "./src/game/scoring.ts"
import { shouldBid, selectPlay } from "./src/game/ai.ts"

const ROUNDS = 20
let passed = 0
let failed = 0

for (let r = 1; r <= ROUNDS; r++) {
  try {
    const deck = shuffleDeck(createDeck())
    const dealingQueue = generateDealSequence(deck)
    const bottomCards = getBottomCards(deck)
    const hands = [[], [], [], []] as any[][]
    let trumpSuit = null
    let trumpRank = null
    let dealerSeat = null
    let hasBid = false

    // Dealing
    for (let i = 0; i < dealingQueue.length; i++) {
      const step = dealingQueue[i]
      hands[step.targetSeat] = addCards(hands[step.targetSeat], [step.card])
      if (step.targetSeat === 0) hands[0] = sortHand(hands[0], trumpSuit, trumpRank)
      if (!hasBid) {
        const eb = dealerSeat != null && trumpSuit != null ? { bidder: dealerSeat, suit: trumpSuit, isPair: false, pairCount: 1 } : null
        const bid = shouldBid(hands[step.targetSeat], 2, eb, "easy")
        if (bid) {
          bid.bidder = step.targetSeat
          trumpSuit = bid.suit; trumpRank = 2; dealerSeat = bid.bidder; hasBid = true
          for (let s = 0; s < 4; s++) hands[s] = sortHand(hands[s], trumpSuit, trumpRank)
        }
      }
    }
    // Forced bidding
    if (!hasBid) {
      const fd = Math.floor(Math.random() * 4)
      trumpSuit = bottomCards[0].suit !== "joker" ? bottomCards[0].suit : "fixed"
      trumpRank = 2; dealerSeat = fd; hasBid = true
      for (let s = 0; s < 4; s++) hands[s] = sortHand(hands[s], trumpSuit, trumpRank)
    }
    // Bottom cards: 先给庄家加入底牌(25+8=33张)，再扣8张
    const beforeAdd = hands[dealerSeat].length
    hands[dealerSeat] = addCards(hands[dealerSeat], bottomCards)
    const afterAdd = hands[dealerSeat].length
    const dh = [...hands[dealerSeat]]
    dh.sort((a, b) => {
      if (isTrump(a, trumpSuit, trumpRank) === isTrump(b, trumpSuit, trumpRank)) return a.rank - b.rank
      return isTrump(a, trumpSuit, trumpRank) ? 1 : -1
    })
    const toBury = dh.slice(0, 8)
    hands[dealerSeat] = removeCards(hands[dealerSeat], toBury)
    const afterBury = hands[dealerSeat].length
    // 更新 bottomCards 为扣的8张（用于后续计分）
    bottomCards.length = 0
    bottomCards.push(...toBury)
    if (beforeAdd !== 25 || afterAdd !== 33 || afterBury !== 25) {
      throw new Error(`r${r}: dealerCardCnt before=${beforeAdd} afterAdd=${afterAdd} afterBury=${afterBury}`)
    }
    // Playing — 持续出牌直到所有手牌清空（对子/拖拉机可能一轮出多张）
    let cp = dealerSeat
    const pts = [0, 0]
    let tn = 0
    while (hands.some(h => h.length > 0)) {
      tn++
      const trick = []
      for (let turn = 0; turn < 4; turn++) {
        const seat = ((cp + turn) % 4)
        const legalPlay = selectPlay(hands[seat], trick, trumpSuit, trumpRank, seat, "easy")
        if (!legalPlay || legalPlay.cards.length === 0) {
          const leadInfo = trick.length > 0 ? ` leadType=${trick[0].playType} leadSuit=${trick[0].cards[0].suit} leadRank=${trick[0].cards[0].rank}` : ''
          throw new Error(`r${r} t${tn}: seat${seat} empty handSz=${hands[seat].length} trickLen=${trick.length}${leadInfo}`)
        }
        trick.push({ seat, cards: legalPlay.cards, playType: legalPlay.playType, tractorLength: legalPlay.tractorLength })
        hands[seat] = removeCards(hands[seat], legalPlay.cards)
      }
      const winner = determineTrickWinner(trick, trumpSuit, trumpRank)
      const tp = countTrickPoints(trick)
      pts[winner === 0 || winner === 2 ? 0 : 1] += tp
      cp = winner
    }
    // Verify: 所有牌应已出完
    let rem = 0
    for (let s = 0; s < 4; s++) rem += hands[s].length
    if (rem !== 0) throw new Error(`r${r}: ${rem} cards left after ${tn} tricks`)
    const ourD = dealerSeat === 0 || dealerSeat === 2
    const ndp = ourD ? pts[1] : pts[0]
    const res = calculateLevelChange(ndp, 2, 2, ourD)
    process.stdout.write(`Round ${String(r).padStart(2)}: dealer=${dealerSeat} trump=${trumpSuit} ndpts=${ndp} ourChg=${res.ourLevelChange} theirChg=${res.theirLevelChange}\n`)
    passed++
  } catch (e) {
    process.stderr.write(`FAIL r${r}: ${e.message}\n`)
    failed++
  }
}
process.stdout.write(`\n${passed}/${ROUNDS} passed, ${failed} failed\n`)
process.exit(failed > 0 ? 1 : 0)
