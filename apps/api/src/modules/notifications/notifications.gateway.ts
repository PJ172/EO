import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  roles?: string[];
}

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/notifications',
})
@Injectable()
export class NotificationsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private logger = new Logger('NotificationsGateway');
  private userSockets: Map<string, Set<string>> = new Map();

  constructor(private jwtService: JwtService) {}

  afterInit() {
    this.logger.log('WebSocket Gateway initialized');
  }

  async handleConnection(client: AuthenticatedSocket) {
    try {
      // Extract token from handshake
      const token =
        client.handshake.auth.token ||
        client.handshake.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        client.disconnect();
        return;
      }

      // Verify JWT
      const payload = this.jwtService.verify(token);
      client.userId = payload.sub;
      client.roles = payload.roles;

      // Track user's sockets
      if (!this.userSockets.has(payload.sub)) {
        this.userSockets.set(payload.sub, new Set());
      }
      this.userSockets.get(payload.sub)!.add(client.id);

      // Join user-specific room
      client.join(`user:${payload.sub}`);

      // Join role-based rooms
      payload.roles?.forEach((role: string) => {
        client.join(`role:${role}`);
      });

      this.logger.log(`Client connected: ${client.id} (User: ${payload.sub})`);
    } catch (error) {
      this.logger.error(`Connection failed: ${error}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      this.userSockets.get(client.userId)?.delete(client.id);
      if (this.userSockets.get(client.userId)?.size === 0) {
        this.userSockets.delete(client.userId);
      }
    }
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  // Send notification to specific user
  sendToUser(userId: string, event: string, data: any) {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  // Send notification to users with specific role
  sendToRole(role: string, event: string, data: any) {
    this.server.to(`role:${role}`).emit(event, data);
  }

  // Broadcast to all connected users
  broadcast(event: string, data: any) {
    this.server.emit(event, data);
  }

  // Check if user is online
  isUserOnline(userId: string): boolean {
    return (
      this.userSockets.has(userId) && this.userSockets.get(userId)!.size > 0
    );
  }

  // Get online user count
  getOnlineCount(): number {
    return this.userSockets.size;
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket): {
    event: string;
    data: string;
  } {
    return { event: 'pong', data: 'ok' };
  }

  @SubscribeMessage('markAsRead')
  handleMarkAsRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { notificationId: string },
  ) {
    // Handle marking notification as read
    this.logger.log(
      `User ${client.userId} marked notification ${data.notificationId} as read`,
    );
    return { success: true };
  }
}
