import { useEffect, useState } from 'react'
import type { GameInfo, RosterEntry, Player } from '../../types'
import { fetchPlayers } from '../../api/gas'
import { POSITIONS } from '../../constants/codes'

type Props = {
  game: GameInfo
  initialRoster: RosterEntry[]
  onBack: () => void
  onStart: (roster: RosterEntry[]) => void
}

export default function OrderEdit({ game, initialRoster, onBack, onStart }: Props) {
  const [players, setPlayers] = useState<Player[]>([])
  const [roster, setRoster] = useState<RosterEntry[]>(initialRoster)

  useEffect(() => {
    fetchPlayers().then(setPlayers).catch(() => {})
  }, [])

  const playerNames = players.map(p => p.name)

  const update = (order: number, field: 'name' | 'position', value: string) => {
    setRoster(prev =>
      prev.map(r => (r.order === order ? { ...r, [field]: value } : r))
    )
  }

  return (
    <div className="max-w-lg mx-auto flex flex-col min-h-screen">
      <div className="sticky top-0 bg-blue-700 text-white px-4 py-3 flex items-center gap-3 z-10">
        <button onClick={onBack} className="text-white text-2xl leading-none">‹</button>
        <div>
          <p className="font-bold">{game.opponent}</p>
          <p className="text-xs text-blue-200">{game.gameDate}</p>
        </div>
      </div>

      <div className="flex-1 p-4 space-y-3 pb-28">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">打順・ポジション設定</h2>

        {roster.map(r => (
          <div key={r.order} className="bg-white rounded-xl shadow p-3">
            <p className="text-xs font-bold text-blue-600 mb-2">{r.order}番</p>
            <div className="flex gap-2">
              <select
                value={r.name}
                onChange={e => update(r.order, 'name', e.target.value)}
                className="flex-1 border rounded-lg px-2 py-2.5 text-sm"
              >
                <option value="">選手を選択</option>
                {playerNames.map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              <select
                value={r.position}
                onChange={e => update(r.order, 'position', e.target.value)}
                className="w-16 border rounded-lg px-1 py-2.5 text-sm text-center"
              >
                {POSITIONS.map(p => (
                  <option key={p} value={p}>{p || '−'}</option>
                ))}
              </select>
            </div>
          </div>
        ))}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t px-4 py-3 safe-area-bottom">
        <button
          onClick={() => onStart(roster)}
          className="w-full max-w-lg mx-auto block py-4 bg-blue-600 text-white rounded-xl font-bold text-lg active:bg-blue-700"
        >
          入力開始 →
        </button>
      </div>
    </div>
  )
}
