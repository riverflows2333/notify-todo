from __future__ import annotations

from typing import Optional, Any, Sequence
import httpx


async def upsert_todo(base_url: str, token: str, content: str, note_id: str | None = None, title: str | None = None) -> Optional[str]:
    url = base_url.rstrip('/') + '/api/v1/note/upsert'
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {token.strip().removeprefix("Bearer ").strip()}',
    }
    payload = { 'content': content, 'type': 2 }
    if title:
        payload['title'] = title
    if note_id:
        payload['id'] = note_id
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.post(url, headers=headers, json=payload)
        r.raise_for_status()
        data = r.json()
        # Try to extract note id if Blinko returns it; fallback None
        return str(data.get('id') or data.get('data', {}).get('id') or '') or None


def _auth_header(token: str) -> dict[str, str]:
    return {
        'Authorization': f'Bearer {token.strip().removeprefix("Bearer ").strip()}',
    }


async def get_note_detail(base_url: str, token: str, note_id: str) -> dict[str, Any] | None:
    url = base_url.rstrip('/') + '/api/v1/note/detail'
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.post(url, headers=_auth_header(token), json={'id': note_id})
        if r.status_code == 404:
            return None
        r.raise_for_status()
        return r.json()


async def list_notes_by_ids(base_url: str, token: str, ids: Sequence[str]) -> list[dict[str, Any]]:
    url = base_url.rstrip('/') + '/api/v1/note/list-by-ids'
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.post(url, headers=_auth_header(token), json={'ids': list(ids)})
        r.raise_for_status()
        data = r.json()
        if isinstance(data, dict) and 'data' in data and isinstance(data['data'], list):
            return data['data']  # common pattern
        if isinstance(data, list):
            return data
        return []


async def trash_notes(base_url: str, token: str, ids: Sequence[str]) -> None:
    url = base_url.rstrip('/') + '/api/v1/note/batch-trash'
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.post(url, headers=_auth_header(token), json={'ids': list(ids)})
        r.raise_for_status()


async def delete_notes(base_url: str, token: str, ids: Sequence[str]) -> None:
    url = base_url.rstrip('/') + '/api/v1/note/batch-delete'
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.post(url, headers=_auth_header(token), json={'ids': list(ids)})
        r.raise_for_status()
