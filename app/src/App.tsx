import { Routes, Route, Navigate } from 'react-router-dom'
import InputApp from './InputApp'
import ViewLayout from './components/ViewLayout'
import StatsPage from './components/Stats'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<InputApp />} />
      <Route path="/view" element={<ViewLayout />}>
        <Route index element={<Navigate to="/view/stats" replace />} />
        <Route path="stats" element={<StatsPage />} />
        <Route path="game/:gameId" element={<ComingSoon label="試合サマリ" />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function ComingSoon({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-32 text-gray-400">
      <div className="text-4xl mb-4">⚾</div>
      <p className="font-medium">{label}（準備中）</p>
    </div>
  )
}
