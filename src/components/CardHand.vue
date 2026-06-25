<script setup lang="ts">
import { computed } from "vue"
import { useGameStore } from "@/store/game"
import { isTrump } from "@/game/comparator"
import CardComponent from "./CardComponent.vue"
import type { Card } from "@/game/types"

const store = useGameStore()

const groupedHand = computed(() => {
  const hand = store.playerHand
  const groups: { label: string; cards: Card[] }[] = []
  if (hand.length === 0) return groups

  const trumpSuit = store.trumpSuit
  const trumpRank = store.trumpRank

  // Group 0: Big jokers
  const group0 = hand.filter(c => c.rank === 16)
  if (group0.length > 0) groups.push({ label: "大王", cards: group0 })

  // Group 1: Small jokers
  const group1 = hand.filter(c => c.rank === 15)
  if (group1.length > 0) groups.push({ label: "小王", cards: group1 })

  // Group 2: Level cards (常主)
  const group2 = hand.filter(c => c.rank === store.currentLevel && c.suit !== "joker")
  if (group2.length > 0) groups.push({ label: "常主", cards: group2 })

  // Group 3: Trump suit cards
  if (trumpSuit && trumpSuit !== "fixed") {
    const group3 = hand.filter(c => c.suit === trumpSuit && c.rank !== store.currentLevel && c.suit !== "joker")
    if (group3.length > 0) groups.push({ label: "将牌", cards: group3 })
  }

  // Groups 4-7: Side suits
  const sideSuits: Array<{ suit: "spades" | "hearts" | "clubs" | "diamonds"; symbol: string }> = [
    { suit: "spades", symbol: "♠" },
    { suit: "hearts", symbol: "♥" },
    { suit: "clubs", symbol: "♣" },
    { suit: "diamonds", symbol: "♦" },
  ]
  for (const { suit, symbol } of sideSuits) {
    const cards = hand.filter(c => c.suit === suit && c.rank !== store.currentLevel)
    if (trumpSuit !== null && trumpSuit !== "fixed" && suit === trumpSuit) continue
    if (cards.length > 0) groups.push({ label: symbol, cards })
  }

  return groups
})

function onCardClick(card: Card) {
  if (store.phase !== "playing" || !store.isPlayerTurn) return
  store.toggleCardSelection(card)
}

function canPlay(): boolean {
  return store.selectedCards.length > 0 && store.isPlayerTurn && store.phase === "playing"
}

function playCards() {
  store.playSelectedCards()
}
</script>

<template>
  <div class="card-hand" v-if="groupedHand.length > 0">
    <div class="card-hand__groups">
      <div
        v-for="(group, gi) in groupedHand"
        :key="gi"
        class="card-hand__group"
        :class="{ 'card-hand__group--gap': gi > 0 && gi <= 3 }"
      >
        <span class="card-hand__group-label" v-if="group.label">{{ group.label }}</span>
        <div class="card-hand__cards">
          <CardComponent
            v-for="card in group.cards"
            :key="card.id"
            :card="{ ...card, faceUp: true }"
            :selected="store.selectedCards.some(c => c.id === card.id)"
            @click="onCardClick"
          />
        </div>
      </div>
    </div>
    <button
      v-if="store.isPlayerTurn && store.phase === 'playing'"
      class="play-btn"
      :disabled="!canPlay()"
      @click="playCards"
    >
      出牌 ({{ store.selectedCards.length }})
    </button>
  </div>
  <div class="card-hand card-hand--empty" v-else-if="store.phase !== 'start'">
    <p class="card-hand__empty-msg">暂无手牌</p>
  </div>
</template>
