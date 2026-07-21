import type { GameInfo } from '../types'

// 規定打席の判定（打者のみ。投手の規定投球回は未導入）
// 規定打席 = チーム試合数 × 2.1
export function minPlateAppearances(teamGames: number): number {
  return teamGames * 2.1
}

export function isQualifiedBatter(pa: number, teamGames: number): boolean {
  return pa >= minPlateAppearances(teamGames)
}

// 選択中の年度スコープにおけるチームの総試合数（全年度選択時は全件）
export function countTeamGames(games: GameInfo[], year: string): number {
  return year === 'all' ? games.length : games.filter(g => g.gameDate.startsWith(year)).length
}
