/**
 * Linear workspace setup script for cognivia-erp-engine (Backend)
 *
 * Run once after creating your Linear workspace:
 *   LINEAR_API_KEY=lin_api_xxx LINEAR_TEAM_ID=xxx npx ts-node scripts/linear-setup.ts
 *
 * Get your API key: Linear → Settings → API → Personal API keys
 * Get your Team ID: Linear → Settings → Members & Teams → copy team ID from URL
 */

import { LinearClient } from '@linear/sdk';

const client = new LinearClient({ apiKey: process.env.LINEAR_API_KEY! });
const TEAM_ID = process.env.LINEAR_TEAM_ID!;

// ─── All backend issues mapped from PLAN.md ───────────────────────────────────

const PHASES: { title: string; priority: number; issues: { title: string; description: string; labelNames: string[] }[] }[] = [
  {
    title: 'Phase 5 — Seed & First Run',
    priority: 1,
    issues: [
      { title: 'Run prisma migrate dev against Neon', description: 'Apply schema migrations to NeonDB production database.', labelNames: ['backend', 'database'] },
      { title: 'Run prisma db seed — demo data', description: 'Creates demo org, 2 institutes, 3 roles, all permissions, admin user.', labelNames: ['backend', 'database'] },
      { title: 'Verify Swagger at /api/docs', description: 'Confirm all endpoints appear correctly in Swagger UI after server starts.', labelNames: ['backend'] },
      { title: 'Test login flow end-to-end', description: 'POST /auth/login → verify access token → GET /auth/me → verify user payload.', labelNames: ['backend', 'auth'] },
    ],
  },
  {
    title: 'Phase 6 — Accounts Module',
    priority: 2,
    issues: [
      { title: 'GET/POST /accounts — chart of accounts', description: 'CRUD for institute accounts (assets, liabilities, income, expenses).', labelNames: ['backend', 'accounts'] },
      { title: 'POST /receipts — create receipt with ledger entry', description: 'Auto-creates double-entry ledger on receipt creation.', labelNames: ['backend', 'accounts'] },
      { title: 'POST /vouchers — payment/journal/contra vouchers', description: 'Support all 3 voucher types with ledger entries.', labelNames: ['backend', 'accounts'] },
      { title: 'GET /ledger — filtered by account + date range', description: 'Paginated ledger entries with debit/credit totals.', labelNames: ['backend', 'accounts'] },
      { title: 'GET /accounts/day-book', description: 'All transactions for a selected date.', labelNames: ['backend', 'accounts'] },
      { title: 'GET /accounts/cash-in-hand', description: 'Current cash balance from cash account.', labelNames: ['backend', 'accounts'] },
      { title: 'GET /accounts/trial-balance', description: 'Debit/credit totals across all accounts.', labelNames: ['backend', 'accounts'] },
    ],
  },
  {
    title: 'Phase 7 — Reports & Export Engine',
    priority: 2,
    issues: [
      { title: 'GET /reports/student-strength', description: 'Class/section-wise student count report.', labelNames: ['backend', 'reports'] },
      { title: 'GET /reports/attendance-analytics', description: 'Monthly attendance trends by section.', labelNames: ['backend', 'reports'] },
      { title: 'GET /reports/fee-defaulters', description: 'Overdue fee list with aging buckets (30/60/90 days).', labelNames: ['backend', 'reports'] },
      { title: 'GET /reports/exam-ranking', description: 'Top performers per exam with rank + grade.', labelNames: ['backend', 'reports'] },
      { title: 'GET /export/students — Excel/CSV', description: 'Export full student list with enrollments.', labelNames: ['backend', 'export'] },
      { title: 'GET /export/attendance — summary + detailed', description: 'Attendance export in Excel format.', labelNames: ['backend', 'export'] },
      { title: 'GET /export/report-card/:examId/:studentId — PDF', description: 'Generate PDF report card using pdfkit.', labelNames: ['backend', 'export'] },
      { title: 'GET /export/id-card/:studentId — PDF', description: 'Generate student ID card PDF.', labelNames: ['backend', 'export'] },
    ],
  },
  {
    title: 'Phase 8 — BullMQ Background Jobs',
    priority: 3,
    issues: [
      { title: 'NotificationWorker — async SMS/Email delivery', description: 'Process queued notifications via Resend (email) and Twilio (SMS).', labelNames: ['backend', 'jobs'] },
      { title: 'ExportWorker — async PDF/Excel generation', description: 'Generate large exports in background, store in R2, email download link.', labelNames: ['backend', 'jobs'] },
      { title: 'AttendanceAlertWorker — absent notifications', description: 'After attendance marked, notify guardians of absent students.', labelNames: ['backend', 'jobs'] },
      { title: 'FeeReminderWorker — scheduled cron reminders', description: 'Daily cron job sending fee due reminders to overdue students.', labelNames: ['backend', 'jobs'] },
      { title: 'GET /jobs/:id/status — job tracking endpoint', description: 'Check status of async export jobs.', labelNames: ['backend', 'jobs'] },
    ],
  },
  {
    title: 'Phase 9 — Realtime WebSocket Gateway',
    priority: 3,
    issues: [
      { title: 'AttendanceGateway — live attendance broadcast', description: 'Broadcast attendance updates to dashboard via Socket.io rooms per section.', labelNames: ['backend', 'realtime'] },
      { title: 'NotificationGateway — in-app push notifications', description: 'Push live notifications to connected users per institute room.', labelNames: ['backend', 'realtime'] },
      { title: 'JWT auth on socket handshake', description: 'Verify JWT token during socket connection handshake.', labelNames: ['backend', 'realtime', 'auth'] },
    ],
  },
  {
    title: 'Phase 10 — File Upload (Cloudflare R2)',
    priority: 3,
    issues: [
      { title: 'POST /upload/avatar — user profile photo', description: 'Upload + store user avatar in R2, return public URL.', labelNames: ['backend', 'upload'] },
      { title: 'POST /upload/student-photo', description: 'Upload student profile photo to R2.', labelNames: ['backend', 'upload'] },
      { title: 'POST /upload/document — student documents', description: 'Upload student documents (certificates, etc.) to R2.', labelNames: ['backend', 'upload'] },
      { title: 'POST /upload/logo — org/institute logo', description: 'Upload org or institute logo to R2.', labelNames: ['backend', 'upload'] },
      { title: 'Signed URL generation for private files', description: 'Generate time-limited signed URLs for private document access.', labelNames: ['backend', 'upload'] },
    ],
  },
  {
    title: 'Phase 11 — Guardians & Parent Data',
    priority: 2,
    issues: [
      { title: 'POST /guardians — create guardian', description: 'Create guardian with relationship and contact details.', labelNames: ['backend', 'students'] },
      { title: 'POST /students/:id/guardians — link guardian', description: 'Link existing or new guardian to a student.', labelNames: ['backend', 'students'] },
      { title: 'GET /guardians/:id — profile with students', description: 'Guardian profile showing all linked students.', labelNames: ['backend', 'students'] },
    ],
  },
  {
    title: 'Phase 12 — Tasks & Events',
    priority: 3,
    issues: [
      { title: 'GET/POST /tasks — create and list tasks', description: 'Task creation and listing with role-based visibility.', labelNames: ['backend', 'tasks'] },
      { title: 'PUT /tasks/:id/complete — mark task done', description: 'Mark task as completed with timestamp.', labelNames: ['backend', 'tasks'] },
      { title: 'GET /tasks/my-tasks — current user tasks', description: 'Tasks assigned to the currently authenticated user.', labelNames: ['backend', 'tasks'] },
    ],
  },
  {
    title: 'Phase 13 — Multi-Institute Switching',
    priority: 2,
    issues: [
      { title: 'GET /auth/institutes — list accessible institutes', description: 'List all institutes the current user has roles in.', labelNames: ['backend', 'auth'] },
      { title: 'POST /auth/switch-institute — scoped token', description: 'Issue new JWT scoped to a specific institute.', labelNames: ['backend', 'auth'] },
    ],
  },
  {
    title: 'Phase 14 — Security Hardening',
    priority: 2,
    issues: [
      { title: 'Rate limiting on auth endpoints', description: 'Use @nestjs/throttler to limit login attempts.', labelNames: ['backend', 'security'] },
      { title: 'Helmet security headers', description: 'Add security HTTP headers via @fastify/helmet.', labelNames: ['backend', 'security'] },
      { title: 'Input sanitization', description: 'Strip dangerous HTML/SQL from all string inputs.', labelNames: ['backend', 'security'] },
      { title: 'Audit log retention policy', description: 'Auto-delete audit logs older than 90 days via cron.', labelNames: ['backend', 'security'] },
    ],
  },
  {
    title: 'Phase 15 — Testing',
    priority: 3,
    issues: [
      { title: 'Unit tests — AuthService', description: 'Test login, register, refresh, logout flows.', labelNames: ['backend', 'testing'] },
      { title: 'Unit tests — FeesService', description: 'Test payment collection, receipt generation, defaulters.', labelNames: ['backend', 'testing'] },
      { title: 'Integration test — full student lifecycle', description: 'Login → admit student → enroll → mark attendance → collect fee.', labelNames: ['backend', 'testing'] },
      { title: 'GitHub Actions CI pipeline', description: 'Run tsc + tests on every push to main.', labelNames: ['backend', 'ci'] },
    ],
  },
  {
    title: 'Phase 16 — Production Deployment',
    priority: 1,
    issues: [
      { title: 'Push backend to GitHub', description: 'Initialize git repo and push cognivia-erp-engine to GitHub.', labelNames: ['backend', 'devops'] },
      { title: 'Connect Railway to GitHub repo', description: 'Create Railway project linked to backend repo.', labelNames: ['backend', 'devops'] },
      { title: 'Set all env vars in Railway dashboard', description: 'DATABASE_URL, DIRECT_URL, REDIS_URL, JWT secrets, R2 keys, RESEND_API_KEY.', labelNames: ['backend', 'devops'] },
      { title: 'Verify health endpoint on production', description: 'GET https://your-backend.railway.app/api/v1/health returns 200.', labelNames: ['backend', 'devops'] },
    ],
  },
];

