# Todo 服务后端 API 文档

本文件面向移动端开发者，基于仓库实际实现（参见 `server/app/api/routes/*.py`）整理。当前代码已对除注册/登录外的所有路由强制启用 JWT 鉴权，并按用户隔离数据与缓存。

- 基础协议：HTTP/1.1 + JSON（UTF-8）
- 基础 URL：`http://<server-host>:8000`
- 认证方式（建议）：JWT Bearer（`Authorization: Bearer <token>`）
- 时间格式：ISO 8601（UTC 或带时区），如：`2025-09-17T08:00:00Z`
- 时间格式：ISO 8601（UTC 或带时区），如：`2025-09-17T08:00:00Z`
- 时区：通过环境变量 `TIMEZONE` 配置（默认 `UTC`；中国大陆推荐 `Asia/Shanghai`）；服务端调度使用该时区。
- 状态枚举：`status ∈ { todo, doing, done }`（默认 `todo`）
- 优先级：`priority` 示例实现为 `normal`/`high` 等（默认 `normal`）
- 错误响应：`{"detail": "..."}`

---

## 1. 鉴权与用户

### 1.1 注册

- POST `/auth/register`
- Body

```json
{
  "email": "user@example.com",
  "password": "P@ssw0rd!"
}
```

- 200 OK 返回用户信息（示例 `UserOut`）

```json
{
  "id": 1,
  "email": "user@example.com",
  "created_at": "2025-09-17T08:00:00Z"
}
```

- 400 Email already registered

### 1.2 登录

- POST `/auth/login`
- Body（`application/x-www-form-urlencoded`）
  - `username`（邮箱）
  - `password`

- 200 OK

```json
{
  "access_token": "<jwt>",
  "token_type": "bearer"
}
```

- 401 Incorrect email or password

### 1.3 当前用户信息

- GET `/users/me`
- 200 OK

```json
{
  "id": 1,
  "email": "user@example.com"
}
```

---

## 2. 项目（Projects）

路由定义：`server/app/api/routes/projects.py`

### 2.1 列表项目（需认证）

- GET `/projects`
- 200 OK

```json
[
  { "id": 1, "name": "Work", "created_at": "2025-09-17T08:00:00Z" }
]
```

### 2.2 新建项目（需认证）

- POST `/projects`
- Body

```json
{ "name": "New Project", "description": "Optional" }
```

- 200 OK（创建后的完整 Project）

### 2.3 更新项目（需认证）

- PATCH `/projects/{project_id}`
- Body（部分更新）

```json
{ "name": "Renamed" }
```

- 200 OK

### 2.4 删除项目（需认证）

- DELETE `/projects/{project_id}`
- 200 OK `{ "message": "deleted" }`

---

## 3. 看板（Boards）

### 3.1 列表看板（按项目，需认证）

- GET `/projects/{project_id}/boards`
- 200 OK：`Board[]`

### 3.2 新建看板（需认证）

- POST `/projects/{project_id}/boards`
- Body

```json
{ "name": "New Board" }
```

- 200 OK：创建后的 `Board`

### 3.3 更新/删除看板（需认证）

- PATCH `/projects/boards/{board_id}`
- DELETE `/projects/boards/{board_id}`
- 200 OK（更新后的对象或 `{ "message": "deleted" }`）

---

## 4. 任务（Tasks）

实体字段（示例）：

```json
{
  "id": 100,
  "project_id": 1,
  "board_id": 10,
  "title": "Implement login",
  "description": "...",
  "status": "todo",
  "priority": "normal",
  "due_date": "2025-09-20T00:00:00Z",
  "remind_at": "2025-09-19T08:30:00Z",
  "is_today": true,
  "created_at": "2025-09-17T08:00:00Z",
  "updated_at": "2025-09-17T08:30:00Z"
}
```

### 4.1 列表任务（按看板，需认证）

- GET `/projects/boards/{board_id}/tasks`
- 200 OK：`Task[]`

字段说明：

- `remind_at`（可选）：单次提醒的时间点，精确到分钟；留空表示不提醒。创建/更新时如提供该字段，服务端会调度一个提醒任务，时间到达后通过 WebSocket 向对应用户推送提醒消息；若更新为 `null` 则取消提醒。

### 4.2 新建任务（需认证）

- POST `/projects/boards/{board_id}/tasks`
- Body（最小集）

```json
{
  "title": "Task title",
  "status": "todo",
  "priority": "normal",
  "due_date": null,
  "is_today": false,
  "remind_at": null
}
```

- 200 OK：创建后的 `Task`

### 4.3 更新任务（需认证）

- PATCH `/projects/tasks/{task_id}`
- Body：任意可编辑字段（部分更新）
- 200 OK：更新后的 `Task`

### 4.4 删除任务（需认证）

