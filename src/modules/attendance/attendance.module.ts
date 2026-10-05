import { Module } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { AttendanceController } from './attendance.controller';
import { RealtimeModule } from '../realtime/realtime.module';
import { WhatsappModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [RealtimeModule, WhatsappModule],
  controllers: [AttendanceController],
  providers: [AttendanceService],
  exports: [AttendanceService],
})
export class AttendanceModule {}
