import { defineStore } from 'pinia'
import type { Card, Suit, Seat, GamePhase, Difficulty, TrickPlay, BidInfo, RoundResult, PlayerInfo, Team, DealStep, PlayType } from '@/game/types'
import { PLAYER_NAMES, SEAT_TEAMS, DEAL_SPEED_MS, BID_WINDOW_MS, AI_PLAY_DELAY_MS } from '@/game/constants'
import { createDeck, shuffleDeck, generateDealSequence, getBottomCards, sortHand, removeCards, addCards } from '@/game/deck'
import { isTrump } from '@/game/comparator'
import { getValidLeads, getValidFollows, type LegalPlay } from '@/game/rules'
import { determineTrickWinner } from '@/game/trick'
import { countTrickPoints, calculateLevelChange } from '@/game/scoring'
import { shouldBid, selectPlay } from '@/game/ai'

export const useGameStore = defineStore('game', {
  state: () => ({
    phase: 'start' as GamePhase,
    difficulty: 'easy' as Difficulty,
    currentLevel: 2,
    players: [
      { name: PLAYER_NAMES[0], seat: 0 as Seat, isHuman: true, team: SEAT_TEAMS[0] },
      { name: PLAYER_NAMES[1], seat: 1 as Seat, isHuman: false, team: SEAT_TEAMS[1] },
      { name: PLAYER_NAMES[2], seat: 2 as Seat, isHuman: false, team: SEAT_TEAMS[2] },
      { name: PLAYER_NAMES[3], seat: 3 as Seat, isHuman: false, team: SEAT_TEAMS[3] },
    ] as PlayerInfo[],
    hands: [[], [], [], []] as Card[][],
    trumpSuit: null as Suit | 'fixed' | null,
    trumpRank: null as number | null,
    dealer: null as Seat | null,
    currentPlayer: null as Seat | null,
    currentTrick: [] as TrickPlay[],
    trickNumber: 1,
    tricksWon: [0, 0] as [number, number],
    pointsCollected: [0, 0] as [number, number],
    bottomCards: [] as Card[],
    dealingQueue: [] as DealStep[],
    dealingIndex: 0,
    bidHistory: [] as BidInfo[],
    hasBid: false,
    roundResults: [] as RoundResult[],
    ourLevel: 2,
    theirLevel: 2,
    autoPlayTimer: null as ReturnType<typeof setTimeout> | null,
    dealingInterval: null as ReturnType<typeof setInterval> | null,
    selectedCards: [] as Card[],
    bottomSelectedCards: [] as Card[],
    bidAnnouncement: null as { bidder: Seat; suit: Suit | 'fixed'; isPair: boolean } | null,
    playError: null as string | null,
    trickEnd: false,
    trickWinner: null as Seat | null,
    previousTrick: null as TrickPlay[] | null,
    previousTrickWinner: null as Seat | null,
    previousTrickNumber: null as number | null,
  }),
  getters: {
    playerHand(state): Card[] {
      return state.hands[0]
    },
    isPlayerTurn(state): boolean {
      return state.currentPlayer === 0
    },
    isDealerTeam(state): boolean {
      if (state.dealer === null) return false
      return state.players[state.dealer].team === 'us'
    },
    playerTeamPoints(state): number {
      const p = state.players[0].team === 'us' ? 0 : 1
      return state.pointsCollected[p]
    },
    opponentTeamPoints(state): number {
      const p = state.players[0].team === 'us' ? 1 : 0
      return state.pointsCollected[p]
    },
    nonDealerPoints(state): number {
      if (state.dealer === null) return 0
      const dealerTeam = state.players[state.dealer].team
      if (dealerTeam === 'us') return state.pointsCollected[1]
      return state.pointsCollected[0]
    },
    canBidDuringDeal(state): boolean {
      if (state.phase !== 'dealing') return false
      if (state.hasBid) return false
      const levelCards = state.hands[0].filter(c => c.rank === state.currentLevel && c.suit !== 'joker')
      return levelCards.length > 0
    },
    getBiddableCards(state): Card[] {
      return state.hands[0].filter(c => c.rank === state.currentLevel && c.suit !== 'joker')
    },
  },
  actions: {
    startGame(difficulty: Difficulty) {
      this.difficulty = difficulty
      this.phase = 'dealing'
      this.currentLevel = this.ourLevel
      this.trumpSuit = null
      this.trumpRank = null
      this.dealer = null
      this.currentPlayer = null
      this.currentTrick = []
      this.trickNumber = 1
      this.tricksWon = [0, 0]
      this.pointsCollected = [0, 0]
      this.bottomCards = []
      this.dealingIndex = 0
      this.bidHistory = []
      this.hasBid = false
      this.selectedCards = []
      this.bottomSelectedCards = []
      this.bidAnnouncement = null
      this.trickEnd = false
      this.trickWinner = null
      this.previousTrick = null
      this.previousTrickWinner = null
      this.previousTrickNumber = null
      this.hands = [[], [], [], []]
      const deck = shuffleDeck(createDeck())
      this.dealingQueue = generateDealSequence(deck)
      this.bottomCards = getBottomCards(deck)
      this.startDealing()
    },
    startDealing() {
      if (this.dealingInterval) clearInterval(this.dealingInterval)
      this.dealingInterval = setInterval(() => {
        this.processDealStep()
      }, DEAL_SPEED_MS + BID_WINDOW_MS)
    },
    processDealStep() {
      if (this.dealingIndex >= this.dealingQueue.length) {
        this.finishDealing()
        return
      }
      const step = this.dealingQueue[this.dealingIndex]
      this.hands[step.targetSeat] = addCards(this.hands[step.targetSeat], [step.card])
      if (step.targetSeat === 0) {
        this.hands[0] = sortHand(this.hands[0], this.trumpSuit, this.trumpRank)
      }
      this.dealingIndex++
      if (!this.hasBid) {
        const bidSeat = step.targetSeat
        if (bidSeat !== 0) {
          const existingBid = this.bidHistory.length > 0 ? this.bidHistory[this.bidHistory.length - 1] : null
          const bid = shouldBid(this.hands[bidSeat], this.currentLevel, existingBid, this.difficulty)
          if (bid) {
            bid.bidder = bidSeat
            this.processBid(bid)
          }
        }
      }
    },
    finishDealing() {
      if (this.dealingInterval) {
        clearInterval(this.dealingInterval)
        this.dealingInterval = null
      }
      if (this.hasBid) {
        // 将底牌加入庄家手牌（25+8=33张），庄家再选8张扣底
        this.hands[this.dealer!] = addCards(this.hands[this.dealer!], this.bottomCards)
        this.hands[this.dealer!] = sortHand(this.hands[this.dealer!], this.trumpSuit, this.trumpRank)
        this.phase = 'bottom_cards'
        this.currentPlayer = this.dealer
        this.bottomSelectedCards = []
        this.bidAnnouncement = null
        if (this.dealer !== 0) {
          this.scheduleAutoPlay()
        }
      } else {
        this.phase = 'bidding'
        this.startForcedBidding()
      }
    },
    startForcedBidding() {
      if (this.bottomCards.length > 0) {
        const first = this.bottomCards[0]
        const forcedDealer: Seat = (Math.floor(Math.random() * 4)) as Seat
        if (first.suit !== 'joker') {
          this.trumpSuit = first.suit
        } else {
          this.trumpSuit = 'fixed'
        }
        this.trumpRank = this.currentLevel
        this.dealer = forcedDealer
        this.hasBid = true
        this.bidHistory = [{ bidder: forcedDealer, suit: this.trumpSuit, isPair: false, pairCount: 1 }]
        this.bidAnnouncement = { bidder: forcedDealer, suit: this.trumpSuit!, isPair: false }
        // 将底牌加入庄家手牌（25+8=33张），庄家再选8张扣底
        this.hands[forcedDealer] = addCards(this.hands[forcedDealer], this.bottomCards)
        for (let s = 0; s < 4; s++) {
          this.hands[s] = sortHand(this.hands[s], this.trumpSuit, this.trumpRank)
        }
        this.phase = 'bottom_cards'
        this.currentPlayer = forcedDealer
        this.bottomSelectedCards = []
        if (forcedDealer !== 0) {
          this.scheduleAutoPlay()
        }
      }
    },
    playerBid(suit: Suit | 'fixed', isPair: boolean) {
      if (!this.canBidDuringDeal) return
      this.hasBid = true
      const bid: BidInfo = { bidder: 0, suit, isPair, pairCount: isPair ? 2 : 1 }
      this.processBid(bid)
    },
    processBid(bid: BidInfo) {
      this.hasBid = true
      this.bidHistory.push(bid)
      this.trumpSuit = bid.suit
      this.trumpRank = this.currentLevel
      this.dealer = bid.bidder
      this.bidAnnouncement = { bidder: bid.bidder, suit: bid.suit, isPair: bid.isPair }
      for (let s = 0; s < 4; s++) {
        this.hands[s] = sortHand(this.hands[s], this.trumpSuit, this.trumpRank)
      }
    },
    toggleBottomCardSelection(card: Card) {
      if (this.phase !== 'bottom_cards' || this.dealer !== 0) return
      const idx = this.bottomSelectedCards.findIndex(c => c.id === card.id)
      if (idx >= 0) {
        this.bottomSelectedCards.splice(idx, 1)
      } else if (this.bottomSelectedCards.length < 8) {
        this.bottomSelectedCards.push(card)
      }
    },
    confirmBottomCards() {
      if (this.bottomSelectedCards.length !== 8) return
      this.setBottomCards(this.bottomSelectedCards)
      this.bottomSelectedCards = []
    },
    setBottomCards(cards: Card[]) {
      this.hands[this.dealer!] = removeCards(this.hands[this.dealer!], cards)
      this.bottomCards = cards
      this.phase = 'playing'
      this.currentPlayer = this.dealer
      this.currentTrick = []
      this.trickNumber = 1
      this.hands[0] = sortHand(this.hands[0], this.trumpSuit, this.trumpRank)
      if (this.dealer !== 0) {
        this.scheduleAutoPlay()
      }
    },
    playSelectedCards() {
      if (this.trickEnd) return
      if (this.selectedCards.length === 0) return
      this.playError = null

      const selectedIds = new Set(this.selectedCards.map(c => c.id))
      let matchedPlay: LegalPlay | undefined

      if (this.currentTrick.length === 0) {
        // 首出校验：必须是一个合法的首出牌型
        const validLeads = getValidLeads(this.hands[0], this.trumpSuit, this.trumpRank)
        matchedPlay = validLeads.find(lp =>
          lp.cards.length === this.selectedCards.length &&
          lp.cards.every(c => selectedIds.has(c.id))
        )
        if (!matchedPlay) {
          this.playError = '无效出牌：请选择合法的单张、对子或拖拉机'
          return
        }
      } else {
        // 跟牌校验：必须符合跟牌规则（花色、牌型、杀牌/垫牌）
        const validFollows = getValidFollows(
          this.hands[0], this.currentTrick, this.trumpSuit, this.trumpRank
        )
        matchedPlay = validFollows.find(lp =>
          lp.cards.length === this.selectedCards.length &&
          lp.cards.every(c => selectedIds.has(c.id))
        )
        if (!matchedPlay) {
          this.playError = '无效跟牌：必须跟随首出花色和牌型，无法跟牌时可杀牌或垫牌'
          return
        }
      }

      this.playerPlay(this.selectedCards, matchedPlay.playType, matchedPlay.tractorLength)
      this.selectedCards = []
    },
    playerPlay(cards: Card[], playType: PlayType, tractorLength?: number) {
      if (this.currentPlayer !== 0) return
      const play: TrickPlay = { seat: 0, cards, playType, tractorLength }
      this.currentTrick.push(play)
      this.hands[0] = removeCards(this.hands[0], cards)
      this.selectedCards = []
      this.playError = null
      this.advanceTurn()
    },
    advanceTurn() {
      if (this.currentTrick.length >= 4) {
        this.finishTrick()
        return
      }
      const nextSeat = ((this.currentPlayer! + 1) % 4) as Seat
      this.currentPlayer = nextSeat
      if (nextSeat !== 0) {
        this.scheduleAutoPlay()
      }
    },
    scheduleAutoPlay() {
      if (this.autoPlayTimer) clearTimeout(this.autoPlayTimer)
      if (this.currentPlayer === 0 || this.currentPlayer === null) return
      const delay = this.phase === 'playing'
        ? AI_PLAY_DELAY_MS[this.difficulty]
        : 400
      this.autoPlayTimer = setTimeout(() => {
        this.doAutoPlay()
      }, delay)
    },
    doAutoPlay() {
      const seat = this.currentPlayer!
      if (seat === 0 || seat === null) return
      if (this.phase === 'bottom_cards') {
        this.aiSelectBottomCards(seat)
        return
      }
      if (this.phase === 'playing') {
        const legalPlay = selectPlay(
          this.hands[seat],
          this.currentTrick,
          this.trumpSuit,
          this.trumpRank,
          seat,
          this.difficulty,
        )
        if (!legalPlay || legalPlay.cards.length === 0) return
        const play: TrickPlay = { seat, cards: legalPlay.cards, playType: legalPlay.playType, tractorLength: legalPlay.tractorLength }
        this.currentTrick.push(play)
        this.hands[seat] = removeCards(this.hands[seat], legalPlay.cards)
        this.advanceTurn()
      }
    },
    aiSelectBottomCards(seat: Seat) {
      const hand = [...this.hands[seat]]
      hand.sort((a, b) => {
        if (isTrump(a, this.trumpSuit, this.trumpRank) === isTrump(b, this.trumpSuit, this.trumpRank)) {
          return a.rank - b.rank
        }
        return isTrump(a, this.trumpSuit, this.trumpRank) ? 1 : -1
      })
      const bottom = hand.slice(0, 8)
      this.hands[seat] = removeCards(this.hands[seat], bottom)
      this.bottomCards = bottom
      if (this.phase === 'bottom_cards') {
        this.phase = 'playing'
        this.currentPlayer = this.dealer
        this.currentTrick = []
        this.trickNumber = 1
        this.hands[0] = sortHand(this.hands[0], this.trumpSuit, this.trumpRank)
        if (this.dealer !== 0) {
          this.scheduleAutoPlay()
        }
      }
    },
    finishTrick() {
      const winner = determineTrickWinner(this.currentTrick, this.trumpSuit, this.trumpRank)
      const pts = countTrickPoints(this.currentTrick)
      const winnerTeam = this.players[winner].team
      const idx = winnerTeam === 'us' ? 0 : 1
      this.pointsCollected[idx] += pts
      this.tricksWon[idx]++
      this.currentPlayer = winner
      this.trickWinner = winner
      this.trickEnd = true
    },
    nextTrick() {
      // 保存上一轮出牌记录
      this.previousTrick = [...this.currentTrick]
      this.previousTrickWinner = this.trickWinner
      this.previousTrickNumber = this.trickNumber

      if (this.trickNumber >= 25) {
        this.trickEnd = false
        this.trickWinner = null
        this.currentTrick = []
        this.endRound()
        return
      }
      this.trickEnd = false
      this.trickWinner = null
      this.currentTrick = []
      this.trickNumber++
      if (this.currentPlayer !== 0) {
        this.scheduleAutoPlay()
      }
    },
    endRound() {
      const ourTeamIsDealer = this.players[this.dealer!].team === 'us'
      const nonDealerPts = ourTeamIsDealer ? this.pointsCollected[1] : this.pointsCollected[0]
      const result = calculateLevelChange(nonDealerPts, this.ourLevel, this.theirLevel, ourTeamIsDealer)
      this.ourLevel = result.newOurLevel
      this.theirLevel = result.newTheirLevel
      this.roundResults.push(result)
      this.phase = 'round_end'
      if (this.autoPlayTimer) { clearTimeout(this.autoPlayTimer); this.autoPlayTimer = null }
      if (this.dealingInterval) { clearInterval(this.dealingInterval); this.dealingInterval = null }
    },
    restart() {
      if (this.autoPlayTimer) clearTimeout(this.autoPlayTimer)
      if (this.dealingInterval) clearInterval(this.dealingInterval)
      this.autoPlayTimer = null
      this.dealingInterval = null
      this.phase = 'start'
      this.selectedCards = []
      this.bottomSelectedCards = []
      this.playError = null
      this.bidAnnouncement = null
      this.trickEnd = false
      this.trickWinner = null
      this.previousTrick = null
      this.previousTrickWinner = null
      this.previousTrickNumber = null
    },
    nextRound() {
      if (this.autoPlayTimer) clearTimeout(this.autoPlayTimer)
      if (this.dealingInterval) clearInterval(this.dealingInterval)
      this.autoPlayTimer = null
      this.dealingInterval = null
      this.startGame(this.difficulty)
    },
    toggleCardSelection(card: Card) {
      const idx = this.selectedCards.findIndex(c => c.id === card.id)
      if (idx >= 0) {
        this.selectedCards.splice(idx, 1)
      } else {
        this.selectedCards.push(card)
      }
    },
    clearSelection() {
      this.selectedCards = []
      this.playError = null
    },
  },
})
