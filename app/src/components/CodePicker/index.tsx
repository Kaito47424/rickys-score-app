import { useState } from 'react'
import { RESULT_CODES } from '../../constants/codes'

type Props = {
  title: string
  current: string
  onSelect: (code: string) => void
  onClose: () => void
}

export default function CodeModal({ title, current, onSelect, onClose }: Props) {
  const categories = Object.keys(RESULT_CODES)
  const [cat, setCat] = useState(
    () => categories.find(c => RESULT_CODES[c].includes(current)) ?? categories[0]
  )

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl max-h-[80vh] flex flex-col shadow-2xl">
        <div className="flex justify-center pt-2 pb-1 flex-none">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>
        <div className="flex items-center justify-between px-4 pb-3 border-b flex-none">
          <p className="font-bold text-gray-800 text-sm flex-1 mr-2 truncate">{title}</p>
          <div className="flex gap-2 flex-none">
            {current && (
              <button
                onClick={() => { onSelect(''); onClose() }}
                className="px-3 py-1.5 text-sm bg-red-100 text-red-600 rounded-lg font-medium active:bg-red-200"
              >
                クリア
              </button>
            )}
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-sm bg-gray-100 text-gray-600 rounded-lg font-medium active:bg-gray-200"
            >
              閉じる
            </button>
          </div>
        </div>
        <div className="flex gap-1.5 overflow-x-auto px-3 py-2 border-b flex-none no-scrollbar">
          {categories.map(c => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`flex-none px-3 py-1.5 rounded-full text-sm font-medium transition-colors
                ${cat === c
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 active:bg-gray-200'
                }`}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <div className="grid grid-cols-3 gap-2">
            {RESULT_CODES[cat].map(code => (
              <button
                key={code}
                onClick={() => { onSelect(code); onClose() }}
                className={`py-4 rounded-xl text-sm font-bold active:scale-95 transition-transform
                  ${current === code
                    ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-400'
                    : 'bg-gray-100 text-gray-700 active:bg-gray-200'
                  }`}
              >
                {code}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
