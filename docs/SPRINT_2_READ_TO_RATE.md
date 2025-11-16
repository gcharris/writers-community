# Sprint 2: Read-to-Rate Mechanics

**Goal:** Implement the core "read-to-rate" validation system that ensures genuine engagement before allowing comments and ratings.

**Timeline:** ~8 hours

**Prerequisites:** Sprint 1 complete (authentication, work upload/display)

---

## Overview

Sprint 2 transforms the platform from a simple display system into a genuine engagement platform. Writers get validated feedback from readers who actually read their work, not drive-by ratings.

**Key Innovation:** Backend validation of reading behavior (scroll depth, time on page, reading speed) to unlock commenting and rating privileges.

---

## Database Changes

### New Tables

```sql
-- Track reading sessions
CREATE TABLE reading_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    work_id UUID REFERENCES works(id) ON DELETE CASCADE,
    section_id UUID REFERENCES sections(id) ON DELETE SET NULL,

    -- Tracking metrics
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP,
    time_on_page INTEGER DEFAULT 0,  -- seconds
    scroll_depth INTEGER DEFAULT 0,  -- percentage (0-100)
    scroll_events JSONB DEFAULT '[]',  -- timestamps of scroll events
    reading_speed REAL,  -- words per minute

    -- Validation
    completed BOOLEAN DEFAULT false,
    validated BOOLEAN DEFAULT false,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(user_id, work_id, section_id)
);

-- Sections for chapter-based reading
CREATE TABLE sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_id UUID REFERENCES works(id) ON DELETE CASCADE,

    title VARCHAR(255) NOT NULL,
    order_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    word_count INTEGER NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(work_id, order_index)
);

-- Comments (unlocked after validated reading)
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_id UUID REFERENCES works(id) ON DELETE CASCADE,
    section_id UUID REFERENCES sections(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,

    content TEXT NOT NULL,
    parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,  -- for threads

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ratings (unlocked after full work read)
CREATE TABLE ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_id UUID REFERENCES works(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,

    score INTEGER NOT NULL CHECK (score >= 1 AND score <= 5),
    review TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(user_id, work_id)
);

-- Indices for performance
CREATE INDEX idx_reading_sessions_user ON reading_sessions(user_id);
CREATE INDEX idx_reading_sessions_work ON reading_sessions(work_id);
CREATE INDEX idx_sections_work ON sections(work_id, order_index);
CREATE INDEX idx_comments_work ON comments(work_id);
CREATE INDEX idx_comments_section ON comments(section_id);
CREATE INDEX idx_ratings_work ON ratings(work_id);
```

### Updated Works Table

```sql
-- Add computed fields for ratings
ALTER TABLE works ADD COLUMN rating_average REAL DEFAULT 0.0;
ALTER TABLE works ADD COLUMN rating_count INTEGER DEFAULT 0;
ALTER TABLE works ADD COLUMN comment_count INTEGER DEFAULT 0;
```

---

## Backend Implementation

### Models

**`app/models/section.py`:**
```python
from sqlalchemy import Column, String, Integer, Text, ForeignKey, UUID
from sqlalchemy.orm import relationship
from app.core.database import Base
import uuid

class Section(Base):
    __tablename__ = "sections"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    work_id = Column(UUID(as_uuid=True), ForeignKey("works.id", ondelete="CASCADE"))

    title = Column(String(255), nullable=False)
    order_index = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)
    word_count = Column(Integer, nullable=False)

    # Relationships
    work = relationship("Work", back_populates="sections")
    reading_sessions = relationship("ReadingSession", back_populates="section")
    comments = relationship("Comment", back_populates="section")
```

**`app/models/reading_session.py`:**
```python
from sqlalchemy import Column, Integer, Boolean, ForeignKey, UUID, TIMESTAMP, JSON
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from app.core.database import Base
import uuid
from datetime import datetime

class ReadingSession(Base):
    __tablename__ = "reading_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    work_id = Column(UUID(as_uuid=True), ForeignKey("works.id", ondelete="CASCADE"))
    section_id = Column(UUID(as_uuid=True), ForeignKey("sections.id", ondelete="SET NULL"), nullable=True)

    started_at = Column(TIMESTAMP, default=datetime.utcnow)
    ended_at = Column(TIMESTAMP, nullable=True)
    time_on_page = Column(Integer, default=0)  # seconds
    scroll_depth = Column(Integer, default=0)  # percentage
    scroll_events = Column(JSONB, default=list)
    reading_speed = Column(Integer, nullable=True)  # words per minute

    completed = Column(Boolean, default=False)
    validated = Column(Boolean, default=False)

    # Relationships
    user = relationship("User", back_populates="reading_sessions")
    work = relationship("Work", back_populates="reading_sessions")
    section = relationship("Section", back_populates="reading_sessions")
```

