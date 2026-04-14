import { useState } from 'react'
import type { GameInfo, RosterEntry, AllInningData, Page, PitcherRunStat, BatterResults, BatterEntry } from './types'
import GameSelect from './components/GameSelect'
import OrderEdit from './components/OrderEdit'
import InputMain from './components/Input'
import { DEFAULT_ROSTER_NAMES } from './constants/codes'
import { fetchGameData } from './api/gas'

const defaultRoster = (): RosterEntry[] =>
  Array.from({ length: 9 }, (_, i) => ({
    order: i + 1,
    name: DEFAULT_ROSTER_NAMES[i] ?? '',
    position: '',
    subName: '',
    subFromInning: null,
  }))

export default function App() {
  const [page, setPage] = useState<Page>('gameSelect')
  const [game, setGame] = useState<GameInfo | null>(null)
  const [roster, setRoster] = useState<RosterEntry[]>(defaultRoster())
  const [inningData, setInningData] = useState<AllInningData>({})
  const [submitted, setSubmitted] = useState<Set<string>>(new Set())
  const [pitcherStats, setPitcherStats] = useState<PitcherRunStat[]>([])
  const [loadingGame, setLoadingGame] = useState(false)

  const goToOrderEdit = async (g: GameInfo) => {
    setGame(g)
    setInningData({})
    setSubmitted(new Set())
    setPitcherStats([])

    if (g.exists && g.gameId) {
      setLoadingGame(true)
      try {
        const data = await fetchGameData(g.gameId)

        if ('error' in data) throw new Error(String((data as { error: string }).error))

        const fetchedRoster = data.roster && data.roster.length > 0
          ? data.roster.map((r: RosterEntry) => ({ ...r, subName: r.subName ?? '', subFromInning: r.subFromInning ?? null }))
          : defaultRoster()
        setRoster(fetchedRoster)

        const newInningData: AllInningData = {}
        const newSubmitted = new Set<string>()

        for (const [gasKey, orders] of Object.entries(data.batterResults ?? {})) {
          const hasData = Object.keys(orders).length > 0
          const feKey = gasKey.replace('_', '-')
          if (!newInningData[feKey]) newInningData[feKey] = { batterResults: {}, pitcherResults: {}, rbiData: {} }
          const normalized: BatterResults = {}
          for (const [o, val] of Object.entries(orders)) {
            if (typeof val === 'object' && val !== null) {
              const v = val as BatterEntry
              normalized[String(o)] = { code: String(v.code || ''), runCode: v.runCode || null }
            } else {
              normalized[String(o)] = { code: String(val || ''), runCode: null }
            }
          }
          newInningData[feKey].batterResults = normalized
          if (hasData) newSubmitted.add(feKey)
        }

        for (const [gasKey, orders] of Object.entries(data.pitcherResults ?? {})) {
          const hasData = Object.keys(orders).length > 0
          const feKey = gasKey.replace('_', '-')
          if (!newInningData[feKey]) newInningData[feKey] = { batterResults: {}, pitcherResults: {}, rbiData: {} }
          const normalized: Record<string, { code: string; pitcher: string }> = {}
          for (const [o, v] of Object.entries(orders)) normalized[String(o)] = v
          newInningData[feKey].pitcherResults = normalized
          if (hasData) newSubmitted.add(feKey)
        }

        const rbiSource = data.rbiData ?? {}
        if (Object.values(rbiSource).some(v => v.rbi || v.runs || v.sb)) {
          const target = newSubmitted.size > 0 ? [...newSubmitted][0] : '1-1'
          if (!newInningData[target]) newInningData[target] = { batterResults: {}, pitcherResults: {}, rbiData: {} }
          const normalizedRbi: Record<string, { rbi: number; runs: number; sb: number }> = {}
          for (const [o, v] of Object.entries(rbiSource)) normalizedRbi[String(o)] = v
          newInningData[target].rbiData = normalizedRbi
        }

        setInningData(newInningData)
        setSubmitted(newSubmitted)
        setPitcherStats(data.pitcherStats ?? [])
      } catch {
        setRoster(defaultRoster())
      } finally {
        setLoadingGame(false)
      }
    } else {
      setRoster(defaultRoster())
    }

    setPage('orderEdit')
  }

  const goToInputMain = (r: RosterEntry[]) => {
    setRoster(r)
    setPage('inputMain')
  }

  if (loadingGame) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⚾</div>
          <p className="text-gray-600 font-medium">試合データ読み込み中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {page === 'gameSelect' && (
        <GameSelect onSelect={goToOrderEdit} />
      )}
      {page === 'orderEdit' && game && (
        <OrderEdit
          game={game}
          initialRoster={roster}
          onBack={() => setPage('gameSelect')}
          onStart={goToInputMain}
        />
      )}
      {page === 'inputMain' && game && (
        <InputMain
          game={game}
          roster={roster}
          setRoster={setRoster}
          inningData={inningData}
          setInningData={setInningData}
          submitted={submitted}
          setSubmitted={setSubmitted}
          pitcherStats={pitcherStats}
          setPitcherStats={setPitcherStats}
          onBack={() => setPage('orderEdit')}
        />
      )}
    </div>
  )
}
