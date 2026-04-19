import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import type { GameData, BatterEntry } from '../../types'
import { fetchGameData } from '../../api/gas'
import { RESULT_CODES } from '../../constants/codes'

// 野手成績: APIプロパティ名(英語) → 表示カラム名(日本語)
const BAT_COL_MAP: [string, string][] = [
  ['name', '選手名'],
  ['pa', '打席'],
  ['ab', '打数'],
  ['h', '安打'],
  ['avg', '打率'],
  ['hr', '本塁打'],
  ['rbi', '打点'],
  ['runs', '得点'],
  ['sb', '盗塁'],
  ['ops', 'OPS'],
]

// 投手成績: APIプロパティ名(英語) → 表示カラム名(日本語)
const PIT_COL_MAP: [string, string][] = [
  ['name', '選手名'],
  ['ip', '投球回'],
  ['h', '被安打'],
  ['so', '奪三振'],
  ['bb', '四球'],
  ['r', '失点'],
  ['er', '自責点'],
  ['era', '防御率'],
]

const RATE_KEYS = new Set(['avg', 'ops', 'era'])

function fmt(v: unknown, key: string): string {
  if (v === null || v === undefined || v === '') return '—'
  const n = Number(v)
  if (isNaN(n)) return String(v)
  if (RATE_KEYS.has(key)) return n.toFixed(3)
  return String(n)
}

// 純粋な数値は集計式の値なのでスキップ
const isNumeric = (s: string) => /^-?\d+(\.\d+)?$/.test(s)

// 安打・長打のコードセット
const HIT_CODES = new Set([...RESULT_CODES['安打'], ...RESULT_CODES['長打']])

function getCode(entry: BatterEntry | string | undefined): string {
  if (!entry) return ''
  if (typeof entry === 'string') return isNumeric(entry) ? '' : entry
  if (isNumeric(entry.code)) return ''
  const run = entry.runCode ? `/${entry.runCode}` : ''
  return `${entry.code}${run}`
}

function isHit(code: string): boolean {
  return HIT_CODES.has(code)
}