- DELETE `/projects/tasks/{task_id}`
- 200 OK `{ "message": "deleted" }`

### 4.5 拖拽更新状态（用部分更新，需认证）

- `PATCH /projects/tasks/{task_id}`，示例 Body：

```json
{ "status": "doing" }
```

- 200 OK：更新后的 `Task`

---

## 5. 子任务（Subtasks）

### 5.1 列表/创建子任务（需认证）

- GET `/projects/tasks/{task_id}/subtasks`
- POST `/projects/tasks/{task_id}/subtasks`

### 5.2 更新/删除子任务（需认证）

- PATCH `/projects/subtasks/{subtask_id}`
- DELETE `/projects/subtasks/{subtask_id}`

---

## 6. 今日视图（Redis 缓存，需认证）

- GET `/projects/today`
- 说明：服务端返回「今天」标记的任务数组，使用 Redis 缓存序列化后的 JSON；相关任务变动会清缓存。
- 200 OK 示例：

```json
[
  {
    "id": 100,
    "title": "...",
    "status": "todo",
    "priority": "normal",
    "due_date": "2025-09-20T00:00:00Z",
    "is_today": true,
    "board_id": 10,
    "project_id": 1
  }
]
```

---

### 7. WebSocket（提醒推送，需认证）

- 连接：`GET /ws`（需携带 JWT）
  - 支持两种方式：
    - 查询参数：`/ws?token=<jwt>`
    - 或请求头：`Authorization: Bearer <jwt>`
- 鉴权：服务端会验证 JWT 并识别 `user_id`，仅向该用户的连接推送消息。
- 提醒：当任务的 `remind_at` 到达时，服务端向对应用户推送提醒消息，前端可用浏览器 Notification 展示。
- 消息格式示例：

```json
{
  "type": "task.reminder",
  "data": { "id": 100, "title": "开会", "remind_at": "2025-09-19T08:30:00Z" }
}
```

---

## 8. 通用约定与错误

- 鉴权：除注册/登录外的所有路由均需 `Authorization: Bearer <jwt>`；过期返回 401。
- 所有权校验：项目、看板、任务、子任务操作均需资源归属当前用户，否则返回 404 以避免信息泄露。
- 缓存隔离：今日视图缓存键包含用户 ID，任务或子任务变更会清除当前用户的缓存。
- 错误码：404 资源不存在；400 参数错误；401 未认证；409 冲突；422 验证失败；500 服务器异常。

---

## 9. PowerShell 示例（pwsh）

建议先设定环境变量：

```powershell
$BASE = "http://localhost:8000"
$TOKEN = "<your_jwt>"
$Headers = @{ Authorization = "Bearer $TOKEN"; 'Content-Type' = 'application/json' }
```

- 注册：

```powershell
$body = @{ email = 'user@example.com'; password = 'P@ssw0rd!' } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "$BASE/auth/register" -Body $body -Headers @{ 'Content-Type' = 'application/json' }
```

- 登录（表单）：

```powershell
$form = @{ username = 'user@example.com'; password = 'P@ssw0rd!' }
$login = Invoke-RestMethod -Method Post -Uri "$BASE/auth/login" -Body $form -ContentType 'application/x-www-form-urlencoded'
$TOKEN = $login.access_token
$Headers = @{ Authorization = "Bearer $TOKEN"; 'Content-Type' = 'application/json' }
```

- 新建项目：

```powershell
$body = @{ name = 'Work' } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "$BASE/projects" -Body $body -Headers $Headers
```

- 列表项目：

```powershell
Invoke-RestMethod -Method Get -Uri "$BASE/projects" -Headers $Headers
```

- 列表某看板任务：

```powershell
Invoke-RestMethod -Method Get -Uri "$BASE/projects/boards/10/tasks" -Headers $Headers
```

- 新建任务：

```powershell
$body = @{ title = 'Implement login'; status='todo'; priority='normal' } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "$BASE/projects/boards/10/tasks" -Body $body -Headers $Headers
```

- 更新任务状态（拖拽）：

```powershell
$body = @{ status = 'doing' } | ConvertTo-Json
Invoke-RestMethod -Method Patch -Uri "$BASE/projects/tasks/100" -Body $body -Headers $Headers
```

- 今日视图：

```powershell
Invoke-RestMethod -Method Get -Uri "$BASE/projects/today" -Headers $Headers
```

---

## 10. 版本与变更

- v0.4（2025-09-17）：新增 `TIMEZONE` 环境变量；APScheduler 使用配置时区；`remind_at` 在无时区时按配置时区解释。
- v0.3（2025-09-17）：启用强制 JWT 鉴权（除注册/登录外）、按用户隔离与缓存修订。
- v0.2（2025-09-17）：对齐 `server/app/api/routes`，修正路径/方法/示例。
- v0.1（2025-09-17）：初版草拟。
