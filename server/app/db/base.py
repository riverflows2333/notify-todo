from app.db.session import Base  # noqa: F401

# Import all models here so that Base.metadata.create_all sees them
from app.models.user import User  # noqa: F401
from app.models.project import Project  # noqa: F401
from app.models.board import Board  # noqa: F401
from app.models.task import Task  # noqa: F401
from app.models.subtask import Subtask  # noqa: F401
from app.models.integration import IntegrationSetting  # noqa: F401
