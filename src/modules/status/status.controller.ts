import { Controller, Get } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { getAuth } from '../../lib/auth';

const START_TIME = Date.now();

const API_MODULES = [
  { module: 'Auth',          base: '/api/v1/auth',          endpoints: ['POST /register', 'GET /me', 'GET /institutes', 'POST /sign-in/email', 'POST /sign-out', 'GET /get-session'] },
  { module: 'Students',      base: '/api/v1/students',      endpoints: ['GET /', 'POST /', 'GET /:id', 'PATCH /:id', 'DELETE /:id'] },
  { module: 'Guardians',     base: '/api/v1/guardians',     endpoints: ['GET /', 'POST /', 'GET /:id', 'PATCH /:id'] },
  { module: 'Attendance',    base: '/api/v1/attendance',    endpoints: ['POST /mark', 'GET /report', 'GET /today'] },
  { module: 'Fees',          base: '/api/v1/fees',          endpoints: ['GET /structures', 'POST /structures', 'GET /invoices', 'POST /invoices', 'POST /payments'] },
  { module: 'Exams',         base: '/api/v1/exams',         endpoints: ['GET /', 'POST /', 'GET /results', 'POST /results'] },
  { module: 'Madrasa',       base: '/api/v1/madrasa',       endpoints: ['GET /students', 'POST /students', 'GET /halqas', 'POST /halqas'] },
  { module: 'Accounts',      base: '/api/v1/accounts',      endpoints: ['GET /ledger', 'POST /transactions', 'GET /balance-sheet', 'GET /trial-balance'] },
  { module: 'Dashboard',     base: '/api/v1/dashboard',     endpoints: ['GET /stats', 'GET /recent-activity'] },
  { module: 'Reports',       base: '/api/v1/reports',       endpoints: ['GET /attendance', 'GET /fees', 'GET /academic'] },
  { module: 'Export',        base: '/api/v1/export',        endpoints: ['GET /students', 'GET /attendance', 'GET /fees'] },
  { module: 'Notifications', base: '/api/v1/notifications', endpoints: ['GET /history', 'GET /templates', 'POST /templates'] },
  { module: 'Settings',      base: '/api/v1/settings',      endpoints: ['GET /', 'PATCH /', 'GET /academic-years', 'POST /academic-years'] },
  { module: 'Tasks',         base: '/api/v1/tasks',         endpoints: ['GET /', 'POST /', 'PATCH /:id', 'DELETE /:id'] },
  { module: 'Super Admin',   base: '/api/v1/super-admin',   endpoints: ['POST /onboard', 'GET /organizations', 'GET /onboarding-requests'] },
  { module: 'Health',        base: '/api/v1/health',        endpoints: ['GET /'] },
];

@Controller('/')
export class StatusController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  async status() {
    const checks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkAuth(),
    ]);

    const [dbResult, authResult] = checks;

    const database = dbResult.status === 'fulfilled' ? dbResult.value : { status: 'down', latencyMs: null, error: String((dbResult as PromiseRejectedResult).reason) };
    const auth     = authResult.status === 'fulfilled' ? authResult.value : { status: 'down', error: String((authResult as PromiseRejectedResult).reason) };

    const overall = [database, auth].every((c) => c.status === 'up') ? 'operational' : 'degraded';

    return {
      status: overall,
      version: 'v1',
      environment: process.env.NODE_ENV ?? 'unknown',
      uptime: `${Math.floor((Date.now() - START_TIME) / 1000)}s`,
      timestamp: new Date().toISOString(),
      services: { database, auth },
      api: {
        baseUrl: '/api/v1',
        modules: API_MODULES,
      },
    };
  }

  private async checkDatabase(): Promise<{ status: string; latencyMs: number }> {
    const t = Date.now();
    await this.prisma.$queryRaw`SELECT 1`;
    return { status: 'up', latencyMs: Date.now() - t };
  }

  private async checkAuth(): Promise<{ status: string; initialized: boolean }> {
    const auth = await getAuth();
    return { status: auth ? 'up' : 'down', initialized: !!auth };
  }
}
