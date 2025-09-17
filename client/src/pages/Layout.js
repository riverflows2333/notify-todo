import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link as RouterLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../store';
import { AppBar, Toolbar, Typography, Button, Container, Box, Link, Stack } from '@mui/material';
export default function Layout() {
    const { token, setToken } = useAuth();
    const nav = useNavigate();
    return (_jsxs(Box, { minHeight: "100vh", display: "flex", flexDirection: "column", children: [_jsx(AppBar, { position: "static", color: "default", elevation: 1, children: _jsxs(Toolbar, { children: [_jsx(Typography, { variant: "h6", sx: { mr: 2 }, children: "Todolist" }), _jsxs(Stack, { direction: "row", spacing: 2, sx: { flex: 1 }, children: [_jsx(Link, { component: RouterLink, to: "/", underline: "none", color: "inherit", children: "Today" }), _jsx(Link, { component: RouterLink, to: "/projects", underline: "none", color: "inherit", children: "Projects" })] }), token ? (_jsx(Button, { size: "small", onClick: () => { setToken(null); nav('/login'); }, children: "\u9000\u51FA" })) : (_jsxs(Stack, { direction: "row", spacing: 1, children: [_jsx(Button, { size: "small", component: RouterLink, to: "/login", children: "\u767B\u5F55" }), _jsx(Button, { size: "small", component: RouterLink, to: "/register", children: "\u6CE8\u518C" })] }))] }) }), _jsx(Container, { maxWidth: "lg", sx: { py: 3, flex: 1 }, children: _jsx(Outlet, {}) })] }));
}
