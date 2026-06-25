import type { TrickPlay, Team, RoundResult } from './types'
import { POINT_VALUES, SCORE_THRESHOLDS, MAX_LEVEL } from './constants'
export function countTrickPoints(trick: TrickPlay[]): number {
  let pts = 0
  for (const play of trick) {
    for (const card of play.cards) {
      pts += POINT_VALUES[card.rank] || 0
    }
  }
  return pts
}
export function calculateLevelChange(
  nonDealerPoints: number,
  ourLevel: number,
  theirLevel: number,
  ourTeamIsDealer: boolean,
): RoundResult {
  let dealerChange = 0
  let oppoChange = 0
  let winnerTeam: Team = 'us'
  for (const t of SCORE_THRESHOLDS) {
    if (nonDealerPoints <= t.max) {
      dealerChange = t.usChange
      oppoChange = t.themChange
      winnerTeam = ourTeamIsDealer ? (t.winner === 'us' ? 'us' : 'them') : (t.winner === 'us' ? 'them' : 'us')
      break
    }
  }
  const ourChange = ourTeamIsDealer ? dealerChange : oppoChange
  const theirChange = ourTeamIsDealer ? oppoChange : dealerChange
  const newOur = Math.min(ourLevel + ourChange, MAX_LEVEL + 1)
  const newTheir = Math.min(theirLevel + theirChange, MAX_LEVEL + 1)
  return {
    winner: winnerTeam,
    ourPoints: ourTeamIsDealer ? 200 - nonDealerPoints : nonDealerPoints,
    theirPoints: ourTeamIsDealer ? nonDealerPoints : 200 - nonDealerPoints,
    ourLevelChange: ourChange,
    theirLevelChange: theirChange,
    newOurLevel: newOur,
    newTheirLevel: newTheir,
    gameOver: newOur > MAX_LEVEL || newTheir > MAX_LEVEL,
    dealerTeam: ourTeamIsDealer ? 'us' : 'them',
  }
}
