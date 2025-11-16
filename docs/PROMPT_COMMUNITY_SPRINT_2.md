# Prompt: Writers Community Platform - Sprint 2 Implementation

**Repository:** https://github.com/gcharris/writers-community

**Branch:** `main` (merge Sprint 1 first)

**Goal:** Implement read-to-rate mechanics with backend validation

**Timeline:** ~8 hours

---

## What You're Building

The revolutionary "read-to-rate" system that validates genuine reader engagement before unlocking commenting and rating privileges.

**Key Innovation:** Backend validation using scroll depth, time on page, and reading speed to ensure readers actually read the content.

---

## Read This File First

**SPRINT_2_READ_TO_RATE.md** - Complete Sprint 2 specification with all code

---

## Implementation Steps

### Step 1: Database Migration

Add new tables for reading tracking, sections, comments, and ratings:

```bash
cd backend
# Tables to add:
# - reading_sessions
# - sections
# - comments
# - ratings
```

Use the SQL from `SPRINT_2_READ_TO_RATE.md` to create tables.

### Step 2: Backend Models

Create new SQLAlchemy models:

1. `app/models/section.py` - Chapter/section model
2. `app/models/reading_session.py` - Reading metrics tracker
3. `app/models/comment.py` - Comment model
4. `app/models/rating.py` - Rating model

Update existing models:
- `app/models/work.py` - Add relationships for sections, comments, ratings

### Step 3: Backend Schemas

Create Pydantic schemas:

1. `app/schemas/section.py`
2. `app/schemas/reading.py`
3. `app/schemas/comment.py`
4. `app/schemas/rating.py`

### Step 4: Backend Routes

Create new route files:

1. **`app/routes/reading.py`** - Core reading tracker
   - `POST /api/reading/start` - Start reading session
   - `PUT /api/reading/{id}/update` - Update metrics (called every 10s)
   - `POST /api/reading/{id}/complete` - Validate and complete
   - `GET /api/reading/validation/{work_id}` - Check permissions

2. **`app/routes/comments.py`** - Comment system
   - `POST /api/comments/works/{id}` - Create comment (validated)
   - `GET /api/comments/works/{id}` - Get comments
   - `PUT /api/comments/{id}` - Update comment
   - `DELETE /api/comments/{id}` - Delete comment

3. **`app/routes/ratings.py`** - Rating system
   - `POST /api/ratings/works/{id}` - Create rating (validated)
   - `PUT /api/ratings/works/{id}` - Update rating
   - `GET /api/ratings/works/{id}` - Get ratings
   - `GET /api/ratings/works/{id}/stats` - Get statistics

Update `app/main.py` to include new routers.

### Step 5: Validation Algorithm

Implement the reading validation logic in `app/routes/reading.py`:

```python
def validate_reading_session(session, content_word_count):
    """
    Must pass 2 out of 3 criteria:
    1. Time: At least 70% of expected (250 WPM baseline)
    2. Scroll: At least 80% scroll depth
    3. Speed: 100-500 WPM (realistic range)
    """
    min_time = (content_word_count / 250) * 60 * 0.7

    criteria = {
        "time": session.time_on_page >= min_time,
        "scroll": session.scroll_depth >= 80,
        "speed": 100 <= session.reading_speed <= 500
    }

    return sum(criteria.values()) >= 2
```

### Step 6: Frontend Reading Tracker

Create `src/hooks/useReadingTracker.ts`:

```typescript
export const useReadingTracker = (workId: string, sectionId?: string) => {
  // Start reading session on mount
  // Track scroll depth
  // Track time on page
  // Send updates to backend every 10 seconds
  // Provide completeSession() function
}
```

Features:
- Auto-start session when component mounts
- Track scroll depth (percentage of document)
- Track time on page (seconds)
- Send metrics to backend every 10 seconds
- Complete session and get validation result

### Step 7: Update ViewWork Page

Update `src/pages/ViewWork.tsx`:

1. Add `useReadingTracker` hook
2. Show reading progress indicator (time, scroll depth)
3. Add "Finish Reading" button
4. Show comment form (locked behind validation)
5. Show rating interface (locked behind full read)
6. Display validation messages

### Step 8: Comment System UI

Add to `src/pages/ViewWork.tsx`:

1. Comment list display
2. Comment form (unlocks after validation)
3. Reply threading (optional for Sprint 2)
4. Edit/delete own comments

### Step 9: Rating System UI

Create rating interface:

1. 5-star rating selector
2. Optional review text
3. Submit button (locked until full work read)
4. Display existing ratings
5. Show average rating and distribution

### Step 10: Testing

Test the complete flow:

