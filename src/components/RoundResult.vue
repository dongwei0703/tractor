<script setup lang="ts">
import { useGameStore } from "@/store/game"

const store = useGameStore()

function nextRound() {
  if (store.roundResults.length > 0 && store.roundResults[store.roundResults.length - 1].gameOver) {
    store.restart()
  } else {
    store.nextRound()
  }
}
</script>

<template>
  <div class="round-result-overlay" v-if="store.phase === 'round_end'">
    <div class="round-result">
      <h2 class="round-result__title">牌局结束</h2>
      <div class="round-result__body" v-if="store.roundResults.length > 0">
        <div class="round-result__score">
          <span>我方 {{ store.roundResults[store.roundResults.length - 1].ourPoints }} 分</span>
          <span>对方 {{ store.roundResults[store.roundResults.length - 1].theirPoints }} 分</span>
        </div>
        <div class="round-result__change">
          <span v-if="store.roundResults[store.roundResults.length - 1].ourLevelChange > 0">
            我方升 {{ store.roundResults[store.roundResults.length - 1].ourLevelChange }} 级
          </span>
          <span v-if="store.roundResults[store.roundResults.length - 1].theirLevelChange > 0">
            对方升 {{ store.roundResults[store.roundResults.length - 1].theirLevelChange }} 级
          </span>
        </div>
        <div class="round-result__levels">
          <span>我方等级: {{ store.ourLevel <= 10 ? store.ourLevel : ['J','Q','K','A'][store.ourLevel - 11] }}</span>
          <span>对方等级: {{ store.theirLevel <= 10 ? store.theirLevel : ['J','Q','K','A'][store.theirLevel - 11] }}</span>
        </div>
        <div v-if="store.roundResults[store.roundResults.length - 1].gameOver" class="round-result__gameover">
          游戏结束！{{ store.ourLevel > 14 ? '我方' : '对方' }}获胜！
        </div>
      </div>
      <button class="round-result__btn" @click="nextRound">
        {{ store.roundResults.length > 0 && store.roundResults[store.roundResults.length - 1].gameOver ? '重新开始' : '下一局' }}
      </button>
    </div>
  </div>
</template>
