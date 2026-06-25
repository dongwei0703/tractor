<script setup lang="ts">
import { ref } from "vue"
import { useGameStore } from "@/store/game"
import type { Difficulty } from "@/game/types"

const store = useGameStore()
const selectedDifficulty = ref<Difficulty>("easy")

function startGame() {
  store.startGame(selectedDifficulty.value)
}
</script>

<template>
  <div class="start-screen">
    <div class="start-screen__bg"></div>
    <div class="start-screen__content">
      <h1 class="start-screen__title">拖 拉 机</h1>
      <p class="start-screen__subtitle">三国 · 纸牌</p>
      <div class="start-screen__characters">
        <span class="char-tag ally">刘备 · 队友</span>
        <span class="char-tag enemy">关羽 · 对手</span>
        <span class="char-tag enemy">张飞 · 对手</span>
      </div>
      <div class="start-screen__difficulty">
        <label class="diff-label">AI 难度</label>
        <div class="diff-options">
          <button
            v-for="d in (['easy','hard','crazy'] as Difficulty[])"
            :key="d"
            class="diff-btn"
            :class="{ 'diff-btn--active': selectedDifficulty === d }"
            @click="selectedDifficulty = d"
          >
            {{ d === 'easy' ? '简单' : d === 'hard' ? '困难' : '疯狂' }}
          </button>
        </div>
      </div>
      <button class="start-btn" @click="startGame">开 始 牌 局</button>
    </div>
  </div>
</template>
