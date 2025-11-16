# Writers Community Platform - Complete Architecture

**Project:** Writers Community Platform
**Related:** Writers Factory (companion product)
**Purpose:** Public showcase, feedback, and talent discovery platform
**Timeline:** 5 sprints (~48 hours with AI-assisted development)

---

## Executive Summary

Writers Community Platform is a public companion to Writers Factory, enabling writers to share work, receive genuine feedback through "read-to-rate" mechanics, and connect with agents, editors, and publishing professionals. While Writers Factory is the private creative workspace, Writers Community is the public showcase and feedback loop.

---

## Platform Vision

### The Problem
- Existing platforms (Wattpad, AO3) have low-quality feedback ("Great chapter!")
- Ratings/comments from users who didn't actually read the work
- No clear path from community feedback to professional opportunities
- Writers need validation before submitting to agents

### The Solution
**Read-to-Rate Mechanics:**
- Can't comment/rate without reading the content
- Backend tracks actual engagement (time on page, scroll depth)
- Unlocks meaningful feedback from genuine readers
- Public metrics show real readership engagement

**Talent Pipeline:**
- Agents/editors see engagement metrics
- Discovery features for high-performing works
- Direct connection between community success and professional opportunities

---

## System Architecture

### High-Level Components

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React)                      │
│  - Browse/Discovery Page                                 │
│  - Reading Interface (sectioned)                         │
│  - Writer Dashboard                                      │
│  - Agent/Editor Portal                                   │
└─────────────┬───────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────┐
│              Backend API (FastAPI/Python)                │
│  - Upload Management                                     │
│  - Read Tracking Engine                                  │
│  - Rating/Comment System                                 │
│  - Engagement Analytics                                  │
│  - Writers Factory Integration                           │
└─────────────┬───────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────┐
│                    Database Layer                        │
│  - PostgreSQL (primary data)                             │
│  - Redis (read tracking, sessions)                       │
└─────────────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────┐
│                  External Services                       │
│  - AI Summary Service (Claude/GPT)                       │
│  - Writers Factory API                                   │
│  - Email Notifications                                   │
│  - Analytics (Plausible/Mixpanel)                        │
└─────────────────────────────────────────────────────────┘
```

---

## Core Features Breakdown

### 1. Upload & Organization System

**Upload Granularity:**
- Scene-level (500-2000 words)
- Chapter-level (2000-8000 words)
- Full manuscript (50,000+ words)

**Metadata:**
```python
class Work:
    id: UUID
    author_id: UUID
    title: str
    genre: str
    content_rating: str  # G, PG, PG-13, R, Mature
    upload_type: str     # scene, chapter, manuscript
    total_sections: int
    summary: str         # AI-generated or user-written
    tags: List[str]
    created_at: datetime
    updated_at: datetime
    status: str          # draft, published, complete
```

**Auto-Summary Service:**
```python
# AI generates summary on upload
summary = await generate_summary(
    content=work.content,
    max_length=150,
    style="engaging"
)
```

---

### 2. Read Tracking Engine

**Problem to Solve:** Prevent fake ratings from users who didn't read

**Solution: Multi-Factor Validation**

```python
class ReadTracker:
    """Tracks genuine reading engagement."""

    async def track_reading_session(
        self,
        user_id: UUID,
        work_id: UUID,
        section_id: UUID
    ):
        """Track reading metrics."""

        metrics = {
            "time_on_page": 0,        # Seconds
            "scroll_depth": 0,        # Percentage
            "scroll_events": [],      # Timestamps
            "reading_speed": 0,       # Words per minute
            "estimated_completion": 0  # Percentage
        }

        return metrics

    async def validate_read_completion(
        self,
        metrics: dict,
        content_length: int
    ) -> bool:
        """Validate user actually read the content."""

        min_time = content_length / 250 * 60  # 250 WPM average

        criteria = {
            "time": metrics["time_on_page"] >= min_time * 0.7,
            "scroll": metrics["scroll_depth"] >= 80,
            "speed": 100 <= metrics["reading_speed"] <= 500
        }

        # Must pass 2 out of 3 criteria
        return sum(criteria.values()) >= 2
```

**Frontend Integration:**
```javascript
// Track scroll depth
const trackScroll = () => {
  const scrollDepth = (window.scrollY / document.body.scrollHeight) * 100;
  sendMetric('scroll_depth', scrollDepth);
};

// Track time on page
let startTime = Date.now();
window.addEventListener('beforeunload', () => {
  const timeSpent = (Date.now() - startTime) / 1000;
  sendMetric('time_on_page', timeSpent);
});
```

---

### 3. Feedback System

**Read-to-Comment Flow:**

```
User reads Section 1
    ↓
Backend validates engagement
    ↓
If validated: Unlock comment box for Section 1
    ↓
User writes comment
    ↓
