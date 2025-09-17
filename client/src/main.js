import { jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import './index.css';
import { LoginPage } from './pages/Login';
import { RegisterPage } from './pages/Register';
import { TodayPage } from './pages/Today';
import { ProjectsPage } from './pages/Projects';
import Layout from './pages/Layout';
const router = createBrowserRouter([
    {
        path: '/',
        element: _jsx(Layout, {}),
        children: [
            { index: true, element: _jsx(TodayPage, {}) },
            { path: 'projects', element: _jsx(ProjectsPage, {}) },
            { path: 'login', element: _jsx(LoginPage, {}) },
            { path: 'register', element: _jsx(RegisterPage, {}) },
        ],
    },
]);
createRoot(document.getElementById('root')).render(_jsx(React.StrictMode, { children: _jsx(RouterProvider, { router: router }) }));
