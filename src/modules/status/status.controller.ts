import { Controller, Get, Res, Header } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { getAuth } from '../../lib/auth';

const START_TIME = Date.now();

const API_MODULES = [
  { name: 'Auth',          base: '/api/v1/auth',          icon: '🔐', endpoints: ['POST /register', 'GET /me', 'GET /institutes', 'POST /sign-in/email', 'POST /sign-out', 'GET /get-session'] },
  { name: 'Students',      base: '/api/v1/students',      icon: '🎓', endpoints: ['GET /', 'POST /', 'GET /:id', 'PATCH /:id', 'DELETE /:id'] },
  { name: 'Guardians',     base: '/api/v1/guardians',     icon: '👥', endpoints: ['GET /', 'POST /', 'GET /:id', 'PATCH /:id'] },
  { name: 'Attendance',    base: '/api/v1/attendance',    icon: '📋', endpoints: ['POST /mark', 'GET /report', 'GET /today'] },
  { name: 'Fees',          base: '/api/v1/fees',          icon: '💳', endpoints: ['GET /structures', 'POST /structures', 'GET /invoices', 'POST /invoices', 'POST /payments'] },
  { name: 'Exams',         base: '/api/v1/exams',         icon: '📝', endpoints: ['GET /', 'POST /', 'GET /results', 'POST /results'] },
  { name: 'Madrasa',       base: '/api/v1/madrasa',       icon: '🕌', endpoints: ['GET /students', 'POST /students', 'GET /halqas', 'POST /halqas'] },
  { name: 'Accounts',      base: '/api/v1/accounts',      icon: '📊', endpoints: ['GET /ledger', 'POST /transactions', 'GET /balance-sheet', 'GET /trial-balance'] },
  { name: 'Dashboard',     base: '/api/v1/dashboard',     icon: '🏠', endpoints: ['GET /stats', 'GET /recent-activity'] },
  { name: 'Reports',       base: '/api/v1/reports',       icon: '📈', endpoints: ['GET /attendance', 'GET /fees', 'GET /academic'] },
  { name: 'Export',        base: '/api/v1/export',        icon: '📤', endpoints: ['GET /students', 'GET /attendance', 'GET /fees'] },
  { name: 'Notifications', base: '/api/v1/notifications', icon: '🔔', endpoints: ['GET /history', 'GET /templates', 'POST /templates'] },
  { name: 'Settings',      base: '/api/v1/settings',      icon: '⚙️',  endpoints: ['GET /', 'PATCH /', 'GET /academic-years', 'POST /academic-years'] },
  { name: 'Tasks',         base: '/api/v1/tasks',         icon: '✅', endpoints: ['GET /', 'POST /', 'PATCH /:id', 'DELETE /:id'] },
  { name: 'Super Admin',   base: '/api/v1/super-admin',   icon: '👑', endpoints: ['POST /onboard', 'GET /organizations', 'GET /onboarding-requests'] },
  { name: 'Health',        base: '/api/v1/health',        icon: '💚', endpoints: ['GET /'] },
];

const METHOD_COLORS: Record<string, string> = {
  GET: '#22c55e',
  POST: '#3b82f6',
  PATCH: '#f59e0b',
  PUT: '#f59e0b',
  DELETE: '#ef4444',
};

