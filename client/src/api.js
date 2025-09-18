import axios from 'axios';
import { useAuth } from './store';
// 规范化 API 基地址：
// - 若 VITE_API_BASE 未设置或为空，则默认 '/api'（生产同域反代最稳）
// - 若为相对但非以 '/' 开头，补上前导 '/'
// - 保留绝对地址 http(s):// 用于本地直连开发
const RAW_API_BASE = import.meta.env?.VITE_API_BASE;
function normalizeApiBase(v) {
    const s = (v ?? '').trim();
    if (!s)
        return '/api';
    if (s.startsWith('http://') || s.startsWith('https://') || s.startsWith('/'))
        return s;
    return '/' + s;
}
export const API_BASE = normalizeApiBase(RAW_API_BASE);
export const api = axios.create({ baseURL: API_BASE });
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers = config.headers ?? {};
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});
// 统一拦截 401：清除 token 并跳转登录
api.interceptors.response.use((res) => res, (error) => {
    const status = error?.response?.status;
    if (status === 401) {
        try {
            // 清理本地 token（Zustand + localStorage）
            const { setToken } = useAuth.getState();
            setToken(null);
        }
        catch { }
        // 避免对登录/注册页重复跳转
        try {
            const isAuthPath = typeof window !== 'undefined' && /\/login|\/register/.test(window.location.pathname);
            if (!isAuthPath) {
                window.location.replace('/login');
            }
        }
        catch { }
    }
    return Promise.reject(error);
});
const WS_BASE = import.meta.env?.VITE_WS_BASE;
function toWsOrigin(u) {
    if (u.startsWith('wss://') || u.startsWith('ws://'))
        return u;
    if (u.startsWith('https://'))
        return 'wss://' + u.slice('https://'.length);
    if (u.startsWith('http://'))
        return 'ws://' + u.slice('http://'.length);
    return u;
}
function ensureWsUrl(x) {
    // 支持三种形式：
    // 1) 完整 ws(s) URL（可带/不带路径）
    // 2) http(s) origin（自动转为 ws(s) 并追加 /ws）
    // 3) 相对路径（如 /ws），会拼接 window.location.origin
    const trimmed = x.replace(/\s+$/, '');
    if (trimmed.startsWith('ws://') || trimmed.startsWith('wss://')) {
        const noTrail = trimmed.replace(/\/+$/, '');
        // 如果没有路径，补 /ws
        const url = new URL(noTrail);
        if (!url.pathname || url.pathname === '/')
            return noTrail + '/ws';
        return noTrail;
    }
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        const noTrail = trimmed.replace(/\/+$/, '');
        return toWsOrigin(noTrail) + '/ws';
    }
    // 相对路径
    const path = trimmed.startsWith('/') ? trimmed : '/' + trimmed;
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://127.0.0.1:8000';
    return toWsOrigin(origin) + path;
}
export const wsUrl = () => {
    // 优先使用 VITE_WS_BASE；否则根据 API_BASE 推导；若仍为相对路径，则用当前站点 origin
    if (WS_BASE && String(WS_BASE).trim()) {
        return ensureWsUrl(String(WS_BASE).trim());
    }
    if (API_BASE.startsWith('http://') || API_BASE.startsWith('https://')) {
        const origin = new URL(API_BASE).origin;
        return ensureWsUrl(origin);
    }
    // API_BASE 为相对路径（例如 /api），使用当前域名
    return ensureWsUrl('/ws');
};
export async function getSubtasks(taskId) {
    try {
        const { data } = await api.get(`/projects/tasks/${taskId}/subtasks`);
        return Array.isArray(data) ? data : [];
    }
    catch {
        return [];
    }
}
export async function createSubtask(taskId, payload) {
    const { data } = await api.post(`/projects/tasks/${taskId}/subtasks`, { ...payload, task_id: taskId });
    return data;
}
export async function updateSubtask(subtaskId, payload) {
    const { data } = await api.patch(`/projects/subtasks/${subtaskId}`, payload);
    return data;
}
export async function deleteSubtask(subtaskId) {
    await api.delete(`/projects/subtasks/${subtaskId}`);
}
export async function getBlinkoSetting() {
    const { data } = await api.get('/integrations/blinko');
    return data;
}
export async function setBlinkoSetting(base_url, token) {
    const { data } = await api.post('/integrations/blinko', { provider: 'blinko', base_url, token });
    return data;
}
// Project APIs
export async function getProjects() {
    try {
        const { data } = await api.get('/projects');
        return Array.isArray(data) ? data : [];
    }
    catch {
        return [];
    }
}
export async function createProject(payload) {
    const { data } = await api.post('/projects', payload);
    return data;
}
export async function updateProject(id, payload) {
    const { data } = await api.patch(`/projects/${id}`, payload);
    return data;
}
export async function deleteProject(id) {
    await api.delete(`/projects/${id}`);
}
// Board APIs
export async function getBoards(projectId) {
    try {
        const { data } = await api.get(`/projects/${projectId}/boards`);
        return Array.isArray(data) ? data : [];
    }
    catch {
        return [];
    }
}
export async function createBoard(projectId, payload) {
    const { data } = await api.post(`/projects/${projectId}/boards`, { ...payload, project_id: projectId });
    return data;
}
export async function updateBoard(boardId, payload) {
    const { data } = await api.patch(`/projects/boards/${boardId}`, payload);
    return data;
}
export async function deleteBoard(boardId) {
    await api.delete(`/projects/boards/${boardId}`);
}
// Task APIs
export async function getTasks(boardId) {
    try {
        const { data } = await api.get(`/projects/boards/${boardId}/tasks`);
        return Array.isArray(data) ? data : [];
    }
    catch {
        return [];
    }
}
export async function createTask(boardId, payload) {
    const { data } = await api.post(`/projects/boards/${boardId}/tasks`, { ...payload, board_id: boardId });
    return data;
}
export async function updateTask(taskId, payload) {
    const { data } = await api.patch(`/projects/tasks/${taskId}`, payload);
    return data;
}
export async function deleteTask(taskId) {
    await api.delete(`/projects/tasks/${taskId}`);
}
