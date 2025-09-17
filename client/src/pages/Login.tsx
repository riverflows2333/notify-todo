import { FormEvent, useState } from 'react'
import { api } from '../api'
import { useAuth } from '../store'
import { useNavigate, Link as RouterLink } from 'react-router-dom'
import { Paper, TextField, Button, Stack, Typography, Alert, Link, Box } from '@mui/material'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const { setToken } = useAuth()
  const nav = useNavigate()

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const form = new URLSearchParams()
    form.set('username', email)
    form.set('password', password)
    try {
      const { data } = await api.post('/auth/login', form, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })
      setToken(data.access_token)
      nav('/')
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? '登录失败')
    }
  }

  return (
    <Box maxWidth={380} mx="auto">
      <Typography variant="h5" fontWeight={600} mb={2}>登录</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Paper variant="outlined" sx={{ p: 2 }}>
        <form onSubmit={onSubmit}>
          <Stack spacing={2}>
            <TextField label="Email" fullWidth value={email} onChange={e=>setEmail(e.target.value)} />
            <TextField label="Password" type="password" fullWidth value={password} onChange={e=>setPassword(e.target.value)} />
            <Button type="submit" variant="contained" fullWidth>登录</Button>
          </Stack>
        </form>
      </Paper>
      <Typography variant="body2" sx={{ mt: 2 }}>
        没有账号？<Link component={RouterLink} to="/register">去注册</Link>
      </Typography>
    </Box>
  )
}
