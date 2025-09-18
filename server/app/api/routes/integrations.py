from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.utils.deps import get_current_user
from app.models.user import User
from app.models.integration import IntegrationSetting
from app.schemas.common import IntegrationSettingCreate, IntegrationSettingOut
from app.models.task import Task
from app.services.blinko import get_note_detail, trash_notes, delete_notes, upsert_todo


router = APIRouter(prefix="/integrations", tags=["integrations"])


@router.get("/blinko", response_model=IntegrationSettingOut | None)
async def get_blinko(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    row = (
        await db.execute(
            select(IntegrationSetting).where(
                IntegrationSetting.user_id == current_user.id,
                IntegrationSetting.provider == 'blinko'
            )
        )
    ).scalars().first()
    return row


@router.post("/blinko", response_model=IntegrationSettingOut)
async def set_blinko(
    data: IntegrationSettingCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if data.provider != 'blinko':
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="provider must be 'blinko'")
    # upsert by (user, provider)
    row = (
        await db.execute(
            select(IntegrationSetting).where(
                IntegrationSetting.user_id == current_user.id,
                IntegrationSetting.provider == 'blinko'
            )
        )
    ).scalars().first()
    if row is None:
        row = IntegrationSetting(provider='blinko', base_url=data.base_url, token=data.token, user_id=current_user.id)
        db.add(row)
    else:
        row.base_url = data.base_url
        row.token = data.token
    await db.commit()
    await db.refresh(row)
    return row


@router.get("/blinko/notes/{task_id}")
async def get_blinko_note_by_task(task_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    task = await db.get(Task, task_id)
    if not task or task.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    if not task.blinko_note_id:
        return {"note": None}
    integ = (
        await db.execute(
            select(IntegrationSetting).where(
                IntegrationSetting.user_id == current_user.id,
                IntegrationSetting.provider == 'blinko'
            )
        )
    ).scalars().first()
    if not integ:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Blinko not configured")
    note = await get_note_detail(integ.base_url, integ.token, task.blinko_note_id)
    return {"note": note}


@router.delete("/blinko/notes/{task_id}")
async def delete_blinko_note_by_task(task_id: int, hard: bool = False, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    task = await db.get(Task, task_id)
    if not task or task.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    if not task.blinko_note_id:
        return {"message": "no blinko mapping"}
    integ = (
        await db.execute(
            select(IntegrationSetting).where(
                IntegrationSetting.user_id == current_user.id,
                IntegrationSetting.provider == 'blinko'
            )
        )
    ).scalars().first()
    if not integ:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Blinko not configured")
    try:
        if hard:
            await delete_notes(integ.base_url, integ.token, [task.blinko_note_id])
        else:
            await trash_notes(integ.base_url, integ.token, [task.blinko_note_id])
        task.blinko_note_id = None
        await db.commit()
        await db.refresh(task)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return {"message": "ok"}


@router.post("/blinko/sync/{task_id}")
async def sync_blinko_note_by_task(task_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    task = await db.get(Task, task_id)
    if not task or task.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    integ = (
        await db.execute(
            select(IntegrationSetting).where(
                IntegrationSetting.user_id == current_user.id,
                IntegrationSetting.provider == 'blinko'
            )
        )
    ).scalars().first()
    if not integ:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Blinko not configured")
    # Compose markdown content similar to projects routes
    lines = [f"**{task.title}**"]
    if task.description:
        lines.append(task.description)
    meta: list[str] = []
    if task.status:
        meta.append(f"状态: {task.status}")
    if task.priority:
        meta.append(f"优先级: {task.priority}")
    if task.due_date:
        meta.append(f"截止: {task.due_date}")
    if task.remind_at:
        meta.append(f"提醒: {task.remind_at} UTC")
    if task.is_today:
        meta.append("今日")
    if meta:
        lines.append("\n" + " | ".join(meta))
    content = "\n\n".join(lines)
    note_id = await upsert_todo(integ.base_url, integ.token, content, note_id=task.blinko_note_id, title=task.title)
    if note_id and note_id != task.blinko_note_id:
        task.blinko_note_id = note_id
        await db.commit()
        await db.refresh(task)
    return {"note_id": task.blinko_note_id}
