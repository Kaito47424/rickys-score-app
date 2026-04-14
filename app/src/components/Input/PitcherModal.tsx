import { useState, useRef, useEffect } from 'react'

type Props = {
  pitcherNames: string[]
  current: string
  onSelect: (name: string) => void
  onClose: () => void
}

export default function PitcherModal({ pitcherNames, current, onSelect, onClose }: Props) {
  const [text, setText] = useState(current)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSelect = (name: string) => {
    onSelect(name)
    onClose()
  }

  const handleTextConfirm = () => {
    onSelect(text.trim())
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl max-h-[75vh] flex flex-col shadow-2xl">
        <div className="flex justify-center pt-2 pb-1 flex-none">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>
        <div className="flex items-center justify-between px-4 pb-3 border-b flex-none">
          <p className="font-bold text-gray-800">登板投手を選択</p>
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm bg-gray-100 text-gray-600 rounded-lg active:bg-gray-200"
          >
            閉じる
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase mb-2">直接入力</p>
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleTextConfirm()}
                placeholder="投手名を入力"
                className="flex-1 border rounded-xl px-3 py-3 text-base"
              />
              <button
                onClick={handleTextConfirm}
                disabled={!text.trim()}
                className="px-4 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm disabled:opacity-40 active:bg-blue-700"
              >
                確定
              </button>
            </div>
          </div>
          {pitcherNames.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase mb-2">オーダーから選択</p>
              <div className="grid grid-cols-2 gap-2">
                {pitcherNames.map(name => (
                  <button
                    key={name}
                    onClick={() => handleSelect(name)}
                    className={`py-4 rounded-xl text-sm font-bold text-center active:scale-95 transition-transform
                      ${current === name
                        ? 'bg-blue-600 text-white ring-2 ring-blue-400 shadow-md'
                        : 'bg-gray-100 text-gray-700 active:bg-gray-200'
                      }`}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
