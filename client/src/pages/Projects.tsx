import { useEffect, useState } from 'react'
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd'
import {
  Project, Board, Task, Status, Priority,
  getProjects, createProject, updateProject, deleteProject,
  getBoards, createBoard, updateBoard, deleteBoard,
  getTasks, createTask, updateTask, deleteTask,
} from '../api'

export function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [activeProject, setActiveProject] = useState<number | null>(null)
  const [boards, setBoards] = useState<Board[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [formBoardId, setFormBoardId] = useState<number | null>(null)
  const [form, setForm] = useState<{ title: string; description?: string; priority: Priority; is_today: boolean; due?: string }>({ title: '', description: '', priority: 'normal', is_today: false, due: '' })

  // 初始化加载项目
  useEffect(() => { (async () => {
    const ps = await getProjects()
    setProjects(ps)
    if (ps.length) setActiveProject(ps[0].id)
  })() }, [])

  // 切换项目后加载看板与该项目下所有任务
  useEffect(() => { (async () => {
    if (activeProject == null) { setBoards([]); setTasks([]); setFormBoardId(null); return }
    const bs = await getBoards(activeProject)
    setBoards(bs)
    setFormBoardId(bs[0]?.id ?? null)
    const all: Task[] = (await Promise.all(bs.map(b => getTasks(b.id)))).flat()
    setTasks(all)
  })() }, [activeProject])

  // 项目 CRUD
  async function addProject() {
    const name = prompt('项目名称')?.trim(); if (!name) return
    const p = await createProject({ name })
    setProjects(prev => [...prev, p])
    setActiveProject(p.id)
  }
  async function renameProject(id: number) {
    const name = prompt('新名称')?.trim(); if (!name) return
    const p = await updateProject(id, { name })
    setProjects(prev => prev.map(x => x.id === id ? p : x))
  }
  async function removeProject(id: number) {
    if (!confirm('删除项目？')) return
    await deleteProject(id)
    setProjects(prev => prev.filter(x => x.id !== id))
    if (activeProject === id) setActiveProject(null)
  }

  // 看板 CRUD
  async function addBoard() {
    if (activeProject == null) return
    const name = prompt('看板名称')?.trim(); if (!name) return
    const b = await createBoard(activeProject, { name })
    setBoards(prev => {
      const next = [...prev, b]
      if (formBoardId == null) setFormBoardId(b.id)
      return next
    })
  }
  async function renameBoard(id: number) {
    const name = prompt('新名称')?.trim(); if (!name) return
    const b = await updateBoard(id, { name })
    setBoards(prev => prev.map(x => x.id === id ? b : x))
  }
  async function removeBoard(id: number) {
    if (!confirm('删除看板？')) return
    await deleteBoard(id)
    setBoards(prev => {
      const next = prev.filter(x => x.id !== id)
      setTasks(ts => ts.filter(t => t.board_id !== id))
      if (formBoardId === id) setFormBoardId(next[0]?.id ?? null)
      return next
    })
  }

  // 任务 CRUD 与操作
  async function addTask() {
    if (formBoardId == null) return; if (!form.title.trim()) return
    const payload: Partial<Task> & { title: string } = {
      title: form.title.trim(),
      description: form.description?.trim() || undefined,
      priority: form.priority,
      is_today: form.is_today,
      due_date: form.due ? new Date(form.due).toISOString() : undefined,
      status: 'todo',
    }
    const t = await createTask(formBoardId, payload)
    setTasks(prev => [...prev, t])
    setForm({ title: '', description: '', priority: 'normal', is_today: false, due: '' })
  }
  async function renameTask(id: number) {
    const title = prompt('新标题')?.trim(); if (!title) return
    const t = await updateTask(id, { title })
    setTasks(prev => prev.map(x => x.id === id ? t : x))
  }
  async function removeTask(id: number) {
    if (!confirm('删除任务？')) return
    await deleteTask(id)
    setTasks(prev => prev.filter(x => x.id !== id))
  }
  function nextStatus(s?: Task['status']): Task['status'] { if (s === 'todo') return 'doing'; if (s === 'doing') return 'done'; return 'todo' }
  async function cycleStatus(id: number) {
    const cur = tasks.find(t => t.id === id); const s = nextStatus(cur?.status)
    const t = await updateTask(id, { status: s })
    setTasks(prev => prev.map(x => x.id === id ? t : x))
  }
  async function toggleToday(id: number) {
    const cur = tasks.find(t => t.id === id)
    const t = await updateTask(id, { is_today: !cur?.is_today })
    setTasks(prev => prev.map(x => x.id === id ? t : x))
  }
  async function setDueDate(id: number) {
    const cur = tasks.find(t => t.id === id)
    const d = prompt('设置截止日期 (YYYY-MM-DD)，留空清除', (cur?.due_date ?? '').slice(0,10))
    const iso = d ? new Date(d).toISOString() : null
    const t = await updateTask(id, { due_date: iso })
    setTasks(prev => prev.map(x => x.id === id ? t : x))
  }

  const columns: Status[] = ['todo', 'doing', 'done']
  const tasksByStatus: Record<Status, Task[]> = {
    todo: tasks.filter(t => (t.status ?? 'todo') === 'todo'),
    doing: tasks.filter(t => t.status === 'doing'),
    done: tasks.filter(t => t.status === 'done'),
  }
  function priorityBadge(p?: Priority) {
    const map: Record<Priority, string> = { low: 'bg-green-100 text-green-700', normal: 'bg-gray-100 text-gray-700', high: 'bg-red-100 text-red-700' }
    const label: Record<Priority, string> = { low: '低', normal: '中', high: '高' }
    const key = (p ?? 'normal') as Priority
    return <span className={`text-xs px-2 py-0.5 rounded ${map[key]}`}>优先级:{label[key]}</span>
  }
  function isOverdue(d?: string | null) { if (!d) return false; try { return new Date(d) < new Date(new Date().toDateString()) } catch { return false } }

  return (
    <div className="grid grid-cols-12 gap-4">
      {/* 左侧项目列表 */}
      <div className="col-span-3">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-semibold">项目</h2>
          <button onClick={addProject} className="text-sm text-blue-600">+ 新建</button>
        </div>
        <ul className="space-y-1">
          {projects.map(p => (
            <li key={p.id} className={`px-2 py-1 rounded cursor-pointer ${activeProject===p.id?'bg-blue-50':''}`} onClick={()=>setActiveProject(p.id)}>
              <div className="flex items-center justify-between">
                <span>{p.name}</span>
                <div className="text-xs text-gray-500 space-x-2">
                  <button onClick={(e)=>{e.stopPropagation(); renameProject(p.id)}}>改名</button>
                  <button onClick={(e)=>{e.stopPropagation(); removeProject(p.id)}}>删除</button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* 右侧：拖拽 + 新建任务 + 看板列表 */}
      <div className="col-span-9">
        {/* 拖拽区域 */}
        <div className="mb-4">
          <h2 className="font-semibold mb-2">拖拽移动（按状态）</h2>
          <DragDropContext onDragEnd={async (result: DropResult) => {
            const { destination, source, draggableId } = result
            if (!destination) return
            const from = source.droppableId as Status
            const to = destination.droppableId as Status
            if (from === to && source.index === destination.index) return
            const id = parseInt(draggableId, 10)
            try { await updateTask(id, { status: to }); setTasks(prev => prev.map(x => x.id === id ? { ...x, status: to } : x)) } catch {}
          }}>
            <div className="grid grid-cols-3 gap-3">
              {columns.map(col => (
                <div key={col} className="bg-gray-50 rounded border p-2 min-h-[200px]">
                  <div className="font-semibold capitalize mb-2">{col}</div>
                  <Droppable droppableId={col}>
                    {(provided: any) => (
                      <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2 min-h-[100px]">
                        {tasksByStatus[col].map((t, index) => (
                          <Draggable key={t.id} draggableId={String(t.id)} index={index}>
                            {(drag: any) => (
                              <div ref={drag.innerRef} {...drag.draggableProps} {...drag.dragHandleProps} className="bg-white rounded border p-2">
                                <div className="flex items-start justify-between">
                                  <div className="font-medium">{t.title}</div>
                                  <div className="text-xs space-x-2">{priorityBadge(t.priority)}</div>
                                </div>
                                <div className="text-xs text-gray-600 mt-1 flex items-center gap-2">
                                  {t.due_date && (<span className={isOverdue(t.due_date) ? 'text-red-600' : ''}>截止: {new Date(t.due_date).toLocaleDateString()}</span>)}
                                  <span>今日: {t.is_today ? '✓' : '✗'}</span>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                        {tasksByStatus[col].length === 0 && <div className="text-xs text-gray-500">无任务</div>}
                      </div>
                    )}
                  </Droppable>
                </div>
              ))}
            </div>
          </DragDropContext>
        </div>

        {/* 新建任务表单 */}
        <div className="mb-4">
          <h2 className="font-semibold mb-2">新建任务</h2>
          <div className="bg-white border rounded p-3 space-y-2">
            <input className="w-full border px-2 py-1 rounded" placeholder="标题" value={form.title} onChange={e=>setForm(f=>({...f, title:e.target.value}))} />
            <textarea className="w-full border px-2 py-1 rounded" placeholder="描述（可选）" value={form.description} onChange={e=>setForm(f=>({...f, description:e.target.value}))} />
            <div className="flex items-center gap-3 text-sm">
              <label className="flex items-center gap-1">
                <span>看板</span>
                <select className="border rounded px-1 py-0.5" value={formBoardId ?? ''} onChange={e=>setFormBoardId(e.target.value? Number(e.target.value): null)}>
                  {boards.length === 0 && <option value="">无可用看板</option>}
                  {boards.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </label>
              <label className="flex items-center gap-1">
                <span>优先级</span>
                <select className="border rounded px-1 py-0.5" value={form.priority} onChange={e=>setForm(f=>({...f, priority:e.target.value as Priority}))}>
                  <option value="low">低</option>
                  <option value="normal">中</option>
                  <option value="high">高</option>
                </select>
              </label>
              <label className="flex items-center gap-1">
                <input type="checkbox" checked={form.is_today} onChange={e=>setForm(f=>({...f, is_today:e.target.checked}))} /> 加入今日
              </label>
              <label className="flex items-center gap-1">
                <span>截止</span>
                <input type="date" className="border rounded px-1 py-0.5" value={form.due} onChange={e=>setForm(f=>({...f, due:e.target.value}))} />
              </label>
              <button onClick={addTask} className="ml-auto bg-blue-600 text-white text-sm rounded px-2 py-1" disabled={!form.title.trim() || !formBoardId}>创建</button>
            </div>
          </div>
        </div>

        {/* 看板列表：任务放在看板下面 */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-semibold">看板</h2>
            <button onClick={addBoard} className="text-sm text-blue-600">+ 新建看板</button>
          </div>
          <div className="space-y-3">
            {boards.map(b => (
              <div key={b.id} className="bg-white border rounded">
                <div className="px-3 py-2 border-b flex items-center justify-between">
                  <div className="font-medium">{b.name}</div>
                  <div className="text-xs text-gray-600 space-x-3">
                    <button onClick={()=>renameBoard(b.id)}>改名</button>
                    <button onClick={()=>removeBoard(b.id)} className="text-red-600">删除</button>
                  </div>
                </div>
                <ul className="p-3 space-y-2">
                  {tasks.filter(t => t.board_id === b.id).map(t => (
                    <li key={t.id} className="bg-gray-50 rounded border px-3 py-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{t.title}</div>
                          <div className="text-xs text-gray-600 mt-1 space-x-2">
                            <span>状态: {t.status ?? 'todo'}</span>
                            {priorityBadge(t.priority)}
                            {t.due_date && <span className={isOverdue(t.due_date) ? 'text-red-600' : ''}>截止: {new Date(t.due_date).toLocaleDateString()}</span>}
                            <span>今日: {t.is_today ? '✓' : '✗'}</span>
                          </div>
                          {t.description && <div className="text-xs text-gray-600 mt-1">{t.description}</div>}
                        </div>
                        <div className="text-xs text-gray-600 space-x-3">
                          <button onClick={()=>cycleStatus(t.id)}>切换状态</button>
                          <button onClick={()=>toggleToday(t.id)}>{t.is_today?'移出今日':'加入今日'}</button>
                          <button onClick={()=>setDueDate(t.id)}>截止日期</button>
                          <button onClick={()=>renameTask(t.id)}>重命名</button>
                          <button onClick={()=>removeTask(t.id)} className="text-red-600">删除</button>
                        </div>
                      </div>
                    </li>
                  ))}
                  {tasks.filter(t => t.board_id === b.id).length === 0 && (
                    <div className="text-xs text-gray-500">该看板暂无任务</div>
                  )}
                </ul>
              </div>
            ))}
            {boards.length === 0 && <div className="text-gray-500">该项目暂无看板</div>}
          </div>
        </div>
      </div>
    </div>
  )
}