**`app/models/comment.py`:**
```python
from sqlalchemy import Column, String, Text, ForeignKey, UUID, TIMESTAMP
from sqlalchemy.orm import relationship
from app.core.database import Base
import uuid
from datetime import datetime

class Comment(Base):
    __tablename__ = "comments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    work_id = Column(UUID(as_uuid=True), ForeignKey("works.id", ondelete="CASCADE"))
    section_id = Column(UUID(as_uuid=True), ForeignKey("sections.id", ondelete="CASCADE"), nullable=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))

    content = Column(Text, nullable=False)
    parent_id = Column(UUID(as_uuid=True), ForeignKey("comments.id", ondelete="CASCADE"), nullable=True)

    created_at = Column(TIMESTAMP, default=datetime.utcnow)
    updated_at = Column(TIMESTAMP, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    work = relationship("Work", back_populates="comments")
    section = relationship("Section", back_populates="comments")
    user = relationship("User", back_populates="comments")
    replies = relationship("Comment", backref="parent", remote_side=[id])
```

**`app/models/rating.py`:**
```python
from sqlalchemy import Column, Integer, Text, ForeignKey, UUID, TIMESTAMP, CheckConstraint
from sqlalchemy.orm import relationship
from app.core.database import Base
import uuid
from datetime import datetime

class Rating(Base):
    __tablename__ = "ratings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    work_id = Column(UUID(as_uuid=True), ForeignKey("works.id", ondelete="CASCADE"))
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))

    score = Column(Integer, nullable=False)
    review = Column(Text, nullable=True)

    created_at = Column(TIMESTAMP, default=datetime.utcnow)
    updated_at = Column(TIMESTAMP, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        CheckConstraint('score >= 1 AND score <= 5', name='valid_score'),
    )

    # Relationships
    work = relationship("Work", back_populates="ratings")
    user = relationship("User", back_populates="ratings")
```

### Schemas

**`app/schemas/section.py`:**
```python
from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional

class SectionCreate(BaseModel):
    title: str
    order_index: int
    content: str

class SectionUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None

class SectionResponse(BaseModel):
    id: UUID
    work_id: UUID
    title: str
    order_index: int
    content: str
    word_count: int
    created_at: datetime

    class Config:
        from_attributes = True
```

**`app/schemas/reading.py`:**
```python
from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional, List

class ReadingSessionStart(BaseModel):
    work_id: UUID
    section_id: Optional[UUID] = None

class ReadingSessionUpdate(BaseModel):
    time_on_page: int  # seconds
    scroll_depth: int  # percentage (0-100)
    scroll_event: Optional[datetime] = None

class ReadingSessionComplete(BaseModel):
    pass

class ReadingSessionResponse(BaseModel):
    id: UUID
    work_id: UUID
    section_id: Optional[UUID]
    time_on_page: int
    scroll_depth: int
    reading_speed: Optional[int]
    completed: bool
    validated: bool
    started_at: datetime
    ended_at: Optional[datetime]

    class Config:
        from_attributes = True

class ReadingValidationResponse(BaseModel):
    validated: bool
    can_comment: bool
    can_rate: bool
    message: str
```

**`app/schemas/comment.py`:**
```python
from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional, List

class CommentCreate(BaseModel):
    content: str
    section_id: Optional[UUID] = None
    parent_id: Optional[UUID] = None

class CommentUpdate(BaseModel):
    content: str

class CommentResponse(BaseModel):
    id: UUID
    work_id: UUID
    section_id: Optional[UUID]
    user_id: UUID
    username: str  # from join
    content: str
    parent_id: Optional[UUID]
    created_at: datetime
    updated_at: datetime
    replies: List['CommentResponse'] = []

    class Config:
        from_attributes = True
```

