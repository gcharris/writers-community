# Sprint 3: Discovery & Engagement

**Goal:** Build the discovery experience - browse, search, filter, and engage with the community.

**Timeline:** ~8 hours

**Prerequisites:** Sprint 2 complete (read-to-rate mechanics working)

---

## Overview

Transform the platform from individual work viewing into a thriving discovery platform where readers find new works and writers build audiences.

**Key Features:**
- Browse all published works
- Search by title, author, content
- Filter by genre, rating, popularity
- Writer profiles
- Reading history
- Bookmarks/favorites
- Work statistics dashboard

---

## Database Changes

### New Tables

```sql
-- Bookmarks/Favorites
CREATE TABLE bookmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    work_id UUID REFERENCES works(id) ON DELETE CASCADE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(user_id, work_id)
);

-- Reading history (separate from reading_sessions for completed reads)
CREATE TABLE reading_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    work_id UUID REFERENCES works(id) ON DELETE CASCADE,

    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    progress_percentage INTEGER DEFAULT 100,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Follows (follow writers)
CREATE TABLE follows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_id UUID REFERENCES users(id) ON DELETE CASCADE,
    following_id UUID REFERENCES users(id) ON DELETE CASCADE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(follower_id, following_id),
    CHECK (follower_id != following_id)
);

-- Indices
CREATE INDEX idx_bookmarks_user ON bookmarks(user_id);
CREATE INDEX idx_bookmarks_work ON bookmarks(work_id);
CREATE INDEX idx_reading_history_user ON reading_history(user_id);
CREATE INDEX idx_follows_follower ON follows(follower_id);
CREATE INDEX idx_follows_following ON follows(following_id);
```

### Updated Users Table

```sql
-- Add profile fields
ALTER TABLE users ADD COLUMN bio TEXT;
ALTER TABLE users ADD COLUMN avatar_url VARCHAR(500);
ALTER TABLE users ADD COLUMN location VARCHAR(100);
ALTER TABLE users ADD COLUMN website VARCHAR(500);

-- Add stats (cached counts)
ALTER TABLE users ADD COLUMN works_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN followers_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN following_count INTEGER DEFAULT 0;
```

### Updated Works Table

```sql
-- Add visibility control
ALTER TABLE works ADD COLUMN visibility VARCHAR(20) DEFAULT 'draft';
-- Values: 'draft', 'published', 'unlisted', 'archived'

-- Add engagement stats (cached)
ALTER TABLE works ADD COLUMN views_count INTEGER DEFAULT 0;
ALTER TABLE works ADD COLUMN reads_count INTEGER DEFAULT 0;
ALTER TABLE works ADD COLUMN bookmarks_count INTEGER DEFAULT 0;

-- Add published date
ALTER TABLE works ADD COLUMN published_at TIMESTAMP;

-- Add search
CREATE INDEX idx_works_title ON works USING gin(to_tsvector('english', title));
CREATE INDEX idx_works_genre ON works(genre);
CREATE INDEX idx_works_visibility ON works(visibility);
CREATE INDEX idx_works_published ON works(published_at DESC);
```

---

## Backend Implementation

### Models

**`app/models/bookmark.py`:**
```python
from sqlalchemy import Column, ForeignKey, UUID, TIMESTAMP
from sqlalchemy.orm import relationship
from app.core.database import Base
import uuid
from datetime import datetime

class Bookmark(Base):
    __tablename__ = "bookmarks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    work_id = Column(UUID(as_uuid=True), ForeignKey("works.id", ondelete="CASCADE"))

    created_at = Column(TIMESTAMP, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="bookmarks")
    work = relationship("Work", back_populates="bookmarks")
```

**`app/models/reading_history.py`:**
```python
from sqlalchemy import Column, Integer, ForeignKey, UUID, TIMESTAMP
from sqlalchemy.orm import relationship
from app.core.database import Base
import uuid
from datetime import datetime

class ReadingHistory(Base):
    __tablename__ = "reading_history"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    work_id = Column(UUID(as_uuid=True), ForeignKey("works.id", ondelete="CASCADE"))

    completed_at = Column(TIMESTAMP, default=datetime.utcnow)
    progress_percentage = Column(Integer, default=100)

    created_at = Column(TIMESTAMP, default=datetime.utcnow)
    updated_at = Column(TIMESTAMP, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="reading_history")
    work = relationship("Work", back_populates="reading_history")
```

