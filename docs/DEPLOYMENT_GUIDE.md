# Writers Community - Deployment Guide

**Domain:** writerscommunity.app
**Hosting:** Railway.app (recommended for start)

---

## Option 1: Railway.app (Easiest)

### Prerequisites
- GitHub account
- Railway account (railway.app)
- Domain registered (writerscommunity.app)

### Step 1: Prepare Repository

Ensure your repo has these files at root:

**`railway.json`:**
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "numReplicas": 1,
    "restartPolicyType": "ON_FAILURE"
  }
}
```

**`Procfile`** (for backend):
```
web: cd backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

### Step 2: Deploy Database

1. Go to railway.app
2. New Project → "Provision PostgreSQL"
3. Copy the DATABASE_URL (looks like: `postgresql://user:pass@host:port/dbname`)

### Step 3: Deploy Backend

1. Railway Dashboard → New Service → GitHub Repo
2. Select `writers-community` repo
3. Add Environment Variables:
   ```
   DATABASE_URL=<from step 2>
   SECRET_KEY=<generate with: openssl rand -hex 32>
   ALGORITHM=HS256
   ACCESS_TOKEN_EXPIRE_MINUTES=30
   ```
4. Root Directory: `/backend`
5. Build Command: `pip install -r requirements.txt`
6. Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
7. Deploy!

Railway will give you a URL like: `https://writers-community-backend-production.up.railway.app`

### Step 4: Deploy Frontend

1. Railway Dashboard → New Service → GitHub Repo
2. Select same `writers-community` repo
3. Root Directory: `/frontend`
4. Add Environment Variable:
   ```
   VITE_API_URL=<backend URL from step 3>
   ```
5. Build Command: `npm install && npm run build`
6. Start Command: `npm run preview`
7. Deploy!

Railway will give you a URL like: `https://writers-community-frontend-production.up.railway.app`

### Step 5: Connect Domain

1. Railway → Frontend Service → Settings → Domains
2. Add Custom Domain: `writerscommunity.app`
3. Follow DNS instructions (add CNAME record at your registrar)
4. Add `www.writerscommunity.app` as well
5. Railway auto-provisions SSL certificate

**Done!** Your app is live at https://writerscommunity.app

**Cost:** ~$20/month for all services combined

---

## Option 2: DigitalOcean App Platform

### Prerequisites
- DigitalOcean account
- GitHub account
- Domain registered

### Step 1: Create App

1. DigitalOcean → Apps → Create App
2. Connect GitHub: `writers-community` repo
3. Auto-detect: Should find React frontend + Python backend

### Step 2: Configure Components

**Database:**
- Type: Managed Database
- Engine: PostgreSQL 15
- Plan: Basic ($15/month)

**Backend:**
- Type: Web Service
- Build Command: `pip install -r requirements.txt`
- Run Command: `uvicorn app.main:app --host 0.0.0.0 --port 8080`
- Source Directory: `/backend`
- Environment Variables:
  ```
  DATABASE_URL=${db.DATABASE_URL}
  SECRET_KEY=<generate>
  ```

**Frontend:**
- Type: Static Site
- Build Command: `npm install && npm run build`
- Output Directory: `dist`
- Source Directory: `/frontend`
- Environment Variables:
  ```
  VITE_API_URL=${backend.PUBLIC_URL}
  ```

### Step 3: Configure Domain

1. DigitalOcean App → Settings → Domains
2. Add Domain: `writerscommunity.app`
3. Add DNS records at your registrar:
   ```
   Type: A
   Name: @
   Value: <DigitalOcean IP>

   Type: CNAME
   Name: www
   Value: writerscommunity.app
   ```
4. SSL certificate auto-provisions

**Cost:** ~$30-40/month

---

## Option 3: Vercel (Frontend) + Railway (Backend + DB)

### Best Performance, Moderate Cost

**Backend + Database: Railway** (as in Option 1)
- Deploy backend and PostgreSQL on Railway
- Cost: ~$20/month

**Frontend: Vercel**
1. Go to vercel.com
2. Import `writers-community` repo
3. Framework: Vite
4. Root Directory: `frontend`
5. Environment Variable:
   ```
   VITE_API_URL=<Railway backend URL>
   ```
6. Domain Settings → Add `writerscommunity.app`
7. Deploy!

**Benefits:**
- Frontend on Vercel's global CDN (super fast)
- Free SSL
- Automatic deployments on git push

**Cost:** ~$20/month (Vercel free, Railway $20)

---