**`app/schemas/rating.py`:**
```python
from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime
from typing import Optional

class RatingCreate(BaseModel):
    score: int = Field(..., ge=1, le=5)
    review: Optional[str] = None

class RatingUpdate(BaseModel):
    score: int = Field(..., ge=1, le=5)
    review: Optional[str] = None

class RatingResponse(BaseModel):
    id: UUID
    work_id: UUID
    user_id: UUID
    username: str  # from join
    score: int
    review: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

class WorkRatingStats(BaseModel):
    work_id: UUID
    rating_average: float
    rating_count: int
    rating_distribution: dict  # {1: count, 2: count, ...}
```

### Routes

**`app/routes/reading.py`:**
```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.reading_session import ReadingSession
from app.models.section import Section
from app.models.work import Work
from app.schemas.reading import (
    ReadingSessionStart,
    ReadingSessionUpdate,
    ReadingSessionComplete,
    ReadingSessionResponse,
    ReadingValidationResponse
)
from datetime import datetime, timedelta
import uuid

router = APIRouter(prefix="/api/reading", tags=["reading"])

def calculate_reading_speed(time_seconds: int, word_count: int) -> int:
    """Calculate words per minute."""
    if time_seconds == 0:
        return 0
    minutes = time_seconds / 60
    return int(word_count / minutes)

def validate_reading_session(session: ReadingSession, content_word_count: int) -> bool:
    """
    Validate if user actually read the content.

    Criteria (must pass 2 out of 3):
    1. Time: At least 70% of expected reading time (250 WPM average)
    2. Scroll: At least 80% scroll depth
    3. Speed: Reading speed between 100-500 WPM (realistic range)
    """
    # Expected reading time at 250 WPM
    min_time = (content_word_count / 250) * 60 * 0.7  # 70% of expected

    criteria = {
        "time": session.time_on_page >= min_time,
        "scroll": session.scroll_depth >= 80,
        "speed": session.reading_speed and 100 <= session.reading_speed <= 500
    }

    # Must pass 2 out of 3 criteria
    return sum(criteria.values()) >= 2

@router.post("/start", response_model=ReadingSessionResponse)
async def start_reading_session(
    data: ReadingSessionStart,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Start a new reading session."""

    # Check if session already exists
    existing = db.query(ReadingSession).filter(
        and_(
            ReadingSession.user_id == current_user.id,
            ReadingSession.work_id == data.work_id,
            ReadingSession.section_id == data.section_id
        )
    ).first()

    if existing:
        return existing

    # Create new session
    session = ReadingSession(
        user_id=current_user.id,
        work_id=data.work_id,
        section_id=data.section_id,
        started_at=datetime.utcnow()
    )

    db.add(session)
    db.commit()
    db.refresh(session)

    return session

@router.put("/{session_id}/update", response_model=ReadingSessionResponse)
async def update_reading_session(
    session_id: uuid.UUID,
    data: ReadingSessionUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update reading metrics (called periodically by frontend)."""

    session = db.query(ReadingSession).filter(
        and_(
            ReadingSession.id == session_id,
            ReadingSession.user_id == current_user.id
        )
    ).first()

    if not session:
        raise HTTPException(status_code=404, detail="Reading session not found")

    # Update metrics
    session.time_on_page = data.time_on_page
    session.scroll_depth = data.scroll_depth

    # Track scroll events
    if data.scroll_event:
        events = session.scroll_events or []
        events.append(data.scroll_event.isoformat())
        session.scroll_events = events

    db.commit()
    db.refresh(session)

    return session

@router.post("/{session_id}/complete", response_model=ReadingValidationResponse)
async def complete_reading_session(
    session_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Complete reading session and validate engagement."""

    session = db.query(ReadingSession).filter(
        and_(
            ReadingSession.id == session_id,
            ReadingSession.user_id == current_user.id
        )
    ).first()

    if not session:
        raise HTTPException(status_code=404, detail="Reading session not found")

    # Get content word count
    if session.section_id:
        section = db.query(Section).filter(Section.id == session.section_id).first()
        word_count = section.word_count if section else 0
    else:
        work = db.query(Work).filter(Work.id == session.work_id).first()
        word_count = work.word_count if work else 0

    # Calculate reading speed
    if session.time_on_page > 0:
        session.reading_speed = calculate_reading_speed(session.time_on_page, word_count)

    # Mark as completed
    session.completed = True
    session.ended_at = datetime.utcnow()

    # Validate reading
    session.validated = validate_reading_session(session, word_count)

    db.commit()
    db.refresh(session)

    # Check if user can comment/rate
    can_comment = session.validated
    can_rate = check_can_rate(current_user.id, session.work_id, db)

    message = "Reading validated! You can now comment." if session.validated else \
              "Please read more carefully to unlock commenting."

    return ReadingValidationResponse(
        validated=session.validated,
        can_comment=can_comment,
        can_rate=can_rate,
        message=message
    )

def check_can_rate(user_id: uuid.UUID, work_id: uuid.UUID, db: Session) -> bool:
    """Check if user has read all sections and can rate the work."""

    # Get all sections for work
    sections = db.query(Section).filter(Section.work_id == work_id).all()

    if not sections:
        # No sections, check if user validated reading the main work
        session = db.query(ReadingSession).filter(
            and_(
                ReadingSession.user_id == user_id,
                ReadingSession.work_id == work_id,
                ReadingSession.section_id == None,
                ReadingSession.validated == True
            )
        ).first()
        return session is not None

    # Check if user has validated sessions for all sections
    validated_sessions = db.query(ReadingSession).filter(
        and_(
            ReadingSession.user_id == user_id,
            ReadingSession.work_id == work_id,
            ReadingSession.validated == True
        )
    ).all()

    validated_section_ids = {s.section_id for s in validated_sessions}
    required_section_ids = {s.id for s in sections}

    return required_section_ids.issubset(validated_section_ids)

@router.get("/validation/{work_id}", response_model=ReadingValidationResponse)
async def check_reading_validation(
    work_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Check if user can comment/rate a work."""

    # Check for any validated session
    validated_session = db.query(ReadingSession).filter(
        and_(
            ReadingSession.user_id == current_user.id,
            ReadingSession.work_id == work_id,
            ReadingSession.validated == True
        )
    ).first()

    can_comment = validated_session is not None
    can_rate = check_can_rate(current_user.id, work_id, db)

    if can_rate:
        message = "You can comment and rate this work!"
    elif can_comment:
        message = "You can comment. Read all sections to unlock rating."
    else:
        message = "Read the work to unlock commenting and rating."

    return ReadingValidationResponse(
        validated=can_comment,
        can_comment=can_comment,
        can_rate=can_rate,
        message=message
    )
```