**`app/models/follow.py`:**
```python
from sqlalchemy import Column, ForeignKey, UUID, TIMESTAMP, CheckConstraint
from sqlalchemy.orm import relationship
from app.core.database import Base
import uuid
from datetime import datetime

class Follow(Base):
    __tablename__ = "follows"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    follower_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    following_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))

    created_at = Column(TIMESTAMP, default=datetime.utcnow)

    __table_args__ = (
        CheckConstraint('follower_id != following_id', name='no_self_follow'),
    )

    # Relationships
    follower = relationship("User", foreign_keys=[follower_id], back_populates="following")
    following = relationship("User", foreign_keys=[following_id], back_populates="followers")
```

### Schemas

**`app/schemas/browse.py`:**
```python
from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional, List

class WorkListItem(BaseModel):
    """Lightweight work representation for browse/search."""
    id: UUID
    title: str
    author_id: UUID
    author_name: str
    genre: Optional[str]
    content_rating: str
    word_count: int
    summary: Optional[str]

    # Stats
    rating_average: float
    rating_count: int
    views_count: int
    reads_count: int
    comment_count: int
    bookmarks_count: int

    published_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True

class BrowseFilters(BaseModel):
    genre: Optional[str] = None
    min_rating: Optional[float] = None
    min_word_count: Optional[int] = None
    max_word_count: Optional[int] = None
    content_rating: Optional[str] = None
    sort_by: str = "published_at"  # published_at, rating_average, views_count, reads_count
    sort_order: str = "desc"  # asc, desc
    limit: int = 20
    offset: int = 0

class BrowseResponse(BaseModel):
    works: List[WorkListItem]
    total: int
    limit: int
    offset: int

class SearchQuery(BaseModel):
    query: str
    filters: Optional[BrowseFilters] = None
```

**`app/schemas/profile.py`:**
```python
from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional, List

class ProfileUpdate(BaseModel):
    bio: Optional[str] = None
    location: Optional[str] = None
    website: Optional[str] = None
    avatar_url: Optional[str] = None

class ProfileResponse(BaseModel):
    id: UUID
    username: str
    email: str
    bio: Optional[str]
    location: Optional[str]
    website: Optional[str]
    avatar_url: Optional[str]

    # Stats
    works_count: int
    followers_count: int
    following_count: int

    created_at: datetime

    # For viewing other profiles
    is_following: Optional[bool] = None

    class Config:
        from_attributes = True

class UserWorksResponse(BaseModel):
    works: List['WorkListItem']
    total: int
```

**`app/schemas/engagement.py`:**
```python
from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import List

class BookmarkCreate(BaseModel):
    pass

class BookmarkResponse(BaseModel):
    id: UUID
    work_id: UUID
    work_title: str
    created_at: datetime

    class Config:
        from_attributes = True

class ReadingHistoryResponse(BaseModel):
    id: UUID
    work_id: UUID
    work_title: str
    progress_percentage: int
    completed_at: datetime

    class Config:
        from_attributes = True

class FollowResponse(BaseModel):
    id: UUID
    following_id: UUID
    following_username: str
    created_at: datetime

    class Config:
        from_attributes = True
```

### Routes

