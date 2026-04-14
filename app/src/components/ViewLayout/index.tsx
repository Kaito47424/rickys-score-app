import { Outlet, Link, useLocation } from 'react-router-dom'

export default function ViewLayout() {
  const { pathname } = useLocation()

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-blue-700 text-white px-4 py-3 flex items-center gap-4">
        <span className="font-bold text-lg">⚾ Rickys 成績閲覧</span>
        <nav className="flex gap-4 ml-2">
          <Link
            to="/view/stats"
            className={`text-sm px-2 py-1 rounded transition-colors
              ${pathname === '/view/stats' ? 'bg-blue-500 text-white' : 'text-blue-200 hover:text-white'}`}
          >
            個人成績
          </Link>
        </nav>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  )
}
