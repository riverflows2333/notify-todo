from __future__ import annotations

from typing import AsyncIterator
import redis.asyncio as aioredis

from app.core.config import get_settings


settings = get_settings()
redis = aioredis.from_url(settings.REDIS_URL, decode_responses=True)


async def get_redis() -> AsyncIterator[aioredis.Redis]:
    yield redis