**`app/routes/comments.py`:**
```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.comment import Comment
from app.models.reading_session import ReadingSession
from app.schemas.comment import CommentCreate, CommentUpdate, CommentResponse
from typing import List
import uuid

router = APIRouter(prefix="/api/comments", tags=["comments"])

def check_can_comment(user_id: uuid.UUID, work_id: uuid.UUID, section_id: uuid.UUID, db: Session) -> bool:
    """Check if user has validated reading session."""

    session = db.query(ReadingSession).filter(
        and_(
            ReadingSession.user_id == user_id,
            ReadingSession.work_id == work_id,
            ReadingSession.section_id == section_id if section_id else ReadingSession.section_id == None,
            ReadingSession.validated == True
        )
    ).first()

    return session is not None

@router.post("/works/{work_id}", response_model=CommentResponse, status_code=status.HTTP_201_CREATED)
async def create_comment(
    work_id: uuid.UUID,
    data: CommentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a comment (requires validated reading)."""

    # Verify user can comment
    if not check_can_comment(current_user.id, work_id, data.section_id, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must read the content before commenting"
        )

    comment = Comment(
        work_id=work_id,
        section_id=data.section_id,
        user_id=current_user.id,
        content=data.content,
        parent_id=data.parent_id
    )

    db.add(comment)
    db.commit()
    db.refresh(comment)

    # Add username for response
    comment.username = current_user.username

    return comment

@router.get("/works/{work_id}", response_model=List[CommentResponse])
async def get_work_comments(
    work_id: uuid.UUID,
    section_id: uuid.UUID = None,
    db: Session = Depends(get_db)
):
    """Get all comments for a work or section."""

    query = db.query(Comment).filter(Comment.work_id == work_id)

    if section_id:
        query = query.filter(Comment.section_id == section_id)

    comments = query.join(User).all()

    # Add usernames
    for comment in comments:
        comment.username = comment.user.username

    return comments

@router.put("/{comment_id}", response_model=CommentResponse)
async def update_comment(
    comment_id: uuid.UUID,
    data: CommentUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update own comment."""

    comment = db.query(Comment).filter(
        and_(
            Comment.id == comment_id,
            Comment.user_id == current_user.id
        )
    ).first()

    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    comment.content = data.content
    db.commit()
    db.refresh(comment)

    comment.username = current_user.username
    return comment

@router.delete("/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_comment(
    comment_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete own comment."""

    comment = db.query(Comment).filter(
        and_(
            Comment.id == comment_id,
            Comment.user_id == current_user.id
        )
    ).first()

    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    db.delete(comment)
    db.commit()
```

