from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

class UserBase(BaseModel):
    username: str
    full_name: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserInDB(UserBase):
    hashed_password: str

class User(UserBase):
    id: str

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class ReportBase(BaseModel):
    patient_id: str
    disorder: str
    confidence: float
    severity: str
    notes: str
    image_url: Optional[str] = None
    annotations: Optional[str] = None # JSON string of annotations

class ReportCreate(ReportBase):
    pass

class Report(ReportBase):
    id: str
    created_at: datetime
    doctor_id: str
