from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional

class WorkCreate(BaseModel):
    title: str
    genre: Optional[str] = None
    content_rating: Optional[str] = "PG"
    content: str
    summary: Optional[str] = None

class WorkUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    summary: Optional[str] = None
    status: Optional[str] = None

class WorkResponse(BaseModel):
    id: UUID
    author_id: UUID
    title: str
    genre: Optional[str]
    content_rating: str
    word_count: int
    summary: Optional[str]
    status: str
    created_at: datetime

    class Config:
        from_attributes = True
