# Writers Community Platform

A public companion to Writers Factory where writers share work and receive genuine feedback through "read-to-rate" mechanics.

## Project Vision

Writers Community Platform empowers writers to upload, share, and receive feedback on creative works in modular segments (scenes, chapters, manuscripts). The platform encourages meaningful reader engagement through validated reading mechanics.

## Key Features

- **Modular uploads** - scenes, chapters, manuscripts
- **Sectioned reading experience** for easy navigation
- **Automated summaries** for streamlined browsing
- **Read-to-comment mechanics** - must read before commenting
- **Read-to-rate system** - validates genuine engagement
- **Five-star rating** for standardized feedback
- **Public metrics** - read counts, ratings, comments
- **Sales funnel integration** with Writers Factory
- **Agent/editor pipeline** for professional connections

## Tech Stack

**Backend:**
- FastAPI
- PostgreSQL
- SQLAlchemy 2.0
- JWT authentication
- Pydantic schemas

**Frontend:**
- React 18 + TypeScript
- Vite
- Tailwind CSS
- React Router v6
- TanStack Query
- Zustand (state)

## Sprint 1 Status: ✅ COMPLETE

Sprint 1 implements the foundation:
- ✅ User authentication (register/login with JWT)
- ✅ Work upload functionality
- ✅ Work display/reading interface
- ✅ PostgreSQL database setup
- ✅ Docker Compose for local development

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- Docker & Docker Compose
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/gcharris/writers-community.git
cd writers-community
```

### 2. Start the Database

```bash
docker-compose up -d
```

This starts PostgreSQL on port 5432.

### 3. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env

# Generate a secret key and update .env
# You can use: openssl rand -hex 32
# Or: python -c "import secrets; print(secrets.token_hex(32))"
```

Edit `.env` file:
```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/writers_community
SECRET_KEY=your-generated-secret-key-here
```

Start the backend:
```bash
uvicorn app.main:app --reload
```

Backend will run on **http://localhost:8000**

API Documentation: **http://localhost:8000/api/docs**

### 4. Frontend Setup

Open a new terminal:

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend will run on **http://localhost:5173**

## Usage

### Test the Complete Flow

1. Open **http://localhost:5173** in your browser
2. Click "Register" and create a new account
3. Log in with your credentials
4. Click "Upload Work" and submit a piece of writing
5. View your uploaded work
6. Browse all published works on the home page

### API Testing

You can also test the API directly:

**Register:**
```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"password123"}'
```

**Login:**
```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=test@example.com&password=password123"
```

**Upload Work (with token):**
```bash
curl -X POST http://localhost:8000/api/works/ \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{"title":"My First Story","genre":"Fiction","content":"Once upon a time..."}'
```

## Project Structure

```
writers-community/
├── backend/
│   ├── app/
│   │   ├── core/           # Configuration, database, security
│   │   ├── models/         # SQLAlchemy models
│   │   ├── routes/         # API endpoints
│   │   ├── schemas/        # Pydantic schemas
│   │   └── main.py         # FastAPI application
│   ├── requirements.txt
│   ├── .env.example
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── api/            # API client
│   │   ├── stores/         # Zustand state management
│   │   ├── pages/          # React pages
│   │   ├── App.tsx         # Main app component
│   │   └── main.tsx        # Entry point
│   ├── package.json
│   └── vite.config.ts
├── docs/                   # Complete documentation
├── docker-compose.yml      # PostgreSQL setup
└── README.md
```

## Documentation

All project documentation is in the `/docs` directory:

- **[WRITERS_COMMUNITY_ARCHITECTURE.md](docs/WRITERS_COMMUNITY_ARCHITECTURE.md)** - Complete platform vision and architecture
- **[SPRINT_1_COMMUNITY_FOUNDATION.md](docs/SPRINT_1_COMMUNITY_FOUNDATION.md)** - Detailed Sprint 1 specification with all code
- **[PROMPT_COMMUNITY_SPRINT_1.md](docs/PROMPT_COMMUNITY_SPRINT_1.md)** - Step-by-step implementation guide
- **[PROMPT_COMMUNITY_SPRINT_1_FINAL.md](docs/PROMPT_COMMUNITY_SPRINT_1_FINAL.md)** - Concise implementation prompt

## Development Roadmap

**Sprint 1: Foundation** ✅ COMPLETE (~8 hours)
- User authentication (register/login with JWT)
- Work upload functionality
- Work display/reading interface
- PostgreSQL database setup
- Docker Compose for local development

**Sprint 2: Read-to-Rate Mechanics** 🔜 NEXT (~8 hours)
- Section-based reading (chapters)
- Read tracking (scroll depth, time on page)
- Comment system (unlocks after reading)
- Rating system (1-5 stars, unlocks after full read)

**Sprint 3: Discovery & Engagement** (~8 hours)
- Browse works by genre/popularity
- Search functionality
- Writer profiles
- Reading history
- Bookmarks/favorites

**Sprint 4: Community Features** (~12 hours)
- Notifications system
- Follow writers
- Reading lists
- Comment threads
- Moderation tools

**Sprint 5: Professional Pipeline** (~12 hours)
- Agent/editor accounts
- Advanced filtering
- Submission tracking
- Analytics dashboard
- Writers Factory integration

## Troubleshooting

**Database Connection Error:**
- Ensure Docker is running: `docker ps`
- Check PostgreSQL is running: `docker-compose ps`
- Restart if needed: `docker-compose restart`

**Frontend Can't Reach Backend:**
- Check backend is running on port 8000
- Verify CORS settings in `backend/app/main.py`
- Check for port conflicts

**401 Unauthorized on Upload:**
- Ensure you're logged in
- Check token is stored in localStorage
- Try logging out and back in

## Repository

https://github.com/gcharris/writers-community

## License

[To be determined]

## Contact

Project Lead: [Your contact information]

---

**Status:** Sprint 1 Complete ✅
**Next:** Sprint 2 - Read-to-Rate Mechanics
**Timeline:** ~48 hours total (5 sprints)
**Created:** November 16, 2025
