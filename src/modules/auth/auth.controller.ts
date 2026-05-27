import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  All,
  Req,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { auth } from '../../lib/auth';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle({ auth: { limit: 3, ttl: 60_000 } })
  @Post('register')
  @ApiOperation({ summary: 'Register a new organization (SaaS onboarding)' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Get('me')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get current user profile with permissions' })
  me(@CurrentUser('id') userId: string) {
    return this.authService.getMe(userId);
  }

  @Get('institutes')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'List institutes the current user has access to' })
  getInstitutes(@CurrentUser('id') userId: string) {
    return this.authService.getInstitutes(userId);
  }

  // Better Auth catch-all — handles sign-in, sign-out, get-session, etc.
  @Public()
  @All('*')
  async betterAuth(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    const url = new URL(
      req.url,
      `http://${(req.headers.host as string) ?? 'localhost:4000'}`,
    );

    const headers = new Headers();
    for (const [key, val] of Object.entries(req.headers)) {
      if (val != null) {
        headers.set(key, Array.isArray(val) ? val.join(', ') : String(val));
      }
    }

    const hasBody = !['GET', 'HEAD'].includes(req.method.toUpperCase());
    const request = new Request(url, {
      method: req.method,
      headers,
      body: hasBody ? JSON.stringify(req.body) : undefined,
    });

    const response = await auth.handler(request);

    response.headers.forEach((val, key) => {
      // Skip Better Auth's CORS headers — NestJS handles CORS
      if (!key.toLowerCase().startsWith('access-control-')) {
        void res.header(key, val);
      }
    });

    res.status(response.status);
    const body = await response.text();
    return res.send(body || null);
  }
}
