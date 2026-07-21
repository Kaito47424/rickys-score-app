// S1-2: 既存スプシデータ(本番GAS経由)をSupabaseへ移行する。
// 読み取りは本番GAS URLへのGETのみ（書き込み・削除は一切行わない）。
// 全テーブルnatural keyでupsertするため再実行しても安全（冪等）。
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local' })

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, VITE_GAS_URL } = process.env

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !VITE_GAS_URL) {
  console.error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / VITE_GAS_URL を .env.local に設定してください')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function gasGet(action, params = {}) {
  const qs = new URLSearchParams({ action, ...params })
  const res = await fetch(`${VITE_GAS_URL}?${qs}`)
  if (!res.ok) throw new Error(`GAS ${action} failed: ${res.status}`)
  const data = await res.json()
  if (data && typeof data === 'object' && 'error' in data && !Array.isArray(data)) {
    throw new Error(`GAS ${action} error: ${data.error}`)
  }
  return data
}

async function upsert(table, rows, onConflict) {
  if (rows.length === 0) return
  const { error } = await supabase.from(table).upsert(rows, { onConflict })
  if (error) throw new Error(`upsert ${table} failed: ${error.message}`)
  console.log(`  ${table}: ${rows.length}件`)
}

function splitInningRound(key) {
  const [inning, round] = key.split('_').map(Number)
  return { inning, round }
}

async function main() {
  console.log('取得: 選手一覧')
  const players = await gasGet('getPlayers')
  await upsert(
    'players',
    players.map(p => ({ player_id: p.playerId, number: p.number, name: p.name })),
    'player_id',
  )

  console.log('取得: 試合一覧')
  const games = await gasGet('getGames')
  console.log(`  ${games.length}試合`)

  const gamesRows = []
  const rosterRows = []
  const batResultsRows = []
  const batterManualStatsRows = []
  const pitchResultsRows = []
  const pitcherAppearancesRows = []
  const mvpRows = []

  for (const g of games) {
    console.log(`取得: 試合データ ${g.gameId} (${g.opponent})`)
    const gameData = await gasGet('getGameData', { gameId: g.gameId })

    gamesRows.push({
      game_id: g.gameId,
      game_date: gameData.gameDate,
      opponent: gameData.opponent,
      deleted_at: null, // getGamesは削除済み試合を返さないため常にnull
    })

    for (const r of gameData.roster || []) {
      rosterRows.push({
        game_id: g.gameId,
        batting_order: r.order,
        name: r.name,
        position: r.position || null,
        sub_name: r.subName || null,
        sub_position: r.subPosition || null,
        sub_from_inning: r.subFromInning ?? null, // 現行GASでは常にnull（未保存のため）
      })
    }

    for (const [key, orders] of Object.entries(gameData.batterResults || {})) {
      const { inning, round } = splitInningRound(key)
      for (const [order, entry] of Object.entries(orders)) {
        const code = typeof entry === 'string' ? entry : entry?.code
        if (!code) continue
        const runCode = typeof entry === 'object' ? entry?.runCode ?? null : null
        batResultsRows.push({
          game_id: g.gameId,
          batting_order: Number(order),
          inning,
          round,
          code,
          run_code: runCode,
        })
      }
    }

    for (const [order, rbi] of Object.entries(gameData.rbiData || {})) {
      batterManualStatsRows.push({
        game_id: g.gameId,
        batting_order: Number(order),
        rbi: rbi.rbi || 0,
        runs: rbi.runs || 0,
        sb: rbi.sb || 0,
      })
    }

    for (const [key, orders] of Object.entries(gameData.pitcherResults || {})) {
      const { inning, round } = splitInningRound(key)
      for (const [opponentOrder, entry] of Object.entries(orders)) {
        if (!entry?.code && !entry?.pitcher) continue
        pitchResultsRows.push({
          game_id: g.gameId,
          opponent_order: Number(opponentOrder),
          inning,
          round,
          code: entry.code || null,
          pitcher_name: entry.pitcher || null,
        })
      }
    }

    // pitchStats（投球回・失点・自責点など、投手別集計セクション由来）を優先。
    // 無ければ簡易版のpitcherStats（name/r/erのみ）にフォールバック。
    const pitcherSource = gameData.pitchStats?.length ? gameData.pitchStats : gameData.pitcherStats
    for (const p of pitcherSource || []) {
      if (!p.name) continue
      pitcherAppearancesRows.push({
        game_id: g.gameId,
        pitcher_name: p.name,
        ip: p.ip !== undefined ? String(p.ip) : null,
        r: p.r ?? 0,
        er: p.er ?? 0,
      })
    }

    if (gameData.mvp?.name) {
      mvpRows.push({ game_id: g.gameId, name: gameData.mvp.name, reason: gameData.mvp.reason || null })
    }
  }

  console.log('書き込み: games')
  await upsert('games', gamesRows, 'game_id')
  console.log('書き込み: roster_entries')
  await upsert('roster_entries', rosterRows, 'game_id,batting_order')
  console.log('書き込み: bat_results')
  await upsert('bat_results', batResultsRows, 'game_id,batting_order,inning,round')
  console.log('書き込み: batter_manual_stats')
  await upsert('batter_manual_stats', batterManualStatsRows, 'game_id,batting_order')
  console.log('書き込み: pitch_results')
  await upsert('pitch_results', pitchResultsRows, 'game_id,opponent_order,inning,round')
  console.log('書き込み: pitcher_appearances')
  await upsert('pitcher_appearances', pitcherAppearancesRows, 'game_id,pitcher_name')
  console.log('書き込み: mvp')
  await upsert('mvp', mvpRows, 'game_id')

  console.log('取得: 修正履歴')
  const editLog = await gasGet('getEditLog')
  // edit_logはnatural keyがないため毎回truncate→再挿入
  const { error: delErr } = await supabase.from('edit_log').delete().gte('id', 0)
  if (delErr) throw new Error(`edit_log削除失敗: ${delErr.message}`)
  const editLogRows = editLog.map(e => ({
    logged_at: e.timestamp,
    game_id: e.gameId,
    edit_type: e.editType,
    inning: e.inning || null,
    round: e.round || null,
    batting_order: e.order || null,
    old_value: e.oldValue || null,
    new_value: e.newValue || null,
  }))
  if (editLogRows.length > 0) {
    const { error } = await supabase.from('edit_log').insert(editLogRows)
    if (error) throw new Error(`edit_log挿入失敗: ${error.message}`)
  }
  console.log(`  edit_log: ${editLogRows.length}件`)

  console.log('完了')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
