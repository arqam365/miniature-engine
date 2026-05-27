import { Injectable, NestMiddleware } from '@nestjs/common';
import { tenantStorage } from './tenant-context';

@Injectable()
export class TenancyMiddleware implements NestMiddleware {
  use(req: any, _res: any, next: () => void) {
    const instituteId = req.headers['x-institute-id'] as string | undefined;
    // Always establish the storage context — BetterAuthGuard fills in real values after auth.
    tenantStorage.run({ organizationId: '', instituteId, userId: '', permissions: [] }, () => next());
  }
}
