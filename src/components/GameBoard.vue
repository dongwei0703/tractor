<script setup lang="ts">
import { useGameStore } from "@/store/game"
import { PLAYER_NAMES } from "@/game/constants"
import ScoreBar from "./ScoreBar.vue"
import RestartButton from "./RestartButton.vue"
import CardHand from "./CardHand.vue"
import PlayedTrick from "./PlayedTrick.vue"
import DealingOverlay from "./DealingOverlay.vue"
import BiddingPanel from "./BiddingPanel.vue"
import BottomCards from "./BottomCards.vue"
import RoundResult from "./RoundResult.vue"

const store = useGameStore()

function playerName(seat: number): string {
  return PLAYER_NAMES[seat as 0|1|2|3]
}

function teamLabel(seat: number): string {
  return seat === 0 || seat === 2 ? "队友" : "对手"
}

function getHandCount(seat: number): number {
  return store.hands[seat]?.length || 0
}
</script>

<template>
  <div class="game-board">
    <ScoreBar />
    <RestartButton />
    <DealingOverlay />
    <BiddingPanel />

    <!-- AI seat areas -->
    <div class="seat seat--top">
      <div class="seat__card">
        <div class="seat__name">{{ playerName(2) }}</div>
        <div class="seat__team">{{ teamLabel(2) }}</div>
        <div class="seat__hand-count" v-if="store.phase !== 'start'">
          {{ getHandCount(2) }} 张
        </div>
      </div>
    </div>

    <div class="seat seat--left">
      <div class="seat__card">
        <div class="seat__name">{{ playerName(1) }}</div>
        <div class="seat__team">{{ teamLabel(1) }}</div>
        <div class="seat__hand-count" v-if="store.phase !== 'start'">
          {{ getHandCount(1) }} 张
        </div>
      </div>
    </div>

    <div class="seat seat--right">
      <div class="seat__card">
        <div class="seat__name">{{ playerName(3) }}</div>
        <div class="seat__team">{{ teamLabel(3) }}</div>
        <div class="seat__hand-count" v-if="store.phase !== 'start'">
          {{ getHandCount(3) }} 张
        </div>
      </div>
    </div>

    <!-- Center area -->
    <div class="center-area">
      <PlayedTrick v-if="store.phase === 'playing' && store.currentTrick.length > 0" />
      <div v-else-if="store.phase === 'dealing'" class="center-area__text">
        发牌中...
      </div>
      <div v-else-if="store.phase === 'bidding'" class="center-area__text">
        等待叫主...
      </div>
      <div v-else-if="store.phase === 'bottom_cards'" class="center-area__text">
        庄家扣底牌中...
      </div>
    </div>

    <!-- Bottom area: player hand -->
    <div class="player-area">
      <div class="seat seat--bottom-label">
        <div class="seat__card">
          <div class="seat__name">你</div>
          <div class="seat__team">玩家</div>
        </div>
      </div>
      <CardHand />
    </div>

    <RoundResult />
  </div>
</template>
