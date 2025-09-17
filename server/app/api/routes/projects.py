from __future__ import annotations

from typing import List
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

router = APIRouter(prefix="/projects", tags=["projects"])


def today_cache_key(user_id: int) -> str:
    return f"today:{user_id}"


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
    task = Task(
        title=data.title,
        description=data.description,
        status=data.status or "todo",
        priority=data.priority or "normal",
        due_date=data.due_date,
        is_today=data.is_today or False,
        board_id=board_id,
        owner_id=current_user.id,
    )
    db.add(task)
    await db.commit()
    await db.refresh(task)
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
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(task, k, v)
    await db.commit()
    await db.refresh(task)
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
    await db.delete(task)
    await db.commit()
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
    await r.delete(today_cache_key(current_user.id))
    return sub


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
