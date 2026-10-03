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
import { MediaState, RtcService } from './rtc/rtc.service';
import { WhiteboardService } from './whiteboard/whiteboard.service';
import { RoomTimerService } from './room-timer/room-timer.service';

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
  equippedProfileFrame?: string | null;
  equippedBubbleColor?: string | null;
  equippedIcon?: string | null;
  roomName: string;
  isAtDesk: boolean;
  isEliteRoom: boolean;
  isPremium: boolean;
}

interface RtcJoinDto {
  roomName: string;
}

interface RtcSignalDto {
  targetUserId: number;
  data: unknown;
}

interface BoardOpenDto {
  /** true ise PDF'siz bos beyaz tahta acilir. */
  blank?: boolean;
  fileUrl?: string;
  fileName?: string;
}

interface RoomTimerStartDto {
  focusMinutes: number;
  breakMinutes: number;
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
    private readonly rtcService: RtcService,
    private readonly whiteboardService: WhiteboardService,
    private readonly roomTimerService: RoomTimerService,
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
      this.leaveCall(userId, client.id);
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
    if (usersInRoom.length === 0) {
      this.whiteboardService.scheduleDrop(roomName);
      this.roomTimerService.scheduleDrop(roomName);
    } else {
      this.whiteboardService.cancelDrop(roomName);
      this.roomTimerService.cancelDrop(roomName);
    }
    const focusedCount = usersInRoom.filter((user) => user.isAtDesk).length;
    void this.lobbiesService.updateActiveUsers(roomName, focusedCount);

    // Web istemcileri icin kamera/mikrofon/ekran durumu eklenir; mobil bu alanlari yok sayar.
    const payload = usersInRoom.map((user) => {
      const media: MediaState | null =
        this.rtcService.getRoomOf(user.userId) === roomName
          ? this.rtcService.getMedia(user.userId)
          : null;
      return {
        ...user,
        isInCall: media !== null,
        isCameraOn: media?.camera ?? false,
        isMicOn: media?.mic ?? false,
        isScreenSharing: media?.screen ?? false,
      };
    });
    this.server.to(roomName).emit('room_users', payload);
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

      // Kapasite sunucudaki lobi kaydindan okunur (video odalari 6 kisiyle sinirli).
      const capacity = lobby.maxUsers ?? maxUsers;
      const usersInRoom = Array.from(this.connectedUsers.values()).filter(
        (u) => u.roomName === roomName && u.userId !== socketUser.sub,
      );

      if (capacity && usersInRoom.length >= capacity) {
        client.emit('room_full', { message: 'Bu oda kapasitesine ulasti.' });
        client.emit('join_lobby_error', { message: 'Bu oda dolu.' });
        return;
      }

      // Ayni soketle baska bir odaya gecildiyse once eski odadan cik.
      const previous = this.connectedUsers.get(client.id);
      if (previous && previous.roomName !== roomName) {
        await this.leaveLobby(client, previous);
      }

      void client.join(roomName);