**`app/routes/browse.py`:**
```python
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc, asc
from app.core.database import get_db
from app.models.work import Work
from app.models.user import User
from app.schemas.browse import (
    WorkListItem,
    BrowseFilters,
    BrowseResponse,
    SearchQuery
)
from typing import Optional, List

router = APIRouter(prefix="/api/browse", tags=["browse"])

@router.get("/", response_model=BrowseResponse)
async def browse_works(
    genre: Optional[str] = None,
    min_rating: Optional[float] = None,
    min_word_count: Optional[int] = None,
    max_word_count: Optional[int] = None,
    content_rating: Optional[str] = None,
    sort_by: str = "published_at",
    sort_order: str = "desc",
    limit: int = Query(20, le=100),
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """Browse published works with filtering and sorting."""

    query = db.query(Work).filter(Work.visibility == "published")

    # Apply filters
    if genre:
        query = query.filter(Work.genre == genre)

    if min_rating is not None:
        query = query.filter(Work.rating_average >= min_rating)

    if min_word_count is not None:
        query = query.filter(Work.word_count >= min_word_count)

    if max_word_count is not None:
        query = query.filter(Work.word_count <= max_word_count)

    if content_rating:
        query = query.filter(Work.content_rating == content_rating)

    # Get total count before pagination
    total = query.count()

    # Apply sorting
    sort_column = getattr(Work, sort_by, Work.published_at)
    sort_func = desc if sort_order == "desc" else asc
    query = query.order_by(sort_func(sort_column))

    # Pagination
    works = query.offset(offset).limit(limit).all()

    # Join author names
    work_items = []
    for work in works:
        author = db.query(User).filter(User.id == work.author_id).first()
        work_dict = {
            **work.__dict__,
            'author_name': author.username if author else 'Unknown'
        }
        work_items.append(WorkListItem(**work_dict))

    return BrowseResponse(
        works=work_items,
        total=total,
        limit=limit,
        offset=offset
    )

@router.get("/search", response_model=BrowseResponse)
async def search_works(
    q: str = Query(..., min_length=1),
    genre: Optional[str] = None,
    min_rating: Optional[float] = None,
    sort_by: str = "published_at",
    sort_order: str = "desc",
    limit: int = Query(20, le=100),
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """Full-text search for works."""

    # PostgreSQL full-text search
    query = db.query(Work).filter(
        and_(
            Work.visibility == "published",
            or_(
                Work.title.ilike(f"%{q}%"),
                Work.summary.ilike(f"%{q}%") if Work.summary else False
            )
        )
    )

    # Apply filters
    if genre:
        query = query.filter(Work.genre == genre)

    if min_rating is not None:
        query = query.filter(Work.rating_average >= min_rating)

    # Get total
    total = query.count()

    # Sort and paginate
    sort_column = getattr(Work, sort_by, Work.published_at)
    sort_func = desc if sort_order == "desc" else asc
    query = query.order_by(sort_func(sort_column))

    works = query.offset(offset).limit(limit).all()

    # Add author names
    work_items = []
    for work in works:
        author = db.query(User).filter(User.id == work.author_id).first()
        work_dict = {
            **work.__dict__,
            'author_name': author.username if author else 'Unknown'
        }
        work_items.append(WorkListItem(**work_dict))

    return BrowseResponse(
        works=work_items,
        total=total,
        limit=limit,
        offset=offset
    )

@router.get("/genres", response_model=List[str])
async def get_genres(db: Session = Depends(get_db)):
    """Get list of all genres with published works."""

    genres = db.query(Work.genre).filter(
        and_(
            Work.visibility == "published",
            Work.genre.isnot(None)
        )
    ).distinct().all()

    return [g[0] for g in genres]
```

**`app/routes/profile.py`:**
```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.work import Work
from app.models.follow import Follow
from app.schemas.profile import ProfileUpdate, ProfileResponse, UserWorksResponse
from app.schemas.browse import WorkListItem
import uuid

router = APIRouter(prefix="/api/profile", tags=["profile"])

@router.get("/me", response_model=ProfileResponse)
async def get_own_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get own profile."""
    return current_user

@router.put("/me", response_model=ProfileResponse)
async def update_own_profile(
    data: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update own profile."""

    if data.bio is not None:
        current_user.bio = data.bio
    if data.location is not None:
        current_user.location = data.location
    if data.website is not None:
        current_user.website = data.website
    if data.avatar_url is not None:
        current_user.avatar_url = data.avatar_url

    db.commit()
    db.refresh(current_user)

    return current_user

@router.get("/{username}", response_model=ProfileResponse)
async def get_user_profile(
    username: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get another user's profile."""

    user = db.query(User).filter(User.username == username).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Check if current user follows this user
    is_following = db.query(Follow).filter(
        and_(
            Follow.follower_id == current_user.id,
            Follow.following_id == user.id
        )
    ).first() is not None

    profile = ProfileResponse(**user.__dict__, is_following=is_following)
    return profile

@router.get("/{username}/works", response_model=UserWorksResponse)
async def get_user_works(
    username: str,
    db: Session = Depends(get_db)
):
    """Get all published works by a user."""

    user = db.query(User).filter(User.username == username).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    works = db.query(Work).filter(
        and_(
            Work.author_id == user.id,
            Work.visibility == "published"
        )
    ).all()

    work_items = [
        WorkListItem(**{**w.__dict__, 'author_name': user.username})
        for w in works
    ]

    return UserWorksResponse(works=work_items, total=len(works))

@router.post("/{username}/follow", status_code=status.HTTP_201_CREATED)
async def follow_user(
    username: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Follow a user."""

    user = db.query(User).filter(User.username == username).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot follow yourself")

    # Check if already following
    existing = db.query(Follow).filter(
        and_(
            Follow.follower_id == current_user.id,
            Follow.following_id == user.id
        )
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="Already following")

    follow = Follow(follower_id=current_user.id, following_id=user.id)
    db.add(follow)

    # Update counts
    current_user.following_count += 1
    user.followers_count += 1

    db.commit()

    return {"message": "Followed successfully"}

@router.delete("/{username}/follow", status_code=status.HTTP_204_NO_CONTENT)
async def unfollow_user(
    username: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Unfollow a user."""

    user = db.query(User).filter(User.username == username).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    follow = db.query(Follow).filter(
        and_(
            Follow.follower_id == current_user.id,
            Follow.following_id == user.id
        )
    ).first()

    if not follow:
        raise HTTPException(status_code=404, detail="Not following")

    db.delete(follow)

    # Update counts
    current_user.following_count -= 1
    user.followers_count -= 1

    db.commit()
```

