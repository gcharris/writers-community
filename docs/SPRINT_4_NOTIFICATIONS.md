# Sprint 4: Notifications & Community Features

**Goal:** Build real-time engagement through notifications, feed, and community interactions.

**Timeline:** ~12 hours

**Prerequisites:** Sprint 3 complete (discovery and profiles working)

---

## Overview

Create the "live" feeling of a thriving community through real-time notifications, activity feeds, and enhanced social features.

**Key Features:**
- Notification system (new comments, ratings, follows)
- Activity feed (what writers you follow are doing)
- Moderation tools (report, flag content)
- Writer dashboard (analytics)
- Email notifications (optional)
- Reading lists/collections

---

## Database Changes

### New Tables

```sql
-- Notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,

    type VARCHAR(50) NOT NULL,  -- 'comment', 'rating', 'follow', 'reply'
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    link VARCHAR(500),  -- URL to relevant content

    read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Optional references
    actor_id UUID REFERENCES users(id) ON DELETE CASCADE,  -- who triggered it
    work_id UUID REFERENCES works(id) ON DELETE CASCADE,
    comment_id UUID REFERENCES comments(id) ON DELETE CASCADE
);

CREATE INDEX idx_notifications_user ON notifications(user_id, read, created_at DESC);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

-- Reading Lists (collections of works)
CREATE TABLE reading_lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,

    name VARCHAR(255) NOT NULL,
    description TEXT,
    visibility VARCHAR(20) DEFAULT 'private',  -- 'private', 'public'

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE reading_list_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reading_list_id UUID REFERENCES reading_lists(id) ON DELETE CASCADE,
    work_id UUID REFERENCES works(id) ON DELETE CASCADE,

    order_index INTEGER NOT NULL,
    notes TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(reading_list_id, work_id)
);

CREATE INDEX idx_reading_list_items_list ON reading_list_items(reading_list_id, order_index);

-- Reports/Flags for moderation
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID REFERENCES users(id) ON DELETE CASCADE,

    type VARCHAR(50) NOT NULL,  -- 'work', 'comment', 'user'
    target_id UUID NOT NULL,  -- ID of the reported item

    reason VARCHAR(100) NOT NULL,
    details TEXT,

    status VARCHAR(20) DEFAULT 'pending',  -- 'pending', 'reviewed', 'resolved'
    resolved_at TIMESTAMP,
    resolved_by UUID REFERENCES users(id),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_reports_status ON reports(status, created_at DESC);
CREATE INDEX idx_reports_type ON reports(type, target_id);

-- Activity Feed (cached denormalized data for performance)
CREATE TABLE activity_feed (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,  -- who performed action

    type VARCHAR(50) NOT NULL,  -- 'published_work', 'commented', 'rated'
    title VARCHAR(255) NOT NULL,
    description TEXT,
    link VARCHAR(500),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- References
    work_id UUID REFERENCES works(id) ON DELETE CASCADE
);

CREATE INDEX idx_activity_user ON activity_feed(user_id, created_at DESC);
CREATE INDEX idx_activity_created ON activity_feed(created_at DESC);
```

---

## Backend Implementation

### Models

**`app/models/notification.py`:**
```python
from sqlalchemy import Column, String, Text, Boolean, ForeignKey, UUID, TIMESTAMP
from sqlalchemy.orm import relationship
from app.core.database import Base
import uuid
from datetime import datetime

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))

    type = Column(String(50), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    link = Column(String(500), nullable=True)

    read = Column(Boolean, default=False)
    created_at = Column(TIMESTAMP, default=datetime.utcnow)

    # Optional references
    actor_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    work_id = Column(UUID(as_uuid=True), ForeignKey("works.id", ondelete="CASCADE"), nullable=True)
    comment_id = Column(UUID(as_uuid=True), ForeignKey("comments.id", ondelete="CASCADE"), nullable=True)

    # Relationships
    user = relationship("User", foreign_keys=[user_id], back_populates="notifications")
    actor = relationship("User", foreign_keys=[actor_id])
```

