# Sprint 1: Writers Community Foundation

**Goal:** Repository setup, core architecture, basic upload/display functionality
**Timeline:** ~8 hours with AI-assisted development
**Priority:** HIGH - Foundation for entire platform

---

## Objectives

Build the foundational infrastructure for Writers Community Platform:
1. Repository structure and development environment
2. Authentication system (registration, login, JWT)
3. Database schema and ORM setup
4. Basic upload endpoint (single manuscript)
5. Basic display/reading interface
6. Frontend navigation and layout

**Success Criteria:**
- User can register and log in
- User can upload a manuscript
- User can view their uploaded work
- Database schema implemented
- API documentation auto-generated

---

## Repository Structure

```
writers-community/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── api/
│   │   ├── utils/
│   │   └── App.tsx
│   ├── public/
│   ├── package.json
│   └── tsconfig.json
├── backend/
│   ├── app/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── core/
│   │   └── main.py
│   ├── alembic/
│   ├── requirements.txt
│   └── .env.example
├── docs/
│   ├── ARCHITECTURE.md
│   ├── API.md
│   └── DEPLOYMENT.md
├── .github/
│   └── workflows/
│       └── ci.yml
├── docker-compose.yml
├── README.md
└── .gitignore
```

---

## Tech Stack (Sprint 1)

### Frontend
- React 18 + TypeScript
- Vite (build tool)
- Tailwind CSS
- React Router v6
- TanStack Query
- Axios

### Backend
- FastAPI
- SQLAlchemy 2.0
- PostgreSQL
- Alembic (migrations)
- python-jose (JWT)
- bcrypt (password hashing)

### Development
- Docker Compose (local PostgreSQL)
- Git + GitHub

---

## Database Schema (Sprint 1)

```sql
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'writer',
    bio TEXT,
    avatar_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Works table (simplified for Sprint 1)
CREATE TABLE works (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    genre VARCHAR(50),
    content_rating VARCHAR(10) DEFAULT 'PG',
    content TEXT NOT NULL,
    word_count INTEGER,
    summary TEXT,
    status VARCHAR(20) DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_works_author ON works(author_id);
CREATE INDEX idx_works_status ON works(status);
CREATE INDEX idx_users_email ON users(email);
```

---

## Backend Implementation

### 1. Project Setup

**File: `backend/requirements.txt`**
```
fastapi==0.104.1
uvicorn[standard]==0.24.0
sqlalchemy==2.0.23
psycopg2-binary==2.9.9
alembic==1.12.1
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.6
pydantic[email]==2.5.0
pydantic-settings==2.1.0
```

### 2. Core Configuration

**File: `backend/app/core/config.py`**
```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Writers Community"
    VERSION: str = "0.1.0"
    API_PREFIX: str = "/api"

    # Database
    DATABASE_URL: str

    # Security
    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    class Config:
        env_file = ".env"

settings = Settings()
```

**File: `backend/.env.example`**
```
DATABASE_URL=postgresql://user:password@localhost:5432/writers_community
SECRET_KEY=your-secret-key-generate-with-openssl-rand-hex-32
```

### 3. Database Models

**File: `backend/app/models/user.py`**
```python
from sqlalchemy import Column, String, Text, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid

from app.core.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), default="writer")
    bio = Column(Text, nullable=True)
    avatar_url = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
```

**File: `backend/app/models/work.py`**
```python
from sqlalchemy import Column, String, Text, Integer, DateTime, ForeignKey
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
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    author = relationship("User", backref="works")
```

### 4. Database Connection

**File: `backend/app/core/database.py`**
```python
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

from app.core.config import settings

engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

### 5. Authentication

**File: `backend/app/core/security.py`**
```python
from datetime import datetime, timedelta
from jose import jwt
from passlib.context import CryptContext

from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm="HS256")
    return encoded_jwt
```

### 6. API Routes

**File: `backend/app/routes/auth.py`**
```python
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from jose import JWTError, jwt

from app.core.database import get_db
from app.core.security import verify_password, get_password_hash, create_access_token
from app.core.config import settings
from app.models.user import User
from app.schemas.user import UserCreate, UserResponse, Token

