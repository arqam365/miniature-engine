import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TenancyMiddleware } from './tenancy.middleware';

@Module({
  imports: [JwtModule],
  providers: [TenancyMiddleware],
  exports: [TenancyMiddleware],
})
export class TenancyModule {}
