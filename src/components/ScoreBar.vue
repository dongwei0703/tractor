<script setup lang="ts">
import { useGameStore } from "@/store/game"
import { SUIT_NAMES } from "@/game/constants"

const store = useGameStore()

function levelName(lvl: number): string {
  if (lvl <= 10) return String(lvl)
  const map: Record<number, string> = { 11: "J", 12: "Q", 13: "K", 14: "A" }
  return map[lvl] || String(lvl)
}
</script>

<template>
  <div class="score-bar">
    <div class="score-bar__item">
      <span class="score-bar__label">等级</span>
      <span class="score-bar__value">{{ levelName(store.currentLevel) }}</span>
    </div>
    <div class="score-bar__item" v-if="store.trumpSuit">
      <span class="score-bar__label">将牌</span>
      <span class="score-bar__value score-bar__trump" v-if="store.trumpSuit !== 'fixed'">
        {{ SUIT_NAMES[store.trumpSuit] }}
      </span>
      <span class="score-bar__value score-bar__trump" v-else>无主</span>
    </div>
    <div class="score-bar__item">
      <span class="score-bar__label">我方</span>
      <span class="score-bar__value">{{ levelName(store.ourLevel) }}</span>
    </div>
    <div class="score-bar__item">
      <span class="score-bar__label">对方</span>
      <span class="score-bar__value">{{ levelName(store.theirLevel) }}</span>
    </div>
    <div class="score-bar__item">
      <span class="score-bar__label">比分</span>
      <span class="score-bar__value">{{ store.playerTeamPoints }} : {{ store.opponentTeamPoints }}</span>
    </div>
    <div class="score-bar__item" v-if="store.dealer !== null">
      <span class="score-bar__label">庄家</span>
      <span class="score-bar__value">{{ store.players[store.dealer].name }}</span>
    </div>
  </div>
</template>