**`app/routes/ratings.py`:**
```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.rating import Rating
from app.models.work import Work
from app.routes.reading import check_can_rate
from app.schemas.rating import RatingCreate, RatingUpdate, RatingResponse, WorkRatingStats
from typing import List
import uuid

router = APIRouter(prefix="/api/ratings", tags=["ratings"])

@router.post("/works/{work_id}", response_model=RatingResponse, status_code=status.HTTP_201_CREATED)
async def create_rating(
    work_id: uuid.UUID,
    data: RatingCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a rating (requires full work read validation)."""

    # Verify user can rate
    if not check_can_rate(current_user.id, work_id, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must read the entire work before rating"
        )

    # Check if user already rated
    existing = db.query(Rating).filter(
        and_(
            Rating.user_id == current_user.id,
            Rating.work_id == work_id
        )
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already rated this work. Use PUT to update."
        )

    rating = Rating(
        work_id=work_id,
        user_id=current_user.id,
        score=data.score,
        review=data.review
    )

    db.add(rating)
    db.commit()

    # Update work's rating stats
    update_work_rating_stats(work_id, db)

    db.refresh(rating)
    rating.username = current_user.username

    return rating

@router.put("/works/{work_id}", response_model=RatingResponse)
async def update_rating(
    work_id: uuid.UUID,
    data: RatingUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update own rating."""

    rating = db.query(Rating).filter(
        and_(
            Rating.user_id == current_user.id,
            Rating.work_id == work_id
        )
    ).first()

    if not rating:
        raise HTTPException(status_code=404, detail="Rating not found")

    rating.score = data.score
    rating.review = data.review

    db.commit()

    # Update work's rating stats
    update_work_rating_stats(work_id, db)

    db.refresh(rating)
    rating.username = current_user.username

    return rating

@router.get("/works/{work_id}", response_model=List[RatingResponse])
async def get_work_ratings(
    work_id: uuid.UUID,
    db: Session = Depends(get_db)
):
    """Get all ratings for a work."""

    ratings = db.query(Rating).filter(Rating.work_id == work_id).join(User).all()

    for rating in ratings:
        rating.username = rating.user.username

    return ratings

@router.get("/works/{work_id}/stats", response_model=WorkRatingStats)
async def get_work_rating_stats(
    work_id: uuid.UUID,
    db: Session = Depends(get_db)
):
    """Get rating statistics for a work."""

    ratings = db.query(Rating).filter(Rating.work_id == work_id).all()

    if not ratings:
        return WorkRatingStats(
            work_id=work_id,
            rating_average=0.0,
            rating_count=0,
            rating_distribution={1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
        )

    scores = [r.score for r in ratings]
    distribution = {i: scores.count(i) for i in range(1, 6)}

    return WorkRatingStats(
        work_id=work_id,
        rating_average=sum(scores) / len(scores),
        rating_count=len(ratings),
        rating_distribution=distribution
    )

def update_work_rating_stats(work_id: uuid.UUID, db: Session):
    """Update cached rating stats on work."""

    result = db.query(
        func.avg(Rating.score).label("avg"),
        func.count(Rating.id).label("count")
    ).filter(Rating.work_id == work_id).first()

    work = db.query(Work).filter(Work.id == work_id).first()
    if work:
        work.rating_average = float(result.avg) if result.avg else 0.0
        work.rating_count = result.count
        db.commit()
```

### Update `app/main.py`

