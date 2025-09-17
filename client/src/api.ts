import axios from 'axios'

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

export const wsUrl = () => {
  if (API_BASE.startsWith('https://')) return API_BASE.replace('https://', 'wss://') + '/ws'
  if (API_BASE.startsWith('http://')) return API_BASE.replace('http://', 'ws://') + '/ws'
  return 'ws://127.0.0.1:8000/ws'
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
}

// Project APIs
export async function getProjects() {
  const { data } = await api.get<Project[]>('/projects')
  return data
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
  const { data } = await api.get<Board[]>(`/projects/${projectId}/boards`)
  return data
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
  const { data } = await api.get<Task[]>(`/projects/boards/${boardId}/tasks`)
  return data
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
