import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { api } from '../api';
import { useAuth } from '../store';
import { useNavigate, Link } from 'react-router-dom';
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
    return (_jsxs("div", { className: "max-w-sm mx-auto", children: [_jsx("h1", { className: "text-xl font-semibold mb-4", children: "\u767B\u5F55" }), error && _jsx("div", { className: "mb-3 text-red-600 text-sm", children: error }), _jsxs("form", { onSubmit: onSubmit, className: "space-y-3", children: [_jsx("input", { className: "w-full border px-3 py-2 rounded", placeholder: "Email", value: email, onChange: e => setEmail(e.target.value) }), _jsx("input", { className: "w-full border px-3 py-2 rounded", type: "password", placeholder: "Password", value: password, onChange: e => setPassword(e.target.value) }), _jsx("button", { className: "w-full bg-blue-600 text-white rounded py-2", children: "\u767B\u5F55" })] }), _jsxs("div", { className: "mt-3 text-sm", children: ["\u6CA1\u6709\u8D26\u53F7\uFF1F", _jsx(Link, { className: "text-blue-600", to: "/register", children: "\u53BB\u6CE8\u518C" })] })] }));
}
