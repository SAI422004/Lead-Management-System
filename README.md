# 📊 LeadMS — Mini Lead Management System

A full-stack Lead Management System built with **Node.js + Express + PostgreSQL + React.js**.

---

## Tech Stack

| Layer     | Technology                          |
|-----------|-------------------------------------|
| Backend   | Node.js, Express.js                 |
| Database  | PostgreSQL (Supabase compatible)    |
| Frontend  | React.js, Bootstrap 5               |
| Auth      | JWT (access + refresh tokens)       |
| Email     | Nodemailer (SMTP)                   |

---

## Features

### Authentication
- Register, Login, Logout
- JWT access tokens + refresh tokens
- Bcrypt password hashing
- Protected routes with role-based authorization

### Roles
| Role    | Permissions                                      |
|---------|--------------------------------------------------|
| Admin   | Full access + user management                    |
| Manager | Create/update/delete leads, view all leads       |
| Agent   | View and update only their assigned leads        |

### Leads Management
- Create, Read, Update, Delete leads
- Auto-assignment to agents (least-loaded strategy)
- Pagination, Search, Sorting, Filtering by status/source
- Fields: name, email, phone, source, status, notes, assigned_to

### Activity Logs
- Lead Created, Lead Updated, Status Changed, Lead Deleted
- Stored per lead, visible on lead detail page

### Third-Party Integration
- **Nodemailer (Email)** — Sends email to agent on lead assignment, and to lead on status change

---

## Project Structure

```
lead-management/
├── backend/
│   ├── migrations/
│   │   └── 001_schema.sql       ← Full DB schema
│   └── src/
│       ├── app.js               ← Express entry point
│       ├── db/index.js          ← pg Pool connection
│       ├── middleware/
│       │   ├── auth.js          ← JWT authenticate + authorize
│       │   └── errorHandler.js  ← Validation + error middleware
│       ├── routes/
│       │   ├── authRoutes.js
│       │   ├── leadRoutes.js
│       │   └── userRoutes.js
│       ├── controllers/
│       │   ├── authController.js
│       │   ├── leadController.js
│       │   └── userController.js
│       ├── services/
│       │   ├── authService.js
│       │   ├── leadService.js
│       │   ├── assignmentService.js
│       │   └── activityLogService.js
│       └── utils/
│           └── emailUtil.js
└── frontend/
    └── src/
        ├── App.js
        ├── context/AuthContext.js
        ├── services/api.js
        ├── components/
        │   ├── Navbar.js
        │   └── shared.js
        └── pages/
            ├── Login.js
            ├── Register.js
            ├── Dashboard.js
            ├── LeadsList.js
            ├── LeadForm.js
            ├── LeadDetail.js
            └── Users.js
```

---

## Database Setup

### Option A: Supabase (Free, Recommended)
1. Go to [supabase.com](https://supabase.com) → New Project
2. Go to **SQL Editor** → paste contents of `backend/migrations/001_schema.sql` → Run
3. Go to **Settings → Database** → copy the connection string URI

### Option B: Local PostgreSQL
```bash
psql -U postgres -c "CREATE DATABASE lead_management;"
psql -U postgres -d lead_management -f backend/migrations/001_schema.sql
```

---

## Environment Configuration

### Backend (`backend/.env`)
```env
PORT=5000
DATABASE_URL=postgresql://user:password@host:5432/lead_management
JWT_SECRET=your_super_secret_key_here
JWT_EXPIRES_IN=7d

# Optional: Email notifications
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
EMAIL_FROM=your_email@gmail.com

FRONTEND_URL=http://localhost:3000
```

### Frontend (`frontend/.env`)
```env
REACT_APP_API_URL=http://localhost:5000/api
```

---

## How to Run

### Backend
```bash
cd backend
npm install
cp .env.example .env    # fill in your values
npm run dev             # nodemon for dev, or: npm start
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env    # set REACT_APP_API_URL
npm start
```

Backend runs on **http://localhost:5000**, Frontend on **http://localhost:3000**.

---

## API Documentation

### Auth
| Method | Endpoint              | Auth | Description        |
|--------|-----------------------|------|--------------------|
| POST   | /api/auth/register    | No   | Register user      |
| POST   | /api/auth/login       | No   | Login → tokens     |
| POST   | /api/auth/refresh     | No   | Refresh access token |
| POST   | /api/auth/logout      | No   | Invalidate refresh token |
| GET    | /api/auth/me          | Yes  | Get current user   |

### Leads
| Method | Endpoint              | Auth     | Roles              |
|--------|-----------------------|----------|--------------------|
| GET    | /api/leads            | Yes      | All                |
| GET    | /api/leads/:id        | Yes      | All (agents: own)  |
| POST   | /api/leads            | Yes      | Admin, Manager     |
| PUT    | /api/leads/:id        | Yes      | All (agents: own)  |
| DELETE | /api/leads/:id        | Yes      | Admin, Manager     |

**GET /api/leads query params:**
- `page` (default: 1)
- `limit` (default: 10, max: 100)
- `search` — searches name, email, phone
- `status` — new | contacted | qualified | converted | lost
- `source` — website | referral | social_media | cold_call | email_campaign | other
- `sortBy` — name | status | source | created_at | updated_at (default: created_at)
- `sortDir` — asc | desc (default: desc)

### Users (Admin only)
| Method | Endpoint      | Description    |
|--------|---------------|----------------|
| GET    | /api/users    | List all users |
| GET    | /api/users/:id | Get user      |
| PUT    | /api/users/:id | Update user   |

---

## Lead Assignment Logic

Uses the **Least-Loaded Agent** strategy:

1. When a manager creates a lead, the system queries `agent_assignment_tracker`
2. It selects the active agent with the **fewest assigned leads**
3. On tie, it picks the one who was **assigned least recently**
4. The tracker row is updated in a **DB transaction with SELECT FOR UPDATE SKIP LOCKED** to prevent race conditions under concurrency
5. When a lead is deleted, the agent's count is decremented

This is scalable: no in-memory state, the DB is the source of truth. To switch to round-robin, simply change the `ORDER BY` in `assignmentService.js`.

---

## Assumptions & Tradeoffs

### Assumptions
- Only managers and admins can create leads; agents only receive them via auto-assignment
- Agents cannot see other agents' leads
- A lead's `assigned_to` is set at creation and not changed by business logic (admin/manager can update it manually via the edit form)
- Email notifications are fire-and-forget (non-blocking); if SMTP is not configured, they are silently skipped

### Tradeoffs
- **Refresh tokens stored in DB** (simple, auditable) vs Redis (faster but adds infra complexity)
- **Nodemailer over SendGrid/SES** — zero-cost, zero-signup for demo; swap the transport in `emailUtil.js` for production
- **React without Redux** — local state + Context is sufficient for this scope; Redux would add boilerplate without benefit here
- **No soft-delete on leads** — hard delete with activity log is simpler and sufficient; soft delete could be added as a migration

### Improvements With More Time
- WebSocket live updates for agent dashboard
- Swagger/OpenAPI docs
- Redis caching for lead listing queries
- Background job queue for email sending (Bull/BullMQ)
- Rate limiting per IP/user
- CSV export for lead reports
- Advanced analytics on dashboard
