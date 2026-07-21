import { useEffect, useMemo, useState } from 'react'
import type { BatStat, PitchStat, GameInfo } from '../../types'
import { fetchBatStats, fetchPitchStats, fetchGames } from '../../api/gas'
import { isQualifiedBatter, countTeamGames } from '../../utils/qualification'

const TOP_N = 5

type RankEntry = { name: string; value: number; display: string }

function fmt3(v: number): string {
  return v.toFixed(3)
}
function fmt2(v: number): string {
  return v.toFixed(2)
}
function fmtInt(v: number): string {
  return String(v)
}

// 投球回は"10.1"="10と1/3"のような3分表記のため、正しい小数値に変換する
function ipToDecimal(ip: unknown): number {
  const s = String(ip ?? '0')
  const [wholeStr, fracStr] = s.split('.')
  const whole = Number(wholeStr) || 0
  const frac = fracStr ? Number(fracStr[0]) || 0 : 0
  return whole + frac / 3
}

function buildRanking<T extends BatStat | PitchStat>(
  rows: T[],
  getValue: (r: T) => number,
  format: (v: number, r: T) => string,
  ascending = false,
): RankEntry[] {
  return rows
    .map(r => {
      const value = getValue(r)
      return { name: String(r['選手名'] ?? '—'), value, display: format(value, r) }
    })
    .sort((a, b) => (ascending ? a.value - b.value : b.value - a.value))
    .slice(0, TOP_N)
}

// 1位=金・2位=銀・3位=銅、4位以下は通常表示
const RANK_BADGE_STYLE = [
  'bg-yellow-400 text-yellow-900',   // 1位: gold
  'bg-gray-300 text-gray-700',       // 2位: silver
  'bg-orange-400 text-orange-900',   // 3位: bronze
] as const

function RankBadge({ rank }: { rank: number }) {
  const style = RANK_BADGE_STYLE[rank - 1]
  if (!style) {
    return <span className="w-6 h-6 flex items-center justify-center text-xs font-bold text-gray-400">{rank}</span>
  }
  return (
    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${style}`}>
      {rank}
    </span>
  )
}

function RankingCard({ title, entries }: { title: string; entries: RankEntry[] }) {
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
                <RankBadge rank={i + 1} />
                <span className="font-medium text-gray-800">{e.name}</span>
              </span>
              <span className="font-bold text-blue-700">{e.display}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

function RankingSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-bold text-gray-700 text-sm">{title}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{children}</div>
    </section>
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

  // 野手
  const avgRanking = useMemo(() => buildRanking(qualifiedBatters, r => Number(r['打率'] ?? 0), fmt3), [qualifiedBatters])
  const hrRanking = useMemo(() => buildRanking(batStats, r => Number(r['本塁打'] ?? 0), fmtInt), [batStats])
  const rbiRanking = useMemo(() => buildRanking(batStats, r => Number(r['打点'] ?? 0), fmtInt), [batStats])
  const sbRanking = useMemo(() => buildRanking(batStats, r => Number(r['盗塁'] ?? 0), fmtInt), [batStats])
  const opsRanking = useMemo(() => buildRanking(qualifiedBatters, r => Number(r['OPS'] ?? 0), fmt3), [qualifiedBatters])

  // 投手
  const eraRanking = useMemo(() => buildRanking(pitchStats, r => Number(r['防御率(ERA)'] ?? 0), fmt3, true), [pitchStats])
  const soRanking = useMemo(() => buildRanking(pitchStats, r => Number(r['奪三振'] ?? 0), fmtInt), [pitchStats])
  const whipRanking = useMemo(
    () => buildRanking(
      pitchStats.filter(r => ipToDecimal(r['投球回']) > 0),
      r => (Number(r['被安打'] ?? 0) + Number(r['四球'] ?? 0)) / ipToDecimal(r['投球回']),
      fmt2,
      true,
    ),
    [pitchStats],
  )
  const ipRanking = useMemo(
    () => buildRanking(pitchStats, r => ipToDecimal(r['投球回']), (_v, r) => String(r['投球回'] ?? 0)),
    [pitchStats],
  )

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

      <div className="flex-1 overflow-auto p-4 flex flex-col gap-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-gray-400 text-sm">読み込み中...</p>
          </div>
        ) : error ? (
          <p className="text-red-500 text-center py-16 px-4">{error}</p>
        ) : (
          <>
            <RankingSection title="野手ランキング">
              <RankingCard title={`打率ランキング（規定打席${(teamGames * 2.1).toFixed(1)}以上）`} entries={avgRanking} />
              <RankingCard title="本塁打ランキング" entries={hrRanking} />
              <RankingCard title="打点ランキング" entries={rbiRanking} />
              <RankingCard title="盗塁ランキング" entries={sbRanking} />
              <RankingCard title={`OPSランキング（規定打席${(teamGames * 2.1).toFixed(1)}以上）`} entries={opsRanking} />
            </RankingSection>

            <RankingSection title="投手ランキング">
              <RankingCard title="防御率ランキング" entries={eraRanking} />
              <RankingCard title="奪三振ランキング" entries={soRanking} />
              <RankingCard title="WHIPランキング" entries={whipRanking} />
              <RankingCard title="投球回ランキング" entries={ipRanking} />
            </RankingSection>
          </>
        )}
      </div>
    </div>
  )
}
