from pydantic import BaseModel
from datetime import datetime

class IntegrationSettingBase(BaseModel):
	provider: str
	base_url: str
	token: str

class IntegrationSettingCreate(IntegrationSettingBase):
	pass

class IntegrationSettingOut(IntegrationSettingBase):
	id: int
	user_id: int
	created_at: datetime

	class Config:
		from_attributes = True


class Message(BaseModel):
	message: str
