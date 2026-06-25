import { defineStore } from 'pinia'
import type { Card, Suit, Seat, GamePhase, Difficulty, TrickPlay, BidInfo, RoundResult, PlayerInfo, Team, DealStep } from '@/game/types'
import { PLAYER_NAMES, SEAT_TEAMS, DEAL_SPEED_MS, BID_WINDOW_MS, AI_PLAY_DELAY_MS } from '@/game/constants'
import { createDeck, shuffleDeck, generateDealSequence, getBottomCards, sortHand, removeCards, addCards } from '@/game/deck'
import { isTrump } from '@/game/comparator'
import { getValidLeads, type LegalPlay } from '@/game/rules'
import { determineTrickWinner } from '@/game/trick'
import { countTrickPoints, calculateLevelChange } from '@/game/scoring'
import { shouldBid, selectPlay } from '@/game/ai'

interface AutoPlayState {
  timerId: ReturnType<typeof setTimeout> | null
}

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
      // Sort player's hand
      if (step.targetSeat === 0) {
        this.hands[0] = sortHand(this.hands[0], this.trumpSuit, this.trumpRank)
      }
      this.dealingIndex++
      // Check AI bid during dealing
      if (!this.hasBid) {
        const bidSeat = step.targetSeat
        if (bidSeat !== 0) {
          // AI bid check
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
        this.phase = 'bottom_cards'
        this.currentPlayer = this.dealer
        this.scheduleAutoPlay()
      } else {
        this.phase = 'bidding'
        this.startForcedBidding()
      }
    },
    startForcedBidding() {
      // Reveal bottom cards one by one
      if (this.bottomCards.length > 0) {
        const first = this.bottomCards[0]
        if (first.suit !== 'joker') {
          this.trumpSuit = first.suit
          this.trumpRank = this.currentLevel
          this.dealer = 0
          this.hasBid = true
          this.bidHistory = [{ bidder: 0, suit: first.suit, isPair: false, pairCount: 1 }]
        } else {
          this.trumpSuit = 'fixed'
          this.trumpRank = this.currentLevel
          this.dealer = 0
          this.hasBid = true
          this.bidHistory = [{ bidder: 0, suit: 'fixed', isPair: false, pairCount: 1 }]
        }
        this.hands[0] = sortHand(this.hands[0], this.trumpSuit, this.trumpRank)
        this.phase = 'bottom_cards'
        this.scheduleAutoPlay()
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
      // Re-sort all hands with new trump info
      for (let s = 0; s < 4; s++) {
        this.hands[s] = sortHand(this.hands[s], this.trumpSuit, this.trumpRank)
      }
    },
    setBottomCards(cards: Card[]) {
      this.hands[this.dealer!] = removeCards(this.hands[this.dealer!], cards)
      this.bottomCards = cards
      this.phase = 'playing'
      this.currentPlayer = this.dealer
      this.currentTrick = []
      this.trickNumber = 1
      this.hands[0] = sortHand(this.hands[0], this.trumpSuit, this.trumpRank)
      this.scheduleAutoPlay()
    },
    playSelectedCards() {
      if (this.selectedCards.length === 0) return
      this.playerPlay(this.selectedCards)
      this.selectedCards = []
    },
    playerPlay(cards: Card[]) {
      if (this.currentPlayer !== 0) return
      const leadCard = cards[0]
      const playType: 'single' | 'pair' | 'tractor' = cards.length === 1 ? 'single' : cards.length === 2 ? 'pair' : 'tractor'
      const play: TrickPlay = { seat: 0, cards, playType }
      this.currentTrick.push(play)
      this.hands[0] = removeCards(this.hands[0], cards)
      this.selectedCards = []
      this.advanceTurn()
    },
    advanceTurn() {
      if (this.currentTrick.length >= 4) {
        // Trick complete
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
      if (this.currentPlayer === 0) return
      const delay = this.phase === 'playing'
        ? AI_PLAY_DELAY_MS[this.difficulty]
        : 400
      this.autoPlayTimer = setTimeout(() => {
        this.doAutoPlay()
      }, delay)
    },
    doAutoPlay() {
      const seat = this.currentPlayer!
      if (seat === 0) return
      if (this.phase === 'bottom_cards') {
        this.aiSelectBottomCards(seat)
        return
      }
      if (this.phase === 'playing') {
        const cards = selectPlay(
          this.hands[seat],
          this.currentTrick,
          this.trumpSuit,
          this.trumpRank,
          seat,
          this.difficulty,
        )
        const leadCard = cards[0]
        const playType: 'single' | 'pair' | 'tractor' = cards.length === 1 ? 'single' : cards.length === 2 ? 'pair' : 'tractor'
        const play: TrickPlay = { seat, cards, playType }
        this.currentTrick.push(play)
        this.hands[seat] = removeCards(this.hands[seat], cards)
        this.advanceTurn()
      }
    },
    aiSelectBottomCards(seat: Seat) {
      // AI selects 8 cards for bottom
      // Simple strategy: discard weakest cards
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
      // After setting bottom cards, enter playing phase
      if (this.phase === 'bottom_cards') {
        this.phase = 'playing'
        this.currentPlayer = this.dealer
        this.currentTrick = []
        this.trickNumber = 1
        this.hands[0] = sortHand(this.hands[0], this.trumpSuit, this.trumpRank)
      }
      if (this.currentPlayer !== 0) {
        this.scheduleAutoPlay()
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
      this.currentTrick = []
      this.trickNumber++
      if (this.trickNumber > 25) {
        this.endRound()
      } else if (this.currentPlayer !== 0) {
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
      if (this.autoPlayTimer) {
        clearTimeout(this.autoPlayTimer)
        this.autoPlayTimer = null
      }
      if (this.dealingInterval) {
        clearInterval(this.dealingInterval)
        this.dealingInterval = null
      }
    },
    restart() {
      if (this.autoPlayTimer) clearTimeout(this.autoPlayTimer)
      if (this.dealingInterval) clearInterval(this.dealingInterval)
      this.autoPlayTimer = null
      this.dealingInterval = null
      this.phase = 'start'
      this.selectedCards = []
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
    },
  },
})
