import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import * as jwt from 'jsonwebtoken';

const WS_PORT = parseInt(process.env.WS_PORT ?? '4001', 10);

@WebSocketGateway(WS_PORT, {
  namespace: '/notifications',
  cors: { origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true },
})
export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(NotificationGateway.name);

  async handleConnection(socket: Socket) {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) { socket.disconnect(); return; }

    try {
      const payload: any = jwt.verify(token, process.env.JWT_SECRET ?? 'default-secret-change-in-prod');
      socket.data.user = payload;
      socket.join(`user:${payload.sub}`);
      this.logger.debug(`Connected: ${payload.sub}`);
    } catch {
      socket.disconnect();
    }
  }

  handleDisconnect(socket: Socket) {
    this.logger.debug(`Disconnected: ${socket.id}`);
  }

  emitToUser(userId: string, event: string, data: unknown) {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  emitNotification(userId: string, notification: { id: string; title: string; body: string; createdAt: string }) {
    this.emitToUser(userId, 'notification:new', notification);
  }
}
