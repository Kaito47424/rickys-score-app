import { Outlet, Link, useLocation } from 'react-router-dom'

export default function ViewLayout() {
  const { pathname } = useLocation()

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="w-full px-4 py-2.5 md:px-8 md:py-3 flex items-center gap-2 bg-blue-700 text-white">
        <span className="font-bold text-base md:text-lg">⚾ Rickys</span>
        <nav className="flex gap-1.5 md:gap-2 ml-auto">
          <Link
            to="/view/stats"
            className={`text-xs md:text-sm px-2 py-1.5 md:px-3 md:py-2 rounded-lg transition-colors
              ${pathname === '/view/stats' ? 'bg-blue-500 text-white' : 'text-blue-200 hover:text-white'}`}
          >
            個人成績
          </Link>
          <Link
            to="/view/games"
            className={`text-xs md:text-sm px-2 py-1.5 md:px-3 md:py-2 rounded-lg transition-colors
              ${pathname === '/view/games' ? 'bg-blue-500 text-white' : 'text-blue-200 hover:text-white'}`}
          >
            各試合
          </Link>
        </nav>
      </header>
      <main className="w-full px-4 md:px-8">
        <Outlet />
      </main>
    </div>
  )
}
