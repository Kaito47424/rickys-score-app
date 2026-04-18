import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { GameInfo } from '../../types'
import { fetchGames } from '../../api/gas'

export default function GamesPage() {
  const navigate = useNavigate()
  const [games, setGames] = useState<GameInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchGames()
      .then(data => {
        const sorted = [...data].sort((a, b) => b.gameDate.localeCompare(a.gameDate))
        setGames(sorted)
      })
      .catch(() => setError('試合一覧の取得に失敗しました'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="flex flex-col h-full">
      {loading ? (
        <p className="text-gray-400 text-center py-16">読み込み中...</p>
      ) : error ? (
        <p className="text-red-500 text-center py-16 px-4">{error}</p>
      ) : games.length === 0 ? (
        <p className="text-gray-400 text-center py-16">試合データがありません</p>
      ) : (
        <div className="p-4 grid grid-cols-1 gap-3">
          {games.map(game => (
            <button
              key={game.gameId}
              onClick={() => navigate(`/view/game/${game.gameId}`)}
              className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 text-left hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-400">{game.gameId}</span>
                <span className="text-xs text-gray-400">{game.gameDate}</span>
              </div>
              <p className="font-bold text-gray-800">{game.opponent}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
