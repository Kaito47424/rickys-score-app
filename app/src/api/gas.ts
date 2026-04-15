import type { GameInfo, Player, BatStat, PitchStat, GameData, EditLogEntry, LogEditPayload } from '../types'

const GAS_URL = import.meta.env.VITE_GAS_URL as string

export async function fetchGames(): Promise<GameInfo[]> {
  const res = await fetch(`${GAS_URL}?action=getGames`)
  if (!res.ok) throw new Error('試合一覧の取得に失敗しました')
  return res.json()
}

export async function fetchPlayers(): Promise<Player[]> {
  const res = await fetch(`${GAS_URL}?action=getPlayers`)
  if (!res.ok) throw new Error('選手一覧の取得に失敗しました')
  return res.json()
}

export async function fetchBatStats(): Promise<BatStat[]> {
  const res = await fetch(`${GAS_URL}?action=getBatStats`)
  if (!res.ok) throw new Error('野手成績の取得に失敗しました')
  return res.json()
}

export async function fetchPitchStats(): Promise<PitchStat[]> {
  const res = await fetch(`${GAS_URL}?action=getPitchStats`)
  if (!res.ok) throw new Error('投手成績の取得に失敗しました')
  return res.json()
}

export async function fetchGameData(gameId: string): Promise<GameData> {
  const res = await fetch(`${GAS_URL}?action=getGameData&gameId=${encodeURIComponent(gameId)}`)
  if (!res.ok) throw new Error('試合データの取得に失敗しました')
  return res.json()
}

// no-cors: レスポンスボディは読めないが GAS はデータを受け取る
export async function postToGas(data: object): Promise<void> {
  await fetch(GAS_URL, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify(data),
  })
}

export async function fetchEditLog(gameId?: string): Promise<EditLogEntry[]> {
  const params = gameId
    ? `?action=getEditLog&gameId=${encodeURIComponent(gameId)}`
    : '?action=getEditLog'
  const res = await fetch(`${GAS_URL}${params}`)
  if (!res.ok) throw new Error('修正履歴の取得に失敗しました')
  return res.json()
}

// no-cors のため postToGas のラッパー
export async function postLogEdit(payload: Omit<LogEditPayload, 'type'>): Promise<void> {
  await postToGas({ type: 'logEdit', ...payload })
}
