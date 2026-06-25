<script setup lang="ts">
import { useGameStore } from "@/store/game"
import { SUIT_NAMES } from "@/game/constants"
import type { Suit } from "@/game/types"
import { computed } from "vue"

const store = useGameStore()

const biddableSuits = computed(() => {
  const cards = store.getBiddableCards
  const suits = new Set<Suit>()
  for (const c of cards) {
    suits.add(c.suit as Suit)
  }
  return [...suits]
})

function bid(suit: Suit | "fixed") {
  store.playerBid(suit, false)
}
</script>

<template>
  <div class="bidding-panel-overlay" v-if="store.canBidDuringDeal">
    <div class="bidding-panel">
      <h3 class="bidding-panel__title">叫 主</h3>
      <p class="bidding-panel__hint">发牌中可随时亮级牌叫主</p>
      <div class="bidding-panel__suits">
        <button
          v-for="suit in biddableSuits"
          :key="suit"
          class="bidding-panel__btn"
          @click="bid(suit)"
        >
          {{ SUIT_NAMES[suit] }} {{ suit === 'spades' ? '黑桃' : suit === 'hearts' ? '红心' : suit === 'clubs' ? '梅花' : '方片' }}
        </button>
      </div>
    </div>
  </div>
</template>
