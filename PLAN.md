# Cognivia ERP — Backend Engine Plan
## `cognivia-erp-engine` · NestJS + Fastify + Prisma + PostgreSQL (Neon)

---

## Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 22 |
| Framework | NestJS 11 + Fastify |
| ORM | Prisma 6 |
| Database | PostgreSQL 16 via Neon (serverless) |
| Cache / Queue | Redis via Upstash + BullMQ |
| Auth | JWT (access + refresh tokens) + Argon2 |
| File Storage | Cloudflare R2 (S3-compatible) |
| Email | Resend |
| SMS | Twilio |
| Realtime | Socket.io WebSocket gateway |
| Docs | Swagger / OpenAPI at `/api/docs` |
| Deployment | Railway |

---

## Current Status

### ✅ Phase 0 — Scaffold (DONE)
- [x] NestJS + Fastify bootstrap (`main.ts`)
- [x] Global config (`ConfigModule`)
- [x] Prisma service + module (global)
- [x] Docker Compose (Postgres + Redis + MinIO for local dev)
- [x] `railway.toml` deployment config
- [x] `.env.example` with Neon + Upstash + R2 + Resend

### ✅ Phase 1 — Database Schema (DONE)
- [x] Multi-tenant schema (`organization_id` + `institute_id` on all tables)
- [x] Organizations, Institutes
- [x] Users, Roles, Permissions, RBAC junction tables
- [x] Refresh tokens
- [x] Academic Years, Courses, Classes, Sections, Batches
- [x] Subjects, ClassSubjects
- [x] Students, Guardians, Enrollments, Custom fields
- [x] Attendance records
- [x] Fee categories, structures, payments
- [x] Exam types, grade schemas, exams, results, marks
- [x] Accounts, Receipts, Vouchers, Ledger entries
- [x] Tasks
- [x] Notification templates + Notifications
- [x] Org settings, Student field config
- [x] Audit log
- [x] Madrasa plugin: HifzProgress, Sponsorships, DonationLedger
- [x] Neon dual-URL setup (`DATABASE_URL` pooled + `DIRECT_URL` for migrations)

### ✅ Phase 2 — Core Infrastructure (DONE)
- [x] `AsyncLocalStorage` tenant context
- [x] `TenancyMiddleware` — injects org/institute from JWT on every request
- [x] `JwtAuthGuard` — global, skipped via `@Public()`
- [x] `RbacGuard` — global, checked via `@RequirePermission()`
- [x] `GlobalExceptionFilter` — Prisma + HTTP errors → clean JSON
- [x] `AuditLogInterceptor` — logs all write operations
- [x] Decorators: `@CurrentUser`, `@RequirePermission`, `@Public`

### ✅ Phase 3 — Auth Module (DONE)
- [x] `POST /auth/register` — org onboarding
- [x] `POST /auth/login` — returns access + refresh tokens with permissions
- [x] `POST /auth/refresh` — token rotation
- [x] `POST /auth/logout` — revoke refresh token
- [x] `GET /auth/me` — current user profile
- [x] JWT strategy (Passport)

### ✅ Phase 4 — Core ERP Modules (DONE)
- [x] Students — CRUD, enrollment, attendance summary, soft delete
- [x] Attendance — bulk mark, section view, monthly report, absentees
- [x] Fees — collect payment, receipt generation, defaulters, dashboard stats
- [x] Exams — create, mark entry, publish results, ranking
- [x] Settings — org profile, institutes, academic years, roles, classes, sections, subjects, student fields
- [x] Madrasa — Hifz progress, sponsorships, donation ledger
- [x] Dashboard — aggregated stats + recent activity
- [x] Notifications — templates, send, bulk send, history
- [x] Health check — `GET /api/v1/health`

---

## Phase 5 — Seed & Permissions (NEXT)

- [ ] Run `prisma migrate dev` against Neon
- [ ] Run `prisma db seed` — creates demo org, 2 institutes, 3 roles, all permissions, admin user
- [ ] Verify Swagger at `http://localhost:4000/api/docs`
- [ ] Test login flow end-to-end

---

## Phase 6 — Accounts Module

Full double-entry bookkeeping for institutes.

- [ ] `GET/POST /accounts` — chart of accounts
- [ ] `POST /receipts` — create receipt + auto ledger entry
- [ ] `POST /vouchers` — payment / journal / contra vouchers
- [ ] `GET /ledger` — filtered ledger entries by account + date range
- [ ] `GET /accounts/day-book` — all transactions for a date
- [ ] `GET /accounts/cash-in-hand` — current cash balance
- [ ] `GET /accounts/trial-balance` — debit/credit totals

---

## Phase 7 — Reports & Export Engine

Critical selling feature of the ERP.

- [ ] `GET /reports/student-strength` — class/section-wise strength
- [ ] `GET /reports/attendance-analytics` — monthly trends by section
- [ ] `GET /reports/fee-defaulters` — overdue with aging buckets
- [ ] `GET /reports/exam-ranking` — top performers per exam
- [ ] `GET /reports/teacher-workload` — classes assigned per teacher
- [ ] `GET /reports/sponsor-coverage` — madrasa sponsor ratio
- [ ] `GET /reports/donation-summary` — by type + donor
- [ ] `GET /export/students` — Excel/CSV
- [ ] `GET /export/attendance` — summary + detailed
- [ ] `GET /export/fees` — receipts + outstanding
- [ ] `GET /export/report-card/:examId/:studentId` — PDF
- [ ] `GET /export/id-card/:studentId` — PDF

