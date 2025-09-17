## Todolist Server (FastAPI + PostgreSQL + Redis)

后端使用 FastAPI、SQLAlchemy(Async) 与 Redis，支持基础注册/登录、项目/板块/任务/子任务 CRUD、今日任务缓存、WebSocket 心跳与定时任务骨架，并预留 memos/blinko 同步接口。

### 运行环境
- Python 3.12
- PostgreSQL 16
- Redis 7

### 快速开始
1. 复制 `.env.example` 为 `.env` 并根据需要修改参数。
2. 启动数据库与 Redis（可用 Docker）：
```pwsh
docker compose up -d
```
3. 安装依赖并启动服务：
```pwsh
pip install -U pip
pip install -e .
uvicorn app.main:app --reload --port 8000 --app-dir server
```

接口示例：
- POST `/auth/register` { email, password }
- POST `/auth/login` form-data(username=email, password)
- GET `/projects` 等。

## 前端（client/）

开发启动：

```pwsh
cd client
copy .env.example .env
npm install
npm run dev
```

默认后端地址为 `http://127.0.0.1:8000`，可通过修改 `client/.env` 的 `VITE_API_BASE` 调整。