```python
from app.routes import reading, comments, ratings

app.include_router(reading.router)
app.include_router(comments.router)
app.include_router(ratings.router)
```

---

## Frontend Implementation

### Reading Tracker Hook

**`src/hooks/useReadingTracker.ts`:**
```typescript
import { useState, useEffect, useRef } from 'react';
import { api } from '../api/client';

interface ReadingMetrics {
  sessionId: string | null;
  timeOnPage: number;
  scrollDepth: number;
  isTracking: boolean;
}

export const useReadingTracker = (workId: string, sectionId?: string) => {
  const [metrics, setMetrics] = useState<ReadingMetrics>({
    sessionId: null,
    timeOnPage: 0,
    scrollDepth: 0,
    isTracking: false,
  });

  const startTimeRef = useRef<number>(Date.now());
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Start reading session
  useEffect(() => {
    const startSession = async () => {
      try {
        const response = await api.post('/api/reading/start', {
          work_id: workId,
          section_id: sectionId || null,
        });

        setMetrics(prev => ({
          ...prev,
          sessionId: response.data.id,
          isTracking: true,
        }));

        startTimeRef.current = Date.now();
      } catch (error) {
        console.error('Failed to start reading session:', error);
      }
    };

    startSession();

    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, [workId, sectionId]);

  // Track scroll depth
  useEffect(() => {
    if (!metrics.isTracking) return;

    const handleScroll = () => {
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const scrollTop = window.scrollY;

      const scrollDepth = Math.round(
        ((scrollTop + windowHeight) / documentHeight) * 100
      );

      setMetrics(prev => ({
        ...prev,
        scrollDepth: Math.max(prev.scrollDepth, scrollDepth),
      }));
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [metrics.isTracking]);

  // Update backend every 10 seconds
  useEffect(() => {
    if (!metrics.sessionId || !metrics.isTracking) return;

    updateIntervalRef.current = setInterval(async () => {
      const timeOnPage = Math.floor((Date.now() - startTimeRef.current) / 1000);

      setMetrics(prev => ({ ...prev, timeOnPage }));

      try {
        await api.put(`/api/reading/${metrics.sessionId}/update`, {
          time_on_page: timeOnPage,
          scroll_depth: metrics.scrollDepth,
          scroll_event: new Date().toISOString(),
        });
      } catch (error) {
        console.error('Failed to update reading session:', error);
      }
    }, 10000); // 10 seconds

    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, [metrics.sessionId, metrics.isTracking, metrics.scrollDepth]);

  const completeSession = async () => {
    if (!metrics.sessionId) return null;

    try {
      const response = await api.post(`/api/reading/${metrics.sessionId}/complete`);
      setMetrics(prev => ({ ...prev, isTracking: false }));
      return response.data;
    } catch (error) {
      console.error('Failed to complete reading session:', error);
      return null;
    }
  };

  return {
    metrics,
    completeSession,
  };
};
```

### Updated ViewWork Page

