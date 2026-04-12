import { Outlet, NavLink } from 'react-router-dom'

export function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-brand-dark border-b border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <NavLink to="/" className="flex items-center gap-2">
            <span className="text-2xl font-black text-brand-yellow tracking-tight">McDollars</span>
            <span className="text-xs text-gray-500 font-medium mt-1">edu</span>
          </NavLink>
          <nav className="flex items-center gap-1">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-brand-yellow text-brand-dark' : 'text-gray-400 hover:text-white'
                }`
              }
            >
              Dashboard
            </NavLink>
            <NavLink
              to="/menu"
              className={({ isActive }) =>
                `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-brand-yellow text-brand-dark' : 'text-gray-400 hover:text-white'
                }`
              }
            >
              Menu
            </NavLink>
            <NavLink
              to="/orders"
              className={({ isActive }) =>
                `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-brand-yellow text-brand-dark' : 'text-gray-400 hover:text-white'
                }`
              }
            >
              Orders
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