## Recommended Stack for Each Phase

**Beta (0-100 users):**
- **Railway.app** - Everything in one place
- Cost: ~$20/month
- Deployment time: 30 minutes

**Launch (100-1000 users):**
- **Vercel (frontend) + Railway (backend)**
- Cost: ~$20-30/month
- Best performance/cost ratio

**Growth (1000+ users):**
- **Vercel (frontend) + AWS/DigitalOcean (backend)**
- Cost: $50-200/month depending on traffic
- Add caching, CDN, monitoring

**Scale (10,000+ users):**
- **AWS/GCP with auto-scaling**
- Cost: $200-1000+/month
- Professional infrastructure
- Consider adding monetization at this point!

---

## Environment Variables Reference

### Backend (.env)
```bash
DATABASE_URL=postgresql://user:pass@host:port/dbname
SECRET_KEY=your-secret-key-from-openssl-rand-hex-32
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
CORS_ORIGINS=https://writerscommunity.app,https://www.writerscommunity.app
```

### Frontend (.env)
```bash
VITE_API_URL=https://api.writerscommunity.app
```

---

## Database Migrations

After deploying, run migrations:

```bash
# Connect to Railway PostgreSQL
railway connect postgres

# Or use connection string
psql $DATABASE_URL

# Run migration files
\i backend/migrations/001_sprint_1_foundation.sql
\i backend/migrations/002_sprint_2_reading_tracking.sql
\i backend/migrations/003_sprint_3_discovery.sql
```

Or use Alembic (recommended for production):

```bash
cd backend
alembic init alembic
alembic revision --autogenerate -m "Initial migration"
alembic upgrade head
```

---

## Monitoring & Maintenance

**Railway:**
- Built-in metrics dashboard
- View logs in real-time
- Auto-restarts on crashes

**DigitalOcean:**
- App metrics
- Email alerts
- Uptime monitoring

**Must-haves:**
- Uptime monitoring (UptimeRobot - free)
- Error tracking (Sentry - free tier)
- Analytics (Plausible or Simple Analytics - privacy-focused)

---

## Cost Breakdown

### Minimal Setup (Beta)
- Railway: $20/month
- Domain: $12/year
- **Total: ~$21/month**

### Recommended Setup (Launch)
- Vercel (frontend): Free
- Railway (backend + DB): $20/month
- Domain: $12/year
- **Total: ~$21/month**

### Growth Setup
- Vercel (frontend): Free
- DigitalOcean (backend): $25/month
- DigitalOcean (database): $15/month
- Monitoring: $10/month
- Domain: $12/year
- **Total: ~$51/month**

### At Scale (with revenue)
- Vercel Pro: $20/month
- AWS/GCP: $100-500/month
- Monitoring: $50/month
- CDN: $20/month
- **Total: $200-600/month**

---

## Security Checklist

- [ ] Environment variables not in code
- [ ] HTTPS only (SSL certificate)
- [ ] CORS configured correctly
- [ ] Database backups enabled
- [ ] Rate limiting on API
- [ ] SQL injection protection (SQLAlchemy handles this)
- [ ] XSS protection (React handles this)
- [ ] Password hashing (bcrypt)
- [ ] JWT expiration configured

---

## Deployment Checklist

**Before First Deploy:**
- [ ] All environment variables configured
- [ ] Database migrations ready
- [ ] CORS origins set correctly
- [ ] Secret key generated (not the default!)
- [ ] Error handling tested
- [ ] API docs accessible (/api/docs)

**After Deploy:**
- [ ] Test registration flow
- [ ] Test login flow
- [ ] Test work upload
- [ ] Test work viewing
- [ ] Check API response times
- [ ] Verify database connections
- [ ] Test on mobile
- [ ] Check SSL certificate
- [ ] Setup monitoring

---

## Rollback Plan

**Railway:**
```bash
railway rollback
```

**Vercel:**
```bash
vercel rollback
```

**DigitalOcean:**
- App Settings → Deployments → Rollback to previous

---

## When You're Ready

1. Finish Sprint 2 (read-to-rate)
2. Test locally thoroughly
3. Deploy to Railway (30 minutes)
4. Point writerscommunity.app domain
5. Invite beta testers
6. Gather feedback
7. Complete Sprint 3-5
8. Public launch!

**Current Status:** Development phase
**Next Step:** Complete Sprint 2
**Target Launch:** After Sprint 3 completion (foundation + read-to-rate + discovery)

---

**Questions?** Railway has excellent documentation and 24/7 Discord support.
