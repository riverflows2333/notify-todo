import React, { Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './index.css'
const LoginPage = lazy(() => import('./pages/Login').then(m => ({ default: m.LoginPage })))
const RegisterPage = lazy(() => import('./pages/Register').then(m => ({ default: m.RegisterPage })))
const TodayPage = lazy(() => import('./pages/Today').then(m => ({ default: m.TodayPage })))
const ProjectsPage = lazy(() => import('./pages/Projects').then(m => ({ default: m.ProjectsPage })))
import Layout from './pages/Layout'
import { ThemeProvider, createTheme, CssBaseline, Box, CircularProgress } from '@mui/material'

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
      { index: true, element: <Suspense fallback={Fallback}><TodayPage /></Suspense> },
      { path: 'projects', element: <Suspense fallback={Fallback}><ProjectsPage /></Suspense> },
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
