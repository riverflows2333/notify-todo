from __future__ import annotations

from typing import List
import logging
from datetime import timezone
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.encoders import jsonable_encoder
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.core.redis import get_redis
from app.models.project import Project
from app.models.board import Board
from app.models.task import Task
from app.models.subtask import Subtask
from app.schemas.project import (
    ProjectCreate, ProjectOut, ProjectUpdate,
    BoardCreate, BoardOut, BoardUpdate,
    TaskCreate, TaskOut, TaskUpdate,
    SubtaskCreate, SubtaskOut, SubtaskUpdate,
)
from app.utils.deps import get_current_user
from app.models.user import User
from app.utils.scheduler import start_scheduler, schedule_datetime
from app.api.routes.ws import manager
from app.models.integration import IntegrationSetting
from app.services.blinko import upsert_todo, trash_notes

router = APIRouter(prefix="/projects", tags=["projects"])
logger = logging.getLogger(__name__)


def today_cache_key(user_id: int) -> str:
    return f"today:{user_id}"


async def _compose_blinko_content(db: AsyncSession, task: Task) -> str:
    """构建用于 Blinko 的简洁 Markdown 内容，包含子任务清单。
    规则：
    - 第一行：粗体标题
    - 第二段（可选）：任务描述
    - 第三段（可选）：元信息（状态/优先级/截止/提醒/今日）以 | 分隔
    - 其后：子任务清单，每行 "- [ ] 标题"；若已完成则 "- [x] 标题"
    """
    lines: list[str] = [f"**{task.title}**"]
    if task.description:
        lines.append(task.description)
    meta: list[str] = []
    if getattr(task, "status", None):
        meta.append(f"状态: {task.status}")
    if getattr(task, "priority", None):
        meta.append(f"优先级: {task.priority}")
    if getattr(task, "due_date", None):
        meta.append(f"截止: {task.due_date}")
    if getattr(task, "remind_at", None):
        meta.append(f"提醒: {task.remind_at} UTC")
    if getattr(task, "is_today", None):
        meta.append("今日")
    if meta:
        lines.append("\n" + " | ".join(meta))
    # 子任务清单
    subs = (
        await db.execute(select(Subtask).where(Subtask.task_id == task.id))
    ).scalars().all()
    if subs:
        checklist = [f"- [{'x' if s.done else ' '}] {s.title}" for s in subs]
        lines.append("")
        lines.extend(checklist)
    return "\n\n".join(lines)


