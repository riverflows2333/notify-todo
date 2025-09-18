import axios from 'axios';
import { useAuth } from './store';
export const API_BASE = import.meta.env?.VITE_API_BASE ?? 'http://127.0.0.1:8000';
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
export const wsUrl = () => {
    if (API_BASE.startsWith('https://'))
        return API_BASE.replace('https://', 'wss://') + '/ws';
    if (API_BASE.startsWith('http://'))
        return API_BASE.replace('http://', 'ws://') + '/ws';
    return 'ws://127.0.0.1:8000/ws';
};
export async function getSubtasks(taskId) {
    const { data } = await api.get(`/projects/tasks/${taskId}/subtasks`);
    return data;
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
    const { data } = await api.get('/projects');
    return data;
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
    const { data } = await api.get(`/projects/${projectId}/boards`);
    return data;
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
    const { data } = await api.get(`/projects/boards/${boardId}/tasks`);
    return data;
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
