import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import './index.css';
const LoginPage = lazy(() => import('./pages/Login').then(m => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import('./pages/Register').then(m => ({ default: m.RegisterPage })));
const TodayPage = lazy(() => import('./pages/Today').then(m => ({ default: m.TodayPage })));
const ProjectsPage = lazy(() => import('./pages/Projects').then(m => ({ default: m.ProjectsPage })));
import Layout from './pages/Layout';
import { ThemeProvider, createTheme, CssBaseline, Box, CircularProgress } from '@mui/material';
import { useAuth } from './store';
const Fallback = (_jsx(Box, { sx: { display: 'flex', alignItems: 'center', justifyContent: 'center', py: 8 }, children: _jsx(CircularProgress, {}) }));
const router = createBrowserRouter([
    {
        path: '/',
        element: _jsx(Layout, {}),
        children: [
            { index: true, element: _jsx(AuthGuard, { children: _jsx(Suspense, { fallback: Fallback, children: _jsx(TodayPage, {}) }) }) },
            { path: 'projects', element: _jsx(AuthGuard, { children: _jsx(Suspense, { fallback: Fallback, children: _jsx(ProjectsPage, {}) }) }) },
            { path: 'login', element: _jsx(Suspense, { fallback: Fallback, children: _jsx(LoginPage, {}) }) },
            { path: 'register', element: _jsx(Suspense, { fallback: Fallback, children: _jsx(RegisterPage, {}) }) },
        ],
    },
]);
const theme = createTheme({
    palette: { mode: 'light' },
});
createRoot(document.getElementById('root')).render(_jsx(React.StrictMode, { children: _jsxs(ThemeProvider, { theme: theme, children: [_jsx(CssBaseline, {}), _jsx(RouterProvider, { router: router })] }) }));
// 受保护路由：无 token 则重定向到 /login
function AuthGuard({ children }) {
    const { token } = useAuth();
    if (!token)
        return _jsx(Navigate, { to: "/login", replace: true });
    return _jsx(_Fragment, { children: children });
}