Comment saved + section_id tagged
```

**Read-to-Rate Flow:**

```
User reads all sections of Chapter 1
    ↓
Backend validates ALL sections read
    ↓
If validated: Unlock rating for Chapter 1
    ↓
User rates (1-5 stars)
    ↓
Rating saved + aggregated
```

**Data Model:**
```python
class Comment:
    id: UUID
    work_id: UUID
    section_id: UUID      # Which section this comments on
    user_id: UUID
    content: str
    created_at: datetime
    read_verified: bool   # Backend verified they read it

class Rating:
    id: UUID
    work_id: UUID
    user_id: UUID
    stars: int            # 1-5
    read_verified: bool
    sections_read: List[UUID]  # Proof of reading
    created_at: datetime
```

---

### 4. Public Metrics Dashboard

**Writer Dashboard:**
```python
class WorkMetrics:
    work_id: UUID

    # Engagement
    total_views: int
    unique_readers: int
    avg_completion_rate: float  # % who finish

    # Ratings
    total_ratings: int
    avg_rating: float
    rating_distribution: Dict[int, int]  # {5: 120, 4: 80, ...}

    # Comments
    total_comments: int
    avg_comments_per_section: float

    # Reading behavior
    avg_time_per_section: int  # Seconds
    drop_off_points: List[int]  # Which sections lose readers

    # Discovery
    discovery_source: Dict[str, int]  # {browse: 100, search: 50, ...}
```

**Agent/Editor Portal:**
```python
class TalentDiscovery:
    """For agents/editors to find promising works."""

    async def get_trending_works(
        self,
        genre: str = None,
        min_engagement: int = 100
    ) -> List[Work]:
        """Find works with strong engagement."""

        query = """
        SELECT w.*,
               COUNT(DISTINCT r.user_id) as unique_readers,
               AVG(rating.stars) as avg_rating,
               COUNT(DISTINCT c.id) as total_comments
        FROM works w
        LEFT JOIN reads r ON w.id = r.work_id
        LEFT JOIN ratings rating ON w.id = rating.work_id
        LEFT JOIN comments c ON w.id = c.work_id
        WHERE r.read_verified = true
        GROUP BY w.id
        HAVING COUNT(DISTINCT r.user_id) >= :min_engagement
        ORDER BY avg_rating DESC, unique_readers DESC
        LIMIT 50
        """

        return await db.execute(query, min_engagement=min_engagement)
```

---

### 5. Writers Factory Integration

**Publishing Flow:**

```
Writers Factory (Private)
    ↓
User: "Publish Chapter 5 to Community"
    ↓
API call to Writers Community
    ↓
Community creates new work entry
    ↓
Links back to Factory project
    ↓
Status: "Published on Community"
```

**Data Sync:**
```python
class FactoryIntegration:
    """Bidirectional sync with Writers Factory."""

    async def publish_from_factory(
        self,
        factory_project_id: UUID,
        content: str,
        metadata: dict
    ) -> Work:
        """Publish work from Factory to Community."""

        work = Work(
            author_id=metadata["author_id"],
            title=metadata["title"],
            content=content,
            source="writers_factory",
            factory_project_id=factory_project_id,
            status="published"
        )

        # Generate AI summary
        work.summary = await generate_summary(content)

        await db.save(work)

        # Notify Factory of publication
        await factory_api.mark_published(
            project_id=factory_project_id,
            community_work_id=work.id
        )

        return work

    async def sync_feedback_to_factory(
        self,
        work_id: UUID
    ) -> dict:
        """Send community feedback back to Factory."""

        metrics = await get_work_metrics(work_id)
        comments = await get_work_comments(work_id)

        feedback_summary = {
            "engagement": metrics,
            "top_comments": comments[:10],
            "sentiment_analysis": await analyze_sentiment(comments)
        }

        await factory_api.update_community_feedback(
            work_id=work_id,
            feedback=feedback_summary
        )

        return feedback_summary
```

---

## Database Schema

### Core Tables

```sql
-- Users
CREATE TABLE users (
    id UUID PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(20) DEFAULT 'writer',  -- writer, reader, agent, editor, admin
    created_at TIMESTAMP DEFAULT NOW()
);

-- Works
CREATE TABLE works (
    id UUID PRIMARY KEY,
    author_id UUID REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    genre VARCHAR(50),
    content_rating VARCHAR(10),
    upload_type VARCHAR(20),  -- scene, chapter, manuscript
    total_sections INTEGER,
    summary TEXT,
    status VARCHAR(20) DEFAULT 'draft',
    source VARCHAR(50),  -- 'direct_upload' or 'writers_factory'
    factory_project_id UUID,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Sections (for modular reading)
CREATE TABLE sections (
    id UUID PRIMARY KEY,
    work_id UUID REFERENCES works(id),
    section_number INTEGER,
    title VARCHAR(255),
    content TEXT,
    word_count INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Read Tracking
CREATE TABLE reads (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    work_id UUID REFERENCES works(id),
    section_id UUID REFERENCES sections(id),
    time_on_page INTEGER,  -- Seconds
    scroll_depth INTEGER,  -- Percentage
    reading_speed INTEGER,  -- WPM
    read_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, section_id)
);

-- Ratings
CREATE TABLE ratings (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    work_id UUID REFERENCES works(id),
    stars INTEGER CHECK (stars BETWEEN 1 AND 5),
    read_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, work_id)
);

