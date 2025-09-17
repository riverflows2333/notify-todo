from __future__ import annotations

from datetime import datetime
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from typing import Callable, Awaitable
from zoneinfo import ZoneInfo
from app.core.config import get_settings
import asyncio


scheduler: AsyncIOScheduler | None = None


def start_scheduler() -> AsyncIOScheduler:
    global scheduler
    if scheduler is None:
        tz = ZoneInfo(get_settings().TIMEZONE)
        # Try to bind to the currently running loop (FastAPI/uvicorn loop)
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            loop = None
        scheduler = AsyncIOScheduler(timezone=tz, event_loop=loop)
        scheduler.start()
    return scheduler


def add_daily_job(func, hour: int = 21, minute: int = 0):
    sch = start_scheduler()
    sch.add_job(func, "cron", hour=hour, minute=minute, id=f"daily-{hour}-{minute}")


# util to run async callback from scheduler
def schedule_datetime(job_id: str, when: datetime, coro_factory: Callable[[], Awaitable[None]]):
    sch = start_scheduler()
    # Define an async runner so AsyncIOScheduler can await it
    async def _runner():
        await coro_factory()
    # normalize to timezone-aware datetime in configured TZ
    settings_tz = sch.timezone  # already ZoneInfo
    if when.tzinfo is None:
        # interpret naive datetime as settings timezone
        when = when.replace(tzinfo=settings_tz)
    else:
        # convert to scheduler timezone
        when = when.astimezone(settings_tz)
    sch.add_job(_runner, 'date', run_date=when, id=job_id, replace_existing=True)
