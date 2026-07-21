// S1-5: 本番GASとSupabaseの内容を突き合わせ、差分をレポートする（読み取りのみ・安全）。
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local' })

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, VITE_GAS_URL } = process.env
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !VITE_GAS_URL) {
  console.error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / VITE_GAS_URL を .env.local に設定してください')
  process.exit(1)
}
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

let okCount = 0
let ngCount = 0
function ok(label) { okCount++; console.log(`  OK  ${label}`) }
function ng(label, detail) { ngCount++; console.log(`  NG  ${label}${detail ? ' : ' + detail : ''}`) }

async function gasGet(action, params = {}) {
  const qs = new URLSearchParams({ action, ...params })
  const res = await fetch(`${VITE_GAS_URL}?${qs}`)
  if (!res.ok) throw new Error(`GAS ${action} failed: ${res.status}`)
  return res.json()
}

function splitInningRound(key) {
  const [inning, round] = key.split('_').map(Number)
  return { inning, round }
}

async function sbSelect(table, gameId) {
  const { data, error } = await supabase.from(table).select('*').eq('game_id', gameId)
  if (error) throw new Error(`select ${table} failed: ${error.message}`)
  return data
}

async function verifyGame(g) {
  console.log(`--- ${g.gameId} (${g.opponent}) ---`)
  const gameData = await gasGet('getGameData', { gameId: g.gameId })

  const { data: sbGames } = await supabase.from('games').select('*').eq('game_id', g.gameId).single()
  if (!sbGames) { ng('games', '行が存在しない'); return }
  if (sbGames.opponent !== gameData.opponent) ng('games.opponent', `${sbGames.opponent} != ${gameData.opponent}`)
  else ok('games.opponent')

  // roster
  const sbRoster = await sbSelect('roster_entries', g.gameId)
  const roster = gameData.roster || []
  if (sbRoster.length !== roster.length) {
    ng('roster_entries件数', `supabase=${sbRoster.length} gas=${roster.length}`)
  } else {
    let mismatch = 0
    for (const r of roster) {
      const sr = sbRoster.find(x => x.batting_order === r.order)
      if (!sr || sr.name !== r.name || (sr.position || '') !== (r.position || '')) mismatch++
    }
    mismatch === 0 ? ok(`roster_entries(${roster.length}件)`) : ng('roster_entries内容', `${mismatch}件不一致`)
  }

  // bat_results
  let expectedBatRows = 0
  for (const [key, orders] of Object.entries(gameData.batterResults || {})) {
    for (const entry of Object.values(orders)) {
      const code = typeof entry === 'string' ? entry : entry?.code
      if (code) expectedBatRows++
    }
  }
  const sbBat = await sbSelect('bat_results', g.gameId)
  sbBat.length === expectedBatRows
    ? ok(`bat_results(${expectedBatRows}件)`)
    : ng('bat_results件数', `supabase=${sbBat.length} gas=${expectedBatRows}`)

  // batter_manual_stats
  const sbManual = await sbSelect('batter_manual_stats', g.gameId)
  const rbiEntries = Object.entries(gameData.rbiData || {})
  if (sbManual.length !== rbiEntries.length) {
    ng('batter_manual_stats件数', `supabase=${sbManual.length} gas=${rbiEntries.length}`)
  } else {
    let mismatch = 0
    for (const [order, rbi] of rbiEntries) {
      const sr = sbManual.find(x => x.batting_order === Number(order))
      if (!sr || sr.rbi !== rbi.rbi || sr.runs !== rbi.runs || sr.sb !== rbi.sb) mismatch++
    }
    mismatch === 0 ? ok(`batter_manual_stats(${rbiEntries.length}件)`) : ng('batter_manual_stats内容', `${mismatch}件不一致`)
  }

  // pitch_results
  let expectedPitchRows = 0
  for (const orders of Object.values(gameData.pitcherResults || {})) {
    for (const entry of Object.values(orders)) {
      if (entry?.code || entry?.pitcher) expectedPitchRows++
    }
  }
  const sbPitch = await sbSelect('pitch_results', g.gameId)
  sbPitch.length === expectedPitchRows
    ? ok(`pitch_results(${expectedPitchRows}件)`)
    : ng('pitch_results件数', `supabase=${sbPitch.length} gas=${expectedPitchRows}`)

  // pitcher_appearances
  const pitcherSource = (gameData.pitchStats?.length ? gameData.pitchStats : gameData.pitcherStats) || []
  const sbAppearances = await sbSelect('pitcher_appearances', g.gameId)
  if (sbAppearances.length !== pitcherSource.filter(p => p.name).length) {
    ng('pitcher_appearances件数', `supabase=${sbAppearances.length} gas=${pitcherSource.length}`)
  } else {
    let mismatch = 0
    for (const p of pitcherSource) {
      if (!p.name) continue
      const sp = sbAppearances.find(x => x.pitcher_name === p.name)
      if (!sp || sp.r !== p.r || sp.er !== p.er) mismatch++
    }
    mismatch === 0 ? ok(`pitcher_appearances(${sbAppearances.length}件)`) : ng('pitcher_appearances内容', `${mismatch}件不一致`)
  }

  // mvp
  const { data: sbMvp } = await supabase.from('mvp').select('*').eq('game_id', g.gameId).maybeSingle()
  if (gameData.mvp?.name) {
    !sbMvp || sbMvp.name !== gameData.mvp.name ? ng('mvp', `supabase=${sbMvp?.name} gas=${gameData.mvp.name}`) : ok('mvp')
  } else if (sbMvp) {
    ng('mvp', 'GAS側にはMVPが無いのにSupabaseに存在する')
  } else {
    ok('mvp(該当なし)')
  }
}

async function main() {
  console.log('取得: 選手一覧・試合一覧')
  const players = await gasGet('getPlayers')
  const { data: sbPlayers } = await supabase.from('players').select('*')
  players.length === sbPlayers.length
    ? ok(`players件数(${players.length})`)
    : ng('players件数', `supabase=${sbPlayers.length} gas=${players.length}`)

  const games = await gasGet('getGames')
  for (const g of games) {
    await verifyGame(g)
  }

  console.log('取得: 修正履歴')
  const editLog = await gasGet('getEditLog')
  const { count: sbEditLogCount } = await supabase.from('edit_log').select('*', { count: 'exact', head: true })
  editLog.length === sbEditLogCount
    ? ok(`edit_log件数(${editLog.length})`)
    : ng('edit_log件数', `supabase=${sbEditLogCount} gas=${editLog.length}`)

  console.log(`\n結果: OK=${okCount} NG=${ngCount}`)
  if (ngCount > 0) process.exit(1)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
