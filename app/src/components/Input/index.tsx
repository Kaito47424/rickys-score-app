import { useState, useEffect } from 'react'
import type { GameInfo, RosterEntry, AllInningData, InningState, ModalTarget, PitcherRunStat, BatterEntry } from '../../types'
import { postToGas, postLogEdit } from '../../api/gas'
import InningBar from './InningBar'
import CodeModal from '../CodePicker'
import PitcherModal from './PitcherModal'
import RunCodeModal from './RunCodeModal'

type Props = {
  game: GameInfo
  roster: RosterEntry[]
  setRoster: React.Dispatch<React.SetStateAction<RosterEntry[]>>
  inningData: AllInningData
  setInningData: React.Dispatch<React.SetStateAction<AllInningData>>
  submitted: Set<string>
  setSubmitted: React.Dispatch<React.SetStateAction<Set<string>>>
  pitcherStats: PitcherRunStat[]
  setPitcherStats: React.Dispatch<React.SetStateAction<PitcherRunStat[]>>
  onBack: () => void
}

function emptyInning(): InningState {
  return { batterResults: {}, pitcherResults: {}, rbiData: {} }
}

function getOrInit(data: AllInningData, key: string): InningState {
  return data[key] ?? emptyInning()
}

function normEntry(v: BatterEntry | string | undefined): BatterEntry {
  if (!v) return { code: '', runCode: null }
  if (typeof v === 'string') return { code: v, runCode: null }
  return v
}

