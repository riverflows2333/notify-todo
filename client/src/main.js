import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import './index.css';
const LoginPage = lazy(() => import('./pages/Login').then(m => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import('./pages/Register').then(m => ({ default: m.RegisterPage })));
const TodayPage = lazy(() => import('./pages/Today').then(m => ({ default: m.TodayPage })));
const ProjectsPage = lazy(() => import('./pages/Projects').then(m => ({ default: m.ProjectsPage })));
import Layout from './pages/Layout';
import { ThemeProvider, createTheme, CssBaseline, Box, CircularProgress } from '@mui/material';
const Fallback = (_jsx(Box, { sx: { display: 'flex', alignItems: 'center', justifyContent: 'center', py: 8 }, children: _jsx(CircularProgress, {}) }));
const router = createBrowserRouter([
    {
        path: '/',
        element: _jsx(Layout, {}),
        children: [
            { index: true, element: _jsx(Suspense, { fallback: Fallback, children: _jsx(TodayPage, {}) }) },
            { path: 'projects', element: _jsx(Suspense, { fallback: Fallback, children: _jsx(ProjectsPage, {}) }) },
            { path: 'login', element: _jsx(Suspense, { fallback: Fallback, children: _jsx(LoginPage, {}) }) },
            { path: 'register', element: _jsx(Suspense, { fallback: Fallback, children: _jsx(RegisterPage, {}) }) },
        ],
    },
]);
const theme = createTheme({
    palette: { mode: 'light' },
});
createRoot(document.getElementById('root')).render(_jsx(React.StrictMode, { children: _jsxs(ThemeProvider, { theme: theme, children: [_jsx(CssBaseline, {}), _jsx(RouterProvider, { router: router })] }) }));
