<script setup lang="ts">
import { useGameStore } from "@/store/game"

const store = useGameStore()

function confirmRestart() {
  if (confirm("确定放弃当前牌局重新开始？")) {
    store.restart()
  }
}
</script>

<template>
  <button class="restart-btn" @click="confirmRestart" title="重新开始">
    重新开始
  </button>
</template>
