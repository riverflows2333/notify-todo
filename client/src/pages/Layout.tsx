import { Link, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../store'

export default function Layout() {
  const { token, setToken } = useAuth()
  const nav = useNavigate()
  return (
    <div className="min-h-screen">
      <header className="border-b bg-white">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center gap-4">
          <Link to="/" className="font-semibold">Todolist</Link>
          <nav className="flex-1">
            <Link className="mr-4" to="/">Today</Link>
            <Link className="mr-4" to="/projects">Projects</Link>
          </nav>
          {token ? (
            <button className="text-sm text-gray-600" onClick={() => { setToken(null); nav('/login') }}>退出</button>
          ) : (
            <div className="text-sm">
              <Link className="mr-3" to="/login">登录</Link>
              <Link to="/register">注册</Link>
            </div>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