**`app/routes/engagement.py`:**
```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.work import Work
from app.models.bookmark import Bookmark
from app.models.reading_history import ReadingHistory
from app.schemas.engagement import (
    BookmarkResponse,
    ReadingHistoryResponse
)
from typing import List
import uuid

router = APIRouter(prefix="/api/engagement", tags=["engagement"])

# Bookmarks
@router.post("/bookmarks/{work_id}", status_code=status.HTTP_201_CREATED)
async def bookmark_work(
    work_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Bookmark a work."""

    # Check if work exists
    work = db.query(Work).filter(Work.id == work_id).first()
    if not work:
        raise HTTPException(status_code=404, detail="Work not found")

    # Check if already bookmarked
    existing = db.query(Bookmark).filter(
        and_(
            Bookmark.user_id == current_user.id,
            Bookmark.work_id == work_id
        )
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="Already bookmarked")

    bookmark = Bookmark(user_id=current_user.id, work_id=work_id)
    db.add(bookmark)

    # Update work's bookmark count
    work.bookmarks_count += 1

    db.commit()

    return {"message": "Bookmarked successfully"}

@router.delete("/bookmarks/{work_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_bookmark(
    work_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove bookmark."""

    bookmark = db.query(Bookmark).filter(
        and_(
            Bookmark.user_id == current_user.id,
            Bookmark.work_id == work_id
        )
    ).first()

    if not bookmark:
        raise HTTPException(status_code=404, detail="Bookmark not found")

    work = db.query(Work).filter(Work.id == work_id).first()
    if work:
        work.bookmarks_count -= 1

    db.delete(bookmark)
    db.commit()

@router.get("/bookmarks", response_model=List[BookmarkResponse])
async def get_bookmarks(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's bookmarks."""

    bookmarks = db.query(Bookmark).filter(
        Bookmark.user_id == current_user.id
    ).join(Work).all()

    result = []
    for b in bookmarks:
        result.append(BookmarkResponse(
            id=b.id,
            work_id=b.work_id,
            work_title=b.work.title,
            created_at=b.created_at
        ))

    return result

# Reading History
@router.get("/history", response_model=List[ReadingHistoryResponse])
async def get_reading_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get reading history."""

    history = db.query(ReadingHistory).filter(
        ReadingHistory.user_id == current_user.id
    ).join(Work).order_by(ReadingHistory.completed_at.desc()).all()

    result = []
    for h in history:
        result.append(ReadingHistoryResponse(
            id=h.id,
            work_id=h.work_id,
            work_title=h.work.title,
            progress_percentage=h.progress_percentage,
            completed_at=h.completed_at
        ))

    return result
```

---

## Frontend Implementation

### Browse Page

