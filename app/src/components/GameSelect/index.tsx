import { useEffect, useState } from 'react'
import type { GameInfo } from '../../types'
import { fetchGames, postToGas } from '../../api/gas'
import StatsModal from '../Stats'

type Props = { onSelect: (game: GameInfo) => void }

const GUIDE_STEPS = [
  '試合を選択（または新規作成）',
  'オーダーを設定して「入力開始」',
  'イニングと巡目を選択',
  '各打者の結果をタップで入力',
  '野手・投手タブを切り替えて入力',
  '「この回を送信」でスプシに反映',
  '全イニング送信したら完了',
]

export default function GameSelect({ onSelect }: Props) {
  const [games, setGames]       = useState<GameInfo[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [showForm, setShowForm] = useState(false)
  const [showGuide, setShowGuide] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [date, setDate]         = useState(new Date().toISOString().slice(0, 10))
  const [opponent, setOpponent] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    fetchGames()
      .then(data => {
        const sorted = [...data].sort((a, b) =>
          b.gameDate.localeCompare(a.gameDate)
        )
        setGames(sorted)
      })
      .catch(() => setError('試合一覧の取得に失敗しました'))
      .finally(() => setLoading(false))
  }, [])

  const handleCreate = async () => {
    if (!date || !opponent.trim()) return
    setCreating(true)
    try {
      await postToGas({ type: 'createGame', gameDate: date, opponent: opponent.trim() })
    } catch {
      // no-cors: ignore
    }
    setCreating(false)
    onSelect({ gameId: '', gameDate: date, opponent: opponent.trim(), exists: true })
  }

  return (
    <div className="max-w-lg mx-auto p-4 pb-8">
      <div className="flex items-center gap-3 mb-4 pt-2">
        <span className="text-3xl">⚾</span>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-blue-700">Rickys スコア入力</h1>
          <p className="text-xs text-gray-400">草野球成績管理</p>
        </div>
        <button
          onClick={() => setShowStats(true)}
          className="flex items-center gap-1 px-3 py-2 bg-blue-50 text-blue-700 rounded-xl text-sm font-bold active:bg-blue-100 border border-blue-200"
        >
          <span>📊</span>
          <span>個人成績</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-4 overflow-hidden">
        <button
          onClick={() => setShowGuide(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-600 active:bg-gray-50"
        >
          <span className="flex items-center gap-2">
            <span>📖</span>
            <span>使い方ガイド</span>
          </span>
          <span className={`text-gray-400 transition-transform duration-200 ${showGuide ? 'rotate-90' : ''}`}>›</span>
        </button>
        {showGuide && (
          <div className="px-4 pb-4 border-t border-gray-100">
            <ol className="mt-3 space-y-2">
              {GUIDE_STEPS.map((step, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-gray-700">
                  <span className="flex-none w-5 h-5 bg-blue-600 text-white rounded-full text-xs flex items-center justify-center font-bold mt-0.5">
                    {i + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>

      <button
        onClick={() => setShowForm(v => !v)}
        className="w-full py-3 mb-4 bg-blue-600 text-white rounded-xl font-bold text-base active:bg-blue-700"
      >
        ＋ 新規試合を作成
      </button>

      {showForm && (
        <div className="bg-white rounded-xl p-4 mb-5 shadow">
          <label className="block text-sm font-medium text-gray-600 mb-1">日付</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="w-full border rounded-lg px-3 py-2.5 mb-3 text-base"
          />
          <label className="block text-sm font-medium text-gray-600 mb-1">対戦相手</label>
          <input
            type="text"
            value={opponent}
            onChange={e => setOpponent(e.target.value)}
            placeholder="チーム名を入力"
            className="w-full border rounded-lg px-3 py-2.5 mb-4 text-base"
          />
          <button
            onClick={handleCreate}
            disabled={creating || !date || !opponent.trim()}
            className="w-full py-3 bg-green-600 text-white rounded-xl font-bold text-base disabled:opacity-50 active:bg-green-700"
          >
            {creating ? '作成中...' : '試合を作成してオーダー入力へ'}
          </button>
        </div>
      )}

      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">試合一覧</h2>

      {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

      {loading ? (
        <p className="text-gray-400 text-center py-12">読み込み中...</p>
      ) : games.length === 0 ? (
        <p className="text-gray-400 text-center py-12">試合がありません</p>
      ) : (
        <div className="space-y-2">
          {games.map(g => (
            <button
              key={g.gameId || `${g.gameDate}-${g.opponent}`}
              onClick={() => onSelect(g)}
              className="w-full bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center justify-between active:bg-gray-50"
            >
              <div className="text-left">
                <p className="font-bold text-gray-800">{g.opponent}</p>
                <p className="text-sm text-gray-500">{g.gameDate}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  g.exists
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-500'
                }`}>
                  {g.exists ? 'シートあり' : '新規'}
                </span>
                <span className="text-gray-300 text-lg">›</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {showStats && <StatsModal onClose={() => setShowStats(false)} />}
    </div>
  )
}
