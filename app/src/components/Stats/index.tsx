import { useEffect, useMemo, useState } from 'react'
import type { BatStat, PitchStat, GameInfo } from '../../types'
import { fetchBatStats, fetchPitchStats, fetchGames } from '../../api/gas'
import { isQualifiedBatter, countTeamGames } from '../../utils/qualification'

// 各試合ページ(GameSummary/index.tsx の BAT_COL_MAP/PIT_COL_MAP)と基本項目を揃えている
const BAT_COLS  = [
  '選手名', '試合数',
  '打席', '打数', '安打', '二塁打', '三塁打', '本塁打', '打点', '得点', '盗塁',
  '四球', '死球', '四死球数', '三振', '犠打', '犠飛', '失策出塁',
  '打率', '出塁率(OBP)', '長打率(SLG)', 'OPS', '四死球率',
  '三振率(K%)', 'POP', '走者なし打率', '走者あり打率', '得点圏打率', 'MVP',
] as const
const PIT_COLS  = ['選手名', '登板試合数', '投球回', '被安打', '被本塁打', '奪三振', '四球', '死球', '失点', '自責点', '防御率(ERA)'] as const

const LOWER_IS_BETTER = new Set(['防御率(ERA)'])

const RATE_COLS = ['打率', 'OPS', '防御率(ERA)', '出塁率(OBP)', '長打率(SLG)', 'フライ率(FB%)', 'POP', '三振率(K%)', '走者なし打率', '走者あり打率', '得点圏打率', '四死球率']

function fmt(v: string | number, col: string): string {
  if (v === null || v === undefined || v === '') return '—'
  const n = Number(v)
  if (isNaN(n)) return String(v)
  if (RATE_COLS.includes(col)) return n.toFixed(3)
  return String(v)
}

// 四死球数(=四球+死球)・四死球率(=四死球数/打席)を追加する
function withBbHbp(rows: BatStat[]): BatStat[] {
  return rows.map((r): BatStat => {
    const bb = Number(r['四球'] ?? 0)
    const hbp = Number(r['死球'] ?? 0)
    const pa = Number(r['打席'] ?? 0)
    return { ...r, '四死球数': bb + hbp, '四死球率': pa > 0 ? (bb + hbp) / pa : 0 }
  })
}

type SortDir = 'asc' | 'desc'

function sortRows<T extends BatStat | PitchStat>(rows: T[], sortCol: string | null, sortDir: SortDir): T[] {
  if (!sortCol) return rows
  const sorted = [...rows].sort((a, b) => {
    if (sortCol === '選手名') {
      return String(a[sortCol] ?? '').localeCompare(String(b[sortCol] ?? ''), 'ja')
    }
    const av = Number(a[sortCol])
    const bv = Number(b[sortCol])
    const an = isNaN(av) ? -Infinity : av
    const bn = isNaN(bv) ? -Infinity : bv
    return an - bn
  })
  return sortDir === 'desc' ? sorted.reverse() : sorted
}

