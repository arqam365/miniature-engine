import { Module } from '@nestjs/common';
import { TenancyMiddleware } from './tenancy.middleware';

@Module({
  providers: [TenancyMiddleware],
  exports: [TenancyMiddleware],
})
export class TenancyModule {}
