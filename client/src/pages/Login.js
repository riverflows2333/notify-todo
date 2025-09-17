import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { api } from '../api';
import { useAuth } from '../store';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { Paper, TextField, Button, Stack, Typography, Alert, Link, Box } from '@mui/material';
export function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const { setToken } = useAuth();
    const nav = useNavigate();
    async function onSubmit(e) {
        e.preventDefault();
        setError(null);
        const form = new URLSearchParams();
        form.set('username', email);
        form.set('password', password);
        try {
            const { data } = await api.post('/auth/login', form, {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            });
            setToken(data.access_token);
            nav('/');
        }
        catch (err) {
            setError(err?.response?.data?.detail ?? '登录失败');
        }
    }
    return (_jsxs(Box, { maxWidth: 380, mx: "auto", children: [_jsx(Typography, { variant: "h5", fontWeight: 600, mb: 2, children: "\u767B\u5F55" }), error && _jsx(Alert, { severity: "error", sx: { mb: 2 }, children: error }), _jsx(Paper, { variant: "outlined", sx: { p: 2 }, children: _jsx("form", { onSubmit: onSubmit, children: _jsxs(Stack, { spacing: 2, children: [_jsx(TextField, { label: "Email", fullWidth: true, value: email, onChange: e => setEmail(e.target.value) }), _jsx(TextField, { label: "Password", type: "password", fullWidth: true, value: password, onChange: e => setPassword(e.target.value) }), _jsx(Button, { type: "submit", variant: "contained", fullWidth: true, children: "\u767B\u5F55" })] }) }) }), _jsxs(Typography, { variant: "body2", sx: { mt: 2 }, children: ["\u6CA1\u6709\u8D26\u53F7\uFF1F", _jsx(Link, { component: RouterLink, to: "/register", children: "\u53BB\u6CE8\u518C" })] })] }));
}