**`app/models/reading_list.py`:**
```python
from sqlalchemy import Column, String, Text, Integer, ForeignKey, UUID, TIMESTAMP
from sqlalchemy.orm import relationship
from app.core.database import Base
import uuid
from datetime import datetime

class ReadingList(Base):
    __tablename__ = "reading_lists"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))

    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    visibility = Column(String(20), default="private")

    created_at = Column(TIMESTAMP, default=datetime.utcnow)
    updated_at = Column(TIMESTAMP, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="reading_lists")
    items = relationship("ReadingListItem", back_populates="reading_list", cascade="all, delete-orphan")

class ReadingListItem(Base):
    __tablename__ = "reading_list_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    reading_list_id = Column(UUID(as_uuid=True), ForeignKey("reading_lists.id", ondelete="CASCADE"))
    work_id = Column(UUID(as_uuid=True), ForeignKey("works.id", ondelete="CASCADE"))

    order_index = Column(Integer, nullable=False)
    notes = Column(Text, nullable=True)

    created_at = Column(TIMESTAMP, default=datetime.utcnow)

    # Relationships
    reading_list = relationship("ReadingList", back_populates="items")
    work = relationship("Work")
```

**`app/models/report.py`:**
```python
from sqlalchemy import Column, String, Text, ForeignKey, UUID, TIMESTAMP
from sqlalchemy.orm import relationship
from app.core.database import Base
import uuid
from datetime import datetime

class Report(Base):
    __tablename__ = "reports"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    reporter_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))

    type = Column(String(50), nullable=False)
    target_id = Column(UUID(as_uuid=True), nullable=False)

    reason = Column(String(100), nullable=False)
    details = Column(Text, nullable=True)

    status = Column(String(20), default="pending")
    resolved_at = Column(TIMESTAMP, nullable=True)
    resolved_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    created_at = Column(TIMESTAMP, default=datetime.utcnow)

    # Relationships
    reporter = relationship("User", foreign_keys=[reporter_id])
    resolver = relationship("User", foreign_keys=[resolved_by])
```

### Notification Service

**`app/services/notifications.py`:**
```python
from sqlalchemy.orm import Session
from app.models.notification import Notification
from app.models.user import User
from app.models.work import Work
from app.models.comment import Comment
import uuid

class NotificationService:
    """Service for creating notifications."""

    @staticmethod
    def create_comment_notification(
        db: Session,
        work: Work,
        commenter: User,
        comment: Comment
    ):
        """Notify work author of new comment."""

        if work.author_id == commenter.id:
            return  # Don't notify yourself

        notification = Notification(
            user_id=work.author_id,
            actor_id=commenter.id,
            work_id=work.id,
            comment_id=comment.id,
            type="comment",
            title="New comment on your work",
            message=f"{commenter.username} commented on '{work.title}'",
            link=f"/works/{work.id}#comment-{comment.id}"
        )

        db.add(notification)
        db.commit()

    @staticmethod
    def create_rating_notification(
        db: Session,
        work: Work,
        rater: User,
        score: int
    ):
        """Notify work author of new rating."""

        if work.author_id == rater.id:
            return

        stars = "★" * score

        notification = Notification(
            user_id=work.author_id,
            actor_id=rater.id,
            work_id=work.id,
            type="rating",
            title="New rating on your work",
            message=f"{rater.username} rated '{work.title}' {stars}",
            link=f"/works/{work.id}"
        )

        db.add(notification)
        db.commit()

    @staticmethod
    def create_follow_notification(
        db: Session,
        follower: User,
        following: User
    ):
        """Notify user of new follower."""

        notification = Notification(
            user_id=following.id,
            actor_id=follower.id,
            type="follow",
            title="New follower",
            message=f"{follower.username} started following you",
            link=f"/profile/{follower.username}"
        )

        db.add(notification)
        db.commit()

    @staticmethod
    def create_reply_notification(
        db: Session,
        parent_comment: Comment,
        replier: User,
        reply: Comment
    ):
        """Notify comment author of reply."""

        if parent_comment.user_id == replier.id:
            return

        notification = Notification(
            user_id=parent_comment.user_id,
            actor_id=replier.id,
            comment_id=reply.id,
            type="reply",
            title="Reply to your comment",
            message=f"{replier.username} replied to your comment",
            link=f"/works/{reply.work_id}#comment-{reply.id}"
        )

        db.add(notification)
        db.commit()
```

