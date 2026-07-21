import { Routes, Route, Navigate } from 'react-router-dom'
import InputApp from './InputApp'
import ViewLayout from './components/ViewLayout'
import StatsPage from './components/Stats'
import GamesPage from './components/Games'
import GameSummary from './components/GameSummary'
import RankingPage from './components/Ranking'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<InputApp />} />
      <Route path="/view" element={<ViewLayout />}>
        <Route index element={<Navigate to="/view/stats" replace />} />
        <Route path="stats" element={<StatsPage />} />
        <Route path="ranking" element={<RankingPage />} />
        <Route path="games" element={<GamesPage />} />
        <Route path="game/:gameId" element={<GameSummary />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