export default function StatsPage() {
  const [tab, setTab] = useState<'bat' | 'pitch'>('bat')
  const [batStats, setBatStats]     = useState<BatStat[]>([])
  const [pitchStats, setPitchStats] = useState<PitchStat[]>([])
  const [batLoading, setBatLoading]     = useState(false)
  const [pitchLoading, setPitchLoading] = useState(false)
  const [batError, setBatError]     = useState('')
  const [pitchError, setPitchError] = useState('')
  const [yearFilter, setYearFilter] = useState<string>('all')
  const [games, setGames] = useState<GameInfo[]>([])
  const [availableYears, setAvailableYears] = useState<string[]>([])
  const [sortCol, setSortCol] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  useEffect(() => {
    loadGames()
  }, [])

  useEffect(() => {
    loadBat()
    loadPitch()
  }, [yearFilter])

  const loadGames = () => {
    fetchGames()
      .then(data => {
        setGames(data)
        const years = new Set(data.map(g => g.gameDate.substring(0, 4)))
        setAvailableYears(['all', ...Array.from(years).sort().reverse()])
      })
      .catch(() => console.error('試合一覧の取得に失敗しました'))
  }

  const loadBat = () => {
    setBatLoading(true)
    setBatError('')
    fetchBatStats(yearFilter === 'all' ? undefined : yearFilter)
      .then(setBatStats)
      .catch(() => setBatError('野手成績の取得に失敗しました'))
      .finally(() => setBatLoading(false))
  }

  const loadPitch = () => {
    setPitchLoading(true)
    setPitchError('')
    fetchPitchStats(yearFilter === 'all' ? undefined : yearFilter)
      .then(setPitchStats)
      .catch(() => setPitchError('投手成績の取得に失敗しました'))
      .finally(() => setPitchLoading(false))
  }

  const handleTab = (t: 'bat' | 'pitch') => {
    setTab(t)
    setSortCol(null)
    if (t === 'bat') loadBat()
    if (t === 'pitch') loadPitch()
  }

  const handleSort = (col: string) => {
    if (col === sortCol) {
      setSortDir(d => (d === 'desc' ? 'asc' : 'desc'))
    } else {
      setSortCol(col)
      setSortDir(col === '選手名' ? 'asc' : 'desc')
    }
  }

  const teamGames = useMemo(() => countTeamGames(games, yearFilter), [games, yearFilter])

  // 野手タブ: 規定打席以上（既存順）→ 規定打席未満（既存順）の安定パーティション
  const batRowsWithQualification = useMemo(() => {
    return withBbHbp(batStats).map(r => ({
      row: r,
      qualified: isQualifiedBatter(Number(r['打席'] ?? 0), teamGames),
    }))
  }, [batStats, teamGames])

  const qualifiedBatRows = batRowsWithQualification.filter(r => r.qualified).map(r => r.row)
  const unqualifiedBatRows = batRowsWithQualification.filter(r => !r.qualified).map(r => r.row)

  // 規定打席以上/未満のグループはそのまま維持し、各グループ内だけソートする
  const sortedQualifiedBatRows = useMemo(() => sortRows(qualifiedBatRows, sortCol, sortDir), [qualifiedBatRows, sortCol, sortDir])
  const sortedUnqualifiedBatRows = useMemo(() => sortRows(unqualifiedBatRows, sortCol, sortDir), [unqualifiedBatRows, sortCol, sortDir])
  const sortedPitchStats = useMemo(() => sortRows(pitchStats, sortCol, sortDir), [pitchStats, sortCol, sortDir])

  const cols    = tab === 'bat' ? BAT_COLS : PIT_COLS
  const loading = tab === 'bat' ? batLoading : pitchLoading
  const error   = tab === 'bat' ? batError : pitchError
  const rowCount = tab === 'bat' ? batRowsWithQualification.length : pitchStats.length

  const bestValues = useMemo<Record<string, number>>(() => {
    // 野手タブは規定打席以上の選手のみを対象にハイライト基準を算出する
    const currentCols = tab === 'bat' ? BAT_COLS : PIT_COLS
    const currentRows = tab === 'bat' ? qualifiedBatRows : pitchStats
    if (currentRows.length === 0) return {}
    const result: Record<string, number> = {}
    for (const col of currentCols) {
      if (col === '選手名') continue
      const nums = currentRows
        .map(r => Number(r[col]))
        .filter(v => !isNaN(v) && isFinite(v) && v > 0)
      if (nums.length === 0) continue
      result[col] = LOWER_IS_BETTER.has(col) ? Math.min(...nums) : Math.max(...nums)
    }
    return result
  }, [tab, qualifiedBatRows, pitchStats])

  const renderRow = (row: BatStat | PitchStat, key: string, dimmed: boolean) => (
    <tr key={key} className={dimmed ? 'bg-gray-50/50 text-gray-400' : 'bg-white'}>
      {cols.map(c => {
        const best = !dimmed && c !== '選手名' && bestValues[c] !== undefined && Number(row[c]) === bestValues[c]
        return (
          <td
            key={c}
            className={`px-3 py-2.5 border-b border-gray-100 whitespace-nowrap
              ${c === '選手名'
                ? `text-left font-medium sticky left-0 z-10 ${dimmed ? 'bg-gray-50/50 text-gray-400' : 'bg-white text-gray-800'}`
                : best
                  ? 'text-right font-bold text-yellow-700 bg-yellow-50'
                  : 'text-right text-gray-600'
              }`}
          >
            {fmt(row[c] as string | number, c)}
          </td>
        )
      })}
    </tr>
  )

  return (
    <div className="flex flex-col h-full">
      {/* メインタブ */}
      <div className="flex border-b bg-white flex-none">
        {(['bat', 'pitch'] as const).map(t => (
          <button
            key={t}
            onClick={() => handleTab(t)}
            className={`flex-1 py-3 text-sm font-bold transition-colors
              ${tab === t ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-400'}`}
          >
            {t === 'bat' ? '野手成績' : '投手成績'}
          </button>
        ))}
      </div>

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

      {/* コンテンツ */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-gray-400 text-sm">読み込み中...</p>
          </div>
        ) : error ? (
          <p className="text-red-500 text-center py-16 px-4">{error}</p>
        ) : rowCount === 0 ? (
          <p className="text-gray-400 text-center py-16">データがありません</p>
        ) : (
          <div className="overflow-x-auto">
            <p className="text-xs text-gray-400 px-1 py-1.5">列見出しをクリックすると、その項目で並び替えできます</p>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 sticky top-0">
                  {cols.map(c => (
                    <th
                      key={c}
                      onClick={() => handleSort(c)}
                      title="クリックで並び替え"
                      className={`px-3 py-2.5 text-xs font-semibold border-b whitespace-nowrap cursor-pointer select-none hover:text-blue-600 hover:bg-blue-50
                        ${sortCol === c ? 'text-blue-600' : 'text-gray-500'}
                        ${c === '選手名' ? 'text-left sticky left-0 bg-gray-50 z-10' : 'text-right'}`}
                    >
                      {c}
                      <span className={sortCol === c ? '' : 'text-gray-300'}>
                        {sortCol === c ? (sortDir === 'desc' ? ' ▼' : ' ▲') : ' ⇅'}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tab === 'bat' ? (
                  <>
                    {sortedQualifiedBatRows.map((row, i) => renderRow(row, `q-${i}`, false))}
                    {sortedUnqualifiedBatRows.length > 0 && (
                      <tr>
                        <td colSpan={cols.length} className="px-3 py-1.5 border-b border-gray-100 text-xs text-gray-400 bg-gray-50">
                          規定打席未満（規定打席: {(teamGames * 2.1).toFixed(1)}）
                        </td>
                      </tr>
                    )}
                    {sortedUnqualifiedBatRows.map((row, i) => renderRow(row, `u-${i}`, true))}
                  </>
                ) : (
                  sortedPitchStats.map((row, i) => renderRow(row, `p-${i}`, false))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
