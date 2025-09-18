import { useEffect, useState } from 'react'
import { Box, Button, Paper, Stack, TextField, Typography, Alert } from '@mui/material'
import { getBlinkoSetting, setBlinkoSetting } from '../api'

export default function Settings() {
  const [baseUrl, setBaseUrl] = useState('')
  const [token, setToken] = useState('')
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    getBlinkoSetting().then((data) => {
      if (!mounted) return
      if (data) {
        setBaseUrl(data.base_url || '')
        setToken(data.token || '')
      }
      setLoading(false)
    }).catch((e) => { setError(String(e)); setLoading(false) })
    return () => { mounted = false }
  }, [])

  const onSave = async () => {
    setSaved(null); setError(null)
    try {
      await setBlinkoSetting(baseUrl, token)
      setSaved('已保存 Blinko 设置')
    } catch (e: any) {
      setError(e?.response?.data?.detail || String(e))
    }
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>设置</Typography>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>Blinko 设置</Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          请输入 Blinko 服务地址与访问 Token（无需包含 Bearer 前缀）。
        </Typography>
        <Stack spacing={2} maxWidth={600}>
          <TextField label="Blinko Base URL" placeholder="https://blinko.example.com" value={baseUrl} onChange={e => setBaseUrl(e.target.value)} fullWidth />
          <TextField label="Blinko Token" type="password" value={token} onChange={e => setToken(e.target.value)} fullWidth />
          <Stack direction="row" spacing={2} alignItems="center">
            <Button variant="contained" onClick={onSave} disabled={loading}>保存</Button>
            {saved && <Alert severity="success">{saved}</Alert>}
            {error && <Alert severity="error">{error}</Alert>}
          </Stack>
        </Stack>
      </Paper>
    </Box>
  )
}
