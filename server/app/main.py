from __future__ import annotations

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
 

from app.core.config import get_settings
from app.utils.scheduler import add_daily_job, start_scheduler
from app.db.session import engine
from app.db import base  # noqa: F401
from app.api.routes.auth import router as auth_router
from app.api.routes.projects import router as projects_router
from app.api.routes.ws import router as ws_router
from app.api.routes.integrations import router as integrations_router
from app.api.routes.users import router as users_router


settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # create tables if not exist
    async with engine.begin() as conn:
        await conn.run_sync(base.Base.metadata.create_all)
    # start scheduler and add daily summary job placeholder
    start_scheduler()
    def _daily_job():
        # TODO: aggregate today's tasks and push to memos/blinko
        pass
    add_daily_job(_daily_job, hour=21, minute=0)
    yield
    # graceful shutdown


app = FastAPI(title=settings.APP_NAME, debug=settings.APP_DEBUG, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.frontend_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(projects_router)
app.include_router(ws_router)
app.include_router(users_router)
app.include_router(integrations_router)


@app.get("/")
async def root(req: Request):
    # If no Authorization header (unauthenticated browser hit), redirect to frontend login
    auth = req.headers.get("authorization") or req.headers.get("Authorization")
    if not auth:
        return RedirectResponse(settings.frontend_login_url, status_code=302)
    return {"message": "Todolist Server running"}

@app.get("/auth/redirect")
async def auth_redirect(_: Request):
    # Explicit endpoint to redirect browsers to login
    return RedirectResponse(settings.frontend_login_url, status_code=302)
