import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { getProjects, createProject, updateProject, deleteProject, getBoards, createBoard, updateBoard, deleteBoard, getTasks, createTask, updateTask, deleteTask, } from '../api';
export function ProjectsPage() {
    const [projects, setProjects] = useState([]);
    const [activeProject, setActiveProject] = useState(null);
    const [boards, setBoards] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [formBoardId, setFormBoardId] = useState(null);
    const [form, setForm] = useState({ title: '', description: '', priority: 'normal', is_today: false, due: '' });
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
        setBoards(prev => {
            const next = prev.filter(x => x.id !== id);
            setTasks(ts => ts.filter(t => t.board_id !== id));
            if (formBoardId === id)
                setFormBoardId(next[0]?.id ?? null);
            return next;
        });
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
            status: 'todo',
        };
        const t = await createTask(formBoardId, payload);
        setTasks(prev => [...prev, t]);
        setForm({ title: '', description: '', priority: 'normal', is_today: false, due: '' });
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
    const columns = ['todo', 'doing', 'done'];
    const tasksByStatus = {
        todo: tasks.filter(t => (t.status ?? 'todo') === 'todo'),
        doing: tasks.filter(t => t.status === 'doing'),
        done: tasks.filter(t => t.status === 'done'),
    };
    function priorityBadge(p) {
        const map = { low: 'bg-green-100 text-green-700', normal: 'bg-gray-100 text-gray-700', high: 'bg-red-100 text-red-700' };
        const label = { low: '低', normal: '中', high: '高' };
        const key = (p ?? 'normal');
        return _jsxs("span", { className: `text-xs px-2 py-0.5 rounded ${map[key]}`, children: ["\u4F18\u5148\u7EA7:", label[key]] });
    }
    function isOverdue(d) { if (!d)
        return false; try {
        return new Date(d) < new Date(new Date().toDateString());
    }
    catch {
        return false;
    } }
    return (_jsxs("div", { className: "grid grid-cols-12 gap-4", children: [_jsxs("div", { className: "col-span-3", children: [_jsxs("div", { className: "mb-2 flex items-center justify-between", children: [_jsx("h2", { className: "font-semibold", children: "\u9879\u76EE" }), _jsx("button", { onClick: addProject, className: "text-sm text-blue-600", children: "+ \u65B0\u5EFA" })] }), _jsx("ul", { className: "space-y-1", children: projects.map(p => (_jsx("li", { className: `px-2 py-1 rounded cursor-pointer ${activeProject === p.id ? 'bg-blue-50' : ''}`, onClick: () => setActiveProject(p.id), children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsx("span", { children: p.name }), _jsxs("div", { className: "text-xs text-gray-500 space-x-2", children: [_jsx("button", { onClick: (e) => { e.stopPropagation(); renameProject(p.id); }, children: "\u6539\u540D" }), _jsx("button", { onClick: (e) => { e.stopPropagation(); removeProject(p.id); }, children: "\u5220\u9664" })] })] }) }, p.id))) })] }), _jsxs("div", { className: "col-span-9", children: [_jsxs("div", { className: "mb-4", children: [_jsx("h2", { className: "font-semibold mb-2", children: "\u62D6\u62FD\u79FB\u52A8\uFF08\u6309\u72B6\u6001\uFF09" }), _jsx(DragDropContext, { onDragEnd: async (result) => {
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
                                }, children: _jsx("div", { className: "grid grid-cols-3 gap-3", children: columns.map(col => (_jsxs("div", { className: "bg-gray-50 rounded border p-2 min-h-[200px]", children: [_jsx("div", { className: "font-semibold capitalize mb-2", children: col }), _jsx(Droppable, { droppableId: col, children: (provided) => (_jsxs("div", { ref: provided.innerRef, ...provided.droppableProps, className: "space-y-2 min-h-[100px]", children: [tasksByStatus[col].map((t, index) => (_jsx(Draggable, { draggableId: String(t.id), index: index, children: (drag) => (_jsxs("div", { ref: drag.innerRef, ...drag.draggableProps, ...drag.dragHandleProps, className: "bg-white rounded border p-2", children: [_jsxs("div", { className: "flex items-start justify-between", children: [_jsx("div", { className: "font-medium", children: t.title }), _jsx("div", { className: "text-xs space-x-2", children: priorityBadge(t.priority) })] }), _jsxs("div", { className: "text-xs text-gray-600 mt-1 flex items-center gap-2", children: [t.due_date && (_jsxs("span", { className: isOverdue(t.due_date) ? 'text-red-600' : '', children: ["\u622A\u6B62: ", new Date(t.due_date).toLocaleDateString()] })), _jsxs("span", { children: ["\u4ECA\u65E5: ", t.is_today ? '✓' : '✗'] })] })] })) }, t.id))), provided.placeholder, tasksByStatus[col].length === 0 && _jsx("div", { className: "text-xs text-gray-500", children: "\u65E0\u4EFB\u52A1" })] })) })] }, col))) }) })] }), _jsxs("div", { className: "mb-4", children: [_jsx("h2", { className: "font-semibold mb-2", children: "\u65B0\u5EFA\u4EFB\u52A1" }), _jsxs("div", { className: "bg-white border rounded p-3 space-y-2", children: [_jsx("input", { className: "w-full border px-2 py-1 rounded", placeholder: "\u6807\u9898", value: form.title, onChange: e => setForm(f => ({ ...f, title: e.target.value })) }), _jsx("textarea", { className: "w-full border px-2 py-1 rounded", placeholder: "\u63CF\u8FF0\uFF08\u53EF\u9009\uFF09", value: form.description, onChange: e => setForm(f => ({ ...f, description: e.target.value })) }), _jsxs("div", { className: "flex items-center gap-3 text-sm", children: [_jsxs("label", { className: "flex items-center gap-1", children: [_jsx("span", { children: "\u770B\u677F" }), _jsxs("select", { className: "border rounded px-1 py-0.5", value: formBoardId ?? '', onChange: e => setFormBoardId(e.target.value ? Number(e.target.value) : null), children: [boards.length === 0 && _jsx("option", { value: "", children: "\u65E0\u53EF\u7528\u770B\u677F" }), boards.map(b => _jsx("option", { value: b.id, children: b.name }, b.id))] })] }), _jsxs("label", { className: "flex items-center gap-1", children: [_jsx("span", { children: "\u4F18\u5148\u7EA7" }), _jsxs("select", { className: "border rounded px-1 py-0.5", value: form.priority, onChange: e => setForm(f => ({ ...f, priority: e.target.value })), children: [_jsx("option", { value: "low", children: "\u4F4E" }), _jsx("option", { value: "normal", children: "\u4E2D" }), _jsx("option", { value: "high", children: "\u9AD8" })] })] }), _jsxs("label", { className: "flex items-center gap-1", children: [_jsx("input", { type: "checkbox", checked: form.is_today, onChange: e => setForm(f => ({ ...f, is_today: e.target.checked })) }), " \u52A0\u5165\u4ECA\u65E5"] }), _jsxs("label", { className: "flex items-center gap-1", children: [_jsx("span", { children: "\u622A\u6B62" }), _jsx("input", { type: "date", className: "border rounded px-1 py-0.5", value: form.due, onChange: e => setForm(f => ({ ...f, due: e.target.value })) })] }), _jsx("button", { onClick: addTask, className: "ml-auto bg-blue-600 text-white text-sm rounded px-2 py-1", disabled: !form.title.trim() || !formBoardId, children: "\u521B\u5EFA" })] })] })] }), _jsxs("div", { children: [_jsxs("div", { className: "mb-2 flex items-center justify-between", children: [_jsx("h2", { className: "font-semibold", children: "\u770B\u677F" }), _jsx("button", { onClick: addBoard, className: "text-sm text-blue-600", children: "+ \u65B0\u5EFA\u770B\u677F" })] }), _jsxs("div", { className: "space-y-3", children: [boards.map(b => (_jsxs("div", { className: "bg-white border rounded", children: [_jsxs("div", { className: "px-3 py-2 border-b flex items-center justify-between", children: [_jsx("div", { className: "font-medium", children: b.name }), _jsxs("div", { className: "text-xs text-gray-600 space-x-3", children: [_jsx("button", { onClick: () => renameBoard(b.id), children: "\u6539\u540D" }), _jsx("button", { onClick: () => removeBoard(b.id), className: "text-red-600", children: "\u5220\u9664" })] })] }), _jsxs("ul", { className: "p-3 space-y-2", children: [tasks.filter(t => t.board_id === b.id).map(t => (_jsx("li", { className: "bg-gray-50 rounded border px-3 py-2", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("div", { className: "font-medium", children: t.title }), _jsxs("div", { className: "text-xs text-gray-600 mt-1 space-x-2", children: [_jsxs("span", { children: ["\u72B6\u6001: ", t.status ?? 'todo'] }), priorityBadge(t.priority), t.due_date && _jsxs("span", { className: isOverdue(t.due_date) ? 'text-red-600' : '', children: ["\u622A\u6B62: ", new Date(t.due_date).toLocaleDateString()] }), _jsxs("span", { children: ["\u4ECA\u65E5: ", t.is_today ? '✓' : '✗'] })] }), t.description && _jsx("div", { className: "text-xs text-gray-600 mt-1", children: t.description })] }), _jsxs("div", { className: "text-xs text-gray-600 space-x-3", children: [_jsx("button", { onClick: () => cycleStatus(t.id), children: "\u5207\u6362\u72B6\u6001" }), _jsx("button", { onClick: () => toggleToday(t.id), children: t.is_today ? '移出今日' : '加入今日' }), _jsx("button", { onClick: () => setDueDate(t.id), children: "\u622A\u6B62\u65E5\u671F" }), _jsx("button", { onClick: () => renameTask(t.id), children: "\u91CD\u547D\u540D" }), _jsx("button", { onClick: () => removeTask(t.id), className: "text-red-600", children: "\u5220\u9664" })] })] }) }, t.id))), tasks.filter(t => t.board_id === b.id).length === 0 && (_jsx("div", { className: "text-xs text-gray-500", children: "\u8BE5\u770B\u677F\u6682\u65E0\u4EFB\u52A1" }))] })] }, b.id))), boards.length === 0 && _jsx("div", { className: "text-gray-500", children: "\u8BE5\u9879\u76EE\u6682\u65E0\u770B\u677F" })] })] })] })] }));
}
