import { useEffect, useState } from 'react'
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd'
import {
  Project, Board, Task, Status, Priority,
  getProjects, createProject, updateProject, deleteProject,
  getBoards, createBoard, updateBoard, deleteBoard,
  getTasks, createTask, updateTask, deleteTask,
} from '../api'
import {
  Box, Paper, Typography, Button, Stack,
  TextField, Select, MenuItem, FormControl, InputLabel,
  Checkbox, FormControlLabel, Chip, Divider,
  Card, CardContent, IconButton
} from '@mui/material'
// 使用 Box + CSS Grid 实现布局，避免 Grid API 版本差异
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'

export function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [activeProject, setActiveProject] = useState<number | null>(null)
  const [boards, setBoards] = useState<Board[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [formBoardId, setFormBoardId] = useState<number | null>(null)
  const [form, setForm] = useState<{ title: string; description?: string; priority: Priority; is_today: boolean; due?: string; remind?: string }>({ title: '', description: '', priority: 'normal', is_today: false, due: '', remind: '' })

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
    setBoards(prev => prev.filter(x => x.id !== id))
    setTasks(prev => prev.filter(t => t.board_id !== id))
    if (formBoardId === id) setFormBoardId(prev => boards.find(b => b.id !== id)?.id ?? null)
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
      remind_at: form.remind ? new Date(form.remind).toISOString() : undefined,
      status: 'todo',
    }
    const t = await createTask(formBoardId, payload)
    setTasks(prev => [...prev, t])
    setForm({ title: '', description: '', priority: 'normal', is_today: false, due: '', remind: '' })
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

  // ---- 时间显示与解析辅助 ----
  const hasTZ = (s: string) => /[zZ]|[+\-]\d{2}:?\d{2}$/.test(s)
  const parseServerDateTime = (s?: string | null): Date | null => {
    if (!s) return null
    try {
      const str = String(s)
      const iso = hasTZ(str) ? str : str + 'Z'
      const d = new Date(iso)
      if (isNaN(d.getTime())) return new Date(str)
      return d
    } catch { return null }
  }
  const formatLocalDateTime = (s?: string | null) => {
    const d = parseServerDateTime(s)
    return d ? d.toLocaleString() : ''
  }
  const toLocalInputValue = (s?: string | null) => {
    const d = parseServerDateTime(s)
    if (!d) return ''
    const pad = (n: number) => String(n).padStart(2, '0')
    const yyyy = d.getFullYear()
    const mm = pad(d.getMonth() + 1)
    const dd = pad(d.getDate())
    const hh = pad(d.getHours())
    const mi = pad(d.getMinutes())
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`
  }

  async function setRemindAt(id: number) {
    const cur = tasks.find(t => t.id === id)
    const init = toLocalInputValue(cur?.remind_at)
    const v = prompt('设置提醒时间 (YYYY-MM-DDTHH:mm)，留空清除', init)
    const iso = v ? new Date(v).toISOString() : null
    const t = await updateTask(id, { remind_at: iso })
    setTasks(prev => prev.map(x => x.id === id ? t : x))
  }

  const columns: Status[] = ['todo', 'doing', 'done']
  const tasksByStatus: Record<Status, Task[]> = {
    todo: tasks.filter(t => (t.status ?? 'todo') === 'todo'),
    doing: tasks.filter(t => t.status === 'doing'),
    done: tasks.filter(t => t.status === 'done'),
  }
  function priorityChipColor(p?: Priority | null) { return p==='high' ? 'error' : p==='low' ? 'success' : 'default' }
  function isOverdue(d?: string | null) { if (!d) return false; try { return new Date(d) < new Date(new Date().toDateString()) } catch { return false } }

  return (
  <Box display="grid" gap={3} sx={{ gridTemplateColumns: { xs: '1fr', md: '280px 1fr' } }}>
      {/* 左侧项目列表 */}
  <Box>
        <Paper variant="outlined">
          <Box p={2} display="flex" alignItems="center" justifyContent="space-between">
            <Typography fontWeight={600}>项目</Typography>
            <Button size="small" onClick={addProject}>+ 新建</Button>
          </Box>
          <Divider />
          <Box p={1}>
            <Stack spacing={1}>
              {projects.map(p => (
                <Paper key={p.id} variant={activeProject===p.id?'elevation':'outlined'} sx={{ p: 1, cursor: 'pointer' }} onClick={()=>setActiveProject(p.id)}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Typography>{p.name}</Typography>
                    <Stack direction="row" spacing={0.5}>
                      <IconButton size="small" onClick={(e)=>{e.stopPropagation(); renameProject(p.id)}}><EditIcon fontSize="small"/></IconButton>
                      <IconButton size="small" color="error" onClick={(e)=>{e.stopPropagation(); removeProject(p.id)}}><DeleteIcon fontSize="small"/></IconButton>
                    </Stack>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          </Box>
        </Paper>
  </Box>

      {/* 右侧 */}
  <Box>
        <Stack spacing={3}>
          {/* 拖拽区域 */}
          <Paper variant="outlined">
            <Box p={2}>
              <Typography fontWeight={600} mb={1}>拖拽移动（按状态）</Typography>
              <DragDropContext onDragEnd={async (result: DropResult) => {
                const { destination, source, draggableId } = result
                if (!destination) return
                const from = source.droppableId as Status
                const to = destination.droppableId as Status
                if (from === to && source.index === destination.index) return
                const id = parseInt(draggableId, 10)
                try { await updateTask(id, { status: to }); setTasks(prev => prev.map(x => x.id === id ? { ...x, status: to } : x)) } catch {}
              }}>
                <Box display="grid" gap={2} sx={{ gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' } }}>
                  {columns.map(col => (
                    <Box key={col}>
                      <Paper variant="outlined" sx={{ p: 1, minHeight: 220 }}>
                        <Typography variant="subtitle2" fontWeight={600} textTransform="capitalize" mb={1}>{col}</Typography>
                        <Droppable droppableId={col}>
                          {(provided: any) => (
                            <Stack ref={provided.innerRef} {...provided.droppableProps} spacing={1} sx={{ minHeight: 140 }}>
                              {tasksByStatus[col].map((t, index) => (
                                <Draggable key={t.id} draggableId={String(t.id)} index={index}>
                                  {(drag: any) => (
                                    <Card ref={drag.innerRef} {...drag.draggableProps} {...drag.dragHandleProps} variant="outlined">
                                      <CardContent sx={{ py: 1.5 }}>
                                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                                          <Typography fontWeight={600}>{t.title}</Typography>
                                          <Chip size="small" color={priorityChipColor(t.priority)} label={t.priority ?? 'normal'} />
                                        </Stack>
                                        <Stack direction="row" spacing={1} alignItems="center" mt={0.5}>
                                          {t.due_date && (
                                            <Typography variant="caption" color={isOverdue(t.due_date) ? 'error' : 'text.secondary'}>
                                              截止: {new Date(t.due_date).toLocaleDateString()}
                                            </Typography>
                                          )}
                                          <Typography variant="caption">今日: {t.is_today ? '✓' : '✗'}</Typography>
                                        </Stack>
                                      </CardContent>
                                    </Card>
                                  )}
                                </Draggable>
                              ))}
                              {provided.placeholder}
                              {tasksByStatus[col].length === 0 && (
                                <Typography variant="caption" color="text.secondary">无任务</Typography>
                              )}
                            </Stack>
                          )}
                        </Droppable>
                      </Paper>
                    </Box>
                  ))}
                </Box>
              </DragDropContext>
            </Box>
          </Paper>

          {/* 新建任务表单 */}
          <Paper variant="outlined">
            <Box p={2}>
              <Typography fontWeight={600} mb={1}>新建任务</Typography>
              <Stack spacing={1.5}>
                <TextField size="small" label="标题" value={form.title} onChange={e=>setForm(f=>({...f, title:e.target.value}))} />
                <TextField size="small" label="描述（可选）" multiline minRows={2} value={form.description} onChange={e=>setForm(f=>({...f, description:e.target.value}))} />
                <Stack direction={{ xs:'column', sm:'row' }} spacing={2} alignItems={{ xs:'stretch', sm:'center' }}>
                  <FormControl size="small" sx={{ minWidth: 160 }}>
                    <InputLabel id="board-select">看板</InputLabel>
                    <Select labelId="board-select" value={formBoardId ?? ''} label="看板" onChange={e=>setFormBoardId((e.target.value as any) ? Number(e.target.value) : null)}>
                      {boards.length === 0 && <MenuItem value="">无可用看板</MenuItem>}
                      {boards.map(b => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
                    </Select>
                  </FormControl>
                  <FormControl size="small" sx={{ minWidth: 160 }}>
                    <InputLabel id="priority-select">优先级</InputLabel>
                    <Select labelId="priority-select" value={form.priority} label="优先级" onChange={e=>setForm(f=>({...f, priority:e.target.value as Priority}))}>
                      <MenuItem value="low">低</MenuItem>
                      <MenuItem value="normal">中</MenuItem>
                      <MenuItem value="high">高</MenuItem>
                    </Select>
                  </FormControl>
                  <FormControlLabel control={<Checkbox checked={form.is_today} onChange={e=>setForm(f=>({...f, is_today:e.target.checked}))} />} label="加入今日" />
                  <TextField size="small" type="date" label="截止" InputLabelProps={{ shrink: true }} value={form.due} onChange={e=>setForm(f=>({...f, due:e.target.value}))} />
                  <TextField size="small" type="datetime-local" label="提醒时间" InputLabelProps={{ shrink: true }} value={form.remind} onChange={e=>setForm(f=>({...f, remind:e.target.value}))} />
                  <Box flex={1} />
                  <Button variant="contained" onClick={addTask} disabled={!form.title.trim() || !formBoardId}>创建</Button>
                </Stack>
              </Stack>
            </Box>
          </Paper>

          {/* 看板列表 */}
          <Stack spacing={2}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography fontWeight={600}>看板</Typography>
              <Button size="small" onClick={addBoard}>+ 新建看板</Button>
            </Stack>
            {boards.map(b => (
              <Paper key={b.id} variant="outlined">
                <Box px={2} py={1.5} display="flex" alignItems="center" justifyContent="space-between" borderBottom={1} borderColor="divider">
                  <Typography fontWeight={600}>{b.name}</Typography>
                  <Stack direction="row" spacing={1}>
                    <Button size="small" startIcon={<EditIcon />} onClick={()=>renameBoard(b.id)}>改名</Button>
                    <Button size="small" color="error" startIcon={<DeleteIcon />} onClick={()=>removeBoard(b.id)}>删除</Button>
                  </Stack>
                </Box>
                <Box p={2}>
                  <Stack spacing={1.5}>
                    {tasks.filter(t => t.board_id === b.id).map(t => (
                      <Card key={t.id} variant="outlined">
                        <CardContent sx={{ py: 1.5 }}>
                          <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                            <Box>
                              <Typography fontWeight={600}>{t.title}</Typography>
                              {t.description && <Typography variant="body2" color="text.secondary">{t.description}</Typography>}
                              <Stack direction="row" spacing={1} alignItems="center" mt={0.5}>
                                <Chip size="small" label={`状态: ${t.status ?? 'todo'}`} />
                                <Chip size="small" color={priorityChipColor(t.priority)} label={t.priority ?? 'normal'} />
                                {t.due_date && (
                                  <Typography variant="caption" color={isOverdue(t.due_date) ? 'error' : 'text.secondary'}>
                                    截止: {new Date(t.due_date).toLocaleDateString()}
                                  </Typography>
                                )}
                                {t.remind_at && (
                                  <Typography variant="caption" color="text.secondary">
                                    提醒: {formatLocalDateTime(t.remind_at)}
                                  </Typography>
                                )}
                                <Typography variant="caption">今日: {t.is_today ? '✓' : '✗'}</Typography>
                              </Stack>
                            </Box>
                            <Stack direction="row" spacing={1}>
                              <Button size="small" onClick={()=>cycleStatus(t.id)}>切换状态</Button>
                              <Button size="small" onClick={()=>toggleToday(t.id)}>{t.is_today?'移出今日':'加入今日'}</Button>
                              <Button size="small" onClick={()=>setDueDate(t.id)}>截止日期</Button>
                              <Button size="small" onClick={()=>setRemindAt(t.id)}>提醒时间</Button>
                              <Button size="small" onClick={()=>renameTask(t.id)}>重命名</Button>
                              <Button size="small" color="error" onClick={()=>removeTask(t.id)}>删除</Button>
                            </Stack>
                          </Stack>
                        </CardContent>
                      </Card>
                    ))}
                    {tasks.filter(t => t.board_id === b.id).length === 0 && (
                      <Typography variant="body2" color="text.secondary">该看板暂无任务</Typography>
                    )}
                  </Stack>
                </Box>
              </Paper>
            ))}
            {boards.length === 0 && <Typography color="text.secondary">该项目暂无看板</Typography>}
          </Stack>
        </Stack>
      </Box>
    </Box>
  )
}
