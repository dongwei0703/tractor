<script setup lang="ts">
import { computed } from "vue"
import { useGameStore } from "@/store/game"
import CardComponent from "./CardComponent.vue"
import type { Card } from "@/game/types"

const store = useGameStore()

const inBottomPhase = computed(() =>
  store.phase === "bottom_cards" && store.dealer === 0
)

const groupedHand = computed(() => {
  const hand = store.playerHand
  const groups: { label: string; cards: Card[] }[] = []
  if (hand.length === 0) return groups

  const trumpSuit = store.trumpSuit
  const group0 = hand.filter(c => c.rank === 16)
  if (group0.length > 0) groups.push({ label: "大王", cards: group0 })
  const group1 = hand.filter(c => c.rank === 15)
  if (group1.length > 0) groups.push({ label: "小王", cards: group1 })
  const group2 = hand.filter(c => c.rank === store.currentLevel && (c.suit as string) !== "joker")
  if (group2.length > 0) groups.push({ label: "级牌", cards: group2 })
  if (trumpSuit && trumpSuit !== "fixed") {
    const group3 = hand.filter(c => c.suit === trumpSuit && c.rank !== store.currentLevel && (c.suit as string) !== "joker")
    if (group3.length > 0) groups.push({ label: "将牌", cards: group3 })
  }
  const sideSuits: Array<{ suit: "spades" | "hearts" | "clubs" | "diamonds"; symbol: string }> = [
    { suit: "spades", symbol: "\u2660" },
    { suit: "hearts", symbol: "\u2665" },
    { suit: "clubs", symbol: "\u2663" },
    { suit: "diamonds", symbol: "\u2666" },
  ]
  for (const { suit, symbol } of sideSuits) {
    const cards = hand.filter(c => c.suit === suit && c.rank !== store.currentLevel)
    if (trumpSuit !== null && trumpSuit !== "fixed" && suit === trumpSuit) continue
    if (cards.length > 0) groups.push({ label: symbol, cards })
  }
  return groups
})

function isCardSelected(card: Card): boolean {
  if (inBottomPhase.value) {
    return store.bottomSelectedCards.some(c => c.id === card.id)
  }
  return store.selectedCards.some(c => c.id === card.id)
}

function onCardClick(card: Card) {
  if (store.trickEnd) return
  if (inBottomPhase.value) {
    store.toggleBottomCardSelection(card)
  } else if (store.phase === "playing" && store.isPlayerTurn) {
    store.toggleCardSelection(card)
  }
}

function handleAction() {
  if (inBottomPhase.value) {
    store.confirmBottomCards()
  } else {
    store.playSelectedCards()
  }
}

function canAct(): boolean {
  if (inBottomPhase.value) {
    return store.bottomSelectedCards.length === 8
  }
  return store.selectedCards.length > 0 && store.isPlayerTurn && store.phase === "playing"
}

function actionLabel(): string {
  if (inBottomPhase.value) {
    return "扣底 (" + store.bottomSelectedCards.length + "/8)"
  }
  return "出牌 (" + store.selectedCards.length + ")"
}

function isActive(): boolean {
  return !store.trickEnd && (inBottomPhase.value || (store.isPlayerTurn && store.phase === "playing"))
}
</script>

<template>
  <div class="card-hand" v-if="groupedHand.length > 0">
    <div v-if="inBottomPhase" class="card-hand__hint">请选择 8 张底牌</div>
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
            :selected="isCardSelected(card)"
            @click="onCardClick"
          />
        </div>
      </div>
    </div>
    <div v-if="store.playError" class="play-error">{{ store.playError }}</div>
    <button
      v-if="isActive()"
      class="play-btn"
      :disabled="!canAct()"
      @click="handleAction"
    >
      {{ actionLabel() }}
    </button>
  </div>
  <div class="card-hand card-hand--empty" v-else-if="store.phase !== 'start'">
    <p class="card-hand__empty-msg">手牌已出完</p>
  </div>
</template>

<style scoped>
.card-hand__hint {
  color: #d4a853;
  font-size: 14px;
  font-weight: 700;
  padding: 6px 16px;
  background: rgba(212,168,83,0.15);
  border-radius: 4px;
  margin-bottom: 8px;
}

.play-error {
  color: #e74c3c;
  font-size: 13px;
  font-weight: 600;
  text-align: center;
  padding: 6px 12px;
  background: rgba(231, 76, 60, 0.12);
  border-radius: 4px;
  margin-bottom: 8px;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>