**`src/pages/Browse.tsx`:**
```tsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../api/client';

export const Browse = () => {
  const [filters, setFilters] = useState({
    genre: '',
    minRating: 0,
    sortBy: 'published_at',
    sortOrder: 'desc',
  });

  const [page, setPage] = useState(0);
  const limit = 20;

  const { data, isLoading } = useQuery({
    queryKey: ['browse', filters, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        ...filters,
        limit: limit.toString(),
        offset: (page * limit).toString(),
      });
      const res = await api.get(`/api/browse?${params}`);
      return res.data;
    },
  });

  const genres = ['Fantasy', 'Sci-Fi', 'Romance', 'Mystery', 'Thriller', 'Literary Fiction'];

  return (
    <div className="max-w-7xl mx-auto p-8">
      <h1 className="text-4xl font-bold mb-8">Discover Stories</h1>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Genre Filter */}
          <select
            value={filters.genre}
            onChange={(e) => setFilters({ ...filters, genre: e.target.value })}
            className="border p-2 rounded"
          >
            <option value="">All Genres</option>
            {genres.map(g => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>

          {/* Rating Filter */}
          <select
            value={filters.minRating}
            onChange={(e) => setFilters({ ...filters, minRating: Number(e.target.value) })}
            className="border p-2 rounded"
          >
            <option value="0">Any Rating</option>
            <option value="3">3+ Stars</option>
            <option value="4">4+ Stars</option>
            <option value="4.5">4.5+ Stars</option>
          </select>

          {/* Sort By */}
          <select
            value={filters.sortBy}
            onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
            className="border p-2 rounded"
          >
            <option value="published_at">Recently Published</option>
            <option value="rating_average">Highest Rated</option>
            <option value="views_count">Most Viewed</option>
            <option value="reads_count">Most Read</option>
          </select>

          {/* Sort Order */}
          <select
            value={filters.sortOrder}
            onChange={(e) => setFilters({ ...filters, sortOrder: e.target.value })}
            className="border p-2 rounded"
          >
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
        </div>
      </div>

      {/* Works Grid */}
      {isLoading ? (
        <div>Loading...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data?.works.map((work: any) => (
              <Link
                key={work.id}
                to={`/works/${work.id}`}
                className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition"
              >
                <h3 className="text-xl font-bold mb-2">{work.title}</h3>
                <p className="text-gray-600 text-sm mb-2">
                  by {work.author_name}
                </p>
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                  <span>{work.genre}</span>
                  <span>•</span>
                  <span>{work.word_count.toLocaleString()} words</span>
                </div>
                {work.summary && (
                  <p className="text-gray-700 text-sm line-clamp-3 mb-3">
                    {work.summary}
                  </p>
                )}
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1">
                    <span className="text-yellow-500">★</span>
                    <span>
                      {work.rating_average.toFixed(1)} ({work.rating_count})
                    </span>
                  </div>
                  <div className="text-gray-500">
                    {work.reads_count} reads
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex justify-center gap-4 mt-8">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="bg-blue-600 text-white px-4 py-2 rounded disabled:bg-gray-300"
            >
              Previous
            </button>
            <span className="py-2">
              Page {page + 1} of {Math.ceil((data?.total || 0) / limit)}
            </span>
            <button
              onClick={() => setPage(page + 1)}
              disabled={(page + 1) * limit >= (data?.total || 0)}
              className="bg-blue-600 text-white px-4 py-2 rounded disabled:bg-gray-300"
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
};
```

### Search Page

**`src/pages/Search.tsx`:**
```tsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';

export const Search = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [searchInput, setSearchInput] = useState(query);

  const { data, isLoading } = useQuery({
    queryKey: ['search', query],
    queryFn: async () => {
      if (!query) return null;
      const res = await api.get(`/api/browse/search?q=${encodeURIComponent(query)}`);
      return res.data;
    },
    enabled: !!query,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchParams({ q: searchInput });
  };

  return (
    <div className="max-w-4xl mx-auto p-8">
      <form onSubmit={handleSearch} className="mb-8">
        <div className="flex gap-2">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search for works..."
            className="flex-1 border p-3 rounded"
          />
          <button
            type="submit"
            className="bg-blue-600 text-white px-6 py-3 rounded"
          >
            Search
          </button>
        </div>
      </form>

      {isLoading && <div>Searching...</div>}

      {data && (
        <>
          <p className="text-gray-600 mb-6">
            Found {data.total} result{data.total !== 1 ? 's' : ''} for "{query}"
          </p>

          <div className="space-y-6">
            {data.works.map((work: any) => (
              <Link
                key={work.id}
                to={`/works/${work.id}`}
                className="block bg-white p-6 rounded-lg shadow hover:shadow-lg transition"
              >
                <h3 className="text-xl font-bold mb-2">{work.title}</h3>
                <p className="text-gray-600 text-sm mb-2">
                  by {work.author_name}
                </p>
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                  <span>{work.genre}</span>
                  <span>•</span>
                  <span>{work.word_count.toLocaleString()} words</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <span className="text-yellow-500">★</span>
                    {work.rating_average.toFixed(1)}
                  </span>
                </div>
                {work.summary && (
                  <p className="text-gray-700">{work.summary}</p>
                )}
              </Link>
            ))}
          </div>
        </>
      )}

      {data && data.total === 0 && (
        <div className="text-center text-gray-600 py-12">
          No results found for "{query}"
        </div>
      )}
    </div>
  );
};
```

