import { Link as RouterLink, Outlet, useNavigate } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import { useAuth } from '../store'
import { AppBar, Toolbar, Typography, Button, Container, Box, Link, Stack } from '@mui/material'
import { wsUrl } from '../api'

export default function Layout() {
  const { token, setToken } = useAuth()
  const nav = useNavigate()
  const wsRef = useRef<WebSocket | null>(null)
  const pingRef = useRef<number | null>(null)

  useEffect(() => {
    // Cleanup when token changes or component unmounts
    const cleanup = () => {
      if (pingRef.current) {
        window.clearInterval(pingRef.current)
        pingRef.current = null
      }
      if (wsRef.current) {
        try { wsRef.current.close() } catch {}
        wsRef.current = null
      }
    }

    if (!token) { cleanup(); return }

    // Request Notification permission (non-blocking)
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {})
    }

    // Connect WS with token in query string
    const url = `${wsUrl()}?token=${encodeURIComponent(token)}`
    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      // keepalive ping
      pingRef.current = window.setInterval(() => {
        try { ws.send('ping') } catch {}
      }, 30000)
    }
    ws.onmessage = (ev) => {
      const text = typeof ev.data === 'string' ? ev.data : ''
      // ignore keepalive pong
      if (text === 'pong') return
      let title = '任务提醒'
      let body = text
      try {
        const obj = JSON.parse(text)
        if (obj?.title) title = String(obj.title)
        if (obj?.message) body = String(obj.message)
        else if (obj?.text) body = String(obj.text)
        else if (obj?.data?.title) body = String(obj.data.title)
        else body = JSON.stringify(obj)
      } catch {
        // plain text
      }
      // Show browser notification if permitted
      if ('Notification' in window && Notification.permission === 'granted') {
        try { new Notification(title, { body }) } catch {}
      }
      // Fallback: console log
      // eslint-disable-next-line no-console
      console.log('[WS]', text)
    }
    ws.onclose = () => { cleanup() }
    ws.onerror = () => { /* ignore */ }

    return cleanup
  }, [token])
  return (
    <Box minHeight="100vh" display="flex" flexDirection="column">
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar>
          <Typography variant="h6" sx={{ mr: 2 }}>Todolist</Typography>
          <Stack direction="row" spacing={2} sx={{ flex: 1 }}>
            <Link component={RouterLink} to="/" underline="none" color="inherit">Today</Link>
            <Link component={RouterLink} to="/projects" underline="none" color="inherit">Projects</Link>
          </Stack>
          {token ? (
            <Button size="small" onClick={() => { setToken(null); nav('/login') }}>退出</Button>
          ) : (
            <Stack direction="row" spacing={1}>
              <Button size="small" component={RouterLink} to="/login">登录</Button>
              <Button size="small" component={RouterLink} to="/register">注册</Button>
            </Stack>
          )}
        </Toolbar>
      </AppBar>
      <Container maxWidth="lg" sx={{ py: 3, flex: 1 }}>
        <Outlet />
      </Container>
    </Box>
  )
}
