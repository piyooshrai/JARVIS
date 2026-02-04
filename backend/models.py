from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


class Domain(BaseModel):
    id: str
    name: str
    is_verified: bool


class User(BaseModel):
    id: str
    email: str
    display_name: str
    domain: str
    last_sign_in: Optional[datetime]
    account_enabled: bool
    license_type: Optional[str]
    department: Optional[str]
    manager: Optional[str]


class CreateUserRequest(BaseModel):
    full_name: str
    username: str
    domain: str
    department: Optional[str] = None
    manager_email: Optional[str] = None
    license_type: str = "Business Basic"


class UserListResponse(BaseModel):
    users: List[User]
    total: int
    monthly_cost: float


class AIAnalysisRequest(BaseModel):
    question: str
    context: Optional[dict] = None


class AIAnalysisResponse(BaseModel):
    response: str
    recommendations: Optional[List[str]] = None
