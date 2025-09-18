from datetime import datetime, date
from pydantic import BaseModel


class ProjectBase(BaseModel):
    name: str
    description: str | None = None


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(ProjectBase):
    pass


class ProjectOut(ProjectBase):
    id: int
    owner_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class BoardBase(BaseModel):
    name: str
    project_id: int


class BoardCreate(BoardBase):
    pass


class BoardUpdate(BaseModel):
    name: str | None = None


class BoardOut(BoardBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class TaskBase(BaseModel):
    title: str
    description: str | None = None
    status: str | None = None
    priority: str | None = None
    due_date: date | None = None
    is_today: bool | None = None
    board_id: int
    # 提醒时间（ISO 日期时间，精确到分钟），可为空
    remind_at: datetime | None = None


class TaskCreate(TaskBase):
    pass


class TaskUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    status: str | None = None
    priority: str | None = None
    due_date: date | None = None
    is_today: bool | None = None
    remind_at: datetime | None = None


class TaskOut(TaskBase):
    id: int
    owner_id: int
    created_at: datetime
    updated_at: datetime
    blinko_note_id: str | None = None

    class Config:
        from_attributes = True


class SubtaskBase(BaseModel):
    title: str
    done: bool = False
    task_id: int


class SubtaskCreate(SubtaskBase):
    pass


class SubtaskUpdate(BaseModel):
    title: str | None = None
    done: bool | None = None


class SubtaskOut(SubtaskBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
