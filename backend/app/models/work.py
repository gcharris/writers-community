from sqlalchemy import Column, String, Text, Integer, DateTime, ForeignKey, Float
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid

from app.core.database import Base

class Work(Base):
    __tablename__ = "works"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    author_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    title = Column(String(255), nullable=False)
    genre = Column(String(50))
    content_rating = Column(String(10), default="PG")
    content = Column(Text, nullable=False)
    word_count = Column(Integer)
    summary = Column(Text)
    status = Column(String(20), default="draft")

    # Rating statistics
    rating_average = Column(Float, default=0.0)
    rating_count = Column(Integer, default=0)
    comment_count = Column(Integer, default=0)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    author = relationship("User", back_populates="works")
    sections = relationship("Section", back_populates="work", cascade="all, delete-orphan")
    reading_sessions = relationship("ReadingSession", back_populates="work", cascade="all, delete-orphan")
    comments = relationship("Comment", back_populates="work", cascade="all, delete-orphan")
    ratings = relationship("Rating", back_populates="work", cascade="all, delete-orphan")