### User Profile Page

**`src/pages/Profile.tsx`:**
```tsx
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuthStore } from '../stores/authStore';

export const Profile = () => {
  const { username } = useParams();
  const { user: currentUser } = useAuthStore();

  const { data: profile, refetch } = useQuery({
    queryKey: ['profile', username],
    queryFn: async () => {
      const res = await api.get(`/api/profile/${username}`);
      return res.data;
    },
  });

  const { data: works } = useQuery({
    queryKey: ['user-works', username],
    queryFn: async () => {
      const res = await api.get(`/api/profile/${username}/works`);
      return res.data;
    },
  });

  const followMutation = useMutation({
    mutationFn: async () => {
      if (profile?.is_following) {
        await api.delete(`/api/profile/${username}/follow`);
      } else {
        await api.post(`/api/profile/${username}/follow`);
      }
    },
    onSuccess: () => refetch(),
  });

  if (!profile) return <div>Loading...</div>;

  const isOwnProfile = currentUser?.username === username;

  return (
    <div className="max-w-4xl mx-auto p-8">
      {/* Profile Header */}
      <div className="bg-white p-8 rounded-lg shadow mb-8">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-6">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.username}
                className="w-24 h-24 rounded-full"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gray-300 flex items-center justify-center text-3xl text-white">
                {profile.username[0].toUpperCase()}
              </div>
            )}

            <div>
              <h1 className="text-3xl font-bold">{profile.username}</h1>
              {profile.location && (
                <p className="text-gray-600">{profile.location}</p>
              )}
              {profile.website && (
                <a
                  href={profile.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {profile.website}
                </a>
              )}
            </div>
          </div>

          {!isOwnProfile && (
            <button
              onClick={() => followMutation.mutate()}
              className={`px-6 py-2 rounded ${
                profile.is_following
                  ? 'bg-gray-200 text-gray-800'
                  : 'bg-blue-600 text-white'
              }`}
            >
              {profile.is_following ? 'Following' : 'Follow'}
            </button>
          )}

          {isOwnProfile && (
            <Link
              to="/settings/profile"
              className="bg-gray-200 text-gray-800 px-6 py-2 rounded"
            >
              Edit Profile
            </Link>
          )}
        </div>

        {profile.bio && (
          <p className="mt-6 text-gray-700">{profile.bio}</p>
        )}

        <div className="flex gap-6 mt-6 text-sm">
          <div>
            <span className="font-bold">{profile.works_count}</span> Works
          </div>
          <div>
            <span className="font-bold">{profile.followers_count}</span> Followers
          </div>
          <div>
            <span className="font-bold">{profile.following_count}</span> Following
          </div>
        </div>
      </div>

      {/* Works */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Published Works</h2>

        {works?.works.length === 0 ? (
          <div className="text-gray-600 text-center py-12">
            No published works yet
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {works?.works.map((work: any) => (
              <Link
                key={work.id}
                to={`/works/${work.id}`}
                className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition"
              >
                <h3 className="text-xl font-bold mb-2">{work.title}</h3>
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                  <span>{work.genre}</span>
                  <span>•</span>
                  <span>{work.word_count.toLocaleString()} words</span>
                </div>
                {work.summary && (
                  <p className="text-gray-700 text-sm line-clamp-2 mb-3">
                    {work.summary}
                  </p>
                )}
                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1">
                    <span className="text-yellow-500">★</span>
                    {work.rating_average.toFixed(1)}
                  </span>
                  <span>{work.reads_count} reads</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
```

---

## Success Criteria

**Backend:**
- ✅ Browse endpoint with filters and sorting
- ✅ Search endpoint with full-text search
- ✅ Profile CRUD endpoints
- ✅ Follow/unfollow functionality
- ✅ Bookmarks system
- ✅ Reading history tracking
- ✅ Work visibility controls

**Frontend:**
- ✅ Browse page with filters
- ✅ Search page
- ✅ User profile page
- ✅ Bookmark management
- ✅ Reading history view
- ✅ Follow button integration

**Integration:**
- ✅ Pagination works
- ✅ Filters apply correctly
- ✅ Search returns relevant results
- ✅ Stats update accurately

---

**Sprint 3 Complete When:**
- Browse and search working
- Profiles functional
- Following system active
- Bookmarks working
- All tests pass
- Code committed and pushed

Timeline: ~8 hours
