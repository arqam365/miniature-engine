import { Module } from '@nestjs/common';
import { AttendanceGateway } from './attendance.gateway';
import { NotificationGateway } from './notification.gateway';

@Module({
  providers: [AttendanceGateway, NotificationGateway],
  exports: [AttendanceGateway, NotificationGateway],
})
export class RealtimeModule {}