Implementation: use `exceljs` for Excel, `pdfkit` for PDFs, run heavy exports in BullMQ background jobs.

---

## Phase 8 — BullMQ Background Jobs

- [ ] `NotificationWorker` — processes queued SMS/Email notifications via Resend + Twilio
- [ ] `ExportWorker` — generates large PDF/Excel exports async, stores in R2, emails download link
- [ ] `AttendanceAlertWorker` — sends absent notifications to guardians after attendance is marked
- [ ] `FeeReminderWorker` — scheduled job (cron) for overdue fee reminders
- [ ] Job status tracking endpoint: `GET /jobs/:id/status`

---

## Phase 9 — Realtime WebSocket Gateway

- [ ] `AttendanceGateway` — broadcast live attendance updates to dashboard
- [ ] `NotificationGateway` — push in-app notifications to connected users
- [ ] Rooms: per-institute, per-section
- [ ] Auth: JWT verification on socket handshake

---

## Phase 10 — File Upload (Cloudflare R2)

- [ ] `POST /upload/avatar` — user profile photo
- [ ] `POST /upload/student-photo` — student profile photo
- [ ] `POST /upload/document` — student document uploads
- [ ] `POST /upload/logo` — org/institute logo
- [ ] Signed URL generation for private files
- [ ] File size + type validation

---

## Phase 11 — Guardians & Parent Data

- [ ] `POST /guardians` — create guardian
- [ ] `POST /students/:id/guardians` — link guardian to student
- [ ] `GET /guardians/:id` — profile with linked students
- [ ] `PUT /guardians/:id` — update
- [ ] Sponsor flag on guardian for madrasa sponsorship tracking

---

## Phase 12 — Tasks & Events

- [ ] `GET/POST /tasks` — create + list tasks
- [ ] `PUT /tasks/:id/complete` — mark done
- [ ] `GET /tasks/my-tasks` — tasks assigned to current user
- [ ] Role-based visibility (teacher sees own tasks, principal sees all)

---

## Phase 13 — Multi-Institute Switching

- [ ] `GET /auth/institutes` — list institutes user has access to
- [ ] `POST /auth/switch-institute` — get new token scoped to institute
- [ ] Frontend `X-Institute-Id` header support already wired

---

## Phase 14 — Security Hardening

- [ ] Rate limiting on auth endpoints (`@nestjs/throttler`)
- [ ] Helmet headers
- [ ] Input sanitization
- [ ] Audit log retention policy
- [ ] Soft-delete pattern on sensitive data (students, receipts)
- [ ] Permission scope: restrict cross-org data access at DB level

---

## Phase 15 — Testing

- [ ] Unit tests: AuthService, FeesService, AttendanceService
- [ ] Integration tests: full login → student create → enroll → mark attendance → collect fee flow
- [ ] Prisma test client with transaction rollback per test
- [ ] CI: GitHub Actions on push to main

---

## Phase 16 — Production Deployment

- [ ] Push to GitHub
- [ ] Connect Railway to repo
- [ ] Set all env vars in Railway dashboard (Neon + Upstash + R2 + Resend + JWT secrets)
- [ ] Railway auto-runs: `prisma migrate deploy && node dist/main`
- [ ] Verify health: `GET https://your-backend.railway.app/api/v1/health`
- [ ] Point `NEXT_PUBLIC_API_URL` in frontend Vercel to Railway URL

---

## API Base URL Structure

```
https://api.cognivia.app/api/v1/

/auth/*
/dashboard/*
/students/*
/attendance/*
/fees/*
/exams/*
/accounts/*
/reports/*
/export/*
/settings/*
/madrasa/*
/notifications/*
/tasks/*
/upload/*
/health
```

---

## Environment Variables Checklist

```
DATABASE_URL         ← Neon pooled connection
DIRECT_URL           ← Neon direct connection (migrations)
REDIS_URL            ← Upstash Redis
JWT_SECRET           ← random 64 chars
JWT_REFRESH_SECRET   ← random 64 chars
JWT_ACCESS_EXPIRY    ← 15m
JWT_REFRESH_EXPIRY   ← 30d
R2_ACCOUNT_ID        ← Cloudflare R2
R2_ACCESS_KEY_ID     ← Cloudflare R2
R2_SECRET_ACCESS_KEY ← Cloudflare R2
R2_BUCKET            ← cognivia-files
R2_PUBLIC_URL        ← https://pub-xxx.r2.dev
RESEND_API_KEY       ← Resend
TWILIO_ACCOUNT_SID   ← Twilio (optional)
TWILIO_AUTH_TOKEN    ← Twilio (optional)
FRONTEND_URL         ← https://cognivia.vercel.app
NODE_ENV             ← production
PORT                 ← 4000
```
