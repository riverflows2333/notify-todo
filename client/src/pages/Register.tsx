import { FormEvent, useState } from 'react'
import { api } from '../api'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { Paper, TextField, Button, Stack, Typography, Alert, Link, Box } from '@mui/material'

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
    <Box maxWidth={380} mx="auto">
      <Typography variant="h5" fontWeight={600} mb={2}>注册</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Paper variant="outlined" sx={{ p: 2 }}>
        <form onSubmit={onSubmit}>
          <Stack spacing={2}>
            <TextField label="Email" fullWidth value={email} onChange={e=>setEmail(e.target.value)} />
            <TextField label="Password" type="password" fullWidth value={password} onChange={e=>setPassword(e.target.value)} />
            <Button type="submit" variant="contained" fullWidth>注册</Button>
          </Stack>
        </form>
      </Paper>
      <Typography variant="body2" sx={{ mt: 2 }}>
        已有账号？<Link component={RouterLink} to="/login">去登录</Link>
      </Typography>
    </Box>
  )
}
