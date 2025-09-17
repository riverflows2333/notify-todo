from __future__ import annotations

from typing import Dict, Set
from fastapi import APIRouter, WebSocket, WebSocketDisconnect


router = APIRouter()


class ConnectionManager:
    def __init__(self) -> None:
        self.active_connections: Dict[int, Set[WebSocket]] = {}

    async def connect(self, user_id: int, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active_connections.setdefault(user_id, set()).add(websocket)

    def disconnect(self, user_id: int, websocket: WebSocket) -> None:
        conns = self.active_connections.get(user_id)
        if conns and websocket in conns:
            conns.remove(websocket)

    async def send_to_user(self, user_id: int, message: str) -> None:
        for ws in list(self.active_connections.get(user_id, set())):
            try:
                await ws.send_text(message)
            except Exception:
                self.disconnect(user_id, ws)


manager = ConnectionManager()


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    # In real usage, you would parse token and get user_id
    user_id = 1
    await manager.connect(user_id, websocket)
    try:
        while True:
            _ = await websocket.receive_text()
            await manager.send_to_user(user_id, "pong")
    except WebSocketDisconnect:
        manager.disconnect(user_id, websocket)
