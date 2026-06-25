<script setup lang="ts">
import { useGameStore } from "@/store/game"
import { SUIT_NAMES } from "@/game/constants"
import type { Suit } from "@/game/types"
import { computed } from "vue"

const store = useGameStore()

const biddableCards = computed(() => store.getBiddableCards)

const suitsFromLevelCards = computed(() => {
  const suits = new Map<Suit, number>()
  for (const c of biddableCards.value) {
    const count = suits.get(c.suit as Suit) || 0
    suits.set(c.suit as Suit, count + 1)
  }
  return suits
})

function bid(suit: Suit, isPair: boolean) {
  store.playerBid(suit, isPair)
}
</script>

<template>
  <div class="bidding-panel-overlay" v-if="store.phase === 'dealing' && !store.hasBid">
    <div class="bidding-panel" v-if="suitsFromLevelCards.size > 0">
      <h3 class="bidding-panel__title">叫 主</h3>
      <p class="bidding-panel__hint">
        发牌中可亮级牌叫主 · 先叫先得
      </p>
      <div class="bidding-panel__suits">
        <button
          v-for="[suit, count] in suitsFromLevelCards"
          :key="suit"
          class="bidding-panel__btn"
          @click="bid(suit, count >= 2)"
        >
          <span class="bidding-panel__suit-symbol">{{ SUIT_NAMES[suit] }}</span>
          <span class="bidding-panel__suit-name">
            {{ suit === 'spades' ? '黑桃' : suit === 'hearts' ? '红心' : suit === 'clubs' ? '梅花' : '方片' }}
            {{ count >= 2 ? '(对子可反主)' : '' }}
          </span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.bidding-panel__suit-symbol {
  font-size: 20px;
  margin-right: 6px;
}
.bidding-panel__suit-name {
  font-size: 13px;
}
</style>