@Controller('/')
export class StatusController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  @Header('Content-Type', 'text/html; charset=utf-8')
  async status(@Res() res: any) {
    const checks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkAuth(),
    ]);

    const [dbResult, authResult] = checks;
    const database = dbResult.status === 'fulfilled'
      ? dbResult.value
      : { status: 'down' as const, latencyMs: null as null, error: String((dbResult as PromiseRejectedResult).reason) };
    const auth = authResult.status === 'fulfilled'
      ? authResult.value
      : { status: 'down' as const, initialized: false };

    const allUp = database.status === 'up' && auth.status === 'up';
    const uptimeSec = Math.floor((Date.now() - START_TIME) / 1000);
    const uptime = uptimeSec < 60 ? `${uptimeSec}s`
      : uptimeSec < 3600 ? `${Math.floor(uptimeSec / 60)}m ${uptimeSec % 60}s`
      : `${Math.floor(uptimeSec / 3600)}h ${Math.floor((uptimeSec % 3600) / 60)}m`;

    const moduleCards = API_MODULES.map(m => {
      const endpointRows = m.endpoints.map(ep => {
        const [method, ...pathParts] = ep.split(' ');
        const color = METHOD_COLORS[method] ?? '#94a3b8';
        return `<div class="ep">
          <span class="badge" style="background:${color}20;color:${color};border:1px solid ${color}40">${method}</span>
          <span class="ep-path">${m.base}${pathParts.join(' ')}</span>
        </div>`;
      }).join('');

      return `<div class="card">
        <div class="card-header">
          <span class="card-icon">${m.icon}</span>
          <div>
            <div class="card-title">${m.name}</div>
            <div class="card-base">${m.base}</div>
          </div>
          <span class="status-dot up" title="Operational"></span>
        </div>
        <div class="endpoints">${endpointRows}</div>
      </div>`;
    }).join('');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="refresh" content="30">
