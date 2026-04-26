import { useState } from 'react'
import type { GameInfo, RosterEntry } from '../../types'
import { postMvp } from '../../api/gas'

type Props = {
  game: GameInfo
  roster: RosterEntry[]
  initialMvp: { name: string; reason: string } | null
  onBack: () => void
}

export default function MvpInput({ game, roster, initialMvp, onBack }: Props) {
  const [name, setName] = useState(initialMvp?.name ?? '')
  const [reason, setReason] = useState(initialMvp?.reason ?? '')
  const [sending, setSending] = useState(false)
  const [toast, setToast] = useState('')

  const allNames = roster.flatMap(r => [r.name, r.subName].filter(Boolean))
  const uniqueNames = [...new Set(allNames)]

  const handleSubmit = async () => {
    if (!name || !game.gameId) return
    setSending(true)
    try {
      await postMvp(game.gameId, name, reason)
      setToast('MVP を登録しました')
      setTimeout(() => setToast(''), 2000)
    } catch {
      setToast('送信に失敗しました')
      setTimeout(() => setToast(''), 2000)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto p-4 pb-8">
      <div className="flex items-center gap-3 mb-6 pt-2">
        <button onClick={onBack} className="text-gray-400 text-2xl leading-none active:text-gray-600">‹</button>
        <div>
          <h1 className="text-lg font-bold text-gray-800">MVP 入力</h1>
          <p className="text-xs text-gray-400">{game.gameDate} vs {game.opponent}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">選手名</label>
          <select
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full border rounded-lg px-3 py-2.5 text-base bg-white"
          >
            <option value="">選択してください</option>
            {uniqueNames.map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">理由・コメント（任意）</label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="例: 2打点の活躍で勝利に貢献"
            rows={3}
            className="w-full border rounded-lg px-3 py-2.5 text-base resize-none"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={sending || !name}
          className="w-full py-3 bg-yellow-500 text-white rounded-xl font-bold text-base disabled:opacity-50 active:bg-yellow-600"
        >
          {sending ? '送信中...' : 'MVP を登録'}
        </button>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-sm px-4 py-2 rounded-full shadow-lg">
          {toast}
        </div>
      )}
    </div>
  )
}