async function getOrCreateLabel(teamId: string, name: string, color: string): Promise<string> {
  const labels = await client.issueLabels({ filter: { team: { id: { eq: teamId } } } });
  const existing = labels.nodes.find((l) => l.name === name);
  if (existing) return existing.id;

  const result = await client.createIssueLabel({ teamId, name, color });
  return (await result.issueLabel)!.id;
}

async function main() {
  if (!process.env.LINEAR_API_KEY || !TEAM_ID) {
    console.error('❌ Set LINEAR_API_KEY and LINEAR_TEAM_ID env vars');
    process.exit(1);
  }

  const me = await client.viewer;
  console.log(`✅ Connected as: ${me.name}`);

  // Get workflow states
  const team = await client.team(TEAM_ID);
  const states = await team.states();
  const todoState = states.nodes.find((s) => s.name === 'Todo' || s.name === 'Backlog');

  // Pre-create labels
  const labelColors: Record<string, string> = {
    backend: '#6366f1', database: '#0ea5e9', auth: '#f59e0b',
    accounts: '#10b981', reports: '#8b5cf6', export: '#ec4899',
    jobs: '#f97316', realtime: '#14b8a6', upload: '#06b6d4',
    students: '#84cc16', tasks: '#a78bfa', security: '#ef4444',
    testing: '#64748b', ci: '#334155', devops: '#1e40af',
  };

  const labelIds: Record<string, string> = {};
  for (const [name, color] of Object.entries(labelColors)) {
    labelIds[name] = await getOrCreateLabel(TEAM_ID, name, color);
    process.stdout.write('.');
  }
  console.log('\n✅ Labels ready');

  let created = 0;
  for (const phase of PHASES) {
    console.log(`\n📦 Creating: ${phase.title}`);

    for (const issue of phase.issues) {
      const resolvedLabelIds = issue.labelNames
        .map((n) => labelIds[n])
        .filter(Boolean);

      await client.createIssue({
        teamId: TEAM_ID,
        title: `[BE] ${issue.title}`,
        description: issue.description,
        priority: phase.priority,
        stateId: todoState?.id,
        labelIds: resolvedLabelIds,
      });

      process.stdout.write('.');
      created++;
      // Respect Linear rate limit
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  console.log(`\n\n🎉 Done! Created ${created} backend issues in Linear.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
