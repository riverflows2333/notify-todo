import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Box, Button, Paper, Stack, TextField, Typography, Alert } from '@mui/material';
import { getBlinkoSetting, setBlinkoSetting } from '../api';
export default function Settings() {
    const [baseUrl, setBaseUrl] = useState('');
    const [token, setToken] = useState('');
    const [loading, setLoading] = useState(true);
    const [saved, setSaved] = useState(null);
    const [error, setError] = useState(null);
    useEffect(() => {
        let mounted = true;
        getBlinkoSetting().then((data) => {
            if (!mounted)
                return;
            if (data) {
                setBaseUrl(data.base_url || '');
                setToken(data.token || '');
            }
            setLoading(false);
        }).catch((e) => { setError(String(e)); setLoading(false); });
        return () => { mounted = false; };
    }, []);
    const onSave = async () => {
        setSaved(null);
        setError(null);
        try {
            await setBlinkoSetting(baseUrl, token);
            setSaved('已保存 Blinko 设置');
        }
        catch (e) {
            setError(e?.response?.data?.detail || String(e));
        }
    };
    return (_jsxs(Box, { children: [_jsx(Typography, { variant: "h5", gutterBottom: true, children: "\u8BBE\u7F6E" }), _jsxs(Paper, { variant: "outlined", sx: { p: 2 }, children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "Blinko \u8BBE\u7F6E" }), _jsx(Typography, { variant: "body2", color: "text.secondary", gutterBottom: true, children: "\u8BF7\u8F93\u5165 Blinko \u670D\u52A1\u5730\u5740\u4E0E\u8BBF\u95EE Token\uFF08\u65E0\u9700\u5305\u542B Bearer \u524D\u7F00\uFF09\u3002" }), _jsxs(Stack, { spacing: 2, maxWidth: 600, children: [_jsx(TextField, { label: "Blinko Base URL", placeholder: "https://blinko.example.com", value: baseUrl, onChange: e => setBaseUrl(e.target.value), fullWidth: true }), _jsx(TextField, { label: "Blinko Token", type: "password", value: token, onChange: e => setToken(e.target.value), fullWidth: true }), _jsxs(Stack, { direction: "row", spacing: 2, alignItems: "center", children: [_jsx(Button, { variant: "contained", onClick: onSave, disabled: loading, children: "\u4FDD\u5B58" }), saved && _jsx(Alert, { severity: "success", children: saved }), error && _jsx(Alert, { severity: "error", children: error })] })] })] })] }));
}
