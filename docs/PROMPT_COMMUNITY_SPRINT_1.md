# Prompt: Writers Community Platform - Sprint 1 Implementation

## Mission: Build Foundation of Community Platform 🎯

**Project:** Writers Community Platform
**Sprint:** 1 - Foundation
**Timeline:** ~8 hours
**Priority:** HIGH

---

## What You're Building

A community platform where writers share work and receive genuine feedback through "read-to-rate" mechanics. This is a companion to Writers Factory (private workspace) - the Community is the public showcase.

**Sprint 1 Goal:** Get the core infrastructure working so users can register, upload a manuscript, and view it.

---

## Read These Files First

1. **WRITERS_COMMUNITY_ARCHITECTURE.md** - Complete platform vision and architecture
2. **SPRINT_1_COMMUNITY_FOUNDATION.md** - Detailed Sprint 1 specification

---

## Your Implementation Plan

### Step 1: Create New Repository

```bash
# Create new repo on GitHub
gh repo create writers-community --public

# Clone locally
git clone https://github.com/YOUR_USERNAME/writers-community.git
cd writers-community
```

### Step 2: Setup Backend (FastAPI)

**Create directory structure:**
```
writers-community/
├── backend/
│   ├── app/
│   │   ├── core/
│   │   │   ├── __init__.py
│   │   │   ├── config.py
│   │   │   ├── database.py
│   │   │   └── security.py
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── user.py
│   │   │   └── work.py
│   │   ├── routes/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py
│   │   │   └── works.py
│   │   ├── schemas/
│   │   │   ├── __init__.py
│   │   │   ├── user.py
│   │   │   └── work.py
│   │   └── main.py
│   ├── requirements.txt
│   ├── .env.example
│   └── README.md
```

**Implement files from SPRINT_1_COMMUNITY_FOUNDATION.md:**

1. `requirements.txt` - Dependencies
2. `app/core/config.py` - Settings
3. `app/core/database.py` - Database connection
4. `app/core/security.py` - Authentication
5. `app/models/user.py` - User model
6. `app/models/work.py` - Work model
7. `app/routes/auth.py` - Registration/login endpoints
8. `app/routes/works.py` - Upload/read endpoints
9. `app/main.py` - FastAPI app

**Create schemas (Pydantic models):**

`app/schemas/user.py`:
```python
from pydantic import BaseModel, EmailStr
from uuid import UUID
from datetime import datetime

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: UUID
    username: str
    email: str
    role: str
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
```

`app/schemas/work.py`:
```python
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
```

### Step 3: Setup Frontend (React + TypeScript)

**Create Vite project:**
```bash
cd writers-community
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
```

**Install dependencies:**
```bash
npm install react-router-dom @tanstack/react-query axios zustand
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

**Setup Tailwind** (`tailwind.config.js`):
```javascript
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

**Implement files from SPRINT_1_COMMUNITY_FOUNDATION.md:**

1. `src/api/client.ts` - API client + endpoints
2. `src/stores/authStore.ts` - Auth state management
3. `src/pages/Register.tsx` - Registration page
4. `src/pages/Login.tsx` - Login page (create based on Register pattern)
5. `src/pages/UploadWork.tsx` - Upload page
6. `src/pages/ViewWork.tsx` - Display work (create this)
7. `src/pages/Browse.tsx` - List works (create this)
8. `src/App.tsx` - Router setup

**Create App.tsx:**
```typescript
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Register } from './pages/Register';
import { Login } from './pages/Login';
import { UploadWork } from './pages/UploadWork';
import { ViewWork } from './pages/ViewWork';
import { Browse } from './pages/Browse';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/upload" element={<UploadWork />} />
          <Route path="/works/:id" element={<ViewWork />} />
          <Route path="/" element={<Browse />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
```

### Step 4: Database Setup

**Create docker-compose.yml** (in root):
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: writers_community
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

**Start database:**
```bash
docker-compose up -d
```

**Setup environment:**
```bash
cd backend
cp .env.example .env
```

Edit `.env`:
```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/writers_community
SECRET_KEY=generate-with-openssl-rand-hex-32-or-use-python-secrets
```

### Step 5: Test Everything

**Start backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

**Start frontend:**
```bash
cd frontend
npm run dev
```

**Test flow:**
1. Go to http://localhost:5173
2. Click "Register" → Create account
3. Login with credentials
4. Upload a work (paste some text)
5. View the work
6. Check API docs: http://localhost:8000/api/docs

---

## Critical Implementation Details

### 1. CORS Configuration

Backend must allow frontend origin:
```python
# In app/main.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 2. JWT Token Handling

Frontend must store token and send with requests:
```typescript
// In api/client.ts
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