-- Comments
CREATE TABLE comments (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    work_id UUID REFERENCES works(id),
    section_id UUID REFERENCES sections(id),
    content TEXT NOT NULL,
    read_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tags
CREATE TABLE tags (
    id UUID PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE work_tags (
    work_id UUID REFERENCES works(id),
    tag_id UUID REFERENCES tags(id),
    PRIMARY KEY (work_id, tag_id)
);

-- Agent/Editor Actions
CREATE TABLE professional_interactions (
    id UUID PRIMARY KEY,
    professional_id UUID REFERENCES users(id),  -- Agent or editor
    work_id UUID REFERENCES works(id),
    action_type VARCHAR(50),  -- 'viewed', 'bookmarked', 'contacted'
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Sprint Breakdown

### Sprint 1: Foundation (Week 1)
**Goal:** Repository, architecture, basic upload and display

**Tasks:**
1. Create GitHub repo `writers-community`
2. Set up FastAPI backend boilerplate
3. Set up React frontend boilerplate
4. Database schema implementation
5. User authentication (JWT)
6. Basic upload endpoint (single manuscript)
7. Basic display page (read full work)
8. Wireframes for all major pages

**Deliverables:**
- Working upload → display flow
- User registration/login
- PostgreSQL database running
- Basic frontend navigation

---

### Sprint 2: Modular Reading & Feedback (Week 1)
**Goal:** Sectioned reading, read tracking, comment/rating system

**Tasks:**
1. Section-based content storage
2. Frontend: Paginated reading interface
3. Read tracking JavaScript (scroll, time)
4. Backend: Read validation logic
5. Comment system (unlocks after read verification)
6. Rating system (unlocks after full read)
7. Frontend: Comment/rating UI

**Deliverables:**
- Read-to-comment working
- Read-to-rate working
- Backend validates genuine engagement
- UI shows locked/unlocked states

---

### Sprint 3: Metrics & Discovery (Week 2)
**Goal:** Public metrics, browse/discovery, AI summaries

**Tasks:**
1. Writer dashboard (metrics display)
2. Aggregated statistics (views, ratings, comments)
3. Browse/discovery page
4. Search functionality (title, genre, tags)
5. AI summary generation (Claude/GPT integration)
6. Tag system implementation
7. Trending works algorithm

**Deliverables:**
- Writer sees full engagement metrics
- Readers can discover works
- AI summaries auto-generate on upload
- Search and filtering working

---

### Sprint 4: Agent/Editor Portal (Week 2)
**Goal:** Professional talent discovery features

**Tasks:**
1. Agent/Editor registration flow
2. Talent discovery dashboard
3. Filters (genre, engagement threshold, rating)
4. Bookmark/save works feature
5. Contact writer functionality
6. Professional interaction tracking
7. Email notifications

**Deliverables:**
- Agents can discover high-engagement works
- Professional portal fully functional
- Contact/bookmark features working
- Notification system operational

---

### Sprint 5: Writers Factory Integration (Week 3)
**Goal:** Seamless publishing from Factory to Community

**Tasks:**
1. API endpoints for Factory integration
2. "Publish to Community" button in Factory
3. Work linking (Factory project ↔ Community work)
4. Feedback sync (Community → Factory)
5. Status tracking ("Published", "Feedback available")
6. Analytics integration
7. Production deployment

**Deliverables:**
- Full bidirectional integration
- Writers can publish from Factory
- Community feedback flows back to Factory
- Platform ready for beta users

---

## Technology Stack

### Frontend
- **Framework:** React 18 with TypeScript
- **UI Library:** Tailwind CSS + shadcn/ui
- **State Management:** Zustand or Redux Toolkit
- **Routing:** React Router v6
- **API Client:** TanStack Query (React Query)
- **Forms:** React Hook Form + Zod validation

### Backend
- **Framework:** FastAPI (Python 3.11+)
- **Database:** PostgreSQL 15
- **Cache:** Redis 7
- **ORM:** SQLAlchemy 2.0
- **Auth:** JWT (python-jose)
- **API Docs:** Auto-generated (FastAPI Swagger)

### AI Services
- **Summary Generation:** Claude Sonnet 4 or GPT-4o
- **Sentiment Analysis:** Claude Haiku (cost-effective)
- **Content Moderation:** OpenAI Moderation API

### Infrastructure
- **Hosting:** Railway.app or Fly.io (easy deployment)
- **CDN:** Cloudflare (free tier)
- **Email:** Resend or SendGrid
- **Analytics:** Plausible (privacy-focused)
- **Monitoring:** Sentry (error tracking)

---

## API Endpoints (Core)

### Works
```
POST   /api/works                # Upload new work
GET    /api/works/{id}           # Get work details
PATCH  /api/works/{id}           # Update work
DELETE /api/works/{id}           # Delete work
GET    /api/works                # Browse works (with filters)
POST   /api/works/{id}/publish   # Publish from Factory
```

### Reading
```
GET    /api/works/{id}/sections  # Get all sections
GET    /api/sections/{id}        # Get section content
POST   /api/sections/{id}/track  # Track reading engagement
```

### Feedback
```
POST   /api/works/{id}/comments   # Add comment (if read verified)
GET    /api/works/{id}/comments   # Get all comments
POST   /api/works/{id}/ratings    # Add rating (if read verified)
GET    /api/works/{id}/ratings    # Get rating stats
```

### Metrics
```
GET    /api/works/{id}/metrics    # Get engagement metrics
GET    /api/writers/{id}/dashboard # Writer's full dashboard
```

### Discovery
```
GET    /api/discover/trending     # Trending works
GET    /api/discover/search       # Search works
GET    /api/discover/recommended  # Personalized recommendations
```

### Professional
```
GET    /api/professionals/discover # Agent/editor discovery feed
POST   /api/professionals/bookmark # Bookmark work
POST   /api/professionals/contact  # Contact writer
```

---

## User Flows

### Writer Journey
1. Sign up → Writer account
2. Upload work (from Factory or direct)
3. AI generates summary
4. Publish to community
5. Readers engage
6. View metrics dashboard
7. Receive agent interest
8. Connect with professionals

### Reader Journey
1. Browse discovery page
2. Read AI summary
3. Start reading (section by section)
4. Backend tracks engagement
5. Unlock comment after reading section
6. Unlock rating after reading all sections
7. Leave feedback
8. Discover similar works

### Agent Journey
1. Sign up → Agent account
2. Access professional portal
3. Filter by genre/engagement
4. View trending works
5. Read work + see metrics
6. Bookmark interesting works
7. Contact writer
8. Track interactions

---

## Key Metrics to Track

### Platform Health
- Daily/monthly active users
- New uploads per day
- Average engagement rate
- Comment quality (length, sentiment)
- Rating distribution

### Writer Success
- Works published
- Total readers reached
- Average completion rate
- Agent contact rate
- Conversion to professional opportunities

### Reader Engagement
- Average reading time
- Completion rates
- Comment frequency
- Rating participation
- Return visitor rate

---

## Monetization Strategy (Future)

**Free Tier:**
- Upload unlimited works
- Access all feedback
- Basic metrics

**Premium Writer ($9/month):**
- Advanced analytics
- Priority in discovery
- Direct agent messaging
- Export feedback reports

**Premium Reader ($4/month):**
- Ad-free experience
- Early access to new chapters
- Support favorite writers
- Exclusive content

**Professional Access ($49/month):**
- Agent/editor tools
- Advanced search filters
- Writer contact database
- Industry analytics

---

## Success Criteria

### Sprint 1 ✓
- [ ] User can upload a manuscript
- [ ] User can view uploaded work
- [ ] Authentication working

### Sprint 2 ✓
- [ ] Sectioned reading works
- [ ] Read tracking validates engagement
- [ ] Comments locked until read
- [ ] Ratings locked until full read

### Sprint 3 ✓
- [ ] Writer sees full metrics
- [ ] Discovery page functional
- [ ] AI summaries generate
- [ ] Search works

### Sprint 4 ✓
- [ ] Agent portal accessible
- [ ] Talent discovery working
- [ ] Contact features functional
- [ ] Email notifications sent

### Sprint 5 ✓
- [ ] Factory → Community publishing works
- [ ] Community → Factory feedback sync
- [ ] Full integration tested
- [ ] Platform deployed

---

## Timeline Estimate

**With AI-Assisted Development (Claude Cloud):**
- Sprint 1: ~8 hours
- Sprint 2: ~10 hours
- Sprint 3: ~10 hours
- Sprint 4: ~10 hours
- Sprint 5: ~10 hours
- **Total: ~48 hours (2 days)**

**Traditional Development:**
- Sprint 1-5: 8-12 weeks
- Team: 3-5 developers
- Budget: $80,000-150,000

---

## Next Steps

1. Create `writers-community` GitHub repository
2. Create Sprint 1 detailed specification
3. Generate implementation prompt for Claude Cloud
4. Begin development

**Ready to build!** 🚀