router = APIRouter(prefix="/auth", tags=["Authentication"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """Register a new user."""

    # Check if username exists
    if db.query(User).filter(User.username == user_data.username).first():
        raise HTTPException(status_code=400, detail="Username already registered")

    # Check if email exists
    if db.query(User).filter(User.email == user_data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    # Create user
    user = User(
        username=user_data.username,
        email=user_data.email,
        password_hash=get_password_hash(user_data.password)
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return user

@router.post("/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """Login and get access token."""

    user = db.query(User).filter(User.email == form_data.username).first()

    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )

    access_token = create_access_token(data={"sub": str(user.id)})

    return {"access_token": access_token, "token_type": "bearer"}

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    """Get current authenticated user."""

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials"
    )

    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception

    return user
```

**File: `backend/app/routes/works.py`**
```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.core.database import get_db
from app.routes.auth import get_current_user
from app.models.work import Work
from app.models.user import User
from app.schemas.work import WorkCreate, WorkResponse, WorkUpdate

router = APIRouter(prefix="/works", tags=["Works"])

@router.post("/", response_model=WorkResponse, status_code=status.HTTP_201_CREATED)
async def create_work(
    work_data: WorkCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload a new work."""

    # Calculate word count
    word_count = len(work_data.content.split())

    work = Work(
        author_id=current_user.id,
        title=work_data.title,
        genre=work_data.genre,
        content_rating=work_data.content_rating,
        content=work_data.content,
        word_count=word_count,
        summary=work_data.summary,
        status="draft"
    )

    db.add(work)
    db.commit()
    db.refresh(work)

    return work

@router.get("/{work_id}", response_model=WorkResponse)
async def get_work(work_id: UUID, db: Session = Depends(get_db)):
    """Get a work by ID."""

    work = db.query(Work).filter(Work.id == work_id).first()

    if not work:
        raise HTTPException(status_code=404, detail="Work not found")

    return work

@router.get("/", response_model=List[WorkResponse])
async def list_works(
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    """List all published works."""

    works = db.query(Work).filter(Work.status == "published").offset(skip).limit(limit).all()
    return works

@router.patch("/{work_id}", response_model=WorkResponse)
async def update_work(
    work_id: UUID,
    work_data: WorkUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a work."""

    work = db.query(Work).filter(Work.id == work_id, Work.author_id == current_user.id).first()

    if not work:
        raise HTTPException(status_code=404, detail="Work not found or unauthorized")

    # Update fields
    for field, value in work_data.dict(exclude_unset=True).items():
        setattr(work, field, value)

    # Recalculate word count if content changed
    if work_data.content:
        work.word_count = len(work.content.split())

    db.commit()
    db.refresh(work)

    return work

@router.delete("/{work_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_work(
    work_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a work."""

    work = db.query(Work).filter(Work.id == work_id, Work.author_id == current_user.id).first()

    if not work:
        raise HTTPException(status_code=404, detail="Work not found or unauthorized")

    db.delete(work)
    db.commit()

    return None
```

### 7. Main Application

**File: `backend/app/main.py`**
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import Base, engine
from app.routes import auth, works

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    docs_url=f"{settings.API_PREFIX}/docs",
    redoc_url=f"{settings.API_PREFIX}/redoc"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix=settings.API_PREFIX)
app.include_router(works.router, prefix=settings.API_PREFIX)

@app.get("/")
async def root():
    return {"message": "Writers Community API", "version": settings.VERSION}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
```

---

## Frontend Implementation

### 1. Project Setup

**File: `frontend/package.json`**
```json
{
  "name": "writers-community-frontend",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "@tanstack/react-query": "^5.12.0",
    "axios": "^1.6.2",
    "zustand": "^4.4.7"
  },
  "devDependencies": {
    "@types/react": "^18.2.43",
    "@types/react-dom": "^18.2.17",
    "@vitejs/plugin-react": "^4.2.1",
    "typescript": "^5.3.3",
    "vite": "^5.0.8",
    "tailwindcss": "^3.3.6",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.32"
  }
}
```

### 2. API Client

**File: `frontend/src/api/client.ts`**
```typescript
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export const apiClient = axios.create({
  baseURL: API_URL,
});

// Add auth token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API
export const authApi = {
  register: (data: { username: string; email: string; password: string }) =>
    apiClient.post('/auth/register', data),

  login: (email: string, password: string) =>
    apiClient.post('/auth/login', new URLSearchParams({ username: email, password }), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    }),
};

// Works API
export const worksApi = {
  create: (data: { title: string; genre: string; content: string; summary?: string }) =>
    apiClient.post('/works/', data),

  get: (id: string) =>
    apiClient.get(`/works/${id}`),

  list: (skip = 0, limit = 20) =>
    apiClient.get('/works/', { params: { skip, limit } }),

  update: (id: string, data: Partial<{ title: string; content: string; status: string }>) =>
    apiClient.patch(`/works/${id}`, data),

  delete: (id: string) =>
    apiClient.delete(`/works/${id}`),
};
```

### 3. Authentication Store

**File: `frontend/src/stores/authStore.ts`**
```typescript
import { create } from 'zustand';

interface AuthState {
  token: string | null;
  user: { id: string; username: string; email: string } | null;
  login: (token: string, user: any) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: localStorage.getItem('token'),
  user: JSON.parse(localStorage.getItem('user') || 'null'),

  login: (token, user) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    set({ token, user });
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ token: null, user: null });
  },

  isAuthenticated: () => !!get().token,
}));
```

### 4. Pages

**File: `frontend/src/pages/Register.tsx`**
```typescript
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api/client';

export function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await authApi.register(formData);
      alert('Registration successful! Please log in.');
      navigate('/login');
    } catch (error) {
      alert('Registration failed');
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow">
      <h1 className="text-2xl font-bold mb-6">Register</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          placeholder="Username"
          value={formData.username}
          onChange={(e) => setFormData({ ...formData, username: e.target.value })}
          className="w-full px-4 py-2 border rounded"
          required
        />
        <input
          type="email"
          placeholder="Email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="w-full px-4 py-2 border rounded"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          className="w-full px-4 py-2 border rounded"
          required
        />
        <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">
          Register
        </button>
      </form>
    </div>
  );
}
```

**File: `frontend/src/pages/UploadWork.tsx`**
```typescript
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { worksApi } from '../api/client';

export function UploadWork() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    genre: '',
    content: '',
    summary: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await worksApi.create(formData);
      navigate(`/works/${response.data.id}`);
    } catch (error) {
      alert('Upload failed');
    }
  };

  return (
    <div className="max-w-4xl mx-auto mt-10 p-6 bg-white rounded-lg shadow">
      <h1 className="text-2xl font-bold mb-6">Upload Work</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          placeholder="Title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className="w-full px-4 py-2 border rounded"
          required
        />
        <input
          type="text"
          placeholder="Genre"
          value={formData.genre}
          onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
          className="w-full px-4 py-2 border rounded"
        />
        <textarea
          placeholder="Summary (optional)"
          value={formData.summary}
          onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
          className="w-full px-4 py-2 border rounded h-24"
        />
        <textarea
          placeholder="Content"
          value={formData.content}
          onChange={(e) => setFormData({ ...formData, content: e.target.value })}
          className="w-full px-4 py-2 border rounded h-96"
          required
        />
        <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">
          Upload
        </button>
      </form>
    </div>
  );
}
```

---

## Docker Setup

**File: `docker-compose.yml`**
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

---

## Development Workflow

### 1. Setup
```bash
# Start database
docker-compose up -d

# Backend setup
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your settings

# Run migrations
alembic upgrade head

# Start backend
uvicorn app.main:app --reload

# Frontend setup (in new terminal)
cd frontend
npm install
npm run dev
```

### 2. Test Flow
1. Open http://localhost:5173
2. Register new account
3. Login
4. Upload a work
5. View the work
6. Check API docs: http://localhost:8000/api/docs

---

## Success Checklist

- [ ] PostgreSQL running in Docker
- [ ] Backend API running (http://localhost:8000)
- [ ] Frontend running (http://localhost:5173)
- [ ] User can register
- [ ] User can login (receives JWT token)
- [ ] User can upload work
- [ ] Work appears in database
- [ ] User can view uploaded work
- [ ] API documentation accessible
- [ ] No console errors in frontend

---

## Next Sprint Preview

**Sprint 2 will add:**
- Section-based content (break works into chapters/scenes)
- Read tracking (scroll depth, time on page)
- Comment system (unlocks after reading)
- Rating system (unlocks after full read)

**Sprint 1 lays the foundation for all future features!** 🚀
