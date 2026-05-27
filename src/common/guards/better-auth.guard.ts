import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FastifyRequest } from 'fastify';
import { getAuth } from '../../lib/auth';
import { PrismaService } from '../../prisma/prisma.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { tenantStorage } from '../../modules/tenancy/tenant-context';

@Injectable()
export class BetterAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<FastifyRequest>();

    const headers = new Headers();
    for (const [key, val] of Object.entries(req.headers)) {
      if (val != null) {
        headers.set(key, Array.isArray(val) ? val.join(', ') : String(val));
      }
    }

    const auth = await getAuth();
    const session = await auth.api.getSession({ headers });
    if (!session?.user) throw new UnauthorizedException('Authentication required');

    const instituteId = req.headers['x-institute-id'] as string | undefined;

    const [dbUser, userRoles] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: session.user.id },
        select: { organizationId: true, isSuperAdmin: true, isActive: true },
      }),
      this.prisma.userRole.findMany({
        where: {
          userId: session.user.id,
          ...(instituteId ? { instituteId } : {}),
        },
        include: {
          role: {
            include: { rolePermissions: { include: { permission: true } } },
          },
        },
      }),
    ]);

    if (!dbUser?.isActive) throw new UnauthorizedException('Account inactive');

    const permissions = [
      ...new Set(
        userRoles.flatMap((ur) =>
          ur.role.rolePermissions.map(
            (rp) => `${rp.permission.module}:${rp.permission.action}`,
          ),
        ),
      ),
    ];

    (req as any).user = {
      id: session.user.id,
      email: session.user.email,
      organizationId: dbUser.organizationId,
      isSuperAdmin: dbUser.isSuperAdmin,
      instituteId,
      permissions,
    };

    // Update the tenant storage that TenancyMiddleware pre-allocated.
    const ctx = tenantStorage.getStore();
    if (ctx) {
      ctx.organizationId = dbUser.organizationId ?? '';
      ctx.userId = session.user.id;
      ctx.permissions = permissions;
      if (instituteId) ctx.instituteId = instituteId;
    }

    return true;
  }
}