### Routes

**`app/routes/notifications.py`:**
```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import and_
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.notification import Notification
from pydantic import BaseModel
from typing import List
from datetime import datetime
import uuid

router = APIRouter(prefix="/api/notifications", tags=["notifications"])

class NotificationResponse(BaseModel):
    id: uuid.UUID
    type: str
    title: str
    message: str
    link: str | None
    read: bool
    created_at: datetime
    actor_username: str | None

    class Config:
        from_attributes = True

@router.get("/", response_model=List[NotificationResponse])
async def get_notifications(
    unread_only: bool = False,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's notifications."""

    query = db.query(Notification).filter(Notification.user_id == current_user.id)

    if unread_only:
        query = query.filter(Notification.read == False)

    notifications = query.order_by(Notification.created_at.desc()).limit(limit).all()

    result = []
    for n in notifications:
        actor_username = None
        if n.actor_id:
            actor = db.query(User).filter(User.id == n.actor_id).first()
            actor_username = actor.username if actor else None

        result.append(NotificationResponse(
            **n.__dict__,
            actor_username=actor_username
        ))

    return result

@router.get("/unread-count")
async def get_unread_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get count of unread notifications."""

    count = db.query(Notification).filter(
        and_(
            Notification.user_id == current_user.id,
            Notification.read == False
        )
    ).count()

    return {"count": count}

@router.put("/{notification_id}/read")
async def mark_notification_read(
    notification_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark notification as read."""

    notification = db.query(Notification).filter(
        and_(
            Notification.id == notification_id,
            Notification.user_id == current_user.id
        )
    ).first()

    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    notification.read = True
    db.commit()

    return {"message": "Marked as read"}

@router.put("/read-all")
async def mark_all_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark all notifications as read."""

    db.query(Notification).filter(
        and_(
            Notification.user_id == current_user.id,
            Notification.read == False
        )
    ).update({"read": True})

    db.commit()

    return {"message": "All notifications marked as read"}
```

