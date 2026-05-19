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
import { MessagesService } from './messages/messages.service';

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

interface Duel {
  id: string;
  challengerId: number;
  challengedId: number;
  betAmount: number;
  status: 'pending' | 'active';
  roomName: string;
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
  private duels = new Map<string, Duel>();
  private userSockets = new Map<number, Set<string>>();

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly notificationsService: NotificationsService,
    private readonly configService: ConfigService,
    private readonly lobbiesService: LobbiesService,
    private readonly messagesService: MessagesService,
  ) {}

  async handleConnection(client: Socket) {
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

      const userId = payload.sub;
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(client.id);

      // Global olarak çevrimiçi işaretle
      await this.usersService.setOnlineStatus(userId, true);
    } catch {
      console.log('[Socket] Yetkisiz baglanti denemesi reddedildi.');
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const payload = (client.data as any).user;
    if (payload?.sub) {
      const userId = payload.sub;
      const userSocketSet = this.userSockets.get(userId);
      if (userSocketSet) {
        userSocketSet.delete(client.id);
        if (userSocketSet.size === 0) {
          this.userSockets.delete(userId);
          // Global olarak çevrimdışı işaretle
          await this.usersService.setOnlineStatus(userId, false);
        }
      }
    }

    const user = this.connectedUsers.get(client.id);
    if (!user) {
      return;
    }

    await this.resolveDuel(user.userId);

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
    const focusedCount = usersInRoom.filter((user) => user.isAtDesk).length;
    void this.lobbiesService.updateActiveUsers(roomName, focusedCount);
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

  // ── AŞAMA 4: DÜELLO ÇÖZÜMLEME ──
  private async resolveDuel(loserId: number) {
    for (const [duelId, duel] of this.duels.entries()) {
      if (duel.status === 'active' && (duel.challengerId === loserId || duel.challengedId === loserId)) {
        const winnerId = duel.challengerId === loserId ? duel.challengedId : duel.challengerId;
        
        await this.usersService.addCoins(winnerId, duel.betAmount * 2);

        const winnerSocket = Array.from(this.connectedUsers.entries()).find(([_, u]) => u.userId === winnerId)?.[0];
        const loserSocket = Array.from(this.connectedUsers.entries()).find(([_, u]) => u.userId === loserId)?.[0];
        
        const winnerObj = await this.usersService.findById(winnerId);
        const loserObj = await this.usersService.findById(loserId);

        if (winnerSocket) {
          this.server.to(winnerSocket).emit('duel_ended', { winner: true, opponentName: loserObj?.fullName, betAmount: duel.betAmount });
        }
        if (loserSocket) {
          this.server.to(loserSocket).emit('duel_ended', { winner: false, opponentName: winnerObj?.fullName, betAmount: duel.betAmount });
        }

        this.duels.delete(duelId);
        break;
      }
    }
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

      await this.usersService.setOnlineStatus(socketUser.sub, true, roomName);

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

  @SubscribeMessage('send_dm')
  async handleSendDm(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { targetUserId: number; text: string; type?: string; fileUrl?: string } | string,
  ) {
    try {
      const socketUser = this.getSocketUser(client);
      if (!socketUser) return;

      const data = this.parsePayload(payload) as { targetUserId: number; text: string; type?: string; fileUrl?: string };
      const sender = await this.usersService.findById(socketUser.sub);
      const senderName = sender?.fullName ?? socketUser.username;
      const senderUsername = sender?.username ?? socketUser.username;
      const savedMsg = await this.messagesService.createDirectMessage(
        socketUser.sub,
        data.targetUserId,
        data.text,
        data.type || 'text',
        data.fileUrl
      );

      const dmPayload = {
        id: savedMsg.id,
        senderId: socketUser.sub,
        receiverId: data.targetUserId,
        text: data.text,
        type: data.type || 'text',
        fileUrl: data.fileUrl,
        createdAt: savedMsg.createdAt || new Date(),
        senderName,
        senderUsername,
      };

      // Alıcıya gönder
      const targetSockets = this.userSockets.get(data.targetUserId);
      if (targetSockets) {
        for (const socketId of targetSockets) {
          this.server.to(socketId).emit('receive_dm', dmPayload);
        }
      }

      // Gönderene de geri yolla (kendi ekranında çıksın)
      const senderSockets = this.userSockets.get(socketUser.sub);
      if (senderSockets) {
        for (const socketId of senderSockets) {
          this.server.to(socketId).emit('receive_dm', dmPayload);
        }
      }

      const tokens = await this.usersService.getUserPushTokens([data.targetUserId]);
      tokens.forEach((token) => {
        void this.notificationsService.sendNotification(
          token,
          'Yeni mesaj',
          `${senderName} sana bir mesaj gönderdi.`,
          {
            type: 'dm',
            targetUserId: socketUser.sub,
            targetName: senderName,
            targetUsername: senderUsername,
          },
        );
      });
    } catch (error) {
      console.error('DM Gönderim Hatası:', error);
    }
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
      await this.resolveDuel(user.userId);
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
    const targetSockets = this.userSockets.get(data.targetUserId);
    if (targetSockets) {
      for (const socketId of targetSockets) {
        this.server.to(socketId).emit('nudge_received', {
          senderName,
          senderId: socketUser.sub,
          roomName: data.roomName,
          message: `${senderName} seni ${data.roomName} odasina davet ediyor!`,
        });
        notified = true;
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
          `${senderName} seni ${data.roomName} odasina davet ediyor!`,
          {
            type: 'room_invite',
            roomName: data.roomName,
            senderId: socketUser.sub,
            senderName,
          },
        );
      });
    } catch (e) {
      console.error('[Nudge] Push bildirimi gonderilemedi:', e);
    }
  }

  // ── AŞAMA 6: SENKRONİZE ATMOSFER (PREMIUM) ──
  @SubscribeMessage('broadcast_atmosphere')
  async handleBroadcastAtmosphere(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { volumes: Record<string, number>; roomName: string } | string,
  ) {
    const socketUser = this.getSocketUser(client);
    if (!socketUser) return;

    // Sadece Premium kullanıcılar yayın yapabilir
    const user = await this.usersService.findById(socketUser.sub);
    if (!user?.isPremium) {
      client.emit('error', { message: 'Atmosfer senkronizasyonu için Premium gereklidir.' });
      return;
    }

    const data = this.parsePayload(payload) as { volumes: Record<string, number>; roomName: string };
    
    // Odadaki diğer kullanıcılara (kendisi hariç) ayarları gönder
    client.to(data.roomName).emit('atmosphere_updated', {
      ownerId: socketUser.sub,
      ownerName: user.fullName,
      volumes: data.volumes,
    });
  }

  // ── AŞAMA 4: DÜELLO SİSTEMİ ──
  @SubscribeMessage('challenge_duel')
  async handleChallengeDuel(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { targetUserId: number; betAmount: number; roomName: string } | string,
  ) {
    const socketUser = this.getSocketUser(client);
    if (!socketUser) return;

    const data = this.parsePayload(payload) as { targetUserId: number; betAmount: number; roomName: string };
    
    const challenger = await this.usersService.findById(socketUser.sub);
    if (!challenger || challenger.coins < data.betAmount) {
      client.emit('error', { message: 'Yetersiz bakiye!' });
      return;
    }

    const duelId = `duel_${Date.now()}_${Math.random()}`;
    this.duels.set(duelId, {
      id: duelId,
      challengerId: socketUser.sub,
      challengedId: data.targetUserId,
      betAmount: data.betAmount,
      status: 'pending',
      roomName: data.roomName,
    });

    for (const [socketId, user] of this.connectedUsers.entries()) {
      if (user.userId === data.targetUserId) {
        this.server.to(socketId).emit('duel_received', {
          duelId,
          challengerName: challenger.fullName,
          betAmount: data.betAmount,
        });
        break;
      }
    }
  }

  @SubscribeMessage('accept_duel')
  async handleAcceptDuel(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { duelId: string } | string,
  ) {
    const socketUser = this.getSocketUser(client);
    if (!socketUser) return;

    const data = this.parsePayload(payload) as { duelId: string };
    const duel = this.duels.get(data.duelId);

    if (!duel || duel.status !== 'pending' || duel.challengedId !== socketUser.sub) {
      client.emit('error', { message: 'Geçersiz düello isteği!' });
      return;
    }

    const challenged = await this.usersService.findById(socketUser.sub);
    if (!challenged || challenged.coins < duel.betAmount) {
      client.emit('error', { message: 'Yetersiz bakiye!' });
      return;
    }

    // Her iki taraftan da coinleri düş
    const challengerSuccess = await this.usersService.removeCoins(duel.challengerId, duel.betAmount);
    if (!challengerSuccess) {
      client.emit('error', { message: 'Rakibinin bakiyesi yetersiz.' });
      this.duels.delete(duel.id);
      return;
    }
    await this.usersService.removeCoins(duel.challengedId, duel.betAmount);

    duel.status = 'active';
    this.duels.set(duel.id, duel);

    const challengerSocket = Array.from(this.connectedUsers.entries()).find(([_, u]) => u.userId === duel.challengerId)?.[0];
    if (challengerSocket) {
      this.server.to(challengerSocket).emit('duel_started', { opponentName: challenged.fullName, betAmount: duel.betAmount });
    }
    client.emit('duel_started', { opponentName: 'Rakip', betAmount: duel.betAmount });
  }
}
