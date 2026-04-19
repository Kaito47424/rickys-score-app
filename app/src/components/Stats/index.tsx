import { useEffect, useState } from 'react'
import type { BatStat, PitchStat } from '../../types'
import { fetchBatStats, fetchPitchStats, fetchGames } from '../../api/gas'

const BAT_COLS  = ['選手名', '試合数', '打席', '打数', '安打', '打率', '本塁打', '打点', '得点', '盗塁', 'OPS'] as const
const PIT_COLS  = ['選手名', '登板試合数', '投球回', '被安打', '奪三振', '四球', '失点', '自責点', '防御率(ERA)'] as const

function fmt(v: string | number, col: string): string {
  if (v === null || v === undefined || v === '') return '—'
  const n = Number(v)
  if (isNaN(n)) return String(v)
  if (['打率', 'OPS', '防御率(ERA)'].includes(col)) return n.toFixed(3)
  return String(v)
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
  const [availableYears, setAvailableYears] = useState<string[]>([])

  useEffect(() => {
    loadGames()
  }, [])

  useEffect(() => {
    if (yearFilter === 'all') {
      loadBat()
      loadPitch()
    } else {
      loadBat()
      loadPitch()
    }
  }, [yearFilter])

  const loadGames = () => {
    fetchGames()
      .then(data => {
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
    if (t === 'bat') loadBat()
    if (t === 'pitch') loadPitch()
  }

  const cols    = tab === 'bat' ? BAT_COLS : PIT_COLS
  const rows    = tab === 'bat' ? batStats : pitchStats
  const loading = tab === 'bat' ? batLoading : pitchLoading
  const error   = tab === 'bat' ? batError : pitchError

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
        ) : rows.length === 0 ? (
          <p className="text-gray-400 text-center py-16">データがありません</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 sticky top-0">
                  {cols.map(c => (
                    <th
                      key={c}
                      className={`px-3 py-2.5 text-xs font-semibold text-gray-500 border-b whitespace-nowrap
                        ${c === '選手名' ? 'text-left sticky left-0 bg-gray-50 z-10' : 'text-right'}`}
                    >
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                    {cols.map(c => (
                      <td
                        key={c}
                        className={`px-3 py-2.5 border-b border-gray-100 whitespace-nowrap
                          ${c === '選手名'
                            ? 'text-left font-medium text-gray-800 sticky left-0 z-10 ' + (i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50')
                            : 'text-right text-gray-600'
                          }`}
                      >
                        {fmt(row[c] as string | number, c)}
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
