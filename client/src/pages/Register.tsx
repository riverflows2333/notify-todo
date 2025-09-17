import { FormEvent, useState } from 'react'
import { api } from '../api'
import { Link, useNavigate } from 'react-router-dom'

export function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const nav = useNavigate()

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await api.post('/auth/register', { email, password })
      nav('/login')
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? '注册失败')
    }
  }

  return (
    <div className="max-w-sm mx-auto">
      <h1 className="text-xl font-semibold mb-4">注册</h1>
      {error && <div className="mb-3 text-red-600 text-sm">{error}</div>}
      <form onSubmit={onSubmit} className="space-y-3">
        <input className="w-full border px-3 py-2 rounded" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input className="w-full border px-3 py-2 rounded" type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} />
        <button className="w-full bg-blue-600 text-white rounded py-2">注册</button>
      </form>
      <div className="mt-3 text-sm">已有账号？<Link className="text-blue-600" to="/login">去登录</Link></div>
    </div>
  )
}
