from __future__ import annotations

import httpx
from typing import Any


class MemosClient:
    def __init__(self, base_url: str, token: str) -> None:
        self.base_url = base_url.rstrip("/")
        self.token = token

    async def post_memo(self, content: str) -> Any:
        headers = {"Authorization": f"Bearer {self.token}"}
        async with httpx.AsyncClient(base_url=self.base_url, headers=headers, timeout=20.0) as client:
            resp = await client.post("/api/v1/memos", json={"content": content})
            resp.raise_for_status()
            return resp.json()


class BlinkoClient:
    def __init__(self, base_url: str, token: str) -> None:
        self.base_url = base_url.rstrip("/")
        self.token = token

    async def post_note(self, title: str, content: str) -> Any:
        headers = {"Authorization": f"Bearer {self.token}"}
        async with httpx.AsyncClient(base_url=self.base_url, headers=headers, timeout=20.0) as client:
            resp = await client.post("/api/notes", json={"title": title, "content": content})
            resp.raise_for_status()
            return resp.json()