@router.post("/", response_model=ProjectOut)
async def create_project(
    data: ProjectCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = Project(name=data.name, description=data.description, owner_id=current_user.id)
    db.add(project)
    await db.commit()
    await db.refresh(project)
    return project


@router.get("/", response_model=List[ProjectOut])
async def list_projects(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows = (await db.execute(select(Project).where(Project.owner_id == current_user.id))).scalars().all()
    return rows


@router.patch("/{project_id}", response_model=ProjectOut)
async def update_project(
    project_id: int,
    data: ProjectUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    proj = await db.get(Project, project_id)
    if not proj or proj.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(proj, k, v)
    await db.commit()
    await db.refresh(proj)
    return proj


@router.delete("/{project_id}")
async def delete_project(
    project_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    proj = await db.get(Project, project_id)
    if not proj or proj.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    await db.delete(proj)
    await db.commit()
    return {"message": "deleted"}


# Boards
@router.post("/{project_id}/boards", response_model=BoardOut)
async def create_board(
    project_id: int,
    data: BoardCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    proj = await db.get(Project, project_id)
    if not proj or proj.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    board = Board(name=data.name, project_id=project_id)
    db.add(board)
    await db.commit()
    await db.refresh(board)
    return board


@router.get("/{project_id}/boards", response_model=List[BoardOut])
async def list_boards(
    project_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    proj = await db.get(Project, project_id)
    if not proj or proj.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    rows = (await db.execute(select(Board).where(Board.project_id == project_id))).scalars().all()
    return rows


@router.patch("/boards/{board_id}", response_model=BoardOut)
async def update_board(
    board_id: int,
    data: BoardUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    board = await db.get(Board, board_id)
    if not board:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Board not found")
    proj = await db.get(Project, board.project_id)
    if not proj or proj.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Board not found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(board, k, v)
    await db.commit()
    await db.refresh(board)
    return board


@router.delete("/boards/{board_id}")
async def delete_board(
    board_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    board = await db.get(Board, board_id)
    if not board:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Board not found")
    proj = await db.get(Project, board.project_id)
    if not proj or proj.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Board not found")
    await db.delete(board)
    await db.commit()
    return {"message": "deleted"}


# Tasks
@router.post("/boards/{board_id}/tasks", response_model=TaskOut)
async def create_task(
    board_id: int,
    data: TaskCreate,
    db: AsyncSession = Depends(get_db),
    r=Depends(get_redis),
    current_user: User = Depends(get_current_user),
):
    board = await db.get(Board, board_id)
    if not board:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Board not found")
    proj = await db.get(Project, board.project_id)
    if not proj or proj.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Board not found")
    # normalize remind_at for storage: convert to UTC naive to match TIMESTAMP WITHOUT TIME ZONE
    raw_remind = data.remind_at
    persist_remind = None
    if raw_remind is not None:
        persist_remind = (raw_remind.astimezone(timezone.utc).replace(tzinfo=None)
                          if raw_remind.tzinfo is not None else raw_remind)
    task = Task(
        title=data.title,
        description=data.description,
        status=data.status or "todo",
        priority=data.priority or "normal",
        due_date=data.due_date,
        remind_at=persist_remind,
        is_today=data.is_today or False,
        board_id=board_id,
        owner_id=current_user.id,
    )
    db.add(task)
    await db.commit()
    await db.refresh(task)
    # Sync to Blinko if user configured integration
    try:
        integ = (
            await db.execute(
                select(IntegrationSetting).where(
                    IntegrationSetting.user_id == current_user.id,
                    IntegrationSetting.provider == 'blinko'
                )
            )
        ).scalars().first()
        if integ:
            # Compose compact markdown content (with subtasks)
            content = await _compose_blinko_content(db, task)
            note_id = await upsert_todo(integ.base_url, integ.token, content, title=task.title)
            if note_id:
                task.blinko_note_id = note_id
                await db.commit()
                await db.refresh(task)
    except Exception:
        # ignore external integration errors
        pass
    # schedule reminder if needed
    if raw_remind is not None:
        try:
            job_id = f"remind-task-{task.id}"
            async def _notify():
                await manager.send_to_user(current_user.id, f"提醒：{task.title}")
            schedule_datetime(job_id, raw_remind, _notify)
            logger.info("Scheduled reminder %s at %s for user %s", job_id, raw_remind, current_user.id)
        except Exception:
            pass
    await r.delete(today_cache_key(current_user.id))
    return task


@router.get("/boards/{board_id}/tasks", response_model=List[TaskOut])
async def list_tasks(
    board_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    board = await db.get(Board, board_id)
    if not board:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Board not found")
    proj = await db.get(Project, board.project_id)
    if not proj or proj.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Board not found")
    rows = (
        await db.execute(
            select(Task).where(Task.board_id == board_id, Task.owner_id == current_user.id)
        )
    ).scalars().all()
    return rows


@router.patch("/tasks/{task_id}", response_model=TaskOut)
async def update_task(
    task_id: int,
    data: TaskUpdate,
    db: AsyncSession = Depends(get_db),
    r=Depends(get_redis),
    current_user: User = Depends(get_current_user),
):
    task = await db.get(Task, task_id)
    if not task or task.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    payload = data.model_dump(exclude_unset=True)
    # normalize remind_at for storage: UTC naive for TIMESTAMP WITHOUT TIME ZONE
    if "remind_at" in payload:
        v = payload["remind_at"]
        if v is not None and getattr(v, "tzinfo", None) is not None:
            payload["remind_at"] = v.astimezone(timezone.utc).replace(tzinfo=None)
    for k, v in payload.items():
        setattr(task, k, v)
    await db.commit()
    await db.refresh(task)
    # Sync update to Blinko if configured
    try:
        integ = (
            await db.execute(
                select(IntegrationSetting).where(
                    IntegrationSetting.user_id == current_user.id,
                    IntegrationSetting.provider == 'blinko'
                )
            )
        ).scalars().first()
        if integ:
            content = await _compose_blinko_content(db, task)
            note_id = await upsert_todo(integ.base_url, integ.token, content, note_id=task.blinko_note_id, title=task.title)
            if note_id and note_id != task.blinko_note_id:
                task.blinko_note_id = note_id
                await db.commit()
                await db.refresh(task)
    except Exception:
        pass
    # reschedule reminder
    try:
        sch = start_scheduler()
        job_id = f"remind-task-{task.id}"
        if sch.get_job(job_id):
            sch.remove_job(job_id)
        # prefer request payload remind_at (keeps tzinfo); fallback to stored value (naive UTC -> make aware UTC)
        when_req = data.model_dump(exclude_unset=True).get("remind_at")
        when = when_req
        if when is None and task.remind_at is not None:
            when = task.remind_at.replace(tzinfo=timezone.utc)
        if when is not None:
            async def _notify():
                await manager.send_to_user(current_user.id, f"提醒：{task.title}")
            schedule_datetime(job_id, when, _notify)
            logger.info("Rescheduled reminder %s at %s for user %s", job_id, when, current_user.id)
    except Exception:
        pass
    await r.delete(today_cache_key(current_user.id))
    return task


@router.delete("/tasks/{task_id}")
async def delete_task(
    task_id: int,
    db: AsyncSession = Depends(get_db),
    r=Depends(get_redis),
    current_user: User = Depends(get_current_user),
):
    task = await db.get(Task, task_id)
    if not task or task.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    # sync removal to Blinko first (best effort)
    try:
        if task.blinko_note_id:
            integ = (
                await db.execute(
                    select(IntegrationSetting).where(
                        IntegrationSetting.user_id == current_user.id,
                        IntegrationSetting.provider == 'blinko'
                    )
                )
            ).scalars().first()
            if integ:
                # Prefer trash to respect recycle bin; hard delete can be added via param later
                await trash_notes(integ.base_url, integ.token, [task.blinko_note_id])
    except Exception:
        pass
    await db.delete(task)
    await db.commit()
    # cancel reminder
    try:
        sch = start_scheduler()
        job_id = f"remind-task-{task_id}"
        if sch.get_job(job_id):
            sch.remove_job(job_id)
    except Exception:
        pass
    await r.delete(today_cache_key(current_user.id))
    return {"message": "deleted"}


# Subtasks
@router.post("/tasks/{task_id}/subtasks", response_model=SubtaskOut)
async def create_subtask(
    task_id: int,
    data: SubtaskCreate,
    db: AsyncSession = Depends(get_db),
    r=Depends(get_redis),
    current_user: User = Depends(get_current_user),
):
    parent = await db.get(Task, task_id)
    if not parent or parent.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    sub = Subtask(title=data.title, done=data.done, task_id=task_id)
    db.add(sub)
    await db.commit()
    await db.refresh(sub)
    # 触发父任务的 Blinko 同步（最佳努力）
    try:
        integ = (
            await db.execute(
                select(IntegrationSetting).where(
                    IntegrationSetting.user_id == current_user.id,
                    IntegrationSetting.provider == 'blinko'
                )
            )
        ).scalars().first()
        if integ and parent.blinko_note_id:
            content = await _compose_blinko_content(db, parent)
            await upsert_todo(integ.base_url, integ.token, content, note_id=parent.blinko_note_id, title=parent.title)
    except Exception:
        pass
    await r.delete(today_cache_key(current_user.id))
    return sub


@router.patch("/subtasks/{subtask_id}", response_model=SubtaskOut)
async def update_subtask(
    subtask_id: int,
    data: SubtaskUpdate,
    db: AsyncSession = Depends(get_db),
    r=Depends(get_redis),
    current_user: User = Depends(get_current_user),
):
    sub = await db.get(Subtask, subtask_id)
    if not sub:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subtask not found")
    parent = await db.get(Task, sub.task_id)
    if not parent or parent.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subtask not found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(sub, k, v)
    await db.commit()
    await db.refresh(sub)
    # 触发父任务的 Blinko 同步（最佳努力）
    try:
        integ = (
            await db.execute(
                select(IntegrationSetting).where(
                    IntegrationSetting.user_id == current_user.id,
                    IntegrationSetting.provider == 'blinko'
                )
            )
        ).scalars().first()
        if integ and parent.blinko_note_id:
            content = await _compose_blinko_content(db, parent)
            await upsert_todo(integ.base_url, integ.token, content, note_id=parent.blinko_note_id, title=parent.title)
    except Exception:
        pass
    await r.delete(today_cache_key(current_user.id))
    return sub


@router.get("/tasks/{task_id}/subtasks", response_model=List[SubtaskOut])
async def list_subtasks(
    task_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    parent = await db.get(Task, task_id)
    if not parent or parent.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    rows = (
        await db.execute(select(Subtask).where(Subtask.task_id == task_id))
    ).scalars().all()
    return rows


@router.delete("/subtasks/{subtask_id}")
async def delete_subtask(
    subtask_id: int,
    db: AsyncSession = Depends(get_db),
    r=Depends(get_redis),
    current_user: User = Depends(get_current_user),
):
    sub = await db.get(Subtask, subtask_id)
    if not sub:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subtask not found")
    parent = await db.get(Task, sub.task_id)
    if not parent or parent.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subtask not found")
    await db.delete(sub)
    await db.commit()
    # 父任务 Blinko 重同步（最佳努力）
    try:
        integ = (
            await db.execute(
                select(IntegrationSetting).where(
                    IntegrationSetting.user_id == current_user.id,
                    IntegrationSetting.provider == 'blinko'
                )
            )
        ).scalars().first()
        if integ and parent.blinko_note_id:
            content = await _compose_blinko_content(db, parent)
            await upsert_todo(integ.base_url, integ.token, content, note_id=parent.blinko_note_id, title=parent.title)
    except Exception:
        pass
    await r.delete(today_cache_key(current_user.id))
    return {"message": "deleted"}


@router.get("/today", response_model=List[TaskOut])
async def list_today(
    db: AsyncSession = Depends(get_db),
    r=Depends(get_redis),
    current_user: User = Depends(get_current_user),
):
    key = today_cache_key(current_user.id)
    cached = await r.get(key)
    if cached:
        import json
        return json.loads(cached)
    rows = (
        await db.execute(
            select(Task).where(Task.is_today == True, Task.owner_id == current_user.id)  # noqa: E712
        )
    ).scalars().all()
    out = [TaskOut.model_validate(row) for row in rows]
    payload = jsonable_encoder(out)
    import json
    await r.setex(key, 60, json.dumps(payload))
    return out
