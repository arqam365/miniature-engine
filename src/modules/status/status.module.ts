import { Module } from '@nestjs/common';
import { StatusController } from './status.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [StatusController],
})
export class StatusModule {}
