from __future__ import annotations

from datetime import datetime
from apscheduler.schedulers.asyncio import AsyncIOScheduler


scheduler: AsyncIOScheduler | None = None


def start_scheduler() -> AsyncIOScheduler:
    global scheduler
    if scheduler is None:
        scheduler = AsyncIOScheduler()
        scheduler.start()
    return scheduler


def add_daily_job(func, hour: int = 21, minute: int = 0):
    sch = start_scheduler()
    sch.add_job(func, "cron", hour=hour, minute=minute, id=f"daily-{hour}-{minute}")