**`app/routes/dashboard.py`:**
```python
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.work import Work
from app.models.rating import Rating
from app.models.comment import Comment
from app.models.reading_session import ReadingSession
from pydantic import BaseModel
from typing import List
from datetime import datetime, timedelta

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

class WorkStats(BaseModel):
    work_id: str
    title: str
    views: int
    reads: int
    comments: int
    ratings: int
    average_rating: float
    bookmarks: int

class DashboardStats(BaseModel):
    total_works: int
    total_views: int
    total_reads: int
    total_ratings: int
    average_rating: float
    total_followers: int
    work_stats: List[WorkStats]

@router.get("/stats", response_model=DashboardStats)
async def get_dashboard_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get writer dashboard statistics."""

    # Get all user's published works
    works = db.query(Work).filter(
        and_(
            Work.author_id == current_user.id,
            Work.visibility == "published"
        )
    ).all()

    total_views = sum(w.views_count for w in works)
    total_reads = sum(w.reads_count for w in works)
    total_ratings = sum(w.rating_count for w in works)

    # Calculate average rating across all works
    ratings = db.query(func.avg(Rating.score)).join(Work).filter(
        Work.author_id == current_user.id
    ).scalar()

    average_rating = float(ratings) if ratings else 0.0

    # Individual work stats
    work_stats = []
    for work in works:
        comment_count = db.query(Comment).filter(Comment.work_id == work.id).count()

        work_stats.append(WorkStats(
            work_id=str(work.id),
            title=work.title,
            views=work.views_count,
            reads=work.reads_count,
            comments=comment_count,
            ratings=work.rating_count,
            average_rating=work.rating_average,
            bookmarks=work.bookmarks_count
        ))

    return DashboardStats(
        total_works=len(works),
        total_views=total_views,
        total_reads=total_reads,
        total_ratings=total_ratings,
        average_rating=average_rating,
        total_followers=current_user.followers_count,
        work_stats=work_stats
    )

class RecentActivity(BaseModel):
    type: str
    message: str
    timestamp: datetime

@router.get("/activity", response_model=List[RecentActivity])
async def get_recent_activity(
    days: int = 7,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get recent activity on user's works."""

    since = datetime.utcnow() - timedelta(days=days)
    activity = []

    # Recent comments
    comments = db.query(Comment).join(Work).filter(
        and_(
            Work.author_id == current_user.id,
            Comment.created_at >= since
        )
    ).order_by(Comment.created_at.desc()).limit(10).all()

    for c in comments:
        activity.append(RecentActivity(
            type="comment",
            message=f"New comment on '{c.work.title}'",
            timestamp=c.created_at
        ))

    # Recent ratings
    ratings = db.query(Rating).join(Work).filter(
        and_(
            Work.author_id == current_user.id,
            Rating.created_at >= since
        )
    ).order_by(Rating.created_at.desc()).limit(10).all()

    for r in ratings:
        activity.append(RecentActivity(
            type="rating",
            message=f"New {r.score}-star rating on '{r.work.title}'",
            timestamp=r.created_at
        ))

    # Sort by timestamp
    activity.sort(key=lambda x: x.timestamp, reverse=True)

    return activity[:20]
```

**Update comment creation to send notifications:**

In `app/routes/comments.py`, add after comment creation:

```python
from app.services.notifications import NotificationService

# After creating comment:
NotificationService.create_comment_notification(db, work, current_user, comment)

# If it's a reply:
if comment.parent_id:
    parent = db.query(Comment).filter(Comment.id == comment.parent_id).first()
    if parent:
        NotificationService.create_reply_notification(db, parent, current_user, comment)
```

---

## Frontend Implementation

### Notification Bell

**`src/components/NotificationBell.tsx`:**
```tsx
import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../api/client';

export const NotificationBell = () => {
  const [showDropdown, setShowDropdown] = useState(false);

  const { data: unreadCount } = useQuery({
    queryKey: ['unread-count'],
    queryFn: async () => {
      const res = await api.get('/api/notifications/unread-count');
      return res.data.count;
    },
    refetchInterval: 30000, // Poll every 30 seconds
  });

  const { data: notifications, refetch } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await api.get('/api/notifications?limit=10');
      return res.data;
    },
    enabled: showDropdown,
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      await api.put('/api/notifications/read-all');
    },
    onSuccess: () => {
      refetch();
    },
  });

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 hover:bg-gray-100 rounded"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl z-50">
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="font-bold">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllRead.mutate()}
                className="text-sm text-blue-600 hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications?.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No notifications
              </div>
            ) : (
              notifications?.map((n: any) => (
                <Link
                  key={n.id}
                  to={n.link || '#'}
                  className={`block p-4 border-b hover:bg-gray-50 ${
                    !n.read ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => setShowDropdown(false)}
                >
                  <div className="font-semibold text-sm">{n.title}</div>
                  <div className="text-sm text-gray-600">{n.message}</div>
                  <div className="text-xs text-gray-400 mt-1">
                    {new Date(n.created_at).toLocaleDateString()}
                  </div>
                </Link>
              ))
            )}
          </div>

          <Link
            to="/notifications"
            className="block p-3 text-center text-sm text-blue-600 hover:bg-gray-50"
            onClick={() => setShowDropdown(false)}
          >
            View all notifications
          </Link>
        </div>
      )}
    </div>
  );
};
```

### Writer Dashboard

**`src/pages/Dashboard.tsx`:**
```tsx
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../api/client';