<title>Cognivia ERP — API Status</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0 }
  :root {
    --bg: #0a0a0f;
    --surface: #111118;
    --border: #1e1e2e;
    --text: #e2e8f0;
    --muted: #64748b;
    --up: #22c55e;
    --down: #ef4444;
    --accent: #6366f1;
  }
  body { background: var(--bg); color: var(--text); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; min-height: 100vh; }

  /* Header */
  .header { border-bottom: 1px solid var(--border); padding: 20px 32px; display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
  .logo { display: flex; align-items: center; gap: 12px; }
  .logo-mark { width: 36px; height: 36px; background: var(--accent); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 16px; }
  .logo-text { font-size: 18px; font-weight: 700; letter-spacing: -0.3px; }
  .logo-sub { font-size: 12px; color: var(--muted); margin-top: 1px; }
  .overall-badge { display: flex; align-items: center; gap: 8px; padding: 8px 16px; border-radius: 999px; font-size: 13px; font-weight: 600; border: 1px solid; }
  .overall-badge.up { background: #22c55e12; color: #22c55e; border-color: #22c55e30; }
  .overall-badge.down { background: #ef444412; color: #ef4444; border-color: #ef444430; }
  .pulse { width: 8px; height: 8px; border-radius: 50%; animation: pulse 2s infinite; }
  .pulse.up { background: #22c55e; box-shadow: 0 0 0 0 #22c55e40; }
  .pulse.down { background: #ef4444; box-shadow: 0 0 0 0 #ef444440; animation: none; }
  @keyframes pulse { 0%,100%{box-shadow:0 0 0 0 #22c55e40} 50%{box-shadow:0 0 0 6px transparent} }

  /* Main */
  .main { max-width: 1280px; margin: 0 auto; padding: 32px; }

  /* Service row */
  .services { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; margin-bottom: 40px; }
  .service { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 16px 20px; }
  .service-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--muted); margin-bottom: 8px; }
  .service-val { font-size: 22px; font-weight: 700; }
  .service-val.up { color: var(--up); }
  .service-val.down { color: var(--down); }
  .service-meta { font-size: 12px; color: var(--muted); margin-top: 4px; }

  /* Section title */
  .section-title { font-size: 13px; text-transform: uppercase; letter-spacing: 0.6px; color: var(--muted); font-weight: 600; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
  .section-title::after { content: ''; flex: 1; height: 1px; background: var(--border); }

  /* Cards grid */
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; }

  /* Card */
  .card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; transition: border-color 0.15s; }
  .card:hover { border-color: #2e2e42; }
  .card-header { display: flex; align-items: flex-start; gap: 12px; padding: 16px 16px 12px; border-bottom: 1px solid var(--border); }
  .card-icon { font-size: 20px; line-height: 1; margin-top: 2px; }
  .card-title { font-size: 14px; font-weight: 600; }
  .card-base { font-size: 11px; color: var(--accent); margin-top: 2px; font-family: 'SF Mono', 'Fira Code', monospace; }
  .status-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--up); margin-left: auto; margin-top: 4px; flex-shrink: 0; box-shadow: 0 0 6px var(--up); }

  /* Endpoints */
  .endpoints { padding: 10px 12px; display: flex; flex-direction: column; gap: 4px; }
  .ep { display: flex; align-items: center; gap: 8px; padding: 4px 4px; border-radius: 6px; }
  .ep:hover { background: #ffffff06; }
  .badge { font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; font-family: 'SF Mono', 'Fira Code', monospace; min-width: 44px; text-align: center; flex-shrink: 0; }
  .ep-path { font-size: 12px; color: #94a3b8; font-family: 'SF Mono', 'Fira Code', monospace; }

  /* Footer */
  .footer { border-top: 1px solid var(--border); padding: 16px 32px; display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: var(--muted); flex-wrap: wrap; gap: 8px; margin-top: 40px; }
  .footer a { color: var(--accent); text-decoration: none; }

  @media (max-width: 640px) {
    .main { padding: 16px; }
    .header { padding: 16px; }
    .grid { grid-template-columns: 1fr; }
  }
</style>
</head>
<body>

<header class="header">
  <div class="logo">
    <div class="logo-mark">C</div>
    <div>
      <div class="logo-text">Cognivia ERP</div>
      <div class="logo-sub">API Status &amp; Reference</div>
    </div>
  </div>
  <div class="overall-badge ${allUp ? 'up' : 'down'}">
    <span class="pulse ${allUp ? 'up' : 'down'}"></span>
    ${allUp ? 'All Systems Operational' : 'Degraded Performance'}
  </div>
</header>

<main class="main">

  <div class="services">
    <div class="service">
      <div class="service-label">Database</div>
      <div class="service-val ${database.status}">${database.status === 'up' ? 'Online' : 'Offline'}</div>
      <div class="service-meta">${database.status === 'up' ? `${(database as any).latencyMs} ms latency` : 'Connection failed'}</div>
    </div>
    <div class="service">
      <div class="service-label">Auth Service</div>
      <div class="service-val ${auth.status}">${auth.status === 'up' ? 'Online' : 'Offline'}</div>
      <div class="service-meta">${auth.status === 'up' ? 'Better Auth initialized' : 'Initialization failed'}</div>
    </div>
    <div class="service">
      <div class="service-label">Uptime</div>
      <div class="service-val" style="color:var(--text)">${uptime}</div>
      <div class="service-meta">Since last cold start</div>
    </div>
    <div class="service">
      <div class="service-label">Environment</div>
      <div class="service-val" style="color:var(--accent);font-size:16px;text-transform:capitalize">${process.env.NODE_ENV ?? 'unknown'}</div>
      <div class="service-meta">API version: v1</div>
    </div>
    <div class="service">
      <div class="service-label">Modules</div>
      <div class="service-val" style="color:var(--text)">${API_MODULES.length}</div>
      <div class="service-meta">${API_MODULES.reduce((a, m) => a + m.endpoints.length, 0)} total endpoints</div>
    </div>
    <div class="service">
      <div class="service-label">Last Checked</div>
      <div class="service-val" style="color:var(--text);font-size:14px;margin-top:4px">${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
      <div class="service-meta">Auto-refresh every 30s</div>
    </div>
  </div>

  <div class="section-title">API Modules</div>
  <div class="grid">
    ${moduleCards}
  </div>

</main>

<footer class="footer">
  <span>Cognivia ERP Engine &mdash; Built by <a href="https://revzion.in" target="_blank">Revzion</a></span>
  <span>${new Date().toISOString()}</span>
</footer>

</body>
</html>`;

    res.status(200).send(html);
  }

  private async checkDatabase(): Promise<{ status: 'up'; latencyMs: number }> {
    const t = Date.now();
    await this.prisma.$queryRaw`SELECT 1`;
    return { status: 'up', latencyMs: Date.now() - t };
  }

  private async checkAuth(): Promise<{ status: 'up' | 'down'; initialized: boolean }> {
    const auth = await getAuth();
    return { status: auth ? 'up' : 'down', initialized: !!auth };
  }
}
