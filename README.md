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

## Documentation

All project documentation is in the `/docs` directory:

**Architecture:**
- **[WRITERS_COMMUNITY_ARCHITECTURE.md](docs/WRITERS_COMMUNITY_ARCHITECTURE.md)** - Complete platform vision and architecture

**Sprint 1: Foundation**
- **[SPRINT_1_COMMUNITY_FOUNDATION.md](docs/SPRINT_1_COMMUNITY_FOUNDATION.md)** - Detailed specification with all code
- **[PROMPT_COMMUNITY_SPRINT_1.md](docs/PROMPT_COMMUNITY_SPRINT_1.md)** - Step-by-step implementation guide
- **[PROMPT_COMMUNITY_SPRINT_1_FINAL.md](docs/PROMPT_COMMUNITY_SPRINT_1_FINAL.md)** - Concise implementation prompt

**Sprint 2: Read-to-Rate**
- **[SPRINT_2_READ_TO_RATE.md](docs/SPRINT_2_READ_TO_RATE.md)** - Complete read-to-rate mechanics specification
- **[PROMPT_COMMUNITY_SPRINT_2.md](docs/PROMPT_COMMUNITY_SPRINT_2.md)** - Implementation guide

**Sprint 3: Discovery**
- **[SPRINT_3_DISCOVERY.md](docs/SPRINT_3_DISCOVERY.md)** - Browse, search, and engagement features

**Sprint 4: Notifications**
- **[SPRINT_4_NOTIFICATIONS.md](docs/SPRINT_4_NOTIFICATIONS.md)** - Notification system and community features

**Sprint 5: Professional Pipeline**
- **[SPRINT_5_PROFESSIONAL_PIPELINE.md](docs/SPRINT_5_PROFESSIONAL_PIPELINE.md)** - Agent/editor features and Writers Factory integration

## Development Roadmap

**Sprint 1: Foundation** (~8 hours)
- User authentication (register/login with JWT)
- Work upload functionality
- Work display/reading interface
- PostgreSQL database setup
- Docker Compose for local development

**Sprint 2: Read-to-Rate Mechanics** (~8 hours)
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

## Getting Started

See [PROMPT_COMMUNITY_SPRINT_1.md](docs/PROMPT_COMMUNITY_SPRINT_1.md) for detailed setup instructions.

## Repository

https://github.com/gcharris/writers-community

## License

[To be determined]

## Contact

Project Lead: [Your contact information]

---

**Status:** All 5 sprints specified and ready for implementation
**Timeline:** ~48 hours total (5 sprints)
**Created:** November 16, 2025
**Specifications Completed:** November 16, 2025
