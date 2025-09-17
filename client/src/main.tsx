import React from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './index.css'
import { LoginPage } from './pages/Login'
import { RegisterPage } from './pages/Register'
import { TodayPage } from './pages/Today'
import { ProjectsPage } from './pages/Projects'
import Layout from './pages/Layout'

const router = createBrowserRouter([
  {
    path: '/',
  element: <Layout />,
    children: [
      { index: true, element: <TodayPage /> },
      { path: 'projects', element: <ProjectsPage /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'register', element: <RegisterPage /> },
    ],
  },
])

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
)