```bash
# Test reading validation
1. Upload a work
2. Start reading (check session created)
3. Try to comment immediately (should block)
4. Read for 30 seconds and scroll to 90%
5. Complete reading (should unlock commenting)
6. Submit comment (should work)

# Test rating validation
7. Try to rate (should block if sections exist)
8. Read all sections
9. Complete all sessions
10. Submit rating (should work)
```

---

## Critical Implementation Details

### 1. Reading Tracker Metrics

Frontend sends updates every 10 seconds:

```typescript
setInterval(async () => {
  const timeOnPage = Math.floor((Date.now() - startTime) / 1000);

  await api.put(`/api/reading/${sessionId}/update`, {
    time_on_page: timeOnPage,
    scroll_depth: currentScrollDepth,
    scroll_event: new Date().toISOString(),
  });
}, 10000);
```

### 2. Scroll Depth Calculation

```typescript
const handleScroll = () => {
  const windowHeight = window.innerHeight;
  const documentHeight = document.documentElement.scrollHeight;
  const scrollTop = window.scrollY;

  const scrollDepth = Math.round(
    ((scrollTop + windowHeight) / documentHeight) * 100
  );

  setScrollDepth(Math.max(scrollDepth, prevScrollDepth));
};
```

### 3. Comment Permission Check

Backend middleware:

```python
def check_can_comment(user_id, work_id, section_id, db):
    session = db.query(ReadingSession).filter(
        ReadingSession.user_id == user_id,
        ReadingSession.work_id == work_id,
        ReadingSession.section_id == section_id,
        ReadingSession.validated == True
    ).first()

    return session is not None
```

### 4. Rating Permission Check

Must have validated sessions for ALL sections:

```python
def check_can_rate(user_id, work_id, db):
    sections = db.query(Section).filter(Section.work_id == work_id).all()

    validated_sessions = db.query(ReadingSession).filter(
        ReadingSession.user_id == user_id,
        ReadingSession.work_id == work_id,
        ReadingSession.validated == True
    ).all()

    validated_section_ids = {s.section_id for s in validated_sessions}
    required_section_ids = {s.id for s in sections}

    return required_section_ids.issubset(validated_section_ids)
```

---

## Success Criteria Checklist

### Backend ✓
- [ ] Reading session model and routes
- [ ] Validation algorithm implemented
- [ ] Comment routes with permission checks
- [ ] Rating routes with permission checks
- [ ] Section model for chapter-based reading

### Frontend ✓
- [ ] Reading tracker hook working
- [ ] Scroll depth tracked accurately
- [ ] Time on page tracked accurately
- [ ] Visual feedback for reading progress
- [ ] Comment form unlocks after validation
- [ ] Rating interface unlocks after full read

### Integration ✓
- [ ] Can't comment without reading
- [ ] Can't rate without reading all sections
- [ ] Validation messages clear
- [ ] Reading metrics persist correctly
- [ ] Multiple sections supported

---

## Common Issues & Solutions

### Issue 1: Scroll Depth Not Updating
**Solution:** Ensure scroll event listener attached to window, not container

### Issue 2: Time Tracking Stops
**Solution:** Use setInterval with ref to prevent cleanup during component lifecycle

### Issue 3: Validation Too Strict
**Solution:** Adjust criteria (currently 2 out of 3 must pass)

### Issue 4: Comments Show Before Reading
**Solution:** Query validation status on page load, not just after completion

---

## API Endpoints Summary

**Reading:**
- `POST /api/reading/start` - Start session
- `PUT /api/reading/{id}/update` - Update metrics
- `POST /api/reading/{id}/complete` - Complete and validate
- `GET /api/reading/validation/{work_id}` - Check permissions

**Comments:**
- `POST /api/comments/works/{work_id}` - Create (requires validation)
- `GET /api/comments/works/{work_id}` - List
- `PUT /api/comments/{id}` - Update own
- `DELETE /api/comments/{id}` - Delete own

**Ratings:**
- `POST /api/ratings/works/{work_id}` - Create (requires full read)
- `PUT /api/ratings/works/{work_id}` - Update own
- `GET /api/ratings/works/{work_id}` - List
- `GET /api/ratings/works/{work_id}/stats` - Statistics

---

## Sprint 2 Complete When:

1. ✅ Reading sessions tracked with metrics
2. ✅ Validation algorithm working
3. ✅ Comments locked behind reading
4. ✅ Ratings locked behind full read
5. ✅ Sections supported
6. ✅ Frontend shows reading progress
7. ✅ All tests pass
8. ✅ Code committed and pushed

---

## Next Sprint Preview

**Sprint 3 will add:**
- Browse/search functionality
- Genre filtering
- Popularity sorting
- Writer profiles
- Reading history

**This sprint establishes the core mechanic that makes Writers Community unique!** 🚀

---

## Let's Build!

Start with database migrations, then models, then routes, then frontend integration.

Good luck! 🎯
