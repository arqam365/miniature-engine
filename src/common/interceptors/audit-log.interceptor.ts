import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { PrismaService } from '../../prisma/prisma.service';
import { getTenantContext } from '../../modules/tenancy/tenant-context';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const { method, url } = req;

    const writeMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
    if (!writeMethods.includes(method)) return next.handle();

    return next.handle().pipe(
      tap(() => {
        const ctx = getTenantContext();
        if (!ctx) return;

        this.prisma.auditLog
          .create({
            data: {
              userId: ctx.userId,
              orgId: ctx.organizationId,
              action: method,
              resource: url,
              ipAddress: req.ip,
              userAgent: req.headers['user-agent'],
            },
          })
          .catch(() => {});
      }),
    );
  }
}
