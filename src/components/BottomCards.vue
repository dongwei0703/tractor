<script setup lang="ts">
import { useGameStore } from "@/store/game"
import { PLAYER_NAMES } from "@/game/constants"

const store = useGameStore()
</script>

<template>
  <div class="bottom-cards" v-if="store.phase === 'bottom_cards'">
    <div class="bottom-cards__label">
      {{ store.dealer !== null ? PLAYER_NAMES[store.dealer] : '' }} 正在选择底牌...
    </div>
  </div>
</template>