### 3. Database Tables

Use SQLAlchemy to create tables automatically:
```python
# In app/main.py
from app.core.database import Base, engine
Base.metadata.create_all(bind=engine)
```

Or use Alembic for migrations (optional for Sprint 1).

### 4. Password Security

ALWAYS hash passwords, never store plain text:
```python
from passlib.context import CryptContext
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
password_hash = pwd_context.hash(plain_password)
```

---

## Success Criteria Checklist

### Backend ✓
- [ ] FastAPI app runs on http://localhost:8000
- [ ] `/api/docs` shows Swagger UI
- [ ] `/api/auth/register` creates user
- [ ] `/api/auth/login` returns JWT token
- [ ] `/api/works/` creates work (with auth)
- [ ] `/api/works/{id}` returns work
- [ ] Database tables created
- [ ] Password hashing works

### Frontend ✓
- [ ] React app runs on http://localhost:5173
- [ ] Registration page works
- [ ] Login page works
- [ ] Upload page works (authenticated)
- [ ] View work page shows content
- [ ] Browse page lists works
- [ ] Token stored in localStorage
- [ ] API calls include auth header

### Integration ✓
- [ ] Register → Login → Upload → View flow works end-to-end
- [ ] No CORS errors
- [ ] Database persists data
- [ ] JWT auth prevents unauthorized access

---

## File Structure (Final)

```
writers-community/
├── backend/
│   ├── app/
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   ├── database.py
│   │   │   └── security.py
│   │   ├── models/
│   │   │   ├── user.py
│   │   │   └── work.py
│   │   ├── routes/
│   │   │   ├── auth.py
│   │   │   └── works.py
│   │   ├── schemas/
│   │   │   ├── user.py
│   │   │   └── work.py
│   │   └── main.py
│   ├── requirements.txt
│   ├── .env
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── client.ts
│   │   ├── stores/
│   │   │   └── authStore.ts
│   │   ├── pages/
│   │   │   ├── Register.tsx
│   │   │   ├── Login.tsx
│   │   │   ├── UploadWork.tsx
│   │   │   ├── ViewWork.tsx
│   │   │   └── Browse.tsx
│   │   └── App.tsx
│   ├── package.json
│   └── vite.config.ts
├── docker-compose.yml
├── README.md
└── .gitignore
```

---

## Common Issues & Solutions

### Issue 1: Database Connection Error
**Solution:** Make sure PostgreSQL is running (`docker-compose up -d`)

### Issue 2: CORS Error in Browser
**Solution:** Check CORS middleware in `app/main.py` includes frontend URL

### Issue 3: "401 Unauthorized" on Upload
**Solution:** Ensure token is stored in localStorage and sent with request

### Issue 4: Tables Not Created
**Solution:** Run `Base.metadata.create_all(bind=engine)` in `main.py`

---

## Testing Commands

### Backend Tests
```bash
# Test registration
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@example.com","password":"password123"}'

# Test login
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=test@example.com&password=password123"

# Test upload (replace TOKEN with actual token)
curl -X POST http://localhost:8000/api/works/ \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Work","content":"This is a test"}'
```

---

## Documentation to Create

### README.md
```markdown
# Writers Community Platform

## Setup

### Backend
1. Start database: `docker-compose up -d`
2. Install dependencies: `cd backend && pip install -r requirements.txt`
3. Copy `.env.example` to `.env` and configure
4. Run: `uvicorn app.main:app --reload`

### Frontend
1. Install: `cd frontend && npm install`
2. Run: `npm run dev`

## API Documentation
http://localhost:8000/api/docs

## Tech Stack
- Backend: FastAPI, PostgreSQL, SQLAlchemy
- Frontend: React, TypeScript, Tailwind CSS
```

---

## Sprint 1 Complete When:

1. ✅ Repository created on GitHub
2. ✅ Backend running and accessible
3. ✅ Frontend running and accessible
4. ✅ Database setup complete
5. ✅ User can register
6. ✅ User can login
7. ✅ User can upload work
8. ✅ User can view uploaded work
9. ✅ All code committed and pushed
10. ✅ README documentation complete

---

## Next Sprint Preview

**Sprint 2 will add:**
- Section-based reading (break works into chapters)
- Read tracking (scroll depth, time on page)
- Comment system (unlocks after reading)
- Rating system (1-5 stars, unlocks after full read)

**Foundation must be solid for Sprint 2 features!** 🚀

---

## Let's Build!

Start with Step 1 (create repo), then systematically work through backend → frontend → integration testing.

Good luck! 🎯
