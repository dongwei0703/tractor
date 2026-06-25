<script setup lang="ts">
import type { Card } from "@/game/types"
import { RANK_NAMES, SUIT_NAMES } from "@/game/constants"

const props = defineProps<{
  card: Card
  selected?: boolean
  small?: boolean
  disabled?: boolean
}>()

const emit = defineEmits<{
  click: [card: Card]
}>()

function isRed(card: Card): boolean {
  if (card.suit === "joker") return card.jokerType === "big"
  return card.suit === "hearts" || card.suit === "diamonds"
}

function suitSymbol(card: Card): string {
  if (card.suit === "joker") {
    return card.jokerType === "big" ? "大" : "小"
  }
  return SUIT_NAMES[card.suit]
}

function rankName(card: Card): string {
  if (card.suit === "joker") return "王"
  return RANK_NAMES[card.rank] || String(card.rank)
}

function onClick() {
  if (!props.disabled) emit("click", props.card)
}
</script>

<template>
  <div
    class="card"
    :class="{
      'card--selected': selected,
      'card--small': small,
      'card--disabled': disabled,
      'card--red': card.faceUp && isRed(card),
      'card--black': card.faceUp && !isRed(card),
      'card--back': !card.faceUp,
    }"
    @click="onClick"
  >
    <template v-if="card.faceUp">
      <span class="card__rank">{{ rankName(card) }}</span>
      <span class="card__suit">{{ suitSymbol(card) }}</span>
    </template>
    <template v-else>
      <span class="card__back-pattern">&#9830;</span>
    </template>
  </div>
</template>
