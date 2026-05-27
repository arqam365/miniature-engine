import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import * as jwt from 'jsonwebtoken';

const WS_PORT = parseInt(process.env.WS_PORT ?? '4001', 10);

@WebSocketGateway(WS_PORT, {
  namespace: '/attendance',
  cors: { origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true },
})
export class AttendanceGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(AttendanceGateway.name);

  async handleConnection(socket: Socket) {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) { socket.disconnect(); return; }

    try {
      const payload: any = jwt.verify(token, process.env.JWT_SECRET ?? 'default-secret-change-in-prod');
      socket.data.user = payload;
      if (payload.instituteId) {
        socket.join(`institute:${payload.instituteId}`);
      }
      this.logger.debug(`Connected: ${payload.sub}`);
    } catch {
      socket.disconnect();
    }
  }

  handleDisconnect(socket: Socket) {
    this.logger.debug(`Disconnected: ${socket.id}`);
  }

  @SubscribeMessage('join-institute')
  handleJoin(@ConnectedSocket() socket: Socket, @MessageBody() instituteId: string) {
    if (socket.data.user?.instituteId === instituteId) {
      socket.join(`institute:${instituteId}`);
    }
  }

  emitAttendanceUpdate(instituteId: string, data: unknown) {
    this.server.to(`institute:${instituteId}`).emit('attendance:updated', data);
  }
}
