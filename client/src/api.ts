import axios from 'axios'
import { useAuth } from './store'

export const API_BASE: string = (import.meta as any).env?.VITE_API_BASE ?? 'http://127.0.0.1:8000'

export const api = axios.create({ baseURL: API_BASE })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers = config.headers ?? {}
    ;(config.headers as any).Authorization = `Bearer ${token}`
  }
  return config
})

// 统一拦截 401：清除 token 并跳转登录
api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error?.response?.status
    if (status === 401) {
      try {
        // 清理本地 token（Zustand + localStorage）
        const { setToken } = useAuth.getState()
        setToken(null)
      } catch {}
      // 避免对登录/注册页重复跳转
      try {
        const isAuthPath = typeof window !== 'undefined' && /\/login|\/register/.test(window.location.pathname)
        if (!isAuthPath) {
          window.location.replace('/login')
        }
      } catch {}
    }
    return Promise.reject(error)
  }
)

const WS_BASE: string | undefined = (import.meta as any).env?.VITE_WS_BASE

function toWsOrigin(u: string) {
  if (u.startsWith('wss://') || u.startsWith('ws://')) return u
  if (u.startsWith('https://')) return 'wss://' + u.slice('https://'.length)
  if (u.startsWith('http://')) return 'ws://' + u.slice('http://'.length)
  return u
}

function ensureWsUrl(x: string): string {
  // 支持三种形式：
  // 1) 完整 ws(s) URL（可带/不带路径）
  // 2) http(s) origin（自动转为 ws(s) 并追加 /ws）
  // 3) 相对路径（如 /ws），会拼接 window.location.origin
  const trimmed = x.replace(/\s+$/, '')
  if (trimmed.startsWith('ws://') || trimmed.startsWith('wss://')) {
    const noTrail = trimmed.replace(/\/+$/, '')
    // 如果没有路径，补 /ws
    const url = new URL(noTrail)
    if (!url.pathname || url.pathname === '/' ) return noTrail + '/ws'
    return noTrail
  }
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    const noTrail = trimmed.replace(/\/+$/, '')
    return toWsOrigin(noTrail) + '/ws'
  }
  // 相对路径
  const path = trimmed.startsWith('/') ? trimmed : '/' + trimmed
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://127.0.0.1:8000'
  return toWsOrigin(origin) + path
}

export const wsUrl = () => {
  // 优先使用 VITE_WS_BASE；否则根据 API_BASE 推导；若仍为相对路径，则用当前站点 origin
  if (WS_BASE && String(WS_BASE).trim()) {
    return ensureWsUrl(String(WS_BASE).trim())
  }
  if (API_BASE.startsWith('http://') || API_BASE.startsWith('https://')) {
    const origin = new URL(API_BASE).origin
    return ensureWsUrl(origin)
  }
  // API_BASE 为相对路径（例如 /api），使用当前域名
  return ensureWsUrl('/ws')
}

// Types
export type Project = { id: number; name: string; description?: string | null }
export type Board = { id: number; name: string; project_id: number }
export type Status = 'todo' | 'doing' | 'done'
export type Priority = 'low' | 'normal' | 'high'
export type Task = {
  id: number
  title: string
  description?: string | null
  status?: Status
  priority?: Priority
  board_id: number
  is_today?: boolean
  due_date?: string | null
  remind_at?: string | null
}

// Subtask Types & APIs
export type Subtask = {
  id: number
  title: string
  done: boolean
  task_id: number
  created_at: string
}
export async function getSubtasks(taskId: number) {
  try {
    const { data } = await api.get<Subtask[]>(`/projects/tasks/${taskId}/subtasks`)
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}
export async function createSubtask(taskId: number, payload: { title: string; done?: boolean }) {
  const { data } = await api.post<Subtask>(`/projects/tasks/${taskId}/subtasks`, { ...payload, task_id: taskId })
  return data
}
export async function updateSubtask(subtaskId: number, payload: Partial<{ title: string; done: boolean }>) {
  const { data } = await api.patch<Subtask>(`/projects/subtasks/${subtaskId}`, payload)
  return data
}
export async function deleteSubtask(subtaskId: number) {
  await api.delete(`/projects/subtasks/${subtaskId}`)
}

// Integration APIs
export type IntegrationSetting = { id: number; provider: string; base_url: string; token: string; user_id: number; created_at: string }
export async function getBlinkoSetting() {
  const { data } = await api.get<IntegrationSetting | null>('/integrations/blinko')
  return data
}
export async function setBlinkoSetting(base_url: string, token: string) {
  const { data } = await api.post<IntegrationSetting>('/integrations/blinko', { provider: 'blinko', base_url, token })
  return data
}

// Project APIs
export async function getProjects() {
  try {
    const { data } = await api.get<Project[]>('/projects')
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}
export async function createProject(payload: { name: string; description?: string | null }) {
  const { data } = await api.post<Project>('/projects', payload)
  return data
}
export async function updateProject(id: number, payload: Partial<{ name: string; description?: string | null }>) {
  const { data } = await api.patch<Project>(`/projects/${id}`, payload)
  return data
}
export async function deleteProject(id: number) {
  await api.delete(`/projects/${id}`)
}

// Board APIs
export async function getBoards(projectId: number) {
  try {
    const { data } = await api.get<Board[]>(`/projects/${projectId}/boards`)
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}
export async function createBoard(projectId: number, payload: { name: string }) {
  const { data } = await api.post<Board>(`/projects/${projectId}/boards`, { ...payload, project_id: projectId })
  return data
}
export async function updateBoard(boardId: number, payload: Partial<{ name: string }>) {
  const { data } = await api.patch<Board>(`/projects/boards/${boardId}`, payload)
  return data
}
export async function deleteBoard(boardId: number) {
  await api.delete(`/projects/boards/${boardId}`)
}

// Task APIs
export async function getTasks(boardId: number) {
  try {
    const { data } = await api.get<Task[]>(`/projects/boards/${boardId}/tasks`)
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}
export async function createTask(boardId: number, payload: Partial<Task> & { title: string }) {
  const { data } = await api.post(`/projects/boards/${boardId}/tasks`, { ...payload, board_id: boardId })
  return data
}
export async function updateTask(taskId: number, payload: Partial<Task> & { is_today?: boolean; due_date?: string | null }) {
  const { data } = await api.patch(`/projects/tasks/${taskId}`, payload)
  return data
}
export async function deleteTask(taskId: number) {
  await api.delete(`/projects/tasks/${taskId}`)
}
