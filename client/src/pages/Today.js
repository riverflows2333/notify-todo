import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { api } from '../api';
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
    return (_jsxs("div", { children: [_jsx("h1", { className: "text-xl font-semibold mb-4", children: "\u4ECA\u65E5\u4EFB\u52A1" }), loading ? (_jsx("div", { children: "\u52A0\u8F7D\u4E2D\u2026" })) : (_jsxs("ul", { className: "space-y-2", children: [tasks.map(t => (_jsx("li", { className: "bg-white rounded border px-3 py-2", children: _jsxs("div", { className: "flex items-start justify-between", children: [_jsxs("div", { children: [_jsx("div", { className: "font-medium", children: t.title }), t.description && _jsx("div", { className: "text-sm text-gray-600", children: t.description })] }), _jsxs("div", { className: "text-xs text-gray-600 space-x-2", children: [_jsx("span", { className: "px-2 py-0.5 rounded bg-gray-100", children: t.status ?? 'todo' }), _jsx("span", { className: `px-2 py-0.5 rounded ${t.priority === 'high' ? 'bg-red-100 text-red-700' : t.priority === 'low' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`, children: t.priority ?? 'normal' }), t.due_date && (_jsxs("span", { className: new Date(t.due_date) < new Date(new Date().toDateString()) ? 'text-red-600' : '', children: ["\u622A\u6B62: ", new Date(t.due_date).toLocaleDateString()] }))] })] }) }, t.id))), tasks.length === 0 && _jsx("div", { className: "text-gray-500", children: "\u6682\u65E0\u4ECA\u65E5\u4EFB\u52A1" })] }))] }));
}
