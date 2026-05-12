import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  ConnectedSocket,
  OnGatewayDisconnect,
  OnGatewayConnection,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UsersService } from './users/users.service';
import { JwtService } from '@nestjs/jwt';
import { NotificationsService } from './notifications/notifications.service';
import { ConfigService } from '@nestjs/config';
import { getJwtSecret } from './config/env';
import { JwtPayload } from './auth/jwt-payload.interface';
import { LobbiesService } from './lobbies/lobbies.service';

interface JoinLobbyDto {
  roomName: string;
  fullName?: string;
  maxUsers?: number;
}

interface SendMessageDto {
  fullName?: string;
  roomName: string;
  text: string;
  type?: string;
  fileUrl?: string;
  isPremium?: boolean;
}

interface UpdatePresenceDto {
  isAtDesk: boolean;
  roomName: string;
}

interface NudgeFriendDto {
  targetUserId: number;
  senderName?: string;
  roomName: string;
}

interface ConnectedRoomUser {
  userId: number;
  fullName: string;
  avatarUrl?: string | null;
  roomName: string;
  isAtDesk: boolean;
  isEliteRoom: boolean;
  isPremium: boolean;
}

@WebSocketGateway({
  cors: { origin: process.env.CORS_ORIGIN?.split(',') ?? '*' },
  pingInterval: 10000,
  pingTimeout: 5000,
})
export class SensorsGateway
  implements OnGatewayDisconnect, OnGatewayConnection
{
  @WebSocketServer() server!: Server;

  private activeSessions = new Map<number, number>();
  private connectedUsers = new Map<string, ConnectedRoomUser>();

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly notificationsService: NotificationsService,
    private readonly configService: ConfigService,
    private readonly lobbiesService: LobbiesService,
  ) {}

  handleConnection(client: Socket) {
    try {
      const auth = client.handshake.auth as { token?: unknown } | undefined;
      const token = typeof auth?.token === 'string' ? auth.token : undefined;
      if (!token) {
        throw new Error('Token eksik');
      }

      const payload = this.jwtService.verify<JwtPayload>(token, {
        secret: getJwtSecret(this.configService),
      });

      (client.data as Record<string, unknown>).user = payload;
    } catch {
      console.log('[Socket] Yetkisiz baglanti denemesi reddedildi.');
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const user = this.connectedUsers.get(client.id);
    if (!user) {
      return;
    }

    const startTime = this.activeSessions.get(user.userId);
    if (startTime) {
      await this.finishFocusSession(user);
    }

    this.connectedUsers.delete(client.id);
    this.broadcastRoomUsers(user.roomName);
    console.log(`[Baglanti Koptu] ${user.fullName} lobiden ayrildi.`);
  }

  private getSocketUser(client: Socket): JwtPayload | null {
    const user = (client.data as Record<string, unknown>).user as
      | JwtPayload
      | undefined;
    return user?.sub ? user : null;
  }

  private parsePayload<T>(payload: T | string): T {
    return typeof payload === 'string' ? (JSON.parse(payload) as T) : payload;
  }

  private broadcastRoomUsers(roomName: string) {
    const usersInRoom = Array.from(this.connectedUsers.values()).filter(
      (u) => u.roomName === roomName,
    );
    this.server.to(roomName).emit('room_users', usersInRoom);
  }

  private async finishFocusSession(user: ConnectedRoomUser) {
    const startTime = this.activeSessions.get(user.userId);
    if (!startTime) {
      return;
    }

    let durationMinutes = Math.round((Date.now() - startTime) / 60000);
    if (user.isEliteRoom) {
      durationMinutes *= 2;
    }

    if (durationMinutes > 0) {
      const updatedUser = await this.usersService.addFocusTime(
        user.userId,
        durationMinutes,
      );

      if (updatedUser) {
        this.server.emit('score_updated', {
          userId: user.userId,
          newTotal: updatedUser.totalFocusMinutes,
        });
      }
    }

    this.activeSessions.delete(user.userId);
  }

  @SubscribeMessage('join_lobby')
  async handleJoinLobby(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: JoinLobbyDto | string,
  ) {
    const socketUser = this.getSocketUser(client);
    if (!socketUser) {
      client.disconnect();
      return;
    }

    const data = this.parsePayload(payload);
    const { roomName, maxUsers } = data;

    try {
      const currentUser = await this.usersService.findById(socketUser.sub);
      if (!currentUser) {
        client.disconnect();
        return;
      }

      const lobby = await this.lobbiesService.assertUserCanEnter(
        roomName,
        socketUser.sub,
      );
      const fullName = currentUser.fullName ?? socketUser.username;

      const usersInRoom = Array.from(this.connectedUsers.values()).filter(
        (u) => u.roomName === roomName,
      );

      if (maxUsers && usersInRoom.length >= maxUsers) {
        client.emit('room_full', { message: 'Bu oda kapasitesine ulasti.' });
        return;
      }

      void client.join(roomName);

      this.connectedUsers.set(client.id, {
        userId: socketUser.sub,
        fullName,
        avatarUrl: currentUser.avatarUrl,
        roomName,
        isAtDesk: false,
        isEliteRoom: lobby.isPremiumOnly,
        isPremium: currentUser.isPremium,
      });

      console.log(
        `[Lobi Katilim] ${fullName} (ID: ${socketUser.sub}), '${roomName}' lobisine girdi.`,
      );

      this.broadcastRoomUsers(roomName);
      this.server.to(roomName).emit('user_joined_lobby', {
        fullName,
        userId: socketUser.sub,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Lobiye giris reddedildi.';
      client.emit('join_lobby_error', { message });
    }
  }

  @SubscribeMessage('send_message')
  handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: SendMessageDto | string,
  ) {
    const socketUser = this.getSocketUser(client);
    if (!socketUser) {
      client.disconnect();
      return;
    }

    const data = this.parsePayload(payload);
    const connectedUser = this.connectedUsers.get(client.id);
    const fullName = connectedUser?.fullName ?? socketUser.username;

    console.log(`[Chat - ${data.roomName}] ${fullName}: ${data.text}`);

    this.server.to(data.roomName).emit('receive_message', {
      userId: socketUser.sub,
      fullName,
      avatarUrl: connectedUser?.avatarUrl,
      text: data.text,
      type: data.type,
      fileUrl: data.fileUrl,
      isPremium: connectedUser?.isPremium ?? false,
      timestamp: new Date().toISOString(),
    });
  }

  @SubscribeMessage('update_presence')
  async handlePresenceUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: UpdatePresenceDto | string,
  ) {
    const socketUser = this.getSocketUser(client);
    if (!socketUser) {
      client.disconnect();
      return;
    }

    const data = this.parsePayload(payload);
    const user = this.connectedUsers.get(client.id);
    if (!user) {
      return;
    }

    user.isAtDesk = data.isAtDesk;
    this.connectedUsers.set(client.id, user);
    this.broadcastRoomUsers(user.roomName);

    if (data.isAtDesk) {
      this.activeSessions.set(socketUser.sub, Date.now());
      console.log(
        `[Odaklanma Basladi - ${user.roomName}] Kullanici: ${socketUser.sub} (Elite: ${user.isEliteRoom})`,
      );

      void this.usersService
        .getFriendsPushTokens(socketUser.sub)
        .then((tokens) => {
          tokens.forEach((token) => {
            void this.notificationsService.sendNotification(
              token,
              'StudyLounge',
              `${user.fullName} masaya gecti, beraber calisabilirsiniz!`,
            );
          });
        });
    } else {
      await this.finishFocusSession(user);
      console.log(
        `[Odaklanma Bitti - ${user.roomName}] Kullanici: ${socketUser.sub} (Elite: ${user.isEliteRoom})`,
      );
    }

    this.server.to(user.roomName).emit('presence_changed', {
      ...data,
      userId: socketUser.sub,
      isEliteRoom: user.isEliteRoom,
    });
  }

  @SubscribeMessage('nudge_friend')
  async handleNudge(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: NudgeFriendDto | string,
  ) {
    const socketUser = this.getSocketUser(client);
    if (!socketUser) {
      client.disconnect();
      return;
    }

    const data = this.parsePayload(payload);
    const connectedUser = this.connectedUsers.get(client.id);
    const senderName = connectedUser?.fullName ?? socketUser.username;

    console.log(
      `[Nudge] ${senderName} (ID: ${socketUser.sub}), Kullanici ${data.targetUserId}'yi durtuyor.`,
    );

    let notified = false;
    for (const [socketId, user] of this.connectedUsers.entries()) {
      if (user.userId === data.targetUserId) {
        this.server.to(socketId).emit('nudge_received', {
          senderName,
          senderId: socketUser.sub,
          roomName: data.roomName,
          message: `${senderName} seni calismaya cagiriyor!`,
        });
        notified = true;
        break;
      }
    }

    if (!notified) {
      console.log(
        `[Nudge] Kullanici ${data.targetUserId} cevrimici degil, push bildirimi denenecek.`,
      );
    }

    try {
      const tokens = await this.usersService.getUserPushTokens([
        data.targetUserId,
      ]);
      tokens.forEach((token) => {
        void this.notificationsService.sendNotification(
          token,
          'StudyLounge',
          `${senderName} seni calismaya davet ediyor!`,
        );
      });
    } catch (e) {
      console.error('[Nudge] Push bildirimi gonderilemedi:', e);
    }
  }
}