**`src/pages/ViewWork.tsx`:**
```tsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../api/client';
import { useReadingTracker } from '../hooks/useReadingTracker';
import { useAuthStore } from '../stores/authStore';

export const ViewWork = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [commentContent, setCommentContent] = useState('');
  const [canInteract, setCanInteract] = useState({ canComment: false, canRate: false });

  const { metrics, completeSession } = useReadingTracker(id!);

  // Fetch work
  const { data: work, isLoading } = useQuery({
    queryKey: ['work', id],
    queryFn: async () => {
      const res = await api.get(`/api/works/${id}`);
      return res.data;
    },
  });

  // Fetch comments
  const { data: comments, refetch: refetchComments } = useQuery({
    queryKey: ['comments', id],
    queryFn: async () => {
      const res = await api.get(`/api/comments/works/${id}`);
      return res.data;
    },
    enabled: isAuthenticated,
  });

  // Check reading validation
  const { data: validation } = useQuery({
    queryKey: ['validation', id],
    queryFn: async () => {
      const res = await api.get(`/api/reading/validation/${id}`);
      return res.data;
    },
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (validation) {
      setCanInteract({
        canComment: validation.can_comment,
        canRate: validation.can_rate,
      });
    }
  }, [validation]);

  // Create comment mutation
  const createComment = useMutation({
    mutationFn: async (content: string) => {
      await api.post(`/api/comments/works/${id}`, { content });
    },
    onSuccess: () => {
      setCommentContent('');
      setShowCommentForm(false);
      refetchComments();
    },
  });

  const handleCompleteReading = async () => {
    const result = await completeSession();
    if (result) {
      alert(result.message);
      setCanInteract({
        canComment: result.can_comment,
        canRate: result.can_rate,
      });
    }
  };

  const handleSubmitComment = () => {
    if (!canInteract.canComment) {
      alert('You must read the work to unlock commenting');
      return;
    }
    createComment.mutate(commentContent);
  };

  if (isLoading) return <div>Loading...</div>;
  if (!work) return <div>Work not found</div>;

  return (
    <div className="max-w-4xl mx-auto p-8">
      {/* Reading Progress Indicator */}
      {isAuthenticated && metrics.isTracking && (
        <div className="fixed top-0 left-0 right-0 bg-blue-600 text-white p-2 text-sm text-center z-50">
          Reading tracked: {metrics.timeOnPage}s · Scroll: {metrics.scrollDepth}%
          <button
            onClick={handleCompleteReading}
            className="ml-4 bg-white text-blue-600 px-3 py-1 rounded"
          >
            Finish Reading
          </button>
        </div>
      )}

      {/* Work Content */}
      <div className="prose prose-lg max-w-none">
        <h1>{work.title}</h1>
        <div className="text-gray-600 mb-4">
          {work.genre} · {work.word_count} words · {work.content_rating}
        </div>
        {work.summary && (
          <div className="bg-gray-100 p-4 rounded mb-6">
            <p className="italic">{work.summary}</p>
          </div>
        )}
        <div className="whitespace-pre-wrap">{work.content}</div>
      </div>

      {/* Comments Section */}
      {isAuthenticated && (
        <div className="mt-12 border-t pt-8">
          <h2 className="text-2xl font-bold mb-4">Comments</h2>

          {!canInteract.canComment && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
              <p className="text-yellow-800">
                Read the work to unlock commenting
              </p>
            </div>
          )}

          {canInteract.canComment && (
            <button
              onClick={() => setShowCommentForm(!showCommentForm)}
              className="bg-blue-600 text-white px-4 py-2 rounded mb-4"
            >
              Add Comment
            </button>
          )}

          {showCommentForm && (
            <div className="mb-6">
              <textarea
                value={commentContent}
                onChange={(e) => setCommentContent(e.target.value)}
                className="w-full border p-3 rounded"
                rows={4}
                placeholder="Share your thoughts..."
              />
              <button
                onClick={handleSubmitComment}
                className="bg-blue-600 text-white px-4 py-2 rounded mt-2"
              >
                Submit Comment
              </button>
            </div>
          )}

          <div className="space-y-4">
            {comments?.map((comment: any) => (
              <div key={comment.id} className="bg-gray-50 p-4 rounded">
                <div className="font-semibold">{comment.username}</div>
                <div className="text-gray-600 text-sm">
                  {new Date(comment.created_at).toLocaleDateString()}
                </div>
                <p className="mt-2">{comment.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
```

---

## Success Criteria

**Backend:**
- ✅ Reading sessions tracked with metrics
- ✅ Validation algorithm implemented
- ✅ Comments locked behind reading validation
- ✅ Ratings locked behind full work completion
- ✅ Section-based reading support

**Frontend:**
- ✅ Reading tracker hook active
- ✅ Real-time scroll/time tracking
- ✅ Visual feedback for reading progress
- ✅ Comment system with validation
- ✅ Rating interface (5 stars)

**Integration:**
- ✅ Can't comment without reading
- ✅ Can't rate without reading all sections
- ✅ Validation message shown
- ✅ Reading metrics persisted

---

## Testing Checklist

1. Upload work with sections
2. Start reading session (verify tracking starts)
3. Scroll through content (verify scroll depth updates)
4. Try to comment immediately (should block)
5. Read for sufficient time and scroll
6. Complete reading session (should unlock commenting)
7. Submit comment (should work)
8. Try to rate without reading all sections (should block)
9. Read all sections
10. Submit rating (should work)

---

**Sprint 2 Complete When:**
- Reading sessions tracked
- Comments require validated reading
- Ratings require full work completion
- All tests pass
- Code committed and pushed

Timeline: ~8 hours
