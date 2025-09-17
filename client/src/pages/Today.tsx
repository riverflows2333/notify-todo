import { useEffect, useState } from 'react'
import { api, Priority, Status } from '../api'
import { Typography, Card, CardContent, Chip, Stack, Box } from '@mui/material'

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
    <Box>
      <Typography variant="h5" fontWeight={600} mb={2}>今日任务</Typography>
      {loading ? (
        <Typography color="text.secondary">加载中…</Typography>
      ) : (
        <Stack spacing={1.5}>
          {tasks.map(t => (
            <Card key={t.id} variant="outlined">
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Box>
                    <Typography variant="subtitle1" fontWeight={600}>{t.title}</Typography>
                    {t.description && (
                      <Typography variant="body2" color="text.secondary">{t.description}</Typography>
                    )}
                  </Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip size="small" label={t.status ?? 'todo'} />
                    <Chip size="small" color={t.priority==='high'?'error':t.priority==='low'?'success':'default'} label={t.priority ?? 'normal'} />
                    {t.due_date && (
                      <Typography variant="caption" color={new Date(t.due_date) < new Date(new Date().toDateString()) ? 'error' : 'text.secondary'}>
                        截止: {new Date(t.due_date).toLocaleDateString()}
                      </Typography>
                    )}
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          ))}
          {tasks.length === 0 && <Typography color="text.secondary">暂无今日任务</Typography>}
        </Stack>
      )}
    </Box>
  )
}