export default function InputMain({
  game, roster, setRoster, inningData, setInningData, submitted, setSubmitted,
  pitcherStats, setPitcherStats, onBack,
}: Props) {
  const [inning, setInning] = useState(1)
  const [round, setRound] = useState<1 | 2>(1)
  const [mainTab, setMainTab] = useState<'batter' | 'pitcher'>('batter')
  const [modal, setModal] = useState<ModalTarget>(null)
  const [runModal, setRunModal] = useState<number | null>(null)
  const [pitcherModal, setPitcherModal] = useState<number | null>(null)
  const [lastPitcher, setLastPitcher] = useState('')
  const [sending, setSending] = useState(false)
  const [toast, setToast] = useState('')
  const [snapshots, setSnapshots] = useState<Record<string, InningState>>({})

  // 初回マウント時、既存送信済みイニングのスナップショットを初期化
  useEffect(() => {
    const initial: Record<string, InningState> = {}
    for (const k of submitted) {
      if (inningData[k]) initial[k] = inningData[k]
    }
    setSnapshots(initial)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const [subInputOrder, setSubInputOrder] = useState<number | null>(null)
  const [subInputText, setSubInputText] = useState('')

  const key = `${inning}-${round}`
  const current = getOrInit(inningData, key)

  const updateBatterCode = (order: number, code: string) => {
    setInningData(prev => {
      const s = getOrInit(prev, key)
      const existing = normEntry(s.batterResults[String(order)])
      return { ...prev, [key]: { ...s, batterResults: { ...s.batterResults, [String(order)]: { ...existing, code } } } }
    })
  }

  const updateRunCode = (order: number, runCode: string | null) => {
    setInningData(prev => {
      const s = getOrInit(prev, key)
      const existing = normEntry(s.batterResults[String(order)])
      return { ...prev, [key]: { ...s, batterResults: { ...s.batterResults, [String(order)]: { ...existing, runCode } } } }
    })
  }

  const updatePitcherCode = (order: number, code: string) => {
    setInningData(prev => {
      const s = getOrInit(prev, key)
      const existing = s.pitcherResults[String(order)] ?? { code: '', pitcher: '' }
      return {
        ...prev,
        [key]: { ...s, pitcherResults: { ...s.pitcherResults, [String(order)]: { ...existing, code } } },
      }
    })
  }

  const updatePitcherName = (order: number, pitcher: string) => {
    setInningData(prev => {
      const s = getOrInit(prev, key)
      const existing = s.pitcherResults[String(order)] ?? { code: '', pitcher: '' }
      return {
        ...prev,
        [key]: { ...s, pitcherResults: { ...s.pitcherResults, [String(order)]: { ...existing, pitcher } } },
      }
    })
  }

  const updateRbi = (order: number, field: 'rbi' | 'runs' | 'sb', delta: number) => {
    setInningData(prev => {
      const s = getOrInit(prev, key)
      const existing = s.rbiData[String(order)] ?? { rbi: 0, runs: 0, sb: 0 }
      const next = Math.max(0, (existing[field] ?? 0) + delta)
      return {
        ...prev,
        [key]: { ...s, rbiData: { ...s.rbiData, [String(order)]: { ...existing, [field]: next } } },
      }
    })
  }

  const confirmSub = (order: number) => {
    if (!subInputText.trim()) return
    setRoster(prev => prev.map(r =>
      r.order === order ? { ...r, subName: subInputText.trim(), subFromInning: inning } : r
    ))
    setSubInputOrder(null)
    setSubInputText('')
  }

  const cancelSub = (order: number) => {
    setRoster(prev => prev.map(r =>
      r.order === order ? { ...r, subName: '', subFromInning: null } : r
    ))
  }

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  const handleSubmit = async () => {
    // 上書き時: スナップショットと差分を取りログを送信
    if (isSubmitted && snapshots[key]) {
      const prev = snapshots[key]
      for (let order = 1; order <= 9; order++) {
        const o = String(order)
        const oldEntry = normEntry(prev.batterResults?.[o])
        const newEntry = normEntry(current.batterResults?.[o])
        if (oldEntry.code !== newEntry.code) {
          postLogEdit({ gameId: game.gameId, editType: 'batter', inning, round, order, oldValue: oldEntry.code, newValue: newEntry.code })
        }
      }
      for (let order = 1; order <= 9; order++) {
        const o = String(order)
        const oldPr = prev.pitcherResults?.[o] ?? { code: '', pitcher: '' }
        const newPr = current.pitcherResults?.[o] ?? { code: '', pitcher: '' }
        if (oldPr.code !== newPr.code) {
          postLogEdit({ gameId: game.gameId, editType: 'pitcher', inning, round, order, oldValue: oldPr.code, newValue: newPr.code })
        }
      }
    }

    setSending(true)
    try {
      await postToGas({
        type: 'inning',
        gameId: game.gameId,
        gameDate: game.gameDate,
        opponent: game.opponent,
        inning,
        round,
        roster: roster.map(r => ({
          order: r.order,
          name: r.name,
          position: r.position,
          subName: r.subName,
          subPosition: '',
          subFromInning: r.subFromInning,
        })),
        batterResults: current.batterResults,
        pitcherResults: current.pitcherResults,
        rbiData: current.rbiData,
        pitcherStats,
      })
    } catch {
      // no-cors: 送信は完了している
    }
    setSubmitted(prev => new Set([...prev, key]))
    setSnapshots(prev => ({ ...prev, [key]: { ...current } }))
    showToast(`${inning}回 ${round}巡目 送信完了 ✓`)
    setSending(false)
  }

  const pitcherNames = roster.map(r => r.name).filter(Boolean)
  const isSubmitted = submitted.has(key)

  return (
    <div className="max-w-lg mx-auto flex flex-col h-screen bg-gray-50">
      <div className="bg-blue-700 text-white px-4 py-2.5 flex items-center gap-3 flex-none">
        <button onClick={onBack} className="text-white text-2xl leading-none">‹</button>
        <div className="flex-1 min-w-0">
          <p className="font-bold truncate">{game.opponent}</p>
          <p className="text-xs text-blue-200">{game.gameDate}</p>
        </div>
        {isSubmitted && (
          <span className="text-green-300 text-sm font-bold flex-none">送信済 ✓</span>
        )}
      </div>

      <div className="flex-none">
        <InningBar current={inning} submitted={submitted} round={round} onChange={setInning} />
      </div>

      <div className="flex border-b bg-white flex-none">
        <div className="flex border-r">
          {([1, 2] as const).map(r => (
            <button
              key={r}
              onClick={() => setRound(r)}
              className={`px-4 py-2.5 text-sm font-bold transition-colors
                ${round === r ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-400'}`}
            >
              {r}巡目
            </button>
          ))}
        </div>
        <div className="flex flex-1">
          {(['batter', 'pitcher'] as const).map(t => (
            <button
              key={t}
              onClick={() => setMainTab(t)}
              className={`flex-1 py-2.5 text-sm font-bold transition-colors
                ${mainTab === t ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-400'}`}
            >
              {t === 'batter' ? '野手' : '投手'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2 pb-24">
        {roster.map(r => {
          const orderStr = String(r.order)

          if (mainTab === 'batter') {
            const entry = normEntry(current.batterResults[orderStr])
            const rbi = current.rbiData[orderStr] ?? { rbi: 0, runs: 0, sb: 0 }
            const isSubActive = r.subFromInning !== null && r.subFromInning <= inning
            const displayName = isSubActive ? r.subName : r.name
            const showSubInput = subInputOrder === r.order

            return (
              <div key={r.order} className="bg-white rounded-xl shadow-sm p-3 border border-gray-100">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold text-blue-500 w-5 flex-none">{r.order}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-800 text-sm truncate">
                      {displayName || <span className="text-gray-300">未設定</span>}
                    </p>
                    {isSubActive
                      ? <p className="text-xs text-orange-500 font-medium">交代@{r.subFromInning}回</p>
                      : r.position && <p className="text-xs text-gray-400">{r.position}</p>
                    }
                  </div>
                  {isSubActive ? (
                    <button
                      onClick={() => cancelSub(r.order)}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold bg-orange-100 text-orange-600 active:bg-orange-200 flex-none"
                    >↩</button>
                  ) : !showSubInput ? (
                    <button
                      onClick={() => { setSubInputOrder(r.order); setSubInputText('') }}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold bg-gray-100 text-gray-500 active:bg-gray-200 flex-none"
                    >交代↓</button>
                  ) : null}
                </div>

                {showSubInput && (
                  <div className="flex gap-2 mb-2">
                    <input
                      autoFocus
                      type="text"
                      value={subInputText}
                      onChange={e => setSubInputText(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && confirmSub(r.order)}
                      placeholder="交代選手名を入力"
                      className="flex-1 border rounded-xl px-3 py-2 text-sm"
                    />
                    <button
                      onClick={() => confirmSub(r.order)}
                      disabled={!subInputText.trim()}
                      className="px-3 py-2 bg-orange-500 text-white rounded-xl text-sm font-bold disabled:opacity-40 active:bg-orange-600"
                    >確定</button>
                    <button
                      onClick={() => setSubInputOrder(null)}
                      className="px-3 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm font-bold active:bg-gray-200"
                    >×</button>
                  </div>
                )}

                <div className="flex gap-2 mb-2">
                  <div className="flex items-center gap-1.5 flex-1">
                    <span className="text-[10px] text-gray-400 font-semibold flex-none">打撃</span>
                    <button
                      onClick={() => setModal({ order: r.order, tab: 'batter' })}
                      className={`flex-1 py-2 rounded-xl text-sm font-bold text-center transition-colors
                        ${entry.code
                          ? 'bg-blue-600 text-white active:bg-blue-700'
                          : 'bg-gray-100 text-gray-400 border border-dashed border-gray-300 active:bg-gray-200'
                        }`}
                    >
                      {entry.code || 'タップ'}
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5 flex-1">
                    <span className="text-[10px] text-gray-400 font-semibold flex-none">走塁</span>
                    <button
                      onClick={() => setRunModal(r.order)}
                      className={`flex-1 py-2 rounded-xl text-sm font-bold text-center transition-colors
                        ${entry.runCode
                          ? 'bg-red-500 text-white active:bg-red-600'
                          : 'bg-gray-100 text-gray-400 border border-dashed border-gray-300 active:bg-gray-200'
                        }`}
                    >
                      {entry.runCode || 'タップ'}
                    </button>
                  </div>
                </div>

                <div className="flex gap-1.5 justify-end">
                  {(['rbi', 'runs', 'sb'] as const).map(field => (
                    <div key={field} className="flex items-center gap-0.5">
                      <span className="text-[10px] text-gray-400 w-7 text-center">
                        {field === 'rbi' ? '打点' : field === 'runs' ? '得点' : '盗塁'}
                      </span>
                      <button
                        onClick={() => updateRbi(r.order, field, -1)}
                        className="w-7 h-7 rounded-lg bg-gray-100 text-gray-600 font-bold text-sm active:bg-gray-200 flex items-center justify-center"
                      >−</button>
                      <span className="w-6 text-center text-sm font-bold text-gray-700">
                        {rbi[field]}
                      </span>
                      <button
                        onClick={() => updateRbi(r.order, field, 1)}
                        className="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 font-bold text-sm active:bg-blue-200 flex items-center justify-center"
                      >＋</button>
                    </div>
                  ))}
                </div>
              </div>
            )
          } else {
            const pr = current.pitcherResults[orderStr] ?? { code: '', pitcher: '' }
            return (
              <div key={r.order} className="bg-white rounded-xl shadow-sm p-3 border border-gray-100">
                <p className="text-xs font-bold text-blue-500 mb-2">{r.order}番</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setModal({ order: r.order, tab: 'pitcher' })}
                    className={`flex-1 py-3 rounded-xl text-sm font-bold text-center transition-colors
                      ${pr.code
                        ? 'bg-blue-600 text-white active:bg-blue-700'
                        : 'bg-gray-100 text-gray-400 border border-dashed border-gray-300 active:bg-gray-200'
                      }`}
                  >
                    {pr.code || '結果コード'}
                  </button>
                  <button
                    onClick={() => setPitcherModal(r.order)}
                    className={`flex-1 py-3 rounded-xl text-sm font-bold text-center transition-colors
                      ${pr.pitcher
                        ? 'bg-gray-700 text-white active:bg-gray-800'
                        : 'bg-gray-100 text-gray-400 border border-dashed border-gray-300 active:bg-gray-200'
                      }`}
                  >
                    {pr.pitcher || '投手名'}
                  </button>
                </div>
              </div>
            )
          }
        })}

        {mainTab === 'pitcher' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-3 py-2 bg-gray-50 border-b flex items-center justify-between">
              <p className="text-xs font-bold text-gray-600">投手別集計</p>
              {pitcherStats.length < 7 && (
                <button
                  onClick={() => setPitcherStats(prev => [...prev, { name: '', r: 0, er: 0 }])}
                  className="text-xs font-bold text-blue-600 active:text-blue-800"
                >＋ 追加</button>
              )}
            </div>
            {pitcherStats.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">「＋ 追加」で投手を登録</p>
            ) : (
              <div className="divide-y">
                {pitcherStats.map((ps, idx) => (
                  <div key={idx} className="px-3 py-2.5 flex items-center gap-2">
                    <input
                      type="text"
                      value={ps.name}
                      onChange={e => setPitcherStats(prev =>
                        prev.map((s, i) => i === idx ? { ...s, name: e.target.value } : s)
                      )}
                      list="pitcher-names-list"
                      placeholder="投手名"
                      className="flex-1 min-w-0 border rounded-lg px-2 py-1.5 text-sm"
                    />
                    <div className="flex items-center gap-0.5 flex-none">
                      <span className="text-[10px] text-gray-400 w-6 text-center">失点</span>
                      <button
                        onClick={() => setPitcherStats(prev =>
                          prev.map((s, i) => i === idx ? { ...s, r: Math.max(0, s.r - 1) } : s)
                        )}
                        className="w-7 h-7 rounded-lg bg-gray-100 text-gray-600 font-bold text-sm active:bg-gray-200 flex items-center justify-center"
                      >−</button>
                      <span className="w-6 text-center text-sm font-bold text-gray-700">{ps.r}</span>
                      <button
                        onClick={() => setPitcherStats(prev =>
                          prev.map((s, i) => i === idx ? { ...s, r: s.r + 1 } : s)
                        )}
                        className="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 font-bold text-sm active:bg-blue-200 flex items-center justify-center"
                      >＋</button>
                    </div>
                    <div className="flex items-center gap-0.5 flex-none">
                      <span className="text-[10px] text-gray-400 w-8 text-center">自責</span>
                      <button
                        onClick={() => setPitcherStats(prev =>
                          prev.map((s, i) => i === idx ? { ...s, er: Math.max(0, s.er - 1) } : s)
                        )}
                        className="w-7 h-7 rounded-lg bg-gray-100 text-gray-600 font-bold text-sm active:bg-gray-200 flex items-center justify-center"
                      >−</button>
                      <span className="w-6 text-center text-sm font-bold text-gray-700">{ps.er}</span>
                      <button
                        onClick={() => setPitcherStats(prev =>
                          prev.map((s, i) => i === idx ? { ...s, er: s.er + 1 } : s)
                        )}
                        className="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 font-bold text-sm active:bg-blue-200 flex items-center justify-center"
                      >＋</button>
                    </div>
                    <button
                      onClick={() => setPitcherStats(prev => prev.filter((_, i) => i !== idx))}
                      className="text-gray-300 text-lg leading-none active:text-red-400 flex-none"
                    >×</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <datalist id="pitcher-names-list">
          {roster.map(r => r.name).filter(Boolean).map(n => (
            <option key={n} value={n} />
          ))}
        </datalist>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t px-4 py-3">
        <button
          onClick={handleSubmit}
          disabled={sending}
          className={`w-full max-w-lg mx-auto block py-4 rounded-xl font-bold text-lg transition-colors disabled:opacity-60
            ${isSubmitted
              ? 'bg-green-600 text-white active:bg-green-700'
              : 'bg-blue-600 text-white active:bg-blue-700'
            }`}
        >
          {sending ? '送信中...' : isSubmitted ? '再送信（上書き）' : 'この回を送信'}
        </button>
      </div>

      {modal && (
        <CodeModal
          title={
            modal.tab === 'batter'
              ? `${modal.order}番 ${roster[modal.order - 1]?.name ?? ''} — 打撃結果`
              : `相手 ${modal.order}番 — 結果コード`
          }
          current={
            modal.tab === 'batter'
              ? normEntry(current.batterResults[String(modal.order)]).code
              : (current.pitcherResults[String(modal.order)]?.code ?? '')
          }
          onSelect={code => {
            if (modal.tab === 'batter') updateBatterCode(modal.order, code)
            else updatePitcherCode(modal.order, code)
          }}
          onClose={() => setModal(null)}
        />
      )}

      {runModal !== null && (
        <RunCodeModal
          current={normEntry(current.batterResults[String(runModal)]).runCode}
          onSelect={runCode => updateRunCode(runModal, runCode)}
          onClose={() => setRunModal(null)}
        />
      )}

      {pitcherModal !== null && (
        <PitcherModal
          pitcherNames={pitcherNames}
          current={current.pitcherResults[String(pitcherModal)]?.pitcher ?? lastPitcher}
          onSelect={name => {
            updatePitcherName(pitcherModal, name)
            if (name) setLastPitcher(name)
          }}
          onClose={() => setPitcherModal(null)}
        />
      )}

      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-sm px-5 py-2.5 rounded-full shadow-lg z-50 whitespace-nowrap">
          {toast}
        </div>
      )}
    </div>
  )
}
