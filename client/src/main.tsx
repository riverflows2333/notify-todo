import React, { Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider, Navigate, Outlet } from 'react-router-dom'
import './index.css'
const LoginPage = lazy(() => import('./pages/Login').then(m => ({ default: m.LoginPage })))
const RegisterPage = lazy(() => import('./pages/Register').then(m => ({ default: m.RegisterPage })))
const TodayPage = lazy(() => import('./pages/Today').then(m => ({ default: m.TodayPage })))
const ProjectsPage = lazy(() => import('./pages/Projects').then(m => ({ default: m.ProjectsPage })))
import Layout from './pages/Layout'
import { ThemeProvider, createTheme, CssBaseline, Box, CircularProgress } from '@mui/material'
import { useAuth } from './store'

const Fallback = (
  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 8 }}>
    <CircularProgress />
  </Box>
)

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <AuthGuard><Suspense fallback={Fallback}><TodayPage /></Suspense></AuthGuard> },
      { path: 'projects', element: <AuthGuard><Suspense fallback={Fallback}><ProjectsPage /></Suspense></AuthGuard> },
      { path: 'login', element: <Suspense fallback={Fallback}><LoginPage /></Suspense> },
      { path: 'register', element: <Suspense fallback={Fallback}><RegisterPage /></Suspense> },
    ],
  },
])

const theme = createTheme({
  palette: { mode: 'light' },
})

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <RouterProvider router={router} />
    </ThemeProvider>
  </React.StrictMode>
)

// 受保护路由：无 token 则重定向到 /login
function AuthGuard({ children }: { children: React.ReactNode }) {
  const { token } = useAuth()
  if (!token) return <Navigate to="/login" replace />
  return <>{children}</>
}
