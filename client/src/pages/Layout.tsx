import { Link as RouterLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../store'
import { AppBar, Toolbar, Typography, Button, Container, Box, Link, Stack } from '@mui/material'

export default function Layout() {
  const { token, setToken } = useAuth()
  const nav = useNavigate()
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
