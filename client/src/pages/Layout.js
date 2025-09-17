import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link as RouterLink, Outlet, useNavigate } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { useAuth } from '../store';
import { AppBar, Toolbar, Typography, Button, Container, Box, Link, Stack } from '@mui/material';
import { wsUrl } from '../api';
export default function Layout() {
    const { token, setToken } = useAuth();
    const nav = useNavigate();
    const wsRef = useRef(null);
    const pingRef = useRef(null);
    useEffect(() => {
        // Cleanup when token changes or component unmounts
        const cleanup = () => {
            if (pingRef.current) {
                window.clearInterval(pingRef.current);
                pingRef.current = null;
            }
            if (wsRef.current) {
                try {
                    wsRef.current.close();
                }
                catch { }
                wsRef.current = null;
            }
        };
        if (!token) {
            cleanup();
            return;
        }
        // Request Notification permission (non-blocking)
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission().catch(() => { });
        }
        // Connect WS with token in query string
        const url = `${wsUrl()}?token=${encodeURIComponent(token)}`;
        const ws = new WebSocket(url);
        wsRef.current = ws;
        ws.onopen = () => {
            // keepalive ping
            pingRef.current = window.setInterval(() => {
                try {
                    ws.send('ping');
                }
                catch { }
            }, 30000);
        };
        ws.onmessage = (ev) => {
            const text = typeof ev.data === 'string' ? ev.data : '';
            // ignore keepalive pong for notifications, but keep a debug log
            if (text === 'pong') {
                // eslint-disable-next-line no-console
                console.debug('[WS] pong');
                return;
            }
            let title = '任务提醒';
            let body = text;
            try {
                const obj = JSON.parse(text);
                if (obj?.title)
                    title = String(obj.title);
                if (obj?.message)
                    body = String(obj.message);
                else if (obj?.text)
                    body = String(obj.text);
                else if (obj?.data?.title)
                    body = String(obj.data.title);
                else
                    body = JSON.stringify(obj);
            }
            catch {
                // plain text
            }
            // Show browser notification if permitted
            if ('Notification' in window && Notification.permission === 'granted') {
                try {
                    new Notification(title, { body });
                }
                catch { }
            }
            // Fallback: console log
            // eslint-disable-next-line no-console
            console.log('[WS]', text);
        };
        ws.onclose = () => { cleanup(); };
        ws.onerror = () => { };
        return cleanup;
    }, [token]);
    return (_jsxs(Box, { minHeight: "100vh", display: "flex", flexDirection: "column", children: [_jsx(AppBar, { position: "static", color: "default", elevation: 1, children: _jsxs(Toolbar, { children: [_jsx(Typography, { variant: "h6", sx: { mr: 2 }, children: "Todolist" }), _jsxs(Stack, { direction: "row", spacing: 2, sx: { flex: 1 }, children: [_jsx(Link, { component: RouterLink, to: "/", underline: "none", color: "inherit", children: "Today" }), _jsx(Link, { component: RouterLink, to: "/projects", underline: "none", color: "inherit", children: "Projects" })] }), token ? (_jsx(Button, { size: "small", onClick: () => { setToken(null); nav('/login'); }, children: "\u9000\u51FA" })) : (_jsxs(Stack, { direction: "row", spacing: 1, children: [_jsx(Button, { size: "small", component: RouterLink, to: "/login", children: "\u767B\u5F55" }), _jsx(Button, { size: "small", component: RouterLink, to: "/register", children: "\u6CE8\u518C" })] }))] }) }), _jsx(Container, { maxWidth: "lg", sx: { py: 3, flex: 1 }, children: _jsx(Outlet, {}) })] }));
}
