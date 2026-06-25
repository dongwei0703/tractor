<script setup lang="ts">
import { useGameStore } from "@/store/game"
import CardComponent from "./CardComponent.vue"
import { PLAYER_NAMES } from "@/game/constants"

const store = useGameStore()
</script>

<template>
  <div class="played-trick">
    <div
      v-for="play in store.currentTrick"
      :key="play.seat"
      class="trick-position"
      :class="'trick-position--seat-' + play.seat"
    >
      <span class="trick-position__name">{{ PLAYER_NAMES[play.seat] }}</span>
      <div class="trick-position__cards">
        <CardComponent
          v-for="card in play.cards"
          :key="card.id"
          :card="{ ...card, faceUp: true }"
          small
          disabled
        />
      </div>
    </div>
  </div>
</template>