export default function GameSummary() {
  const { gameId } = useParams<{ gameId: string }>()
  const [gameData, setGameData] = useState<GameData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [subTab, setSubTab] = useState<'summary' | 'atbat' | 'bat' | 'pitch'>('summary')

  useEffect(() => {
    if (!gameId) return
    setLoading(true)
    setError('')
    fetchGameData(gameId)
      .then(setGameData)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : '試合データの取得に失敗しました'))
      .finally(() => setLoading(false))
  }, [gameId])

  if (loading) return <p className="text-gray-400 text-center py-16">読み込み中...</p>
  if (error) return <p className="text-red-500 text-center py-16 px-4">{error}</p>
  if (!gameData) return <p className="text-gray-400 text-center py-16">データがありません</p>

  const scoreboard = gameData.scoreboard ?? { rickys: [], opponent: [], total: { rickys: 0, opponent: 0 } }
  const batStats = gameData.batStats ?? []
  const pitchStats = gameData.pitchStats ?? []

  // スコアボード: データがあるイニング数を算出（末尾の0を除く）
  const maxInning = Math.max(
    scoreboard.rickys.reduce((max, v, i) => (v ? i + 1 : max), 0),
    scoreboard.opponent.reduce((max, v, i) => (v ? i + 1 : max), 0),
    1,
  )

  // 打席結果: データがあるイニングキーを抽出・ソート
  const inningKeys = Object.keys(gameData.batterResults)
    .filter(k => {
      const entries = gameData.batterResults[k]
      return Object.values(entries).some(e => getCode(e) !== '')
    })
    .sort((a, b) => {
      const [ai, ar] = a.split('_').map(Number)
      const [bi, br] = b.split('_').map(Number)
      return ai !== bi ? ai - bi : ar - br
    })

  // イニングキーの表示ラベル（"1_1" → "1回", "1_2" → "1回②"）
  const inningLabel = (key: string) => {
    const [inn, round] = key.split('_')
    return round === '2' ? `${inn}回②` : `${inn}回`
  }

  // 各指標1位（batStatsが空でない場合のみ・同率1位は全員表示）
  const topStats = batStats.length > 0
    ? [
        { label: '安打数', names: best('h').names, val: String(best('h').val) },
        { label: '打率', names: best('avg').names, val: fmt(best('avg').val, 'avg') },
        { label: '本塁打', names: best('hr').names, val: String(best('hr').val) },
        { label: '打点', names: best('rbi').names, val: String(best('rbi').val) },
        { label: '盗塁', names: best('sb').names, val: String(best('sb').val) },
        { label: 'OPS', names: best('ops').names, val: fmt(best('ops').val, 'ops') },
      ]
    : []

  function best(key: string) {
    let maxVal = 0
    for (const p of batStats) {
      const v = Number(p[key] ?? 0)
      if (v > maxVal) maxVal = v
    }
    if (maxVal === 0) return { names: ['—'], val: 0 }
    const names = batStats
      .filter(p => Number(p[key] ?? 0) === maxVal)
      .map(p => String(p.name ?? '—'))
    return { names, val: maxVal }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex border-b bg-white flex-none">
        {(['summary', 'atbat', 'bat', 'pitch'] as const).map(t => (
          <button
            key={t}
            onClick={() => setSubTab(t)}
            className={`flex-1 py-3 text-sm font-bold transition-colors
              ${subTab === t ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-400'}`}
          >
            {t === 'summary' ? '試合サマリ' : t === 'atbat' ? '打席結果' : t === 'bat' ? '野手成績' : '投手成績'}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-auto">
        {/* ===== 試合サマリ ===== */}
        {subTab === 'summary' && (
          <div className="p-4 space-y-4">
            {/* MVP（データがある場合のみ） */}
            {gameData.mvp && (
              <div className="bg-yellow-50 rounded-xl shadow-sm p-4 border border-yellow-200">
                <h3 className="font-bold text-yellow-700 mb-2">MVP</h3>
                <p className="text-lg font-bold text-gray-800">{gameData.mvp.name}</p>
                {gameData.mvp.reason && (
                  <p className="text-sm text-gray-600 mt-1">{gameData.mvp.reason}</p>
                )}
              </div>
            )}

            {/* スコアボード */}
            <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
              <h3 className="font-bold text-gray-800 mb-3">スコアボード</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse text-center">
                  <thead>
                    <tr>
                      <th className="px-2 py-1 text-xs text-gray-500 text-left w-20"></th>
                      {Array.from({ length: maxInning }, (_, i) => (
                        <th key={i} className="px-2 py-1 text-xs text-gray-500 min-w-[28px]">{i + 1}</th>
                      ))}
                      <th className="px-2 py-1 text-xs text-gray-500 font-bold border-l border-gray-300 min-w-[32px]">計</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="bg-blue-50">
                      <td className="px-2 py-1.5 text-left font-bold text-gray-800 text-xs">Rickys</td>
                      {Array.from({ length: maxInning }, (_, i) => (
                        <td key={i} className="px-2 py-1.5 font-bold text-gray-800">{scoreboard.rickys[i] ?? 0}</td>
                      ))}
                      <td className="px-2 py-1.5 font-bold text-blue-700 border-l border-gray-300">{scoreboard.total.rickys}</td>
                    </tr>
                    <tr>
                      <td className="px-2 py-1.5 text-left font-bold text-gray-800 text-xs">{gameData.opponent || '相手'}</td>
                      {Array.from({ length: maxInning }, (_, i) => (
                        <td key={i} className="px-2 py-1.5 font-bold text-gray-800">{scoreboard.opponent[i] ?? 0}</td>
                      ))}
                      <td className="px-2 py-1.5 font-bold text-gray-700 border-l border-gray-300">{scoreboard.total.opponent}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 各指標1位 */}
            {topStats.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
                <h3 className="font-bold text-gray-800 mb-3">各指標1位</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {topStats.map(s => (
                    <div key={s.label} className="flex justify-between">
                      <span className="text-gray-600">{s.label}</span>
                      <span className="font-bold text-gray-800">{s.names.join('、')} ({s.val})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===== 打席結果 ===== */}
        {subTab === 'atbat' && (
          inningKeys.length === 0 ? (
            <p className="text-gray-400 text-center py-16">打席データがありません</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50 sticky top-0">
                    <th className="px-2 py-2.5 text-xs font-semibold text-gray-500 border-b text-center whitespace-nowrap w-8">#</th>
                    <th className="px-2 py-2.5 text-xs font-semibold text-gray-500 border-b text-left whitespace-nowrap sticky left-0 bg-gray-50 z-10">選手名</th>
                    {inningKeys.map(k => (
                      <th key={k} className="px-2 py-2.5 text-xs font-semibold text-gray-500 border-b text-center whitespace-nowrap">
                        {inningLabel(k)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {gameData.roster.map((player, i) => (
                    <tr key={player.order} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                      <td className="px-2 py-2 border-b border-gray-100 text-center text-gray-400 text-xs">{player.order}</td>
                      <td className={`px-2 py-2 border-b border-gray-100 text-left font-medium text-gray-800 whitespace-nowrap sticky left-0 z-10 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                        {player.name}
                      </td>
                      {inningKeys.map(k => {
                        const entry = gameData.batterResults[k]?.[player.order]
                        const code = getCode(entry)
                        const hitCode = typeof entry === 'object' && entry ? entry.code : typeof entry === 'string' ? entry : ''
                        return (
                          <td key={k} className="px-2 py-2 border-b border-gray-100 text-center whitespace-nowrap">
                            {code ? (
                              <span className={isHit(hitCode) ? 'font-bold text-blue-600' : 'text-gray-600'}>
                                {code}
                              </span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* ===== 野手成績 ===== */}
        {subTab === 'bat' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 sticky top-0">
                  {BAT_COL_MAP.map(([key, label]) => (
                    <th
                      key={key}
                      className={`px-3 py-2.5 text-xs font-semibold text-gray-500 border-b whitespace-nowrap
                        ${key === 'name' ? 'text-left sticky left-0 bg-gray-50 z-10' : 'text-right'}`}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {batStats.map((player, i) => (
                  <tr key={String(player.order ?? i)} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                    {BAT_COL_MAP.map(([key]) => (
                      <td
                        key={key}
                        className={`px-3 py-2.5 border-b border-gray-100 whitespace-nowrap
                          ${key === 'name'
                            ? 'text-left font-medium text-gray-800 sticky left-0 z-10 ' + (i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50')
                            : 'text-right text-gray-600'
                          }`}
                      >
                        {fmt(player[key], key)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ===== 投手成績 ===== */}
        {subTab === 'pitch' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 sticky top-0">
                  {PIT_COL_MAP.map(([key, label]) => (
                    <th
                      key={key}
                      className={`px-3 py-2.5 text-xs font-semibold text-gray-500 border-b whitespace-nowrap
                        ${key === 'name' ? 'text-left sticky left-0 bg-gray-50 z-10' : 'text-right'}`}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pitchStats.map((player, i) => (
                  <tr key={String(player.name ?? i)} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                    {PIT_COL_MAP.map(([key]) => (
                      <td
                        key={key}
                        className={`px-3 py-2.5 border-b border-gray-100 whitespace-nowrap
                          ${key === 'name'
                            ? 'text-left font-medium text-gray-800 sticky left-0 z-10 ' + (i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50')
                            : 'text-right text-gray-600'
                          }`}
                      >
                        {fmt(player[key], key)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
