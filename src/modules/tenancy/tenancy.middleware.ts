import { Injectable, NestMiddleware } from '@nestjs/common';
import { tenantStorage } from './tenant-context';

@Injectable()
export class TenancyMiddleware implements NestMiddleware {
  use(req: any, _res: any, next: () => void) {
    // Tenant context is populated by BetterAuthGuard after session validation.
    // This middleware runs early (before guards) so it sets up the storage namespace;
    // the guard will call setTenantContext() with real data after auth.
    const instituteId = req.headers['x-institute-id'];
    if (instituteId) {
      // Partial context — will be overwritten by BetterAuthGuard if authenticated.
      tenantStorage.run({ organizationId: '', instituteId, userId: '', permissions: [] }, () => next());
    } else {
      next();
    }
  }
}
