<script setup lang="ts">
import { useGameStore } from "./store/game"
import StartScreen from "./components/StartScreen.vue"
import GameBoard from "./components/GameBoard.vue"

const store = useGameStore()
</script>

<template>
  <div class="app-root">
    <StartScreen v-if="store.phase === 'start'" />
    <GameBoard v-else />
  </div>
</template>
