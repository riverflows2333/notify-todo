from __future__ import annotations

from datetime import datetime, date
from typing import List, TYPE_CHECKING
from enum import Enum
from sqlalchemy import String, Integer, DateTime, Date, ForeignKey, Text, Enum as SAEnum, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base

if TYPE_CHECKING:  # pragma: no cover
    from app.models.board import Board
    from app.models.user import User
    from app.models.subtask import Subtask


class TaskStatusEnum(str, Enum):
    todo = "todo"
    doing = "doing"
    done = "done"


class TaskPriorityEnum(str, Enum):
    low = "low"
    normal = "normal"
    high = "high"


class Task(Base):
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[TaskStatusEnum] = mapped_column(SAEnum(TaskStatusEnum), default=TaskStatusEnum.todo, nullable=False)
    priority: Mapped[TaskPriorityEnum] = mapped_column(SAEnum(TaskPriorityEnum), default=TaskPriorityEnum.normal, nullable=False)
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True, index=True)
    is_today: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)

    board_id: Mapped[int] = mapped_column(ForeignKey("board.id", ondelete="CASCADE"), index=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("user.id", ondelete="CASCADE"), index=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    board: Mapped["Board"] = relationship(back_populates="tasks")
    owner: Mapped["User"] = relationship()
    subtasks: Mapped[List["Subtask"]] = relationship(back_populates="task", cascade="all, delete-orphan")
