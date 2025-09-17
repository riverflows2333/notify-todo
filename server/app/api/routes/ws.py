from __future__ import annotations

from typing import Dict, Set
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status
from jose import jwt, JWTError
from app.core.config import get_settings


router = APIRouter()
settings = get_settings()


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
    # parse token from query param or Authorization header
    token = websocket.query_params.get("token")
    if not token:
        auth = websocket.headers.get("authorization") or websocket.headers.get("Authorization")
        if auth and auth.lower().startswith("bearer "):
            token = auth.split(" ", 1)[1]
    if not token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        sub = payload.get("sub")
        user_id = int(sub)
    except (JWTError, ValueError, TypeError):
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
    await manager.connect(user_id, websocket)
    try:
        while True:
            _ = await websocket.receive_text()
            await manager.send_to_user(user_id, "pong")
    except WebSocketDisconnect:
        manager.disconnect(user_id, websocket)
