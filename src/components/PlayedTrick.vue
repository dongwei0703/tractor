<script setup lang="ts">
import { computed } from "vue"
import { useGameStore } from "@/store/game"
import CardComponent from "./CardComponent.vue"
import { PLAYER_NAMES } from "@/game/constants"
import type { TrickPlay } from "@/game/types"

const store = useGameStore()

const props = defineProps<{
  trick?: TrickPlay[]
  compact?: boolean
}>()

const displayTrick = computed(() => props.trick ?? store.currentTrick)
</script>

<template>
  <div class="played-trick" :class="{ 'played-trick--compact': compact, 'played-trick--previous': trick !== undefined }">
    <div
      v-for="play in displayTrick"
      :key="play.seat"
      class="trick-position"
      :class="'trick-position--seat-' + play.seat"
    >
      <span class="trick-position__name" v-if="!compact">{{ PLAYER_NAMES[play.seat] }}</span>
      <div class="trick-position__cards">
        <CardComponent
          v-for="card in play.cards"
          :key="card.id"
          :card="{ ...card, faceUp: true }"
          :small="compact"
          disabled
        />
      </div>
    </div>
  </div>
</template>
