import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { getProjects, createProject, updateProject, deleteProject, getBoards, createBoard, updateBoard, deleteBoard, getTasks, createTask, updateTask, deleteTask, } from '../api';
import { Box, Paper, Typography, Button, Stack, TextField, Select, MenuItem, FormControl, InputLabel, Checkbox, FormControlLabel, Chip, Divider, Card, CardContent, IconButton } from '@mui/material';
// 使用 Box + CSS Grid 实现布局，避免 Grid API 版本差异
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
export function ProjectsPage() {
    const [projects, setProjects] = useState([]);
    const [activeProject, setActiveProject] = useState(null);
    const [boards, setBoards] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [formBoardId, setFormBoardId] = useState(null);
    const [form, setForm] = useState({ title: '', description: '', priority: 'normal', is_today: false, due: '', remind: '' });
    // 初始化加载项目
    useEffect(() => {
        (async () => {
            const ps = await getProjects();
            setProjects(ps);
            if (ps.length)
                setActiveProject(ps[0].id);
        })();
    }, []);
    // 切换项目后加载看板与该项目下所有任务
    useEffect(() => {
        (async () => {
            if (activeProject == null) {
                setBoards([]);
                setTasks([]);
                setFormBoardId(null);
                return;
            }
            const bs = await getBoards(activeProject);
            setBoards(bs);
            setFormBoardId(bs[0]?.id ?? null);
            const all = (await Promise.all(bs.map(b => getTasks(b.id)))).flat();
            setTasks(all);
        })();
    }, [activeProject]);
    // 项目 CRUD
    async function addProject() {
        const name = prompt('项目名称')?.trim();
        if (!name)
            return;
        const p = await createProject({ name });
        setProjects(prev => [...prev, p]);
        setActiveProject(p.id);
    }
    async function renameProject(id) {
        const name = prompt('新名称')?.trim();
        if (!name)
            return;
        const p = await updateProject(id, { name });
        setProjects(prev => prev.map(x => x.id === id ? p : x));
    }
    async function removeProject(id) {
        if (!confirm('删除项目？'))
            return;
        await deleteProject(id);
        setProjects(prev => prev.filter(x => x.id !== id));
        if (activeProject === id)
            setActiveProject(null);
    }
    // 看板 CRUD
    async function addBoard() {
        if (activeProject == null)
            return;
        const name = prompt('看板名称')?.trim();
        if (!name)
            return;
        const b = await createBoard(activeProject, { name });
        setBoards(prev => {
            const next = [...prev, b];
            if (formBoardId == null)
                setFormBoardId(b.id);
            return next;
        });
    }
    async function renameBoard(id) {
        const name = prompt('新名称')?.trim();
        if (!name)
            return;
        const b = await updateBoard(id, { name });
        setBoards(prev => prev.map(x => x.id === id ? b : x));
    }
    async function removeBoard(id) {
        if (!confirm('删除看板？'))
            return;
        await deleteBoard(id);
        setBoards(prev => prev.filter(x => x.id !== id));
        setTasks(prev => prev.filter(t => t.board_id !== id));
        if (formBoardId === id)
            setFormBoardId(prev => boards.find(b => b.id !== id)?.id ?? null);
    }
    // 任务 CRUD 与操作
    async function addTask() {
        if (formBoardId == null)
            return;
        if (!form.title.trim())
            return;
        const payload = {
            title: form.title.trim(),
            description: form.description?.trim() || undefined,
            priority: form.priority,
            is_today: form.is_today,
            due_date: form.due ? new Date(form.due).toISOString() : undefined,
            remind_at: form.remind ? new Date(form.remind).toISOString() : undefined,
            status: 'todo',
        };
        const t = await createTask(formBoardId, payload);
        setTasks(prev => [...prev, t]);
        setForm({ title: '', description: '', priority: 'normal', is_today: false, due: '', remind: '' });
    }
    async function renameTask(id) {
        const title = prompt('新标题')?.trim();
        if (!title)
            return;
        const t = await updateTask(id, { title });
        setTasks(prev => prev.map(x => x.id === id ? t : x));
    }
    async function removeTask(id) {
        if (!confirm('删除任务？'))
            return;
        await deleteTask(id);
        setTasks(prev => prev.filter(x => x.id !== id));
    }
    function nextStatus(s) { if (s === 'todo')
        return 'doing'; if (s === 'doing')
        return 'done'; return 'todo'; }
    async function cycleStatus(id) {
        const cur = tasks.find(t => t.id === id);
        const s = nextStatus(cur?.status);
        const t = await updateTask(id, { status: s });
        setTasks(prev => prev.map(x => x.id === id ? t : x));
    }
    async function toggleToday(id) {
        const cur = tasks.find(t => t.id === id);
        const t = await updateTask(id, { is_today: !cur?.is_today });
        setTasks(prev => prev.map(x => x.id === id ? t : x));
    }
    async function setDueDate(id) {
        const cur = tasks.find(t => t.id === id);
        const d = prompt('设置截止日期 (YYYY-MM-DD)，留空清除', (cur?.due_date ?? '').slice(0, 10));
        const iso = d ? new Date(d).toISOString() : null;
        const t = await updateTask(id, { due_date: iso });
        setTasks(prev => prev.map(x => x.id === id ? t : x));
    }
    // ---- 时间显示与解析辅助 ----
    const hasTZ = (s) => /[zZ]|[+\-]\d{2}:?\d{2}$/.test(s);
    const parseServerDateTime = (s) => {
        if (!s)
            return null;
        try {
            const str = String(s);
            const iso = hasTZ(str) ? str : str + 'Z';
            const d = new Date(iso);
            if (isNaN(d.getTime()))
                return new Date(str);
            return d;
        }
        catch {
            return null;
        }
    };
    const formatLocalDateTime = (s) => {
        const d = parseServerDateTime(s);
        return d ? d.toLocaleString() : '';
    };
    const toLocalInputValue = (s) => {
        const d = parseServerDateTime(s);
        if (!d)
            return '';
        const pad = (n) => String(n).padStart(2, '0');
        const yyyy = d.getFullYear();
        const mm = pad(d.getMonth() + 1);
        const dd = pad(d.getDate());
        const hh = pad(d.getHours());
        const mi = pad(d.getMinutes());
        return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
    };
    async function setRemindAt(id) {
        const cur = tasks.find(t => t.id === id);
        const init = toLocalInputValue(cur?.remind_at);
        const v = prompt('设置提醒时间 (YYYY-MM-DDTHH:mm)，留空清除', init);
        const iso = v ? new Date(v).toISOString() : null;
        const t = await updateTask(id, { remind_at: iso });
        setTasks(prev => prev.map(x => x.id === id ? t : x));
    }
    const columns = ['todo', 'doing', 'done'];
    const tasksByStatus = {
        todo: tasks.filter(t => (t.status ?? 'todo') === 'todo'),
        doing: tasks.filter(t => t.status === 'doing'),
        done: tasks.filter(t => t.status === 'done'),
    };
    function priorityChipColor(p) { return p === 'high' ? 'error' : p === 'low' ? 'success' : 'default'; }
    function isOverdue(d) { if (!d)
        return false; try {
        return new Date(d) < new Date(new Date().toDateString());
    }
    catch {
        return false;
    } }
    return (_jsxs(Box, { display: "grid", gap: 3, sx: { gridTemplateColumns: { xs: '1fr', md: '280px 1fr' } }, children: [_jsx(Box, { children: _jsxs(Paper, { variant: "outlined", children: [_jsxs(Box, { p: 2, display: "flex", alignItems: "center", justifyContent: "space-between", children: [_jsx(Typography, { fontWeight: 600, children: "\u9879\u76EE" }), _jsx(Button, { size: "small", onClick: addProject, children: "+ \u65B0\u5EFA" })] }), _jsx(Divider, {}), _jsx(Box, { p: 1, children: _jsx(Stack, { spacing: 1, children: projects.map(p => (_jsx(Paper, { variant: activeProject === p.id ? 'elevation' : 'outlined', sx: { p: 1, cursor: 'pointer' }, onClick: () => setActiveProject(p.id), children: _jsxs(Stack, { direction: "row", alignItems: "center", justifyContent: "space-between", children: [_jsx(Typography, { children: p.name }), _jsxs(Stack, { direction: "row", spacing: 0.5, children: [_jsx(IconButton, { size: "small", onClick: (e) => { e.stopPropagation(); renameProject(p.id); }, children: _jsx(EditIcon, { fontSize: "small" }) }), _jsx(IconButton, { size: "small", color: "error", onClick: (e) => { e.stopPropagation(); removeProject(p.id); }, children: _jsx(DeleteIcon, { fontSize: "small" }) })] })] }) }, p.id))) }) })] }) }), _jsx(Box, { children: _jsxs(Stack, { spacing: 3, children: [_jsx(Paper, { variant: "outlined", children: _jsxs(Box, { p: 2, children: [_jsx(Typography, { fontWeight: 600, mb: 1, children: "\u62D6\u62FD\u79FB\u52A8\uFF08\u6309\u72B6\u6001\uFF09" }), _jsx(DragDropContext, { onDragEnd: async (result) => {
                                            const { destination, source, draggableId } = result;
                                            if (!destination)
                                                return;
                                            const from = source.droppableId;
                                            const to = destination.droppableId;
                                            if (from === to && source.index === destination.index)
                                                return;
                                            const id = parseInt(draggableId, 10);
                                            try {
                                                await updateTask(id, { status: to });
                                                setTasks(prev => prev.map(x => x.id === id ? { ...x, status: to } : x));
                                            }
                                            catch { }
                                        }, children: _jsx(Box, { display: "grid", gap: 2, sx: { gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' } }, children: columns.map(col => (_jsx(Box, { children: _jsxs(Paper, { variant: "outlined", sx: { p: 1, minHeight: 220 }, children: [_jsx(Typography, { variant: "subtitle2", fontWeight: 600, textTransform: "capitalize", mb: 1, children: col }), _jsx(Droppable, { droppableId: col, children: (provided) => (_jsxs(Stack, { ref: provided.innerRef, ...provided.droppableProps, spacing: 1, sx: { minHeight: 140 }, children: [tasksByStatus[col].map((t, index) => (_jsx(Draggable, { draggableId: String(t.id), index: index, children: (drag) => (_jsx(Card, { ref: drag.innerRef, ...drag.draggableProps, ...drag.dragHandleProps, variant: "outlined", children: _jsxs(CardContent, { sx: { py: 1.5 }, children: [_jsxs(Stack, { direction: "row", justifyContent: "space-between", alignItems: "flex-start", children: [_jsx(Typography, { fontWeight: 600, children: t.title }), _jsx(Chip, { size: "small", color: priorityChipColor(t.priority), label: t.priority ?? 'normal' })] }), _jsxs(Stack, { direction: "row", spacing: 1, alignItems: "center", mt: 0.5, children: [t.due_date && (_jsxs(Typography, { variant: "caption", color: isOverdue(t.due_date) ? 'error' : 'text.secondary', children: ["\u622A\u6B62: ", new Date(t.due_date).toLocaleDateString()] })), _jsxs(Typography, { variant: "caption", children: ["\u4ECA\u65E5: ", t.is_today ? '✓' : '✗'] })] })] }) })) }, t.id))), provided.placeholder, tasksByStatus[col].length === 0 && (_jsx(Typography, { variant: "caption", color: "text.secondary", children: "\u65E0\u4EFB\u52A1" }))] })) })] }) }, col))) }) })] }) }), _jsx(Paper, { variant: "outlined", children: _jsxs(Box, { p: 2, children: [_jsx(Typography, { fontWeight: 600, mb: 1, children: "\u65B0\u5EFA\u4EFB\u52A1" }), _jsxs(Stack, { spacing: 1.5, children: [_jsx(TextField, { size: "small", label: "\u6807\u9898", value: form.title, onChange: e => setForm(f => ({ ...f, title: e.target.value })) }), _jsx(TextField, { size: "small", label: "\u63CF\u8FF0\uFF08\u53EF\u9009\uFF09", multiline: true, minRows: 2, value: form.description, onChange: e => setForm(f => ({ ...f, description: e.target.value })) }), _jsxs(Stack, { direction: { xs: 'column', sm: 'row' }, spacing: 2, alignItems: { xs: 'stretch', sm: 'center' }, children: [_jsxs(FormControl, { size: "small", sx: { minWidth: 160 }, children: [_jsx(InputLabel, { id: "board-select", children: "\u770B\u677F" }), _jsxs(Select, { labelId: "board-select", value: formBoardId ?? '', label: "\u770B\u677F", onChange: e => setFormBoardId(e.target.value ? Number(e.target.value) : null), children: [boards.length === 0 && _jsx(MenuItem, { value: "", children: "\u65E0\u53EF\u7528\u770B\u677F" }), boards.map(b => _jsx(MenuItem, { value: b.id, children: b.name }, b.id))] })] }), _jsxs(FormControl, { size: "small", sx: { minWidth: 160 }, children: [_jsx(InputLabel, { id: "priority-select", children: "\u4F18\u5148\u7EA7" }), _jsxs(Select, { labelId: "priority-select", value: form.priority, label: "\u4F18\u5148\u7EA7", onChange: e => setForm(f => ({ ...f, priority: e.target.value })), children: [_jsx(MenuItem, { value: "low", children: "\u4F4E" }), _jsx(MenuItem, { value: "normal", children: "\u4E2D" }), _jsx(MenuItem, { value: "high", children: "\u9AD8" })] })] }), _jsx(FormControlLabel, { control: _jsx(Checkbox, { checked: form.is_today, onChange: e => setForm(f => ({ ...f, is_today: e.target.checked })) }), label: "\u52A0\u5165\u4ECA\u65E5" }), _jsx(TextField, { size: "small", type: "date", label: "\u622A\u6B62", InputLabelProps: { shrink: true }, value: form.due, onChange: e => setForm(f => ({ ...f, due: e.target.value })) }), _jsx(TextField, { size: "small", type: "datetime-local", label: "\u63D0\u9192\u65F6\u95F4", InputLabelProps: { shrink: true }, value: form.remind, onChange: e => setForm(f => ({ ...f, remind: e.target.value })) }), _jsx(Box, { flex: 1 }), _jsx(Button, { variant: "contained", onClick: addTask, disabled: !form.title.trim() || !formBoardId, children: "\u521B\u5EFA" })] })] })] }) }), _jsxs(Stack, { spacing: 2, children: [_jsxs(Stack, { direction: "row", alignItems: "center", justifyContent: "space-between", children: [_jsx(Typography, { fontWeight: 600, children: "\u770B\u677F" }), _jsx(Button, { size: "small", onClick: addBoard, children: "+ \u65B0\u5EFA\u770B\u677F" })] }), boards.map(b => (_jsxs(Paper, { variant: "outlined", children: [_jsxs(Box, { px: 2, py: 1.5, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: 1, borderColor: "divider", children: [_jsx(Typography, { fontWeight: 600, children: b.name }), _jsxs(Stack, { direction: "row", spacing: 1, children: [_jsx(Button, { size: "small", startIcon: _jsx(EditIcon, {}), onClick: () => renameBoard(b.id), children: "\u6539\u540D" }), _jsx(Button, { size: "small", color: "error", startIcon: _jsx(DeleteIcon, {}), onClick: () => removeBoard(b.id), children: "\u5220\u9664" })] })] }), _jsx(Box, { p: 2, children: _jsxs(Stack, { spacing: 1.5, children: [tasks.filter(t => t.board_id === b.id).map(t => (_jsx(Card, { variant: "outlined", children: _jsx(CardContent, { sx: { py: 1.5 }, children: _jsxs(Stack, { direction: "row", justifyContent: "space-between", alignItems: "flex-start", children: [_jsxs(Box, { children: [_jsx(Typography, { fontWeight: 600, children: t.title }), t.description && _jsx(Typography, { variant: "body2", color: "text.secondary", children: t.description }), _jsxs(Stack, { direction: "row", spacing: 1, alignItems: "center", mt: 0.5, children: [_jsx(Chip, { size: "small", label: `状态: ${t.status ?? 'todo'}` }), _jsx(Chip, { size: "small", color: priorityChipColor(t.priority), label: t.priority ?? 'normal' }), t.due_date && (_jsxs(Typography, { variant: "caption", color: isOverdue(t.due_date) ? 'error' : 'text.secondary', children: ["\u622A\u6B62: ", new Date(t.due_date).toLocaleDateString()] })), t.remind_at && (_jsxs(Typography, { variant: "caption", color: "text.secondary", children: ["\u63D0\u9192: ", formatLocalDateTime(t.remind_at)] })), _jsxs(Typography, { variant: "caption", children: ["\u4ECA\u65E5: ", t.is_today ? '✓' : '✗'] })] })] }), _jsxs(Stack, { direction: "row", spacing: 1, children: [_jsx(Button, { size: "small", onClick: () => cycleStatus(t.id), children: "\u5207\u6362\u72B6\u6001" }), _jsx(Button, { size: "small", onClick: () => toggleToday(t.id), children: t.is_today ? '移出今日' : '加入今日' }), _jsx(Button, { size: "small", onClick: () => setDueDate(t.id), children: "\u622A\u6B62\u65E5\u671F" }), _jsx(Button, { size: "small", onClick: () => setRemindAt(t.id), children: "\u63D0\u9192\u65F6\u95F4" }), _jsx(Button, { size: "small", onClick: () => renameTask(t.id), children: "\u91CD\u547D\u540D" }), _jsx(Button, { size: "small", color: "error", onClick: () => removeTask(t.id), children: "\u5220\u9664" })] })] }) }) }, t.id))), tasks.filter(t => t.board_id === b.id).length === 0 && (_jsx(Typography, { variant: "body2", color: "text.secondary", children: "\u8BE5\u770B\u677F\u6682\u65E0\u4EFB\u52A1" }))] }) })] }, b.id))), boards.length === 0 && _jsx(Typography, { color: "text.secondary", children: "\u8BE5\u9879\u76EE\u6682\u65E0\u770B\u677F" })] })] }) })] }));
}
