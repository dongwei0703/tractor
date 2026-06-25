<script setup lang="ts">
import { useGameStore } from "@/store/game"
import { computed } from "vue"

const store = useGameStore()

const progress = computed(() => {
  const total = store.dealingQueue.length
  const current = store.dealingIndex
  return total > 0 ? Math.round((current / total) * 100) : 0
})
</script>

<template>
  <div class="dealing-overlay" v-if="store.phase === 'dealing'">
    <div class="dealing-overlay__progress">
      <div class="dealing-overlay__bar">
        <div
          class="dealing-overlay__fill"
          :style="{ width: progress + '%' }"
        ></div>
      </div>
      <span class="dealing-overlay__text">
        第 {{ store.dealingIndex }} / {{ store.dealingQueue.length }} 张
      </span>
    </div>
  </div>
</template>
