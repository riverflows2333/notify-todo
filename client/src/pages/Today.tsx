import { useEffect, useState } from 'react'
import { api, Priority, Status } from '../api'

type Task = {
  id: number
  title: string
  description?: string | null
  status?: Status | null
  priority?: Priority | null
  is_today?: boolean
  due_date?: string | null
}

export function TodayPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  async function fetchToday() {
    setLoading(true)
    try {
      const { data } = await api.get('/projects/today')
      setTasks(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchToday() }, [])

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">今日任务</h1>
      {loading ? (
        <div>加载中…</div>
      ) : (
        <ul className="space-y-2">
          {tasks.map(t => (
            <li key={t.id} className="bg-white rounded border px-3 py-2">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-medium">{t.title}</div>
                  {t.description && <div className="text-sm text-gray-600">{t.description}</div>}
                </div>
                <div className="text-xs text-gray-600 space-x-2">
                  <span className="px-2 py-0.5 rounded bg-gray-100">{t.status ?? 'todo'}</span>
                  <span className={`px-2 py-0.5 rounded ${t.priority==='high'?'bg-red-100 text-red-700':t.priority==='low'?'bg-green-100 text-green-700':'bg-gray-100 text-gray-700'}`}>{t.priority ?? 'normal'}</span>
                  {t.due_date && (
                    <span className={new Date(t.due_date) < new Date(new Date().toDateString()) ? 'text-red-600' : ''}>
                      截止: {new Date(t.due_date).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            </li>
          ))}
          {tasks.length === 0 && <div className="text-gray-500">暂无今日任务</div>}
        </ul>
      )}
    </div>
  )
}