export const Dashboard = () => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const res = await api.get('/api/dashboard/stats');
      return res.data;
    },
  });

  const { data: activity } = useQuery({
    queryKey: ['dashboard-activity'],
    queryFn: async () => {
      const res = await api.get('/api/dashboard/activity');
      return res.data;
    },
  });

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="max-w-7xl mx-auto p-8">
      <h1 className="text-4xl font-bold mb-8">Writer Dashboard</h1>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-gray-600 text-sm">Total Works</div>
          <div className="text-3xl font-bold">{stats?.total_works}</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-gray-600 text-sm">Total Views</div>
          <div className="text-3xl font-bold">{stats?.total_views?.toLocaleString()}</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-gray-600 text-sm">Total Reads</div>
          <div className="text-3xl font-bold">{stats?.total_reads?.toLocaleString()}</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-gray-600 text-sm">Average Rating</div>
          <div className="text-3xl font-bold">
            {stats?.average_rating.toFixed(1)} ★
          </div>
        </div>
      </div>

      {/* Individual Work Stats */}
      <div className="bg-white p-6 rounded-lg shadow mb-8">
        <h2 className="text-2xl font-bold mb-4">Your Works</h2>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">Title</th>
                <th className="text-right p-2">Views</th>
                <th className="text-right p-2">Reads</th>
                <th className="text-right p-2">Comments</th>
                <th className="text-right p-2">Rating</th>
                <th className="text-right p-2">Bookmarks</th>
              </tr>
            </thead>
            <tbody>
              {stats?.work_stats.map((work: any) => (
                <tr key={work.work_id} className="border-b hover:bg-gray-50">
                  <td className="p-2">
                    <Link
                      to={`/works/${work.work_id}`}
                      className="text-blue-600 hover:underline"
                    >
                      {work.title}
                    </Link>
                  </td>
                  <td className="text-right p-2">{work.views}</td>
                  <td className="text-right p-2">{work.reads}</td>
                  <td className="text-right p-2">{work.comments}</td>
                  <td className="text-right p-2">
                    {work.average_rating.toFixed(1)} ({work.ratings})
                  </td>
                  <td className="text-right p-2">{work.bookmarks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-2xl font-bold mb-4">Recent Activity (Last 7 Days)</h2>

        {activity?.length === 0 ? (
          <div className="text-gray-500 text-center py-8">
            No recent activity
          </div>
        ) : (
          <div className="space-y-3">
            {activity?.map((item: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div className="flex items-center gap-3">
                  <span className={`w-2 h-2 rounded-full ${
                    item.type === 'comment' ? 'bg-blue-500' : 'bg-yellow-500'
                  }`}></span>
                  <span>{item.message}</span>
                </div>
                <span className="text-sm text-gray-500">
                  {new Date(item.timestamp).toLocaleDateString()}
                </span>
              </div>
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
- ✅ Notification system working
- ✅ Activity feed generated
- ✅ Moderation/reporting tools
- ✅ Reading lists functional
- ✅ Dashboard analytics

**Frontend:**
- ✅ Notification bell with dropdown
- ✅ Real-time unread count
- ✅ Writer dashboard with stats
- ✅ Activity timeline
- ✅ Reading list management

**Integration:**
- ✅ Notifications trigger on events
- ✅ Stats update accurately
- ✅ Polling for new notifications
- ✅ All features accessible

---

**Sprint 4 Complete When:**
- Notification system live
- Dashboard showing stats
- Activity feed working
- Moderation tools functional
- All tests pass
- Code committed and pushed

Timeline: ~12 hours
