import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { FastifyThrottlerGuard } from './common/guards/throttler.guard';
import configuration from './config/configuration';
import { PrismaModule } from './prisma/prisma.module';
import { TenancyModule } from './modules/tenancy/tenancy.module';
import { TenancyMiddleware } from './modules/tenancy/tenancy.middleware';
import { AuthModule } from './modules/auth/auth.module';
import { StudentsModule } from './modules/students/students.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { FeesModule } from './modules/fees/fees.module';
import { ExamsModule } from './modules/exams/exams.module';
import { SettingsModule } from './modules/settings/settings.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { MadrasaModule } from './modules/madrasa/madrasa.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { HealthModule } from './modules/health/health.module';
import { SuperAdminModule } from './modules/super-admin/super-admin.module';
import { GuardiansModule } from './modules/guardians/guardians.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { ReportsModule } from './modules/reports/reports.module';
import { ExportModule } from './modules/export/export.module';
import { AccountsModule } from './modules/accounts/accounts.module';
import { BetterAuthGuard } from './common/guards/better-auth.guard';
import { RbacGuard } from './common/guards/rbac.guard';
import { AuditLogInterceptor } from './common/interceptors/audit-log.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    ThrottlerModule.forRoot([
      { name: 'auth', ttl: 60_000, limit: 10 },
      { name: 'global', ttl: 60_000, limit: 120 },
    ]),
    PrismaModule,
    TenancyModule,
    AuthModule,
    HealthModule,
    DashboardModule,
    StudentsModule,
    AttendanceModule,
    FeesModule,
    ExamsModule,
    SettingsModule,
    NotificationsModule,
    MadrasaModule,
    GuardiansModule,
    TasksModule,
    ReportsModule,
    ExportModule,
    AccountsModule,
    SuperAdminModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: FastifyThrottlerGuard },
    { provide: APP_GUARD, useClass: BetterAuthGuard },
    { provide: APP_GUARD, useClass: RbacGuard },
    { provide: APP_INTERCEPTOR, useClass: AuditLogInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenancyMiddleware).forRoutes('*');
  }
}
