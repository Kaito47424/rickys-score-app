import { useEffect, useMemo, useState } from 'react'
import type { BatStat, PitchStat, GameInfo } from '../../types'
import { fetchBatStats, fetchPitchStats, fetchGames } from '../../api/gas'
import { isQualifiedBatter, countTeamGames } from '../../utils/qualification'

const TOP_N = 5

type RankEntry = { name: string; value: number }

function fmtRate(v: number): string {
  return v.toFixed(3)
}

function RankingCard({ title, entries, fmt }: { title: string; entries: RankEntry[]; fmt: (v: number) => string }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
      <h3 className="font-bold text-gray-800 mb-3">{title}</h3>
      {entries.length === 0 ? (
        <p className="text-gray-400 text-sm">対象者がいません</p>
      ) : (
        <ol className="flex flex-col gap-2">
          {entries.map((e, i) => (
            <li key={e.name} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <span className="w-5 text-right font-bold text-gray-400">{i + 1}</span>
                <span className="font-medium text-gray-800">{e.name}</span>
              </span>
              <span className="font-bold text-blue-700">{fmt(e.value)}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

export default function RankingPage() {
  const [batStats, setBatStats] = useState<BatStat[]>([])
  const [pitchStats, setPitchStats] = useState<PitchStat[]>([])
  const [games, setGames] = useState<GameInfo[]>([])
  const [availableYears, setAvailableYears] = useState<string[]>([])
  const [yearFilter, setYearFilter] = useState<string>('all')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchGames()
      .then(data => {
        setGames(data)
        const years = new Set(data.map(g => g.gameDate.substring(0, 4)))
        setAvailableYears(['all', ...Array.from(years).sort().reverse()])
      })
      .catch(() => console.error('試合一覧の取得に失敗しました'))
  }, [])

  useEffect(() => {
    setLoading(true)
    setError('')
    const year = yearFilter === 'all' ? undefined : yearFilter
    Promise.all([fetchBatStats(year), fetchPitchStats(year)])
      .then(([bat, pitch]) => {
        setBatStats(bat)
        setPitchStats(pitch)
      })
      .catch(() => setError('成績の取得に失敗しました'))
      .finally(() => setLoading(false))
  }, [yearFilter])

  const teamGames = useMemo(() => countTeamGames(games, yearFilter), [games, yearFilter])

  const qualifiedBatters = useMemo(
    () => batStats.filter(r => isQualifiedBatter(Number(r['打席'] ?? 0), teamGames)),
    [batStats, teamGames],
  )

  const rank = (rows: (BatStat | PitchStat)[], key: string, ascending = false): RankEntry[] =>
    rows
      .map(r => ({ name: String(r['選手名'] ?? '—'), value: Number(r[key] ?? 0) }))
      .sort((a, b) => (ascending ? a.value - b.value : b.value - a.value))
      .slice(0, TOP_N)

  const avgRanking = useMemo(() => rank(qualifiedBatters, '打率'), [qualifiedBatters])
  const hrRanking = useMemo(() => rank(batStats, '本塁打'), [batStats])
  const opsRanking = useMemo(() => rank(qualifiedBatters, 'OPS'), [qualifiedBatters])
  const eraRanking = useMemo(() => rank(pitchStats, '防御率(ERA)', true), [pitchStats])

  return (
    <div className="flex flex-col h-full">
      {/* 年度フィルタ */}
      <div className="bg-white border-b px-4 py-2 flex items-center gap-2 flex-none">
        <label className="text-sm text-gray-600">年度:</label>
        <select
          value={yearFilter}
          onChange={(e) => setYearFilter(e.target.value)}
          className="text-sm border border-gray-300 rounded px-2 py-1 bg-white"
        >
          {availableYears.map(year => (
            <option key={year} value={year}>
              {year === 'all' ? '全年度' : `${year}年度`}
            </option>
          ))}
        </select>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-gray-400 text-sm">読み込み中...</p>
          </div>
        ) : error ? (
          <p className="text-red-500 text-center py-16 px-4">{error}</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <RankingCard title={`打率ランキング（規定打席${(teamGames * 2.1).toFixed(1)}以上）`} entries={avgRanking} fmt={fmtRate} />
            <RankingCard title="本塁打ランキング" entries={hrRanking} fmt={v => String(v)} />
            <RankingCard title={`OPSランキング（規定打席${(teamGames * 2.1).toFixed(1)}以上）`} entries={opsRanking} fmt={fmtRate} />
            <RankingCard title="防御率ランキング" entries={eraRanking} fmt={fmtRate} />
          </div>
        )}
      </div>
    </div>
  )
}
