import { Injectable, NestMiddleware } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { tenantStorage } from './tenant-context';

@Injectable()
export class TenancyMiddleware implements NestMiddleware {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  use(req: any, _res: any, next: () => void) {
    const token = this.extractToken(req);

    if (!token) {
      next();
      return;
    }

    try {
      const payload = this.jwt.verify(token, {
        secret: this.config.get<string>('jwt.secret'),
      });

      const instituteId = req.headers['x-institute-id'] ?? payload.instituteId;

      tenantStorage.run(
        {
          organizationId: payload.organizationId,
          instituteId,
          userId: payload.sub,
          permissions: payload.permissions ?? [],
        },
        () => next(),
      );
    } catch {
      next();
    }
  }

  private extractToken(req: any): string | undefined {
    const [type, token] = (req.headers?.authorization ?? '').split(' ');
    return type === 'Bearer' ? token : undefined;
  }
}
