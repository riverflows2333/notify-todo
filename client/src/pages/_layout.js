import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../store';
export function AppLayout() {
    const { token, setToken } = useAuth();
    const nav = useNavigate();
    return (_jsxs("div", { className: "min-h-screen", children: [_jsx("header", { className: "border-b bg-white", children: _jsxs("div", { className: "mx-auto max-w-5xl px-4 py-3 flex items-center gap-4", children: [_jsx(Link, { to: "/", className: "font-semibold", children: "Todolist" }), _jsx("nav", { className: "flex-1", children: _jsx(Link, { className: "mr-4", to: "/", children: "Today" }) }), token ? (_jsx("button", { className: "text-sm text-gray-600", onClick: () => { setToken(null); nav('/login'); }, children: "\u9000\u51FA" })) : (_jsxs("div", { className: "text-sm", children: [_jsx(Link, { className: "mr-3", to: "/login", children: "\u767B\u5F55" }), _jsx(Link, { to: "/register", children: "\u6CE8\u518C" })] }))] }) }), _jsx("main", { className: "mx-auto max-w-5xl px-4 py-6", children: _jsx(Outlet, {}) })] }));
}
