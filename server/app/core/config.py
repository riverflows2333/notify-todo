from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    APP_NAME: str = "Todolist Server"
    APP_ENV: str = "development"
    APP_DEBUG: bool = True
    APP_HOST: str = "0.0.0.0"
    APP_PORT: int = 8000

    FRONTEND_ORIGINS: str = "http://localhost:5173,http://localhost:3000"
    FRONTEND_BASE_URL: str = "http://localhost:5173"
    FRONTEND_LOGIN_PATH: str = "/login"

    SECRET_KEY: str = "change-me"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    DATABASE_URL: str
    REDIS_URL: str = "redis://localhost:6379/0"

    # Timezone for scheduler & datetime interpretation (IANA TZ, e.g., "UTC", "Asia/Shanghai")
    TIMEZONE: str = "UTC"

    MEMOS_BASE_URL: str | None = None
    MEMOS_TOKEN: str | None = None
    BLINKO_BASE_URL: str | None = None
    BLINKO_TOKEN: str | None = None

    @property
    def frontend_origins(self) -> List[str]:
        return [o.strip() for o in self.FRONTEND_ORIGINS.split(",") if o.strip()]

    @property
    def frontend_login_url(self) -> str:
        base = self.FRONTEND_BASE_URL.rstrip('/')
        path = self.FRONTEND_LOGIN_PATH if self.FRONTEND_LOGIN_PATH.startswith('/') else '/' + self.FRONTEND_LOGIN_PATH
        return f"{base}{path}"


@lru_cache
def get_settings() -> Settings:
    return Settings()
