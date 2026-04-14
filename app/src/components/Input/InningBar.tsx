type Props = {
  current: number
  submitted: Set<string>
  round: 1 | 2
  onChange: (inning: number) => void
}

export default function InningBar({ current, submitted, round, onChange }: Props) {
  return (
    <div className="flex gap-1.5 overflow-x-auto px-3 py-2 bg-white border-b no-scrollbar">
      {Array.from({ length: 11 }, (_, i) => i + 1).map(inn => {
        const key = `${inn}-${round}`
        const done = submitted.has(key)
        const active = inn === current
        return (
          <button
            key={inn}
            onClick={() => onChange(inn)}
            className={`flex-none w-10 h-10 rounded-lg text-sm font-bold relative
              ${active
                ? 'bg-blue-600 text-white shadow'
                : done
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-500'
              }`}
          >
            {inn}
            {done && !active && (
              <span className="absolute -top-1 -right-1 text-[10px] bg-green-500 text-white rounded-full w-4 h-4 flex items-center justify-center">
                ✓
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
