import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { api } from '../api';
import { Typography, Card, CardContent, Chip, Stack, Box } from '@mui/material';
export function TodayPage() {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    async function fetchToday() {
        setLoading(true);
        try {
            const { data } = await api.get('/projects/today');
            setTasks(data);
        }
        finally {
            setLoading(false);
        }
    }
    useEffect(() => { fetchToday(); }, []);
    return (_jsxs(Box, { children: [_jsx(Typography, { variant: "h5", fontWeight: 600, mb: 2, children: "\u4ECA\u65E5\u4EFB\u52A1" }), loading ? (_jsx(Typography, { color: "text.secondary", children: "\u52A0\u8F7D\u4E2D\u2026" })) : (_jsxs(Stack, { spacing: 1.5, children: [tasks.map(t => (_jsx(Card, { variant: "outlined", children: _jsx(CardContent, { children: _jsxs(Stack, { direction: "row", justifyContent: "space-between", alignItems: "flex-start", children: [_jsxs(Box, { children: [_jsx(Typography, { variant: "subtitle1", fontWeight: 600, children: t.title }), t.description && (_jsx(Typography, { variant: "body2", color: "text.secondary", children: t.description }))] }), _jsxs(Stack, { direction: "row", spacing: 1, alignItems: "center", children: [_jsx(Chip, { size: "small", label: t.status ?? 'todo' }), _jsx(Chip, { size: "small", color: t.priority === 'high' ? 'error' : t.priority === 'low' ? 'success' : 'default', label: t.priority ?? 'normal' }), t.due_date && (_jsxs(Typography, { variant: "caption", color: new Date(t.due_date) < new Date(new Date().toDateString()) ? 'error' : 'text.secondary', children: ["\u622A\u6B62: ", new Date(t.due_date).toLocaleDateString()] }))] })] }) }) }, t.id))), tasks.length === 0 && _jsx(Typography, { color: "text.secondary", children: "\u6682\u65E0\u4ECA\u65E5\u4EFB\u52A1" })] }))] }));
}
