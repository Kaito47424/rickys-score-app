const RUN_CODES = ['盗塁失敗', '走塁死', '牽制死'] as const

type Props = {
  current: string | null
  onSelect: (code: string | null) => void
  onClose: () => void
}

export default function RunCodeModal({ current, onSelect, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl shadow-2xl">
        <div className="flex justify-center pt-2 pb-1 flex-none">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>
        <div className="flex items-center justify-between px-4 pb-3 border-b flex-none">
          <p className="font-bold text-gray-800">走塁結果</p>
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm bg-gray-100 text-gray-600 rounded-lg active:bg-gray-200"
          >閉じる</button>
        </div>
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            {RUN_CODES.map(code => (
              <button
                key={code}
                onClick={() => { onSelect(code); onClose() }}
                className={`py-5 rounded-xl text-sm font-bold text-center active:scale-95 transition-transform
                  ${current === code
                    ? 'bg-red-500 text-white ring-2 ring-red-300 shadow-md'
                    : 'bg-gray-100 text-gray-700 active:bg-gray-200'
                  }`}
              >
                {code}
              </button>
            ))}
          </div>
          {current && (
            <button
              onClick={() => { onSelect(null); onClose() }}
              className="w-full py-3 rounded-xl text-sm font-bold text-gray-500 bg-gray-100 active:bg-gray-200"
            >
              クリア
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
