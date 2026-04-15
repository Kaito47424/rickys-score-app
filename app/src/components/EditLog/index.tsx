import { useEffect, useState } from 'react'
import type { EditLogEntry } from '../../types'
import { fetchEditLog } from '../../api/gas'

type Props = { onBack: () => void }

export default function EditLogPage({ onBack }: Props) {
  const [logs, setLogs] = useState<EditLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchEditLog()
      .then(setLogs)
      .catch(() => setError('修正履歴の取得に失敗しました'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="max-w-lg mx-auto flex flex-col h-screen bg-gray-50">
      <div className="bg-blue-700 text-white px-4 py-2.5 flex items-center gap-3 flex-none">
        <button onClick={onBack} className="text-white text-2xl leading-none">‹</button>
        <h1 className="font-bold">修正履歴</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {loading && <p className="text-gray-400 text-center py-12">読み込み中...</p>}
        {error && <p className="text-red-500 text-sm text-center py-4">{error}</p>}
        {!loading && !error && logs.length === 0 && (
          <p className="text-gray-400 text-center py-12">修正履歴はありません</p>
        )}
        {logs.map((log, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm p-3 border border-gray-100">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-blue-600">{log.gameId}</span>
              <span className="text-xs text-gray-400">{log.timestamp}</span>
            </div>
            <p className="text-xs text-gray-500 mb-2">
              {log.editType === 'batter' ? '野手' : '投手'}{' '}
              {log.inning}回 {log.round}巡目 {log.order}番
            </p>
            <div className="flex items-center gap-2 text-sm">
              <span className="px-2 py-1 bg-red-50 text-red-600 rounded-lg font-mono font-bold">
                {log.oldValue || '（空）'}
              </span>
              <span className="text-gray-400 font-bold">→</span>
              <span className="px-2 py-1 bg-green-50 text-green-600 rounded-lg font-mono font-bold">
                {log.newValue || '（空）'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