      this.connectedUsers.set(client.id, {
        userId: socketUser.sub,
        fullName,
        avatarUrl: currentUser.avatarUrl,
        equippedProfileFrame: currentUser.equippedProfileFrame,
        equippedBubbleColor: currentUser.equippedBubbleColor,
        equippedIcon: currentUser.equippedIcon,
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

      // Web: odada acik bir PDF tahtasi varsa yeni gelen kisiye gonderilir.
      const board = this.whiteboardService.getState(roomName);
      if (board) {
        client.emit('board_state', { board });
      }
      // Web: calisan ortak Pomodoro sayaci da gonderilir.
      const timer = this.roomTimerService.snapshot(roomName);
      if (timer) {
        client.emit('room_timer', { timer, action: 'sync' });
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Lobiye giris reddedildi.';
      client.emit('join_lobby_error', { message });
    }
  }

  private async leaveLobby(client: Socket, user: ConnectedRoomUser) {
    await this.resolveDuel(user.userId);
    await this.finishFocusSession(user);
    this.leaveCall(user.userId, client.id);
    void client.leave(user.roomName);
    this.connectedUsers.delete(client.id);
    this.broadcastRoomUsers(user.roomName);
  }

  // Web: sayfadan ayrilirken soket acik kaldigi icin odadan acikca cikilir.
  @SubscribeMessage('leave_lobby')
  async handleLeaveLobby(@ConnectedSocket() client: Socket) {
    const user = this.connectedUsers.get(client.id);
    if (!user) return;
    await this.leaveLobby(client, user);
    console.log(`[Lobi Ayrilis] ${user.fullName}, '${user.roomName}' lobisinden ayrildi.`);
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
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

    const savedMessage = data.fileUrl
      ? null
      : await this.messagesService.createMessage(
          data.text,
          data.roomName,
          socketUser.sub,
        );

    this.server.to(data.roomName).emit('receive_message', {
      id: savedMessage?.id,
      roomName: data.roomName,
      userId: socketUser.sub,
      fullName,
      user: savedMessage?.user,
      avatarUrl: connectedUser?.avatarUrl,
      equippedProfileFrame: connectedUser?.equippedProfileFrame,
      equippedBubbleColor: connectedUser?.equippedBubbleColor,
      equippedIcon: connectedUser?.equippedIcon,
      text: data.text,
      type: data.type,
      fileUrl: data.fileUrl,
      isPremium: connectedUser?.isPremium ?? false,
      createdAt: savedMessage?.createdAt ?? new Date().toISOString(),
      timestamp: savedMessage?.createdAt ?? new Date().toISOString(),
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
            targetAvatarUrl: sender?.avatarUrl,
            targetProfileFrame: sender?.equippedProfileFrame,
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

  // ── WEB: P2P WEBRTC SINYALLESMESI (kamera + ekran paylasimi) ──
  private leaveCall(userId: number, socketId?: string) {
    const roomName = socketId
      ? this.rtcService.leaveBySocket(userId, socketId)
      : this.rtcService.leave(userId);
    if (roomName) {
      this.server.to(roomName).emit('rtc_peer_left', { userId });
      this.broadcastRoomUsers(roomName);
    }
  }

  @SubscribeMessage('rtc_join')
  async handleRtcJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: RtcJoinDto | string,
  ) {
    const socketUser = this.getSocketUser(client);
    if (!socketUser) return;

    const data = this.parsePayload(payload);
    const roomUser = this.connectedUsers.get(client.id);
    if (!roomUser || roomUser.roomName !== data.roomName) {
      client.emit('rtc_error', { message: 'Once lobiye katilmalisin.' });
      return;
    }

    try {
      const lobby = await this.lobbiesService.findByName(data.roomName);
      const { peers, previousRoom } = this.rtcService.join(
        data.roomName,
        socketUser.sub,
        client.id,
        lobby?.allowVideo ?? false,
      );

      if (previousRoom) {
        this.server
          .to(previousRoom)
          .emit('rtc_peer_left', { userId: socketUser.sub });
      }

      client.emit('rtc_peers', {
        peers: peers.map((peer) => ({ userId: peer.userId, media: peer.media })),
      });
      client
        .to(data.roomName)
        .emit('rtc_peer_joined', { userId: socketUser.sub });
      this.broadcastRoomUsers(data.roomName);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Aramaya katilinamadi.';
      client.emit('rtc_error', { message });
    }
  }

  @SubscribeMessage('rtc_signal')
  handleRtcSignal(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: RtcSignalDto | string,
  ) {
    const socketUser = this.getSocketUser(client);
    if (!socketUser) return;

    const data = this.parsePayload(payload);
    const targetSocketId = this.rtcService.resolveSignalTarget(
      socketUser.sub,
      Number(data.targetUserId),
    );
    if (!targetSocketId) return;

    this.server.to(targetSocketId).emit('rtc_signal', {
      fromUserId: socketUser.sub,
      data: data.data,
    });
  }

  @SubscribeMessage('rtc_media_state')
  handleRtcMediaState(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: Partial<MediaState> | string,
  ) {
    const socketUser = this.getSocketUser(client);
    if (!socketUser) return;

    const media = this.rtcService.updateMedia(
      socketUser.sub,
      this.parsePayload(payload),
    );
    const roomName = this.rtcService.getRoomOf(socketUser.sub);
    if (media && roomName) {
      this.server
        .to(roomName)
        .emit('rtc_media_changed', { userId: socketUser.sub, media });
      this.broadcastRoomUsers(roomName);
    }
  }

  @SubscribeMessage('rtc_leave')
  handleRtcLeave(@ConnectedSocket() client: Socket) {
    const socketUser = this.getSocketUser(client);
    if (!socketUser) return;
    this.leaveCall(socketUser.sub, client.id);
  }

  // ── WEB: ORTAK PDF TAHTASI (cizim + sayfa senkronu) ──
  private getBoardRoom(client: Socket): ConnectedRoomUser | null {
    return this.connectedUsers.get(client.id) ?? null;
  }

  @SubscribeMessage('board_sync')
  handleBoardSync(@ConnectedSocket() client: Socket) {
    const user = this.getBoardRoom(client);
    if (!user) return;
    client.emit('board_state', {
      board: this.whiteboardService.getState(user.roomName),
    });
  }

  @SubscribeMessage('board_open')
  handleBoardOpen(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: BoardOpenDto | string,
  ) {
    const user = this.getBoardRoom(client);
    if (!user) return;
    const data = this.parsePayload(payload);
    try {
      const board =
        data?.blank === true
          ? this.whiteboardService.openBlank(
              user.roomName,
              user.userId,
              user.fullName,
            )
          : this.whiteboardService.open(
              user.roomName,
              user.userId,
              user.fullName,
              data?.fileUrl,
              data?.fileName,
            );
      this.server.to(user.roomName).emit('board_state', { board });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'PDF tahtada acilamadi.';
      client.emit('board_error', { message });
    }
  }

  @SubscribeMessage('board_close')
  handleBoardClose(@ConnectedSocket() client: Socket) {
    const user = this.getBoardRoom(client);
    if (!user) return;
    if (this.whiteboardService.close(user.roomName)) {
      this.server.to(user.roomName).emit('board_state', { board: null });
    }
  }

  @SubscribeMessage('board_page')
  handleBoardPage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { page: number } | string,
  ) {
    const user = this.getBoardRoom(client);
    if (!user) return;
    const result = this.whiteboardService.setPage(
      user.roomName,
      this.parsePayload(payload)?.page,
    );
    if (result) {
      this.server.to(user.roomName).emit('board_page', result);
    }
  }

  /** Cizilmekte olan cizgi: saklanmaz, yalnizca odadaki digerlerine iletilir. */
  @SubscribeMessage('board_live')
  handleBoardLive(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { stroke: unknown } | string,
  ) {
    const user = this.getBoardRoom(client);
    if (!user || !this.whiteboardService.getState(user.roomName)) return;
    const stroke = this.whiteboardService.sanitizeLive(
      user.userId,
      this.parsePayload(payload)?.stroke,
    );
    if (stroke) {
      client.volatile.to(user.roomName).emit('board_live', { stroke });
    }
  }

  @SubscribeMessage('board_stroke')
  handleBoardStroke(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { stroke: unknown } | string,
  ) {
    const user = this.getBoardRoom(client);
    if (!user) return;
    const stroke = this.whiteboardService.addStroke(
      user.roomName,
      user.userId,
      this.parsePayload(payload)?.stroke,
    );
    if (stroke) {
      this.server.to(user.roomName).emit('board_stroke', { stroke });
    }
  }

  @SubscribeMessage('board_erase')
  handleBoardErase(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { ids: unknown } | string,
  ) {
    const user = this.getBoardRoom(client);
    if (!user) return;
    const ids = this.whiteboardService.removeStrokes(
      user.roomName,
      this.parsePayload(payload)?.ids,
    );
    if (ids.length) {
      this.server.to(user.roomName).emit('board_erased', { ids });
    }
  }

  @SubscribeMessage('board_clear')
  handleBoardClear(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { page: number } | string,
  ) {
    const user = this.getBoardRoom(client);
    if (!user) return;
    const page = this.whiteboardService.clearPage(
      user.roomName,
      this.parsePayload(payload)?.page,
    );
    if (page !== null) {
      this.server.to(user.roomName).emit('board_cleared', { page });
    }
  }

  // ── WEB: ORTAK POMODORO SAYACI ──
  private broadcastRoomTimer(
    roomName: string,
    action: string,
    byName: string | null,
  ) {
    this.server.to(roomName).emit('room_timer', {
      timer: this.roomTimerService.snapshot(roomName),
      action,
      byName,
    });
  }

  @SubscribeMessage('room_timer_sync')
  handleRoomTimerSync(@ConnectedSocket() client: Socket) {
    const user = this.connectedUsers.get(client.id);
    if (!user) return;
    client.emit('room_timer', {
      timer: this.roomTimerService.snapshot(user.roomName),
      action: 'sync',
      byName: null,
    });
  }

  @SubscribeMessage('room_timer_start')
  handleRoomTimerStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: RoomTimerStartDto | string,
  ) {
    const user = this.connectedUsers.get(client.id);
    if (!user) return;
    const data = this.parsePayload(payload);
    try {
      this.roomTimerService.start(
        user.roomName,
        user.userId,
        user.fullName,
        data?.focusMinutes,
        data?.breakMinutes,
      );
      this.broadcastRoomTimer(user.roomName, 'start', user.fullName);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Ortak sayac baslatilamadi.';
      client.emit('room_timer_error', { message });
    }
  }

  @SubscribeMessage('room_timer_pause')
  handleRoomTimerPause(@ConnectedSocket() client: Socket) {
    const user = this.connectedUsers.get(client.id);
    if (user && this.roomTimerService.pause(user.roomName)) {
      this.broadcastRoomTimer(user.roomName, 'pause', user.fullName);
    }
  }

  @SubscribeMessage('room_timer_resume')
  handleRoomTimerResume(@ConnectedSocket() client: Socket) {
    const user = this.connectedUsers.get(client.id);
    if (user && this.roomTimerService.resume(user.roomName)) {
      this.broadcastRoomTimer(user.roomName, 'resume', user.fullName);
    }
  }

  @SubscribeMessage('room_timer_stop')
  handleRoomTimerStop(@ConnectedSocket() client: Socket) {
    const user = this.connectedUsers.get(client.id);
    if (user && this.roomTimerService.stop(user.roomName)) {
      this.broadcastRoomTimer(user.roomName, 'stop', user.fullName);
    }
  }
}
